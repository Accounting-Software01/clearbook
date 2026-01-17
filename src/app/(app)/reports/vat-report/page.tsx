'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface VatTransaction {
    id: string;
    date: string;
    description: string;
    transaction_id: string;
    vat_amount: number;
}

interface VatData {
    output_vat: VatTransaction[];
    input_vat: VatTransaction[];
}

interface ProcessedVatData {
    outputVat: {
        transactions: VatTransaction[];
        total: number;
    };
    inputVat: {
        transactions: VatTransaction[];
        total: number;
    };
    netVatPayable: number;
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    const formatted = new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const VatReportPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState<ProcessedVatData | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processVatData = useCallback((rawData: VatData): ProcessedVatData => {
        const outputTotal = rawData.output_vat.reduce((sum, tx) => sum + tx.vat_amount, 0);
        const inputTotal = rawData.input_vat.reduce((sum, tx) => sum + tx.vat_amount, 0);

        return {
            outputVat: {
                transactions: rawData.output_vat,
                total: outputTotal
            },
            inputVat: {
                transactions: rawData.input_vat,
                total: inputTotal
            },
            netVatPayable: outputTotal - inputTotal
        };
    }, []);

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
        const url = `https://hariindustries.net/api/clearbook/vat-report.php?company_id=${user.company_id}&fromDate=${fromDate}&toDate=${toDate}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const rawData = await response.json();

            if (!rawData || typeof rawData !== 'object') {
                throw new Error("Invalid data structure: response is not an object.");
            }

            // Normalize the data to ensure arrays exist
            const normalizedData: VatData = {
                output_vat: Array.isArray(rawData.output_vat) ? rawData.output_vat : [],
                input_vat: Array.isArray(rawData.input_vat) ? rawData.input_vat : [],
            };
            
            if (normalizedData.output_vat.length === 0 && normalizedData.input_vat.length === 0) {
                toast({ title: "No VAT Data", description: "There are no VAT transactions within the selected period." });
            }

            setData(processVatData(normalizedData));

        } catch (e: any) {
            setError(`Failed to load VAT data: ${e.message}`);
            toast({ title: "Error Generating Report", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, user, processVatData, toast]);
    
    const renderSection = (title: string, transactions: VatTransaction[], total: number, icon: React.ReactNode) => (
        <div className="mb-8">
            <h3 className="text-xl font-semibold flex items-center mb-2">{icon} {title}</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Transaction Ref</TableHead>
                        <TableHead className="text-right">VAT Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length > 0 ? (
                        transactions.map(tx => (
                            <TableRow key={tx.id}>
                                <TableCell>{format(new Date(tx.date), 'yyyy-MM-dd')}</TableCell>
                                <TableCell>{tx.description}</TableCell>
                                <TableCell>{tx.transaction_id}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(tx.vat_amount)}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No transactions for this category in the selected period.</TableCell></TableRow>
                    )}
                </TableBody>
                <TableFooter>
                    <TableRow className="font-bold bg-gray-100">
                        <TableCell colSpan={3}>Total {title}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(total)}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">VAT Report</h1>
            <Card>
                <CardHeader><CardTitle>Report Controls</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap items-end gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">From Date</label><DatePicker date={startDate} setDate={setStartDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">To Date</label><DatePicker date={endDate} setDate={setEndDate} /></div>
                    <Button onClick={generateReport} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Report
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-4">Calculating VAT...</span></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}

            {data && (
                <div className="space-y-6">
                     <Card>
                        <CardHeader><CardTitle>VAT Summary</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-red-50 rounded-lg">
                                <p className="text-sm font-medium text-red-600">Total Output VAT (Sales)</p>
                                <p className="text-2xl font-bold text-red-800">{formatCurrency(data.outputVat.total)}</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-sm font-medium text-green-600">Total Input VAT (Purchases)</p>
                                <p className="text-2xl font-bold text-green-800">{formatCurrency(data.inputVat.total)}</p>
                            </div>
                            <div className={`p-4 rounded-lg ${data.netVatPayable >= 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                                <p className={`text-sm font-medium ${data.netVatPayable >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
                                    Net VAT Payable / (Refundable)
                                </p>
                                <p className={`text-2xl font-bold ${data.netVatPayable >= 0 ? 'text-blue-800' : 'text-yellow-800'}`}>
                                    {formatCurrency(data.netVatPayable)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            {renderSection('Output VAT (On Sales)', data.outputVat.transactions, data.outputVat.total, <TrendingUp className="mr-2 h-5 w-5 text-red-500" />)}
                            {renderSection('Input VAT (On Purchases/Expenses)', data.inputVat.transactions, data.inputVat.total, <TrendingDown className="mr-2 h-5 w-5 text-green-500" />)}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default VatReportPage;
