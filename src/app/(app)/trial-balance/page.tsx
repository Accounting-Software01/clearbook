
'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from 'react-day-picker';

interface BackendBalance {
    accountId: string;
    debit: number;
    credit: number;
}

interface TrialBalanceEntry {
    accountId: string;
    accountName: string;
    debit: number | null;
    credit: number | null;
}

const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '-';
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const TrialBalancePage = () => {
    const [reportData, setReportData] = useState<TrialBalanceEntry[]>([]);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to) {
            setError("Please select a valid date range for the report.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        const url = new URL('https://hariindustries.net/busa-api/database/trial-balance.php');
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                const errorJson = await response.json().catch(() => ({}));
                throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
            }
            const data: BackendBalance[] = await response.json();

            if (Array.isArray(data)) {
                 const formattedData = data.map(backendEntry => {
                    const account = chartOfAccounts.find(acc => acc.code === backendEntry.accountId);
                    if (!account) return null;

                    return {
                        accountId: account.code,
                        accountName: account.name,
                        debit: backendEntry.debit > 0 ? backendEntry.debit : null,
                        credit: backendEntry.credit > 0 ? backendEntry.credit : null,
                    };
                }).filter((entry): entry is TrialBalanceEntry => entry !== null);

                setReportData(formattedData);
            } else {
                 throw new Error("Invalid data format received from server.");
            }

        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            setReportData([]);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);
    
    const { totalDebits, totalCredits, isBalanced } = React.useMemo(() => {
        const debits = reportData.reduce((acc, entry) => acc + (entry.debit || 0), 0);
        const credits = reportData.reduce((acc, entry) => acc + (entry.credit || 0), 0);
        return {
            totalDebits: debits,
            totalCredits: credits,
            isBalanced: Math.abs(debits - credits) < 0.01 && debits > 0
        };
    }, [reportData]);

  return (
    <>
        <p className="text-muted-foreground mb-6">Verify account balances and browse the complete chart of accounts.</p>
        <div className="space-y-6">
            <Tabs defaultValue="trial-balance">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
                    <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
                </TabsList>
                <TabsContent value="trial-balance" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Trial Balance</CardTitle>
                            <CardDescription>Select a date range to see the movement of all accounts in that period.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg items-end bg-muted/20">
                                <div className="md:col-span-2 space-y-2">
                                    <label htmlFor="report-date-range" className="font-semibold text-sm">Date Range</label>
                                    <DateRangePicker date={dateRange} onDateChange={setDateRange} id="report-date-range"/>
                                </div>
                                <Button onClick={generateReport} disabled={isLoading} className="w-full">
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Generate Report
                                </Button>
                            </div>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            ) : error ? (
                                <div className="flex flex-col justify-center items-center h-40 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>
                            ) : reportData.length > 0 ? (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-1/4">Account Code</TableHead>
                                                <TableHead className="w-1/2">Account Name</TableHead>
                                                <TableHead className="text-right">Debit</TableHead>
                                                <TableHead className="text-right">Credit</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reportData.map((entry) => (
                                                <TableRow key={entry.accountId}>
                                                    <TableCell>{entry.accountId}</TableCell>
                                                    <TableCell>{entry.accountName}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(entry.debit)}</TableCell>
                                                    <TableCell className="text-right font-mono">{formatCurrency(entry.credit)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-right font-bold">Totals</TableCell>
                                                <TableCell className="text-right font-bold font-mono">{formatCurrency(totalDebits)}</TableCell>
                                                <TableCell className="text-right font-bold font-mono">{formatCurrency(totalCredits)}</TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                    <div className="mt-4 flex justify-end">
                                        {isBalanced ? (
                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
                                                <CheckCircle className="h-5 w-5" />
                                                <span className="font-semibold">Balanced</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
                                                <AlertTriangle className="h-5 w-5" />
                                                <span className="font-semibold">Not Balanced</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                 <div className="flex justify-center items-center h-40 text-muted-foreground"><p>Generate a report to see the trial balance.</p></div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="chart-of-accounts" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Chart of Accounts</CardTitle>
                            <CardDescription>A complete list of all accounts in the general ledger.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[600px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Type</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {chartOfAccounts.map((account) => (
                                            <TableRow key={account.code}>
                                                <TableCell className="font-mono">{account.code}</TableCell>
                                                <TableCell>{account.name}</TableCell>
                                                <TableCell><span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">{account.type}</span></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    </>
  );
};

export default TrialBalancePage;
