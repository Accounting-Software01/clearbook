'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileText, Download, Printer, TrendingDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Interfaces
interface ExpenseCategory {
    name: string;
    amount: number;
    subAccounts: { name: string; amount: number }[];
}

interface ProcessedExpenseData {
    categories: ExpenseCategory[];
    totalExpenses: number;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

// Reusable colors for the pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d', '#4dff4d', '#4d4dff'];

const ExpenseAnalysisPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState<ProcessedExpenseData | null>(null);
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processData = (apiData: any): ProcessedExpenseData => {
        const expenseData = apiData.processedData?.expenses;
        if (!expenseData) return { categories: [], totalExpenses: 0 };

        return {
            categories: expenseData.subGroups.map((group: any) => ({
                name: group.groupName,
                amount: group.total,
                subAccounts: group.accounts.map((acc: any) => ({ name: acc.accountName, amount: acc.balance }))
            })),
            totalExpenses: expenseData.total,
        };
    };

    const generateReport = useCallback(async () => {
        if (!fromDate || !toDate || !user?.company_id) {
            setError("Please select valid dates and ensure you are logged in.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setData(null);

        const formatDateStr = (d: Date) => format(d, 'yyyy-MM-dd');
        const url = `https://hariindustries.net/api/clearbook/income-statement.php?company_id=${user.company_id}&fromDate=${formatDateStr(fromDate)}&toDate=${formatDateStr(toDate)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
            
            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'Failed to fetch expense data.');

            const processedData = processData(result);
            setData(processedData);

        } catch (e: any) {
            setError(`Failed to generate report: ${e.message}`);
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [fromDate, toDate, user, toast]);

    const handleExport = (format: 'excel' | 'pdf') => {
        if (!data) return;
        const head = [['Category', 'Sub-Account', 'Amount']];
        const body = data.categories.flatMap(cat => 
            cat.subAccounts.map(sub => [cat.name, sub.name, formatCurrency(sub.amount)])
        );
        body.push(['', 'TOTAL EXPENSES', formatCurrency(data.totalExpenses)]);

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text("Expense Analysis Report", 14, 15);
            (doc as any).autoTable({ startY: 20, head, body, theme: 'striped' });
            doc.save('Expense_Analysis.pdf');
        } else {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([['Expense Analysis Report'], [], ...head, ...body]);
            XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
            XLSX.writeFile(wb, 'Expense_Analysis.xlsx');
        }
    };

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.categories.map(cat => ({ name: cat.name, value: cat.amount, fill: '' })).sort((a,b) => b.value - a.value)
          .map((item, index) => ({...item, fill: COLORS[index % COLORS.length]}));
    }, [data]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Expense Analysis</h1>
                {data && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleExport('excel')}><Download className="mr-2 h-4 w-4" />Excel</Button>
                        <Button variant="outline" onClick={() => handleExport('pdf')}><Printer className="mr-2 h-4 w-4" />PDF</Button>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader><CardTitle>Report Controls</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2"><label>From</label><DatePicker date={fromDate} setDate={setFromDate} /></div>
                    <div className="space-y-2"><label>To</label><DatePicker date={toDate} setDate={setToDate} /></div>
                    <Button onClick={generateReport} disabled={isLoading} className="w-full col-span-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Report
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>}
            {error && <div className="text-center py-12 text-destructive"><AlertCircle className="h-8 w-8 mx-auto mb-2" /><p>{error}</p></div>}

            {data && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Expense Overview</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <span className="text-sm text-muted-foreground">Total Expenses</span>
                                <span className="text-4xl font-bold">{formatCurrency(data.totalExpenses)}</span>
                                <TrendingDown className="text-destructive h-8 w-8" />
                            </div>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} />
                                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Sub-Account</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.categories.length > 0 ? (
                                        data.categories.map((category, index) => (
                                            <React.Fragment key={index}>
                                                {category.subAccounts.map((sub, subIndex) => (
                                                    <TableRow key={`${index}-${subIndex}`}>
                                                        {subIndex === 0 && <TableCell rowSpan={category.subAccounts.length} className="font-semibold align-top">{category.name}</TableCell>}
                                                        <TableCell>{sub.name}</TableCell>
                                                        <TableCell className="text-right">{formatCurrency(sub.amount)}</TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="bg-secondary/50 font-bold">
                                                    <TableCell colSpan={2}>Total for {category.name}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(category.amount)}</TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={3} className="text-center">No expense data for this period.</TableCell></TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="text-lg font-bold">
                                        <TableCell colSpan={2}>Total Expenses</TableCell>
                                        <TableCell className="text-right">{formatCurrency(data.totalExpenses)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!isLoading && !data && !error && <div className="text-center py-12 text-muted-foreground">Generate a report to see the expense analysis.</div>}
        </div>
    );
};

export default ExpenseAnalysisPage;
