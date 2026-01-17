'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileText, TrendingUp, TrendingDown, Percent, Landmark } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface WhtTransaction {
    id: string;
    date: string;
    customer_name: string;
    invoice_id: string;
    gross_amount: number;
    wht_amount: number;
}

interface IncomeTaxData {
    total_revenue: number;
    total_expenses: number;
    assessable_profit: number;
    company_income_tax: number; // CIT
    education_tax: number; // TET
    total_tax_liability: number;
    wht_credit: number;
    final_tax_payable: number;
    wht_transactions: WhtTransaction[];
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    const formatted = new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const IncomeTaxNGPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState<IncomeTaxData | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date('2026-01-01'));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date('2026-12-31'));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!startDate || !endDate || !user?.company_id) {
            setError("Please select a valid date range and ensure you are logged in.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setData(null);

        const fromDate = format(startDate, 'yyyy-MM-dd');
        const toDate = format(endDate, 'yyyy-MM-dd');
        const url = `https://hariindustries.net/api/clearbook/income-tax-report.php?company_id=${user.company_id}&fromDate=${fromDate}&toDate=${toDate}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const reportData: IncomeTaxData = await response.json();

            if (!reportData || typeof reportData.assessable_profit === 'undefined') {
                throw new Error("Invalid data structure received from server.");
            }
            
            setData(reportData);
            if (reportData.wht_transactions.length === 0) {
                 toast({ title: "No WHT Credits", description: "No Withholding Tax credits were found for the selected period.", variant: 'default' });
            }

        } catch (e: any) {
            setError(`Failed to generate tax report: ${e.message}`);
            toast({ title: "Error Generating Report", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, user, toast]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Income Tax Report (Nigeria 2026)</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Tax Period</CardTitle>
                    <CardDescription>Select the period for which you want to generate the tax report. The default is the 2026 calendar year.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">From Date</label><DatePicker date={startDate} setDate={setStartDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">To Date</label><DatePicker date={endDate} setDate={setEndDate} /></div>
                    <Button onClick={generateReport} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Report
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-4">Calculating taxes...</span></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}

            {data && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Tax Computation Summary</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <TableRow><TableCell className="font-semibold">Total Revenue</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.total_revenue)}</TableCell></TableRow>
                                    <TableRow><TableCell className="font-semibold">Total Allowable Expenses</TableCell><TableCell className="text-right font-mono text-red-600">({formatCurrency(data.total_expenses)})</TableCell></TableRow>
                                    <TableRow className="font-bold text-lg bg-gray-100"><TableCell>Assessable Profit</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.assessable_profit)}</TableCell></TableRow>
                                    <TableRow><TableCell>Company Income Tax (CIT) @ 30%</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.company_income_tax)}</TableCell></TableRow>
                                    <TableRow><TableCell>Tertiary Education Tax (TET) @ 2.5%</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.education_tax)}</TableCell></TableRow>
                                    <TableRow className="font-semibold bg-gray-100"><TableCell>Total Tax Liability</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.total_tax_liability)}</TableCell></TableRow>
                                    <TableRow><TableCell>Less: Withholding Tax (WHT) Credit</TableCell><TableCell className="text-right font-mono text-green-600">({formatCurrency(data.wht_credit)})</TableCell></TableRow>
                                </TableBody>
                                <TableFooter>
                                     <TableRow className="font-extrabold text-xl bg-gray-800 text-white hover:bg-black"><TableCell>NET TAX PAYABLE</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.final_tax_payable)}</TableCell></TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Withholding Tax (WHT) Credits</CardTitle>
                            <CardDescription>This table lists the WHT amounts deducted from your sales by customers, which can be claimed as a credit against your income tax liability.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Invoice Ref</TableHead>
                                        <TableHead className="text-right">Gross Amount</TableHead>
                                        <TableHead className="text-right">WHT Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.wht_transactions.length > 0 ? (
                                        data.wht_transactions.map(tx => (
                                            <TableRow key={tx.id}>
                                                <TableCell>{format(new Date(tx.date), 'yyyy-MM-dd')}</TableCell>
                                                <TableCell>{tx.customer_name}</TableCell>
                                                <TableCell>{tx.invoice_id}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(tx.gross_amount)}</TableCell>
                                                <TableCell className="text-right font-mono text-green-600">{formatCurrency(tx.wht_amount)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No WHT credits found for this period.</TableCell></TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold bg-gray-100">
                                        <TableCell colSpan={4}>Total WHT Credit</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(data.wht_credit)}</TableCell>
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

export default IncomeTaxNGPage;
