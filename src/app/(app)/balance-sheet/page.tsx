'use client';
import React, { useState, useCallback } from 'react';
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
import { DatePicker } from '@/components/ui/date-picker'; // Changed from DateRangePicker
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileDown } from 'lucide-react';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
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

interface BalanceSheetData {
    assets: ReportSection;
    liabilities: ReportSection;
    equity: ReportSection;
    totalLiabilitiesAndEquity: number;
}

// Simplified interface to match the new, efficient API response
interface BackendBalance {
    accountId: string;
    balance: number; // Net balance (credit - debit)
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const BalanceSheetPage = () => {
    const { user } = useAuth();
    const [reportData, setReportData] = useState<BalanceSheetData | null>(null);
    const [reportDate, setReportDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!reportDate) {
            setError("Please select a date for the report.");
            return;
        }

        if (!user?.company_id) {
            setError("Could not determine your company. Please ensure you are logged in correctly.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setReportData(null);

        const toDate = format(reportDate, 'yyyy-MM-dd');

        const url = new URL('https://hariindustries.net/api/clearbook/balance_sheet.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                const errorJson = await response.json().catch(() => ({}));
                throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
            }
            const data: BackendBalance[] = await response.json();

            if (Array.isArray(data)) {
                const assets: ReportSection = { title: 'Assets', accounts: [], total: 0 };
                const liabilities: ReportSection = { title: 'Liabilities', accounts: [], total: 0 };
                const equity: ReportSection = { title: 'Equity', accounts: [], total: 0 };
                let totalRevenue = 0;
                let totalExpense = 0;

                data.forEach(item => {
                    const account = chartOfAccounts.find(acc => acc.code === item.accountId);
                    if (!account) return;

                    const balance = item.balance; // This is (credit - debit)

                    switch (account.type) {
                        case 'Asset':
                            // Assets have a debit balance, so we invert the sign
                            assets.accounts.push({ name: account.name, amount: -balance });
                            assets.total -= balance;
                            break;
                        case 'Liability':
                            // Liabilities have a credit balance, which is correct
                            liabilities.accounts.push({ name: account.name, amount: balance });
                            liabilities.total += balance;
                            break;
                        case 'Equity':
                            // Equity has a credit balance, which is correct
                            equity.accounts.push({ name: account.name, amount: balance });
                            equity.total += balance;
                            break;
                        case 'Revenue':
                             totalRevenue += balance; // Credit balance
                             break;
                        case 'Expense':
                        case 'Cost of Sales':
                             totalExpense += balance; // Debit balance (negative)
                             break;
                    }
                });

                const retainedEarnings = totalRevenue + totalExpense;
                equity.accounts.push({ name: "Retained Earnings", amount: retainedEarnings });
                equity.total += retainedEarnings;
                
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
    }, [reportDate, user]);

    const handleExportPdf = useCallback(() => {
        if (!reportData || !user?.company_id || !reportDate) return;

        const doc = new jsPDF();
        const toDateFmt = format(reportDate, 'PPP');
        
        doc.setFontSize(18);
        doc.text('Balance Sheet', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Company: ${user.company_name || user.company_id}`, 14, 30);
        doc.text(`As of: ${toDateFmt}`, 14, 36);

        const body = [];
        // Assets
        body.push([{ content: reportData.assets.title, colSpan: 2, styles: { fontStyle: 'bold'} }]);
        reportData.assets.accounts.forEach(acc => body.push([`  ${acc.name}`, { content: formatCurrency(acc.amount), styles: { halign: 'right' }}]));
        body.push([{ content: `Total ${reportData.assets.title}`, styles: { fontStyle: 'bold' }}, { content: formatCurrency(reportData.assets.total), styles: { halign: 'right', fontStyle: 'bold' }}]);
        body.push([' ', ' ']); // Spacer
        // Liabilities
        body.push([{ content: reportData.liabilities.title, colSpan: 2, styles: { fontStyle: 'bold'} }]);
        reportData.liabilities.accounts.forEach(acc => body.push([`  ${acc.name}`, { content: formatCurrency(acc.amount), styles: { halign: 'right' }}]));
        body.push([{ content: `Total ${reportData.liabilities.title}`, styles: { fontStyle: 'bold' }}, { content: formatCurrency(reportData.liabilities.total), styles: { halign: 'right', fontStyle: 'bold' }}]);
         body.push([' ', ' ']); // Spacer
        // Equity
        body.push([{ content: reportData.equity.title, colSpan: 2, styles: { fontStyle: 'bold'} }]);
        reportData.equity.accounts.forEach(acc => body.push([`  ${acc.name}`, { content: formatCurrency(acc.amount), styles: { halign: 'right' }}]));
        body.push([{ content: `Total ${reportData.equity.title}`, styles: { fontStyle: 'bold' }}, { content: formatCurrency(reportData.equity.total), styles: { halign: 'right', fontStyle: 'bold' }}]);
        body.push([' ', ' ']); // Spacer
        // Total L + E
        body.push([{ content: 'Total Liabilities & Equity', colSpan: 2, styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }]);
        body[body.length - 1][1] = { content: formatCurrency(reportData.totalLiabilitiesAndEquity), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#f1f5f9' } };


        autoTable(doc, {
            startY: 42,
            head: [['Description', 'Amount']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [34, 41, 47] },
        });
        
        doc.save(`Balance-Sheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    }, [reportData, reportDate, user]);

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Balance Sheet</h1>
                <p className="text-muted-foreground">Review your company’s financial position at a specific point in time.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* Left Column: Controls */}
                <div className="lg:col-span-2 lg:sticky lg:top-20">
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Options</CardTitle>
                            <CardDescription>Select the date for the report.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="report-date" className="font-semibold text-sm">As of Date</label>
                                <DatePicker id="report-date" date={reportDate} onDateChange={setReportDate} />
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
                                <CardTitle>Balance Sheet</CardTitle>
                                <CardDescription>
                                    {reportDate 
                                        ? `As of ${format(reportDate, 'PPP')}`
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
                                        <TableRow className="font-bold text-md bg-muted">
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
                                            <TableCell className="pl-4">Total {reportData.assets.title}</TableCell>
                                            <TableCell className="text-right font-mono border-t-2 border-b-4">{formatCurrency(reportData.assets.total)}</TableCell>
                                        </TableRow>
                                        
                                        <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>

                                        <TableRow className="font-bold text-md bg-muted">
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
                                            <TableCell className="pl-4">Total {reportData.liabilities.title}</TableCell>
                                            <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.liabilities.total)}</TableCell>
                                        </TableRow>

                                        <TableRow className="font-bold text-md bg-muted mt-4">
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
                                            <TableCell className="pl-4">Total {reportData.equity.title}</TableCell>
                                            <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.equity.total)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                     <TableFooter>
                                        <TableRow className="font-bold text-lg">
                                            <TableCell>Total Liabilities &amp; Equity</TableCell>
                                            <TableCell className="text-right font-mono border-t-2 border-b-4">{formatCurrency(reportData.totalLiabilitiesAndEquity)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            ) : (
                                 <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to see the Balance Sheet.</p></div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default BalanceSheetPage;
