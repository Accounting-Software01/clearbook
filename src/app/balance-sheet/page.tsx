
'use client';
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


interface ReportAccount {
    name: string;
    amount: number;
}

interface ReportSection {
    title: string;
    accounts: ReportAccount[];
    total: number;
}

interface BalanceSheetData {
    assets: ReportSection;
    liabilities: ReportSection;
    equity: ReportSection;
    totalLiabilitiesAndEquity: number;
}

interface BackendResponse {
    balances: { [accountId: string]: number };
    periodChanges: { [accountId: string]: number };
}


const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0.00';
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const BalanceSheetPage = () => {
    const [reportData, setReportData] = useState<BalanceSheetData | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!dateRange?.from || !dateRange.to) {
            setError("Please select a date range for the report.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        const url = new URL('https://hariindustries.net/busa-api/database/balance-sheet.php');
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                const errorJson = await response.json().catch(() => ({}));
                throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
            }
            const data: BackendResponse = await response.json();

            if (data.balances && data.periodChanges) {
                const assets: ReportSection = { title: 'Assets', accounts: [], total: 0 };
                const liabilities: ReportSection = { title: 'Liabilities', accounts: [], total: 0 };
                const equity: ReportSection = { title: 'Equity', accounts: [], total: 0 };
                let periodRevenue = 0;
                let periodExpense = 0;

                // Process final balances for Assets, Liabilities, Equity
                for (const accountId in data.balances) {
                    const account = chartOfAccounts.find(acc => acc.code === accountId);
                    if (!account) continue;
                    
                    const balance = data.balances[accountId];

                    switch (account.type) {
                        case 'Asset':
                            assets.accounts.push({ name: account.name, amount: balance });
                            assets.total += balance;
                            break;
                        case 'Liability':
                            liabilities.accounts.push({ name: account.name, amount: -balance });
                            liabilities.total -= balance;
                            break;
                        case 'Equity':
                             equity.accounts.push({ name: account.name, amount: -balance });
                             equity.total -= balance;
                            break;
                    }
                }
                
                // Calculate net profit for the selected period
                for (const accountId in data.periodChanges) {
                    const account = chartOfAccounts.find(acc => acc.code === accountId);
                    if (!account) continue;

                    const periodChange = data.periodChanges[accountId];

                     switch (account.type) {
                        case 'Revenue':
                            periodRevenue += periodChange;
                            break;
                        case 'Expense':
                            // periodChange is (credit-debit), so it's already negative for expenses
                            periodExpense += periodChange;
                            break;
                    }
                }

                const netProfitForPeriod = periodRevenue + periodExpense; // expense is negative
                equity.accounts.push({ name: 'Current Period Net Profit', amount: netProfitForPeriod });
                equity.total += netProfitForPeriod;

                setReportData({
                    assets,
                    liabilities,
                    equity,
                    totalLiabilitiesAndEquity: liabilities.total + equity.total,
                });
            } else {
                 throw new Error("Invalid data format received from server.");
            }
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            setReportData(null);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    const chartData = reportData ? [
        { name: 'Balance Sheet', Assets: reportData.assets.total, Liabilities: reportData.liabilities.total, Equity: reportData.equity.total },
    ] : [];


  return (
    <div className="container mx-auto p-4 md:p-8">
        <Card className="max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>
                    Generate a balance sheet to see a snapshot of your company's financial health as of a specific date.
                </CardDescription>
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
                    <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>
                ) : reportData ? (
                    <div className="space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Financial Position</CardTitle>
                            </CardHeader>
                            <CardContent className="h-60">
                                <ChartContainer config={{}} className="w-full h-full">
                                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" hide />
                                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                        <Legend />
                                        <Bar dataKey="Assets" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="Liabilities" stackId="b" fill="hsl(var(--chart-2))" />
                                        <Bar dataKey="Equity" stackId="b" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        <div className="border rounded-lg p-4">
                            <h3 className="text-lg font-bold text-center">Balance Sheet</h3>
                            <p className="text-center text-muted-foreground mb-6">
                                As of {dateRange?.to ? format(dateRange.to, 'LLL dd, y') : ''}
                            </p>
                            
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Assets Section */}
                                    <TableRow className="font-bold bg-muted/30">
                                        <TableCell>{reportData.assets.title}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    {reportData.assets.accounts.map(acc => (
                                        <TableRow key={acc.name}>
                                            <TableCell className="pl-8">{acc.name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-bold text-lg">
                                        <TableCell className="pl-4">Total Assets</TableCell>
                                        <TableCell className="text-right font-mono border-t-2 border-b-4 border-primary/50">{formatCurrency(reportData.assets.total)}</TableCell>
                                    </TableRow>
                                    
                                    {/* Spacer Row */}
                                    <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>

                                    {/* Liabilities Section */}
                                    <TableRow className="font-bold bg-muted/30">
                                        <TableCell>{reportData.liabilities.title}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    {reportData.liabilities.accounts.map(acc => (
                                        <TableRow key={acc.name}>
                                            <TableCell className="pl-8">{acc.name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                     <TableRow className="font-semibold">
                                        <TableCell className="pl-4">Total Liabilities</TableCell>
                                        <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.liabilities.total)}</TableCell>
                                    </TableRow>

                                    {/* Equity Section */}
                                    <TableRow className="font-bold bg-muted/30 mt-4">
                                        <TableCell>{reportData.equity.title}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    {reportData.equity.accounts.map(acc => (
                                        <TableRow key={acc.name}>
                                            <TableCell className="pl-8">{acc.name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-semibold">
                                        <TableCell className="pl-4">Total Equity</TableCell>
                                        <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.equity.total)}</TableCell>
                                    </TableRow>

                                </TableBody>
                                 <TableFooter>
                                    <TableRow className="font-bold text-lg">
                                        <TableCell>Total Liabilities &amp; Equity</TableCell>
                                        <TableCell className="text-right font-mono border-t-2 border-b-4 border-primary/50">{formatCurrency(reportData.totalLiabilitiesAndEquity)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </div>
                ) : (
                     <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to see the balance sheet.</p></div>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default BalanceSheetPage;
