
'use client';
import React, { useState, useCallback } from 'react';
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
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
    const [reportDate, setReportDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!reportDate) {
            setError("Please select a date for the report.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        const asOfDate = format(reportDate, 'yyyy-MM-dd');
        
        const url = new URL('https://hariindustries.net/busa-api/database/trial-balance.php');
        url.searchParams.append('asOfDate', asOfDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                const errorJson = await response.json().catch(() => ({}));
                throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            setReportData(data);
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            setReportData([]);
        } finally {
            setIsLoading(false);
        }
    }, [reportDate]);
    
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
    <div className="container mx-auto p-4 md:p-8">
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Trial Balance &amp; Chart of Accounts</CardTitle>
                <CardDescription>
                    View the chart of accounts or generate a trial balance to verify that total debits equal total credits.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Tabs defaultValue="trial-balance">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
                        <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
                    </TabsList>
                    <TabsContent value="trial-balance">
                        <Card>
                            <CardHeader>
                                <CardTitle>Generate Trial Balance</CardTitle>
                                <CardDescription>Select a date to see the balance of all accounts up to that point.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg items-end bg-muted/20">
                                    <div className="md:col-span-2 space-y-2">
                                        <label htmlFor="report-date" className="font-semibold text-sm">As of Date</label>
                                        <DatePicker date={reportDate} onDateChange={setReportDate} id="report-date"/>
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
                                                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-md">
                                                    <CheckCircle className="h-5 w-5" />
                                                    <span className="font-semibold">Balanced</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-md">
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
                     <TabsContent value="chart-of-accounts">
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
            </CardContent>
        </Card>
    </div>
  );
};

export default TrialBalancePage;
