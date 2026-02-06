'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Loader2, FileSpreadsheet, TrendingDown, TrendingUp, Package, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays } from 'date-fns';

interface MaterialFlowReportData {
    order_id: string;
    order_date: string;
    bom_name: string;
    output_item_name: string;
    output_planned_good: number;
    output_actual_good: number;
    output_defective: number;
    value_of_loss: number;
    yield_percentage: number;
    inputs_consumed: { component_name: string; quantity_consumed: number; unit_of_measure: string; }[];
}

interface ReportSummary {
    totalValueLoss: number;
    totalGoodOutput: number;
    totalDefectiveOutput: number;
    overallYield: number;
}

const PetMaterialFlowReportPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [reportData, setReportData] = useState<MaterialFlowReportData[]>([]);
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(value);
    };

    const fetchReportData = useCallback(async () => {
        if (!user?.company_id || !startDate || !endDate) {
            toast({ title: "Missing Information", description: "Company ID or date range is not set.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setReportData([]);
        setSummary(null);
        try {
            const params = new URLSearchParams({ company_id: user.company_id, start_date: startDate, end_date: endDate });
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-pet-material-flow-report.php?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "An unknown error occurred.");
            
            setReportData(data);

            if (data.length > 0) {
                const totalLoss = data.reduce((acc: number, row: MaterialFlowReportData) => acc + row.value_of_loss, 0);
                const totalGood = data.reduce((acc: number, row: MaterialFlowReportData) => acc + row.output_actual_good, 0);
                const totalDefective = data.reduce((acc: number, row: MaterialFlowReportData) => acc + row.output_defective, 0);
                const totalOutput = totalGood + totalDefective;
                const overallYield = totalOutput > 0 ? (totalGood / totalOutput) * 100 : 100;

                setSummary({
                    totalValueLoss: totalLoss,
                    totalGoodOutput: totalGood,
                    totalDefectiveOutput: totalDefective,
                    overallYield: overallYield,
                });
            }

        } catch (error: any) {
            toast({ title: "Error Fetching Report", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, startDate, endDate, toast]);

    useEffect(() => {
        if (user?.company_id) {
            fetchReportData();
        }
    }, [user?.company_id]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">PET Material Flow Report</h1>
            <Card>
                <CardHeader><CardTitle>Filter Report</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-2"><Label htmlFor="start-date">Start Date</Label><Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                    <div className="grid gap-2"><Label htmlFor="end-date">End Date</Label><Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                    <Button onClick={fetchReportData} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Report</Button>
                </CardContent>
            </Card>

            {/* Summary Section */}
            {summary && !isLoading && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Value of Loss</CardTitle><TrendingDown className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalValueLoss)}</div><p className="text-xs text-muted-foreground">Financial impact of defective units</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Good Output</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{summary.totalGoodOutput.toLocaleString()}</div><p className="text-xs text-muted-foreground">Total saleable units produced</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Defective Units</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.totalDefectiveOutput.toLocaleString()}</div><p className="text-xs text-muted-foreground">Total scrapped units</p></CardContent></Card>
                    <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Overall Yield</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.overallYield.toFixed(2)}%</div><p className="text-xs text-muted-foreground">Efficiency for the selected period</p></CardContent></Card>
                </div>
            )}

            <Card>
                <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-60"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : reportData.length === 0 ? (
                        <div className="text-center text-muted-foreground h-60 flex flex-col justify-center items-center"><FileSpreadsheet className="h-10 w-10 mb-2" /><p className="font-medium">No Data Available</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow><TableHead>Order Date</TableHead><TableHead>BOM / Output</TableHead><TableHead>Inputs Consumed</TableHead><TableHead className="text-right">Good Output</TableHead><TableHead className="text-right">Material Loss</TableHead><TableHead className="text-right">Value of Loss</TableHead><TableHead className="text-right">Yield</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {reportData.map(row => (
                                        <TableRow key={row.order_id}>
                                            <TableCell className="whitespace-nowrap">{format(new Date(row.order_date), 'dd-MMM-yyyy')}</TableCell>
                                            <TableCell><div className="font-medium">{row.bom_name}</div><div className="text-sm text-muted-foreground">{row.output_item_name}</div></TableCell>
                                            <TableCell><ul className="list-disc pl-4 text-sm space-y-1">{row.inputs_consumed.map((input, index) => (<li key={index}>{`${input.component_name}: ${input.quantity_consumed.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${input.unit_of_measure}`}</li>))}</ul></TableCell>
                                            <TableCell className="text-right font-semibold text-green-600 whitespace-nowrap">{`${row.output_actual_good.toLocaleString()} pcs`}</TableCell>
                                            <TableCell className="text-right font-semibold text-red-600 whitespace-nowrap">{`${row.output_defective.toLocaleString()} pcs`}</TableCell>
                                            <TableCell className="text-right font-bold text-red-700 whitespace-nowrap">{formatCurrency(row.value_of_loss)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap"><Badge variant={row.yield_percentage < 95 ? "destructive" : "success"}>{`${row.yield_percentage.toFixed(2)}%`}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                {summary && (
                                    <TableFooter>
                                        <TableRow className="bg-muted/50 font-medium">
                                            <TableCell colSpan={3}>Totals</TableCell>
                                            <TableCell className="text-right text-green-600">{summary.totalGoodOutput.toLocaleString()} pcs</TableCell>
                                            <TableCell className="text-right text-red-600">{summary.totalDefectiveOutput.toLocaleString()} pcs</TableCell>
                                            <TableCell className="text-right font-bold text-red-700">{formatCurrency(summary.totalValueLoss)}</TableCell>
                                            <TableCell className="text-right"><Badge variant={summary.overallYield < 95 ? "destructive" : "success"}>{`${summary.overallYield.toFixed(2)}%`}</Badge></TableCell>
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default PetMaterialFlowReportPage;
