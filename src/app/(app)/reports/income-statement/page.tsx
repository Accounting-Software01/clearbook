'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Loader2, AlertCircle, TrendingUp, ShoppingCart, TrendingDown, ChevronsRight, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Interfaces directly mapping to the new API output
interface ReportAccount {
    id: string;
    name: string;
    amount: number;
    percentage: number;
}

interface ReportSection {
    accounts: ReportAccount[];
    total: number;
    totalPercentage: number;
}

interface ProcessedData {
    revenue: ReportSection;
    costOfGoodsSold: ReportSection;
    grossProfit: { amount: number, percentage: number };
    expenses: ReportSection;
    netIncome: { amount: number, percentage: number };
    summary: {
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
    }
}

// Helper to format currency values
const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '0.00';
    }
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const IncomeStatementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!startDate || !endDate) {
            toast({ title: "Date Range Missing", description: "Please select a start and end date.", variant: 'destructive'});
            return;
        }
        if (!user?.company_id) {
            toast({ title: "Company not loaded", description: "Please wait and try again.", variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData(null);
        
        const fromDate = format(startDate, 'yyyy-MM-dd');
        const toDate = format(endDate, 'yyyy-MM-dd');
        // Point to the new, correct endpoint
        const url = new URL('https://hariindustries.net/api/clearbook/income-statement.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            // The backend now does all the processing. We just set the state.
            if (data.success && data.processedData) {
                if (data.processedData.summary.totalRevenue === 0 && data.processedData.summary.totalExpenses === 0) {
                    toast({ title: "No Data", description: "No transactions for the selected period.", variant: 'default' });
                }
                setProcessedData(data.processedData);
            } else {
                throw new Error(data.message || "Invalid data format received from server.");
            }
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            toast({ title: "Error Generating Report", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, user, toast]);

    // Automatically generate the report when the component loads or dates change.
    useEffect(() => {
        if (user?.company_id) {
            generateReport();
        }
    }, [user, generateReport]);

    const renderSection = (title: string, section: ReportSection, icon: React.ReactNode) => (
        <>
            <TableRow className="font-bold text-lg bg-gray-100 hover:bg-gray-100">
                <TableCell className="flex items-center">{icon} {title}</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
            </TableRow>
            {section.accounts.map(acc => (
                <TableRow key={acc.id}>
                    <TableCell className="pl-10">{acc.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                    <TableCell className="text-right font-mono">{acc.percentage.toFixed(1)}%</TableCell>
                </TableRow>
            ))}
            <TableRow className="font-bold bg-gray-200 hover:bg-gray-200">
                <TableCell>Total {title}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(section.total)}</TableCell>
                <TableCell className="text-right font-mono">{section.totalPercentage.toFixed(1)}%</TableCell>
            </TableRow>
        </>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Income Statement</h1>
            
             <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">From Date</label><DatePicker date={startDate} setDate={setStartDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">To Date</label><DatePicker date={endDate} setDate={setEndDate} /></div>
                    <Button onClick={generateReport} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Generate Report</Button>
                    <Button variant="outline">Export Excel</Button>
                    <Button variant="destructive">Export PDF</Button>
                </CardContent>
            </Card>

            {processedData && (
                 <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                            <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{formatCurrency(processedData.summary.totalRevenue)}</p></div>
                            <div><p className="text-sm text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">{formatCurrency(processedData.summary.totalExpenses)}</p></div>
                            <div><p className="text-sm text-muted-foreground">Net Income</p><p className="text-2xl font-bold text-primary">{formatCurrency(processedData.summary.netIncome)}</p></div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {isLoading ? (
                <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : error ? (
                <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>
            ) : processedData ? (
                <Card>
                    <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead className="w-2/3">Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">% Revenue</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {renderSection('REVENUE', processedData.revenue, <TrendingUp className="h-5 w-5 mr-2" />)}
                            {renderSection('COST OF GOODS SOLD', processedData.costOfGoodsSold, <ShoppingCart className="h-5 w-5 mr-2" />)}
                            <TableRow className="font-extrabold bg-green-100 hover:bg-green-100 text-lg">
                                <TableCell className="flex items-center"><ChevronsRight className="h-5 w-5 mr-2" /> GROSS PROFIT</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(processedData.grossProfit.amount)}</TableCell>
                                <TableCell className="text-right font-mono">{processedData.grossProfit.percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                            {renderSection('OPERATING EXPENSES', processedData.expenses, <TrendingDown className="h-5 w-5 mr-2" />)}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="font-extrabold bg-gray-800 text-white hover:bg-black text-xl">
                                <TableCell className="flex items-center"><Target className="h-5 w-5 mr-2" /> NET INCOME</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(processedData.netIncome.amount)}</TableCell>
                                <TableCell className="text-right font-mono">{processedData.netIncome.percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to view the Income Statement.</p></div>
            )}
        </div>
    );
};

export default IncomeStatementPage;
