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
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import type { DateRange } from 'react-day-picker';
import { useUser } from '@/contexts/UserContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Raw data structure from the new, lean backend
interface AccountBalance {
    accountId: string;
    openingBalance: number;
    closingBalance: number;
}

// Interfaces for the structured data required by the UI
interface CashFlowItem {
    description: string;
    amount: number;
}

interface CashFlowSection {
    title: string;
    items: CashFlowItem[];
    total: number;
}

interface CashFlowData {
    operating: CashFlowSection;
    investing: CashFlowSection;
    financing: CashFlowSection;
    openingBalance: number;
    closingBalance: number;
    netCashFlow: number;
}

// Helper to identify account subtypes for cash flow classification
const getAccountSubtype = (code: string) => {
    if (code.startsWith('1011')) return 'Cash';
    if (code.startsWith('1012') || code.startsWith('1013') || code.startsWith('201')) return 'Current'; // Receivables, Inventory, Payables
    if (code.startsWith('102')) return 'Investing'; // Fixed Assets
    if (code.startsWith('202') || code.startsWith('3')) return 'Financing'; // Long-term Debt & Equity
    return 'Other';
};

const formatCurrency = (amount: number) => {
    const value = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    return amount < 0 ? `(${value})` : value;
};

const CashFlowPage = () => {
    const { user } = useUser();
    const [rawBalances, setRawBalances] = useState<AccountBalance[]>([]);
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

        if (!user?.company_id) {
            setError("Company ID not found. Please log in again.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setRawBalances([]);

        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        const url = new URL('https://hariindustries.net/clearbook/cash-flow.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                const errorJson = await response.json().catch(() => ({}));
                throw new Error(errorJson.error || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();

            // **FIX**: Ensure the data is an array before setting the state.
            if (Array.isArray(data)) {
                setRawBalances(data);
            } else if (data && data.error) {
                throw new Error(data.error);
            } else {
                throw new Error("Invalid data format received from server.");
            }

        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            setRawBalances([]); // Ensure it's an empty array on error
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, user]);

    const reportData: CashFlowData | null = useMemo(() => {
        // **FIX**: Add Array.isArray check to prevent crash if state is not an array.
        if (!Array.isArray(rawBalances) || rawBalances.length === 0) {
            return null;
        }

        let netIncome = 0;
        let openingCash = 0;
        let closingCash = 0;

        const operatingItems: CashFlowItem[] = [];
        const investingItems: CashFlowItem[] = [];
        const financingItems: CashFlowItem[] = [];

        for (const balance of rawBalances) {
            const account = chartOfAccounts.find(acc => acc.code === balance.accountId);
            if (!account) continue;

            const opening = balance.openingBalance;
            const closing = balance.closingBalance;
            const change = closing - opening;

            if (Math.abs(change) < 0.01) continue;

            const accountType = account.type.toLowerCase();
            const accountSubtype = getAccountSubtype(account.code).toLowerCase();

            if (accountSubtype === 'cash') {
                openingCash -= opening;
                closingCash -= closing;
                continue;
            }

            if (accountType === 'revenue' || accountType === 'expense') {
                netIncome += change;
            } else {
                let cashFlowChange = 0;
                if (accountType === 'asset') {
                    cashFlowChange = -change;
                } else { // Liability or Equity
                    cashFlowChange = change;
                }

                const item = { description: `Change in ${account.name}`, amount: cashFlowChange };

                if (accountSubtype === 'current') {
                    operatingItems.push(item);
                } else if (accountSubtype === 'investing') {
                    investingItems.push(item);
                } else if (accountSubtype === 'financing') {
                    financingItems.push(item);
                }
            }
        }

        const operating = {
            title: 'Operating Activities',
            items: [{ description: 'Net Income', amount: netIncome }, ...operatingItems],
            total: netIncome + operatingItems.reduce((sum, item) => sum + item.amount, 0)
        };

        const investing = {
            title: 'Investing Activities',
            items: investingItems,
            total: investingItems.reduce((sum, item) => sum + item.amount, 0)
        };

        const financing = {
            title: 'Financing Activities',
            items: financingItems,
            total: financingItems.reduce((sum, item) => sum + item.amount, 0)
        };

        const netCashFlow = operating.total + investing.total + financing.total;

        return { operating, investing, financing, openingBalance: openingCash, closingBalance: closingCash, netCashFlow };

    }, [rawBalances]);

    const handleExportPdf = useCallback(() => {
        if (!reportData || !user?.company_id || !dateRange?.from || !dateRange?.to) return;

        const doc = new jsPDF();
        const fromDateFmt = format(dateRange.from, 'PPP');
        const toDateFmt = format(dateRange.to, 'PPP');
        
        doc.setFontSize(18);
        doc.text('Cash Flow Statement', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Company: ${user.company_name || user.company_id}`, 14, 30);
        doc.text(`Period: ${fromDateFmt} to ${toDateFmt}`, 14, 36);
        
        const sections = [reportData.operating, reportData.investing, reportData.financing];
        const body: (string | { content: string; styles?: any; colSpan?: number })[][] = [];

        body.push(['Cash at Beginning of Period', { content: formatCurrency(reportData.openingBalance), styles: { halign: 'right' } }]);
        body.push([' ', ' ']); // Spacer

        sections.forEach(section => {
            body.push([{ content: section.title, colSpan: 2, styles: { fontStyle: 'bold'} }]);
            section.items.forEach(item => body.push([`  ${item.description}`, { content: formatCurrency(item.amount), styles: { halign: 'right' }}]));
            body.push([{ content: `Net Cash from ${section.title.split(' ').pop()} Activities`, styles: { fontStyle: 'bold' }}, { content: formatCurrency(section.total), styles: { halign: 'right', fontStyle: 'bold' }}]);
            body.push([' ', ' ']); // Spacer
        });

        body.push([{ content: 'Net Change in Cash', styles: { fontStyle: 'bold' }}, { content: formatCurrency(reportData.netCashFlow), styles: { halign: 'right', fontStyle: 'bold' }}]);
        body.push([{ content: 'Cash at End of Period', styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }, { content: formatCurrency(reportData.closingBalance), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#f1f5f9' } }]);

        autoTable(doc, {
            startY: 42,
            head: [['Description', 'Amount']],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [34, 41, 47] },
        });
        
        doc.save(`Cash-Flow-Statement-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    }, [reportData, dateRange, user]);

    const renderSection = (section: CashFlowSection) => (
        <>
            <TableRow className="font-semibold">
                <TableCell>{section.title}</TableCell>
                <TableCell></TableCell>
            </TableRow>
            {section.items.map((item, index) => (
                <TableRow key={index}>
                    <TableCell className="pl-8">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                </TableRow>
            ))}
            <TableRow>
                <TableCell className="pl-4 font-semibold">{`Net Cash from ${section.title.split(' ').pop()} Activities`}</TableCell>
                <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(section.total)}</TableCell>
            </TableRow>
        </>
    );

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
                <p className="text-muted-foreground">Track the movement of cash from operating, investing, and financing activities.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
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

                <div className="lg:col-span-3">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Cash Flow Statement</CardTitle>
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
                                         <TableRow>
                                            <TableCell className="font-semibold">Cash at Beginning of Period</TableCell>
                                            <TableCell className="text-right font-bold font-mono">{formatCurrency(reportData.openingBalance)}</TableCell>
                                        </TableRow>
                                        
                                        <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>
                                        {renderSection(reportData.operating)}
                                        <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>
                                        {renderSection(reportData.investing)}
                                        <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>
                                        {renderSection(reportData.financing)}
                                        <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>

                                        <TableRow className="font-semibold">
                                            <TableCell>Net Change in Cash</TableCell>
                                            <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(reportData.netCashFlow)}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="font-bold text-lg bg-muted">
                                            <TableCell>Cash at End of Period</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(reportData.closingBalance)}</TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            ) : (
                                <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to see your Cash Flow Statement.</p></div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default CashFlowPage;
