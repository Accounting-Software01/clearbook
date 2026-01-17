'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// --- INTERFACES ---
interface ChartOfAccount {
    account_code: string;
    account_name: string;
}

interface Transaction {
    date: string;
    reference: string;
    description: string;
    debit: string;
    credit: string;
    running_balance: string;
}

interface LedgerSummary {
    account_details: { account_name: string; account_type: string; };
    period_str: string;
    opening_balance: string;
    total_debit: string;
    total_credit: string;
    net_movement: string;
    closing_balance: string;
    transaction_count: number;
}

const initialSummary: LedgerSummary = {
    account_details: { account_name: 'N/A', account_type: 'N/A' },
    period_str: 'N/A',
    opening_balance: '0.00', total_debit: '0.00', total_credit: '0.00',
    net_movement: '0.00', closing_balance: '0.00', transaction_count: 0
};

const GeneralLedgerPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const searchParams = useSearchParams();

    // --- STATE MANAGEMENT ---
    const [fromDate, setFromDate] = useState<Date | undefined>(() => {
        const d = new Date();
        d.setDate(1);
        return d;
    });
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [accountCode, setAccountCode] = useState(searchParams.get('account_code') || '');
    const [accountsList, setAccountsList] = useState<ChartOfAccount[]>([]);

    const [summary, setSummary] = useState<LedgerSummary>(initialSummary);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- DATA FETCHING --- 
    const fetchAccounts = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const res = await fetch(`https://hariindustries.net/api/clearbook/get-gl-accounts.php?company_id=${user.company_id}`);
            const data = await res.json();
            if(data.success) setAccountsList(data.accounts || []);
        } catch (error) {
            toast({ title: "Failed to load accounts", variant: 'destructive' });
        }
    }, [user?.company_id, toast]);

    const fetchLedger = useCallback(async (filters: { from: Date, to: Date, accCode: string }) => {
        if (!user?.company_id || !filters.accCode || !filters.from || !filters.to) {
            return;
        }

        setIsLoading(true);
        const params = new URLSearchParams({
            company_id: user.company_id,
            account_code: filters.accCode,
            from_date: filters.from.toISOString().split('T')[0],
            to_date: filters.to.toISOString().split('T')[0],
        });

        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-general-ledger.php?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch ledger details.');
            }
            setSummary(data.summary || initialSummary);
            setTransactions(data.transactions || []);
            toast({ title: "Ledger Generated", description: `Displaying ${data.transactions.length} transactions.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setSummary(initialSummary);
            setTransactions([]);
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    // --- EFFECTS ---
    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        // Auto-fetch data if account code is present in URL
        if (accountCode && fromDate && toDate) {
            fetchLedger({ from: fromDate, to: toDate, accCode: accountCode });
        }
    }, [accountCode, fromDate, toDate, fetchLedger]);

    const handleGenerate = () => {
        if (!accountCode) {
            toast({ title: "Account required", description: "Please select an account to generate the ledger.", variant: 'destructive'});
            return;
        }
        if (fromDate && toDate) {
            fetchLedger({ from: fromDate, to: toDate, accCode: accountCode });
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">General Ledger Report</h1>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">Select Account *</label>
                            <Select value={accountCode} onValueChange={setAccountCode}><SelectTrigger className="w-[300px]"><SelectValue placeholder="Select an account..." /></SelectTrigger>
                                <SelectContent>{accountsList.map(acc => <SelectItem key={acc.account_code} value={acc.account_code}>{acc.account_code} - {acc.account_name}</SelectItem>)}</SelectContent>
                            </Select></div>
                        <div className="space-y-2"><label className="text-sm font-medium">From Date</label><DatePicker date={fromDate} setDate={setFromDate} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">To Date</label><DatePicker date={toDate} setDate={setToDate} /></div>
                        <div className="pt-6"><Button onClick={handleGenerate} disabled={isLoading}>{isLoading ? <><Loader2 className='h-4 w-4 mr-2 animate-spin'/>Generating</> : 'Generate'}</Button></div>
                    </div>
                </CardHeader>
            </Card>

            {isLoading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin" /><p className="ml-4 text-muted-foreground">Loading ledger...</p></div>
            ) : transactions.length > 0 || summary.account_details.account_name !== 'N/A' ? (
            <>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                        <p><strong>Account:</strong> {accountCode} - {summary.account_details.account_name}</p>
                        <p><strong>Type:</strong> {summary.account_details.account_type}</p>
                        <p><strong>Period:</strong> {summary.period_str}</p>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Opening Balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.opening_balance}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Total Debits</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.total_debit}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium text-red-500">Total Credits</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-500">{summary.total_credit}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-sm font-medium">Closing Balance</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{summary.closing_balance}</p></CardContent></Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Transaction Details</CardTitle>
                        <CardDescription>Total Transactions: {summary.transaction_count} | Net Movement: {summary.net_movement}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reference</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Running Balance</TableHead></TableRow></TableHeader>
                            <TableBody>
                                <TableRow className='bg-gray-50'><TableCell className="font-bold">Opening Balance</TableCell><TableCell colSpan={4}></TableCell><TableCell className="text-right font-bold">{summary.opening_balance}</TableCell></TableRow>
                                {transactions.map((tx, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell><TableCell>{tx.reference}</TableCell><TableCell>{tx.description}</TableCell>
                                        <TableCell className="text-right">{tx.debit}</TableCell><TableCell className="text-right text-red-500">{tx.credit}</TableCell><TableCell className="text-right">{tx.running_balance}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-gray-100 font-bold"><TableCell colSpan={3}>TOTAL FOR PERIOD</TableCell><TableCell className="text-right">{summary.total_debit}</TableCell><TableCell className="text-right text-red-500">{summary.total_credit}</TableCell><TableCell></TableCell></TableRow>
                                <TableRow className="bg-gray-200 font-bold"><TableCell colSpan={5}>CLOSING BALANCE as of {toDate ? toDate.toLocaleDateString() : 'N/A'}</TableCell><TableCell className="text-right font-bold">{summary.closing_balance}</TableCell></TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </>
            ) : (
                <Card><CardContent><p className='text-center py-12 text-muted-foreground'>Please select an account and a date range to generate a ledger.</p></CardContent></Card>
            )
           }
        </div>
    );
};

export default GeneralLedgerPage;
