'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, CheckCircle, PiggyBank, Landmark, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Simplified Interfaces for the data coming from the new balance-sheet.php endpoint
interface ReportAccount {
    id: string;
    name: string;
    balance: number;
}

interface ReportSubGroup {
    accounts: ReportAccount[];
    total: number;
}

interface ReportSection {
    subGroups: Record<string, ReportSubGroup>;
    total: number;
}

interface ProcessedData {
    assets: ReportSection;
    liabilities: ReportSection;
    equity: ReportSection;
    totalLiabilitiesAndEquity: number;
}

// Helper to format currency values
const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
        return '-';
    }
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const BalanceSheetPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [reportDate, setReportDate] = useState<Date | undefined>(new Date());

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!reportDate) {
            toast({ title: "Date Missing", description: "Please select a date for the report.", variant: 'destructive' });
            return;
        }
        if (!user?.company_id) {
            toast({ title: "Company not loaded", description: "Please wait a moment and try again.", variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData(null);
        
        // The new endpoint only requires the company_id and the toDate.
        const toDate = format(reportDate, 'yyyy-MM-dd');
        const url = new URL('https://hariindustries.net/api/clearbook/balance-sheet.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            // The new endpoint returns the data pre-processed.
            if (data.success && data.processedData) {
                setProcessedData(data.processedData);
                if (Object.keys(data.processedData.assets.subGroups).length === 0) {
                     toast({title: "No Data", description: "The report is empty for the selected date.", variant: 'default'});
                }
            } else {
                throw new Error(data.message || "Invalid data format received from the server.");
            }
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            toast({ title: "Error Generating Report", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [reportDate, user, toast]);

        // Auto-generate the report once the user context is loaded.
        useEffect(() => {
            if (user?.company_id) {
                generateReport();
            }
        }, [user, generateReport]);
    
    // Auto-generate the report once the user context is loaded.
    useEffect(() => {
        if (user?.company_id) {
            generateReport();
        }
    }, [user, generateReport]);

    const isBalanced = useMemo(() => {
        if (!processedData) return false;
        // The balance check remains the same.
        return Math.abs(processedData.assets.total - processedData.totalLiabilitiesAndEquity) < 0.01;
    }, [processedData]);

    // Export functions remain largely the same, but are simpler as they consume the final data structure directly.
    const getExportableData = (data: ProcessedData | null): any[] => {
        if (!data) return [];
        const rows: { Account: string; Balance: string; }[] = [];
        const formatForExport = (amount: number) => amount.toFixed(2);
        
        const processExportSection = (title: string, section: ReportSection) => {
            rows.push({ Account: title, Balance: '' });
            Object.entries(section.subGroups).forEach(([subTypeName, subGroup]) => {
                rows.push({ Account: `  ${subTypeName}`, Balance: '' });
                subGroup.accounts.forEach(acc => {
                    rows.push({ Account: `    ${acc.name}`, Balance: formatForExport(acc.balance) });
                });
                rows.push({ Account: `  Total ${subTypeName}`, Balance: formatForExport(subGroup.total) });
            });
            rows.push({ Account: `TOTAL ${title}`, Balance: formatForExport(section.total) });
            rows.push({ Account: '', Balance: '' });
        };

        processExportSection('ASSETS', data.assets);
        processExportSection('LIABILITIES', data.liabilities);
        processExportSection('EQUITY', data.equity);
        rows.push({ Account: 'TOTAL LIABILITIES AND EQUITY', Balance: formatForExport(data.totalLiabilitiesAndEquity) });
        return rows;
    };
    
    const handleExportPDF = useCallback(() => {
        if (!processedData) return toast({ title: "No data to export", variant: "destructive" });
        const doc = new jsPDF();
        doc.text('Balance Sheet', 14, 22);
        doc.text(`As of: ${format(reportDate!, 'PPP')}`, 14, 30);
        autoTable(doc, { startY: 36, head: [['Account', 'Balance']], body: getExportableData(processedData).map(r => [r.Account, r.Balance]), theme: 'grid' });
        doc.save(`Balance-Sheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }, [processedData, reportDate, toast]);

    const handleExportExcel = useCallback(() => {
        if (!processedData) return toast({ title: "No data to export", variant: "destructive" });
        const worksheet = XLSX.utils.json_to_sheet(getExportableData(processedData));
        worksheet['!cols'] = [{ wch: 60 }, { wch: 20 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Balance Sheet");
        XLSX.writeFile(workbook, `Balance-Sheet-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }, [processedData, toast]);
    
    const renderSection = (title: string, section: ReportSection, icon: React.ReactNode, bgColor: string) => (
        <React.Fragment>
            <TableRow className={`${bgColor} font-bold text-lg hover:${bgColor}`}><TableCell colSpan={2} className="flex items-center">{icon} {title}</TableCell></TableRow>
            {Object.entries(section.subGroups).map(([subTypeName, subGroup]) => (
                <React.Fragment key={subTypeName}>
                    <TableRow className="font-semibold bg-gray-50 hover:bg-gray-100"><TableCell colSpan={2} className="pl-8">{subTypeName}</TableCell></TableRow>
                    {subGroup.accounts.map(acc => (
                        <TableRow key={acc.id} className="hover:bg-gray-50">
                            <TableCell className="pl-12">{acc.name}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(acc.balance)}</TableCell>
                        </TableRow>
                    ))}
                     <TableRow className="font-bold bg-gray-100 hover:bg-gray-200">
                        <TableCell className="pl-8">Total {subTypeName}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(subGroup.total)}</TableCell>
                    </TableRow>
                </React.Fragment>
            ))}
            <TableRow className={`font-extrabold text-white hover:${bgColor} ${bgColor.replace('100', '600')}`}><TableCell>TOTAL {title}</TableCell><TableCell className="text-right font-mono">{formatCurrency(section.total)}</TableCell></TableRow>
        </React.Fragment>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
             <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">As of Date</label><DatePicker date={reportDate} setDate={setReportDate} /></div>
                    <Button onClick={generateReport} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Generate Report</Button>
                    <Button variant="outline" onClick={handleExportExcel}>Export Excel</Button>
                    <Button variant="destructive" onClick={handleExportPDF}>Export PDF</Button>
                </CardContent>
            </Card>

            {processedData && (
                <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                    <CardContent className="pt-6 flex justify-between items-center">
                         <div className={`flex items-center font-semibold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>{isBalanced ? <CheckCircle className="h-5 w-5 mr-2"/> : <AlertCircle className="h-5 w-5 mr-2"/>}Status: {isBalanced ? 'Balanced' : 'Not Balanced'}</div>
                        <div className="text-sm font-mono">Assets: {formatCurrency(processedData.assets.total)} | Liab. & Equity: {formatCurrency(processedData.totalLiabilitiesAndEquity)}</div>
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
                            <TableHeader><TableRow><TableHead className="w-3/4">Account</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {renderSection('ASSETS', processedData.assets, <PiggyBank className="h-5 w-5 mr-2" />, 'bg-blue-100')}
                                {renderSection('LIABILITIES', processedData.liabilities, <Landmark className="h-5 w-5 mr-2" />, 'bg-yellow-100')}
                                {renderSection('EQUITY', processedData.equity, <Users className="h-5 w-5 mr-2" />, 'bg-green-100')}
                                <TableRow className="bg-gray-800 text-white font-bold hover:bg-black text-lg">
                                    <TableCell>TOTAL LIABILITIES AND EQUITY</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(processedData.totalLiabilitiesAndEquity)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to view the Balance Sheet.</p></div>
            )}
        </div>
    );
};

export default BalanceSheetPage;
