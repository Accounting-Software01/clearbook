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
import { Loader2, AlertCircle, AlertTriangle, CheckCircle, FileDown } from 'lucide-react';
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DateRange } from 'react-day-picker';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BackendBalance {
    accountId: string;
    accountName: string;
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
    const { language } = useLanguage();
    const { user } = useAuth();
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
        
        if (!user?.company_id) {
            setError("Could not determine your company. Please ensure you are logged in correctly.");
            return;
        }

        setIsLoading(true);
        setError(null);
        
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        const url = new URL('https://hariindustries.net/busa-api/database/trial-balance.php');
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
                const accountNameMap = new Map(chartOfAccounts.map(account => [account.code, account.name]));
                const formattedData = data.map(entry => ({
                    accountId: entry.accountId,
                    accountName: accountNameMap.get(entry.accountId) || entry.accountName,
                    debit: entry.debit > 0 ? entry.debit : null,
                    credit: entry.credit > 0 ? entry.credit : null,
                }));
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
    }, [dateRange, user]);
    
    const { totalDebits, totalCredits, isBalanced } = React.useMemo(() => {
        const debits = reportData.reduce((acc, entry) => acc + (entry.debit || 0), 0);
        const credits = reportData.reduce((acc, entry) => acc + (entry.credit || 0), 0);
        return {
            totalDebits: debits,
            totalCredits: credits,
            isBalanced: Math.abs(debits - credits) < 0.01 && debits > 0
        };
    }, [reportData]);

    const handleExportPdf = useCallback(() => {
        if (!reportData.length || !user?.company_id) return;

        const doc = new jsPDF();
        const fromDateFmt = dateRange?.from ? format(dateRange.from, 'PPP') : 'N/A';
        const toDateFmt = dateRange?.to ? format(dateRange.to, 'PPP') : 'N/A';
        
        // Title
        doc.setFontSize(18);
        doc.text('Trial Balance', 14, 22);

        // Sub-header info
        doc.setFontSize(11);
        doc.setTextColor(100);
        // Assuming company_name is available on the user object. If not, fallback to company_id.
        doc.text(`Company: ${user.company_name || user.company_id}`, 14, 30);
        doc.text(`Period: ${fromDateFmt} to ${toDateFmt}`, 14, 36);

        // Table
        autoTable(doc, {
            startY: 42,
            head: [['Account Code', 'Account Name', 'Debit', 'Credit']],
            body: reportData.map(entry => [
                entry.accountId,
                entry.accountName,
                { content: formatCurrency(entry.debit), styles: { halign: 'right' } },
                { content: formatCurrency(entry.credit), styles: { halign: 'right' } },
            ]),
            foot: [[
                { content: 'Totals', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: formatCurrency(totalDebits), styles: { halign: 'right', fontStyle: 'bold' } },
                { content: formatCurrency(totalCredits), styles: { halign: 'right', fontStyle: 'bold' } },
            ]],
            theme: 'grid',
            headStyles: { fillColor: [34, 41, 47] },
            footStyles: { fillColor: [244, 244, 245], textColor: [34, 41, 47] },
        });
        
        doc.save(`Trial-Balance-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    }, [reportData, dateRange, totalDebits, totalCredits, user]);

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Financial Reports</h1>
                <p className="text-muted-foreground">Generate key financial statements and review company accounts.</p>
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
                    <Tabs defaultValue="trial-balance">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="trial-balance">{language.trialBalance}</TabsTrigger>
                            <TabsTrigger value="chart-of-accounts">{language.chartOfAccounts}</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="trial-balance" className="mt-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>{language.trialBalance}</CardTitle>
                                        <CardDescription>
                                            {dateRange?.from && dateRange?.to 
                                                ? `For the period from ${format(dateRange.from, 'PPP')} to ${format(dateRange.to, 'PPP')}`
                                                : "Generate a report to see the trial balance."}
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleExportPdf}
                                        disabled={reportData.length === 0 || isLoading}
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
                                    ) : reportData.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[120px]">Account Code</TableHead>
                                                    <TableHead>Account Name</TableHead>
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
                                    ) : (
                                        <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to see the trial balance.</p></div>
                                    )}
                                </CardContent>
                                {reportData.length > 0 && (
                                    <CardFooter className="flex justify-end">
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
                                    </CardFooter>
                                )}
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="chart-of-accounts" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{language.chartOfAccounts}</CardTitle>
                                    <CardDescription>A complete list of all accounts in the general ledger.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="max-h-[600px] overflow-y-auto relative">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-background z-10">
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
            </div>
        </>
    );
};

export default TrialBalancePage;