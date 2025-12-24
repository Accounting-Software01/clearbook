'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Loader2, AlertCircle, FileDown } from 'lucide-react';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import type { DateRange } from 'react-day-picker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Reverted interface to work with the currently deployed backend API.
interface BackendBalance {
    accountId: string;
    balance: number;
}

const formatCurrency = (amount: number) => {
    // Using Math.abs() as a safeguard because the backend logic is not ideal.
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
};

const ProfitLossPage = () => {
    const { language } = useLanguage();
    const { user } = useAuth();
    const [reportData, setReportData] = useState<ProfitLossData | null>(null);
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

        if (!user?.company_id) {
            setError("Could not determine your company. Please ensure you are logged in correctly.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setReportData(null);

        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');

        const url = new URL('https://hariindustries.net/busa-api/database/profit-loss.php');
        // The backend script is NOT currently using company_id, which is a security risk.
        url.searchParams.append('company_id', user.company_id);
        if (user.id) {
            url.searchParams.append('user_id', String(user.id));
        }
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
                const costOfSales: ReportSection = { title: 'Cost of Sales', accounts: [], total: 0 };
                const expenses: ReportSection = { title: 'Operating Expenses', accounts: [], total: 0 };

                // Reverted logic to handle the `balance` property from the old API response.
                data.forEach(item => {
                    const account = chartOfAccounts.find(acc => acc.code === item.accountId);
                    if (!account) return;

                    const balance = item.balance; // (credit - debit)

                    if (account.type === 'Revenue') {
                        revenue.accounts.push({ name: account.name, amount: balance });
                        revenue.total += balance;
                    } else if (account.type === 'Cost of Sales') {
                        costOfSales.accounts.push({ name: account.name, amount: -balance });
                        costOfSales.total -= balance;
                    } else if (account.type === 'Expense') {
                        expenses.accounts.push({ name: account.name, amount: -balance });
                        expenses.total -= balance;
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
    }, [dateRange, user]);

    const handleExportPdf = useCallback(() => {
        if (!reportData || !user?.company_id || !dateRange?.from || !dateRange?.to) return;

        const doc = new jsPDF();
        const fromDateFmt = format(dateRange.from, 'PPP');
        const toDateFmt = format(dateRange.to, 'PPP');
        
        doc.setFontSize(18);
        doc.text('Profit and Loss Statement', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Company: ${user.company_name || user.company_id}`, 14, 30);
        doc.text(`Period: ${fromDateFmt} to ${toDateFmt}`, 14, 36);

        const body = [];
        // Revenue
        body.push([{ content: reportData.revenue.title, colSpan: 2, styles: { fontStyle: 'bold'} }]);
        reportData.revenue.accounts.forEach(acc => body.push([`  ${acc.name}`, { content: formatCurrency(acc.amount), styles: { halign: 'right' }}]));
        body.push([{ content: `Total ${reportData.revenue.title}`, styles: { fontStyle: 'bold' }}, { content: formatCurrency(reportData.revenue.total), styles: { halign: 'right', fontStyle: 'bold' }}]);
        body.push([' ', ' ']); // Spacer
        // Cost of Sales
        body.push([{ content: reportData.costOfSales.title, colSpan: 2, styles: { fontStyle: 'bold'} }]);
        reportData.costOfSales.accounts.forEach(acc => body.push([`  ${acc.name}`, { content: formatCurrency(acc.amount), styles: { halign: 'right' }}]));
        body.push([{ content: `Total ${reportData.costOfSales.title}`, styles: { fontStyle: 'bold' }}, { content: formatCurrency(reportData.costOfSales.total), styles: { halign: 'right', fontStyle: 'bold' }}]);
        body.push([' ', ' ']); // Spacer
        // Gross Profit
        body.push([{ content: 'Gross Profit', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }]);
        body[body.length - 1][1] = { content: formatCurrency(reportData.grossProfit), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#f1f5f9' } };
        body.push([' ', ' ']); // Spacer
        // Expenses
        body.push([{ content: reportData.expenses.title, colSpan: 2, styles: { fontStyle: 'bold'} }]);
        reportData.expenses.accounts.forEach(acc => body.push([`  ${acc.name}`, { content: formatCurrency(acc.amount), styles: { halign: 'right' }}]));
        body.push([{ content: `Total ${reportData.expenses.title}`, styles: { fontStyle: 'bold' }}, { content: formatCurrency(reportData.expenses.total), styles: { halign: 'right', fontStyle: 'bold' }}]);
        body.push([' ', ' ']); // Spacer
        // Net Profit
        body.push([{ content: 'Net Profit', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }]);
        body[body.length - 1][1] = { content: formatCurrency(reportData.netProfit), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#f1f5f9' } };


        autoTable(doc, {
            startY: 42,
            head: [['Description', 'Amount']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [34, 41, 47] },
        });
        
        doc.save(`Profit-Loss-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    }, [reportData, dateRange, user]);

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Profit &amp; Loss Statement</h1>
                <p className="text-muted-foreground">Analyze your company's financial performance over a specific period.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* Left Column: Controls */}
                <div className="lg:col-span-2 lg:sticky lg:top-20">
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Options</CardTitle>
                            <CardDescription>Select the period for the report.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="report-date-range" className="font-semibold text-sm">Date Range</label>
                                <DateRangePicker id="report-date-range" date={dateRange} onDateChange={setDateRange} />
                            </div>
                        </CardContent>
                         <CardFooter>
                            <Button onClick={generateReport} disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Generate Report
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: Report Display */}
                <div className="lg:col-span-3">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Profit &amp; Loss Statement</CardTitle>
                                <CardDescription>
                                    {dateRange?.from && dateRange?.to 
                                        ? `For the period from ${format(dateRange.from, 'PPP')} to ${format(dateRange.to, 'PPP')}`
                                        : "Generate a report to get started."}
                                </CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleExportPdf}
                                disabled={!reportData || isLoading}
                            >
                                <FileDown className="mr-2 h-4 w-4"/>
                                Export to PDF
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                            ) : error ? (
                                <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>
                            ) : reportData ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Revenue Section */}
                                        <TableRow className="font-semibold">
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
                                            <TableCell className="pl-4 font-semibold">Total {reportData.revenue.title}</TableCell>
                                            <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.revenue.total)}</TableCell>
                                        </TableRow>

                                        {/* Cost of Sales Section */}
                                         <TableRow className="font-semibold">
                                            <TableCell>{reportData.costOfSales.title}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                        {reportData.costOfSales.accounts.map(acc => (
                                            <TableRow key={acc.name}>
                                                <TableCell className="pl-8">{acc.name}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell className="pl-4 font-semibold">Total {reportData.costOfSales.title}</TableCell>
                                            <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.costOfSales.total)}</TableCell>
                                        </TableRow>

                                        {/* Gross Profit */}
                                        <TableRow className="font-bold text-md bg-muted">
                                            <TableCell>Gross Profit</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(reportData.grossProfit)}</TableCell>
                                        </TableRow>

                                        {/* Expenses Section */}
                                        <TableRow className="font-semibold">
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
                                            <TableCell className="pl-4 font-semibold">Total {reportData.expenses.title}</TableCell>
                                            <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.expenses.total)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="font-bold text-lg bg-primary/10">
                                            <TableCell>Net Profit</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(reportData.netProfit)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            ) : (
                                <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to see the Profit & Loss Statement.</p></div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default ProfitLossPage;
