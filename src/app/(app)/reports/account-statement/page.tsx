'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileText, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface StatementAccount {
    id: string;
    name: string;
    type: 'Customer' | 'Vendor' | 'Account';
}

interface Transaction {
    date: string;
    description: string;
    debit: number;
    credit: number;
}

interface StatementData {
    openingBalance: number;
    transactions: Transaction[];
    closingBalance: number;
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    const formatted = new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const AccountStatementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [accounts, setAccounts] = useState<StatementAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    
    const [data, setData] = useState<StatementData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAccountsLoading, setIsAccountsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.company_id) {
            setIsAccountsLoading(true);
            fetch(`/api/gl/get-statement-accounts.php?company_id=${user.company_id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setAccounts(data.accounts);
                    } else {
                        throw new Error(data.message || 'Failed to load accounts');
                    }
                })
                .catch(e => toast({ title: "Error Loading Accounts", description: e.message, variant: "destructive" }))
                .finally(() => setIsAccountsLoading(false));
        }
    }, [user, toast]);

    const generateReport = useCallback(async () => {
        if (!startDate || !endDate || !selectedAccount || !user?.company_id) {
            setError("Please select an account and a valid date range.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setData(null);

        const fromDate = format(startDate, 'yyyy-MM-dd');
        const toDate = format(endDate, 'yyyy-MM-dd');
        const url = `https://hariindustries.net/api/clearbook/account-statement.php?company_id=${user.company_id}&account_id=${selectedAccount}&fromDate=${fromDate}&toDate=${toDate}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const rawData: StatementData = await response.json();

            if (!rawData || typeof rawData.openingBalance === 'undefined') {
                throw new Error("Invalid data structure received.");
            }
            
            setData(rawData);
            if (rawData.transactions.length === 0) {
                 toast({ title: "No Transactions", description: "There are no transactions for this account in the selected period." });
            }

        } catch (e: any) {
            setError(`Failed to generate statement: ${e.message}`);
            toast({ title: "Error Generating Report", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, selectedAccount, user, toast]);

    const runningBalance = useMemo(() => {
        if (!data) return [];
        const balances: number[] = [];
        let currentBalance = data.openingBalance;
        data.transactions.forEach(tx => {
            currentBalance += (tx.debit - tx.credit);
            balances.push(currentBalance);
        });
        return balances;
    }, [data]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center"><ClipboardList className="mr-3 h-8 w-8"/> Account Statement</h1>
            <Card>
                <CardHeader><CardTitle>Report Controls</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-sm font-medium">Account</label>
                        <Select onValueChange={setSelectedAccount} value={selectedAccount} disabled={isAccountsLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder={isAccountsLoading ? "Loading accounts..." : "Select an account"} />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2"><label className="text-sm font-medium">From Date</label><DatePicker date={startDate} setDate={setStartDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">To Date</label><DatePicker date={endDate} setDate={setEndDate} /></div>
                    <Button onClick={generateReport} disabled={isLoading || !selectedAccount} className="w-full col-span-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Statement
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-4">Generating statement...</span></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}

            {data && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Statement for: {accounts.find(a => a.id === selectedAccount)?.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">Period: {format(startDate!, 'MMM dd, yyyy')} to {format(endDate!, 'MMM dd, yyyy')}</p>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="font-semibold">
                                    <TableCell colSpan={4}>Opening Balance</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(data.openingBalance)}</TableCell>
                                </TableRow>
                                {data.transactions.length > 0 ? (
                                    data.transactions.map((tx, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{format(new Date(tx.date), 'yyyy-MM-dd')}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell className="text-right font-mono text-green-600">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-red-600">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(runningBalance[index])}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">No transactions found for the selected period.</TableCell></TableRow>
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-extrabold text-lg bg-gray-800 text-white hover:bg-black">
                                    <TableCell colSpan={4}>Closing Balance</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(data.closingBalance)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AccountStatementPage;
