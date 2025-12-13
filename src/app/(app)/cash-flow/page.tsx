
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
  TableRow
} from "@/components/ui/table";
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

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

const formatCurrency = (amount: number | null | undefined, options: { withBrackets?: boolean } = {}) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0.00';
    }
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    
    if (options.withBrackets && amount < 0) {
        return `(${formatted})`;
    }
    
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const CashFlowPage = () => {
    const [reportData, setReportData] = useState<CashFlowData | null>(null);
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
        
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        const url = new URL('https://hariindustries.net/busa-api/database/cash-flow.php');
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);

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
            setReportData(null);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]);

    const renderSection = (section: CashFlowSection) => (
        <>
            <TableRow className="font-semibold bg-muted/30">
                <TableCell colSpan={2}>{section.title}</TableCell>
            </TableRow>
            {section.items.map((item, index) => (
                <TableRow key={index}>
                    <TableCell className="pl-8">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.amount, { withBrackets: true })}</TableCell>
                </TableRow>
            ))}
            <TableRow>
                <TableCell className="pl-4 font-semibold">Net Cash from {section.title.split(' ').pop()} Activities</TableCell>
                <TableCell className="text-right font-bold font-mono border-t">{formatCurrency(section.total, { withBrackets: true })}</TableCell>
            </TableRow>
        </>
    );

    const chartData = reportData ? [
        { name: 'Opening Balance', value: reportData.openingBalance },
        { name: 'Inflows', value: reportData.operating.items.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0) },
        { name: 'Outflows', value: reportData.operating.items.filter(i => i.amount < 0).reduce((sum, i) => sum + i.amount, 0) },
        { name: 'Closing Balance', value: reportData.closingBalance }
      ] : [];

  return (
    <>
        <p className="text-muted-foreground mb-6">Track the movement of cash from operating, investing, and financing activities.</p>
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg items-end bg-card">
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
                <Card className="flex flex-col justify-center items-center h-60 text-destructive bg-card"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></Card>
            ) : reportData ? (
                <div className="space-y-8">
                    <Card className="bg-card">
                         <CardHeader>
                            <CardTitle>Cash Movement</CardTitle>
                         </CardHeader>
                         <CardContent className="h-72">
                            <ChartContainer config={{}} className="w-full h-full">
                                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                                    <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar dataKey="value" radius={4}>
                                        {chartData.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                         </CardContent>
                    </Card>
                    
                    <div className="border rounded-lg p-4 bg-card">
                        <h3 className="text-lg font-bold text-center">Statement of Cash Flows</h3>
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
                                <TableRow>
                                    <TableCell className="font-semibold">Cash at Beginning of Period</TableCell>
                                    <TableCell className="text-right font-bold font-mono">{formatCurrency(reportData.openingBalance)}</TableCell>
                                </TableRow>

                                {renderSection(reportData.operating)}
                                <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>
                                {renderSection(reportData.investing)}
                                 <TableRow><TableCell colSpan={2}>&nbsp;</TableCell></TableRow>
                                {renderSection(reportData.financing)}

                                <TableRow className="font-semibold bg-muted/30">
                                    <TableCell>Net Increase/Decrease in Cash</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(reportData.netCashFlow, { withBrackets: true })}</TableCell>
                                </TableRow>
                                
                                <TableRow className="font-bold text-lg bg-primary/10">
                                    <TableCell>Cash at End of Period</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(reportData.closingBalance)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                <Card className="flex justify-center items-center h-60 text-muted-foreground bg-card"><p>Generate a report to see the cash flow statement.</p></Card>
            )}
        </div>
    </>
  );
};

export default CashFlowPage;