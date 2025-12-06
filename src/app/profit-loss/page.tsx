
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
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
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

interface ProfitLossData {
    revenue: ReportSection;
    costOfSales: ReportSection;
    expenses: ReportSection;
    grossProfit: number;
    netProfit: number;
}

interface BackendBalance {
    accountId: string;
    balance: number;
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

const ProfitLossPage = () => {
    const [reportData, setReportData] = useState<ProfitLossData | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to) {
            setError("Please select a valid date range.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setReportData(null);
        
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        const url = new URL('https://hariindustries.net/busa-api/database/profit-loss.php');
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
                const revenue: ReportSection = { title: 'Revenue', accounts: [], total: 0 };
                const expenses: ReportSection = { title: 'Operating Expenses', accounts: [], total: 0 };
                const costOfSales: ReportSection = { title: 'Cost of Sales', accounts: [], total: 0 };


                data.forEach(item => {
                    const account = chartOfAccounts.find(acc => acc.code === item.accountId);
                    if (!account) return;

                    const balance = item.balance; // This is (credit - debit) from the backend

                    if (account.type === 'Revenue') {
                        // Revenue has a credit balance, so backend value is positive.
                        revenue.accounts.push({ name: account.name, amount: balance });
                        revenue.total += balance;
                    } else if (account.type === 'Expense') {
                        // Expenses have debit balances, so backend value is negative. Flip sign for reporting.
                        const amount = -balance;
                        expenses.accounts.push({ name: account.name, amount: amount });
                        expenses.total += amount;
                    }
                });

                const grossProfit = revenue.total - costOfSales.total;
                const netProfit = grossProfit - expenses.total;

                setReportData({
                    revenue,
                    costOfSales,
                    expenses,
                    grossProfit,
                    netProfit
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
        { name: 'Profit & Loss', Revenue: reportData.revenue.total, Expenses: reportData.expenses.total, Profit: reportData.netProfit },
    ] : [];

  return (
    <div className="container mx-auto p-4 md:p-8">
        <Card className="max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle>Profit &amp; Loss Statement</CardTitle>
                <CardDescription>
                    Generate an income statement to see your business's financial performance over a specific period.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg items-end bg-muted/20">
                    <div className="md:col-span-2 space-y-2">
                        <label htmlFor="date-range" className="font-semibold text-sm">Date Range</label>
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} id="date-range"/>
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
                                <CardTitle>Performance Overview</CardTitle>
                             </CardHeader>
                             <CardContent className="h-60">
                                <ChartContainer config={{}} className="w-full h-full">
                                    <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                        <Legend />
                                        <Bar dataKey="Revenue" fill="hsl(var(--chart-2))" radius={4} />
                                        <Bar dataKey="Expenses" fill="hsl(var(--chart-5))" radius={4} />
                                    </BarChart>
                                </ChartContainer>
                             </CardContent>
                        </Card>

                        <div className="border rounded-lg p-4">
                            <h3 className="text-lg font-bold text-center">Profit &amp; Loss Statement</h3>
                            <p className="text-center text-muted-foreground mb-6">
                                For the period from {dateRange?.from ? format(dateRange.from, 'LLL dd, y') : ''} to {dateRange?.to ? format(dateRange.to, 'LLL dd, y') : ''}
                            </p>
                            
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Revenue Section */}
                                    <TableRow className="font-semibold bg-muted/30">
                                        <TableCell>{reportData.revenue.title}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    {reportData.revenue.accounts.map(acc => (
                                        <TableRow key={acc.name}>
                                            <TableCell className="pl-8">{acc.name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="pl-4 font-semibold">Total Revenue</TableCell>
                                        <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.revenue.total)}</TableCell>
                                    </TableRow>

                                     {/* Gross Profit */}
                                    <TableRow className="font-bold text-lg bg-secondary/50">
                                        <TableCell>Gross Profit</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(reportData.grossProfit)}</TableCell>
                                    </TableRow>

                                    {/* Expenses Section */}
                                    <TableRow className="font-semibold bg-muted/30">
                                        <TableCell>{reportData.expenses.title}</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                    {reportData.expenses.accounts.map(acc => (
                                        <TableRow key={acc.name}>
                                            <TableCell className="pl-8">{acc.name}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="pl-4 font-semibold">Total Operating Expenses</TableCell>
                                        <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.expenses.total)}</TableCell>
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold text-xl bg-primary/10">
                                        <TableCell>Net Profit</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(reportData.netProfit)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to see the Profit &amp; Loss statement.</p></div>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default ProfitLossPage;
