'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileText, Download, Printer, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Interfaces
interface GLAccount {
    id: number;
    account_code: string;
    account_name: string;
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

const fetcher = (url: string) => fetch(url).then(res => res.json());

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    const formatted = new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const AccountStatementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const { data: accountsResponse, error: accountsError, isLoading: isAccountsLoading } = useSWR(
        user?.company_id ? `https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${user.company_id}` : null,
        fetcher
    );
    
    const [selectedAccount, setSelectedAccount] = useState<string | undefined>();
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    
    const [data, setData] = useState<StatementData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chartData, setChartData] = useState<{ date: string; balance: number }[]>([]);


    const accounts: GLAccount[] = accountsResponse || [];

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
            
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || "An API error occurred.");
            }
            
            setData(result.statement);
            let balance = result.statement.openingBalance;
            const trendData = result.statement.transactions.map((tx: Transaction) => {
                balance += (tx.debit - tx.credit);
                return { date: tx.date, balance: balance };
            });
            // Add opening balance as the first point for a complete trend
            setChartData([
                { date: format(startDate, 'yyyy-MM-dd'), balance: result.statement.openingBalance },
                ...trendData
            ]);

            if (result.statement.transactions.length === 0) {
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
        let currentBalance = data.openingBalance;
        return data.transactions.map(tx => {
            currentBalance += (tx.debit - tx.credit);
            return currentBalance;
        });
    }, [data]);

    const handlePrint = () => {
        window.print();
    };

    const handleExport = (formatType: 'excel' | 'pdf') => {
        if (!data || !selectedAccount) return;
        const accountName = accounts.find((a) => a.account_code === selectedAccount)?.account_name || 'Selected Account';
        const title = `Account Statement for ${accountName}`;
        const head = [['Date', 'Description', 'Debit', 'Credit', 'Balance']];
        const body = data.transactions.map((t, i) => [
            t.date,
            t.description,
            t.debit > 0 ? formatCurrency(t.debit) : '-',
            t.credit > 0 ? formatCurrency(t.credit) : '-',
            formatCurrency(runningBalance[i])
        ]);

        if (formatType === 'pdf') {
            const doc = new jsPDF();
            doc.text(title, 14, 15);
            (doc as any).autoTable({
                startY: 25,
                head: head,
                body: [
                    [{content: 'Opening Balance', colSpan: 4, styles: { fontStyle: 'bold'}}, {content: formatCurrency(data.openingBalance), styles: { halign: 'right', fontStyle: 'bold' }}],
                    ...body,
                    [{content: 'Closing Balance', colSpan: 4, styles: { fontStyle: 'bold'}}, {content: formatCurrency(data.closingBalance), styles: { halign: 'right', fontStyle: 'bold' }}]
                ],
                theme: 'striped'
            });
            doc.save(`${accountName}_Statement.pdf`);
        } else {
            const ws = XLSX.utils.aoa_to_sheet([
                [title],
                [`Period: ${format(startDate!, 'MMM dd, yyyy')} to ${format(endDate!, 'MMM dd, yyyy')}`],
                [],
                ['', '', '', 'Opening Balance', formatCurrency(data.openingBalance)],
                ...head,
                ...body,
                ['', '', '', 'Closing Balance', formatCurrency(data.closingBalance)]
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Account Statement');
            XLSX.writeFile(wb, `${accountName}_Statement.xlsx`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight flex items-center"><ClipboardList className="mr-3 h-8 w-8"/> Account Statement</h1>
                {data && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleExport('excel')}><Download className="mr-2 h-4 w-4" />Excel</Button>
                        <Button variant="outline" onClick={() => handleExport('pdf')}><FileText className="mr-2 h-4 w-4" />PDF</Button>
                        <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
                    </div>
                )}
            </div>
            
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
                                {accountsError && <SelectItem value="error" disabled>Failed to load accounts</SelectItem>}
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.account_code} value={acc.account_code}>
                                        {acc.account_name}
                                    </SelectItem>
                                ))}
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
                <div className="space-y-6">
                    {/* NEW: Trend Chart Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Balance Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] w-full">
                            <ResponsiveContainer>
                                <ChartContainer config={{}}>
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM d')} />
                                        <YAxis width={80} tickFormatter={(val) => `₦${(val/1000).toFixed(0)}k`} />
                                        <ChartTooltip 
                                            cursor={false}
                                            content={<ChartTooltipContent 
                                                labelFormatter={(label) => format(new Date(label), 'MMM dd, yyyy')}
                                                formatter={(value) => formatCurrency(value as number)} 
                                            />} 
                                        />
                                        <Area type="monotone" dataKey="balance" stroke="#2563eb" fill="#bfdbfe" />
                                    </AreaChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Existing Statement Details Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Statement for: {accounts.find((a) => a.account_code === selectedAccount!)?.account_name}</CardTitle>
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
                                    <TableRow className="font-extrabold text-lg bg-gray-50">
                                        <TableCell colSpan={4}>Closing Balance</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(data.closingBalance)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AccountStatementPage;
