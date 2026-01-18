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
} from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle, CheckCircle, Scale, PiggyBank, Receipt, Landmark, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface Account {
    id: number;
    account_code: string;
    account_name: string;
    account_type: string;
}


// Interfaces for the new Trial Balance Report data structure
interface TrialBalanceAccount {
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
}

interface TrialBalanceSectionData {
    accounts: TrialBalanceAccount[];
    total_debit: number;
    total_credit: number;
}

interface TrialBalanceReport {
    Asset: TrialBalanceSectionData;
    Liability: TrialBalanceSectionData;
    Equity: TrialBalanceSectionData;
    Revenue: TrialBalanceSectionData;
    COGS: TrialBalanceSectionData;
    Expense: TrialBalanceSectionData;
}

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
    const [chartOfAccounts, setChartOfAccounts] = useState<Account[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [reportDate, setReportDate] = useState<Date | undefined>(new Date());

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchChartOfAccounts = async () => {
            if (!user?.company_id) return;
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${user.company_id}`);
                const data = await response.json();


                    if (Array.isArray(data)) {
                        setChartOfAccounts(data);
                    } else {
                    

                    throw new Error(data.message || "Failed to fetch chart of accounts.");
                }
            } catch (e: any) {
                toast({ title: "Error Loading Accounts", description: e.message, variant: "destructive" });
            }
        };
        fetchChartOfAccounts();
    }, [user, toast]);




    const processRawData = useCallback((report: TrialBalanceReport, accounts: Account[]): ProcessedData => {
        const accountMap = new Map(accounts.map(acc => [acc.account_code, acc]));

        const result: ProcessedData = {
            assets: { subGroups: {}, total: 0 },
            liabilities: { subGroups: {}, total: 0 },
            equity: { subGroups: {}, total: 0 },
            totalLiabilitiesAndEquity: 0
        };

        // 1. Calculate Net Income from report sections
        const revenueTotal = report.Revenue.total_credit - report.Revenue.total_debit;
        const cogsTotal = report.COGS.total_debit - report.COGS.total_credit;
        const expenseTotal = report.Expense.total_debit - report.Expense.total_credit;
        const netIncome = revenueTotal - cogsTotal - expenseTotal;

        // 2. Process Asset, Liability, and Equity sections from the report
        const processSection = (
            sectionName: 'Asset' | 'Liability' | 'Equity',
            reportSection: TrialBalanceSectionData,
            targetSection: ReportSection
        ) => {
            reportSection.accounts.forEach(acc => {
                // Ignore the placeholder for current earnings, we calculate it ourselves
                if (acc.account_code === '303000') return;

                const balance = sectionName === 'Asset' ? acc.debit - acc.credit : acc.credit - acc.debit;
                
                // Only include accounts with a non-zero balance
                if (Math.abs(balance) < 0.01) return;

                const accountInfo = accountMap.get(acc.account_code);
// Derives sub-type from name (e.g., "Cash at Bank - Main" becomes "Cash at Bank")
// Falls back to the main account type (e.g., "Asset") if no separator is found.
const subType = accountInfo 
    ? (accountInfo.account_name.includes(' - ') ? accountInfo.account_name.split(' - ')[0] : accountInfo.account_type)
    : 'General';


                if (!targetSection.subGroups[subType]) {
                    targetSection.subGroups[subType] = { accounts: [], total: 0 };
                }

                targetSection.subGroups[subType].accounts.push({
                    id: acc.account_code,
                    name: acc.account_name,
                    balance: balance
                });
            });
        };

        processSection('Asset', report.Asset, result.assets);
        processSection('Liability', report.Liability, result.liabilities);
        processSection('Equity', report.Equity, result.equity);

        // 3. Add calculated Net Income to the Equity section under its own sub-group
        const netIncomeSubType = 'Current Period Earnings';
        if (!result.equity.subGroups[netIncomeSubType]) {
            result.equity.subGroups[netIncomeSubType] = { accounts: [], total: 0 };
        }
        // We add it as a single account within its own sub-group for display purposes
        result.equity.subGroups[netIncomeSubType].accounts.push({
            id: 'net-income',
            name: 'Net Income for the Period', // More descriptive name
            balance: netIncome
        });
        
        // 4. Calculate totals for all sections and sub-groups
        for (const section of [result.assets, result.liabilities, result.equity]) {
            section.total = 0;
            for (const subGroupKey in section.subGroups) {
                const subGroup = section.subGroups[subGroupKey];
                subGroup.total = subGroup.accounts.reduce((sum, acc) => sum + acc.balance, 0);
                section.total += subGroup.total;
            }
        }
        
        // 5. Calculate Total Liabilities & Equity
        result.totalLiabilitiesAndEquity = result.liabilities.total + result.equity.total;

        return result;
    }, []);

    const generateReport = useCallback(async () => {
        if (!reportDate) {
            setError("Please select a date.");
            return;
        }
        if (!user?.company_id || chartOfAccounts.length === 0) {
            setError("Company or accounts not loaded. Please wait a moment and try again.");
            toast({ title: "Prerequisites Missing", description: "Company or Chart of Accounts not loaded yet." });
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData(null);
        
// The date selected by the user will be our 'toDate'
const toDate = format(reportDate, 'yyyy-MM-dd');

// For a balance sheet, the 'fromDate' is the beginning of the financial period. 
// We'll use the first day of the selected year.
const fromDate = format(new Date(reportDate.getFullYear(), 0, 1), 'yyyy-MM-dd');

const url = new URL('https://hariindustries.net/api/clearbook/trial-balance.php');
url.searchParams.append('company_id', user.company_id);
url.searchParams.append('fromDate', fromDate);
url.searchParams.append('toDate', toDate);


        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            if (data.success && data.report) {
                if (Object.keys(data.report).length === 0) {
                    toast({title: "No Data", description: "Report is empty for the selected date.", variant: 'default'});
                }
                setProcessedData(processRawData(data.report, chartOfAccounts));
            } else {
                throw new Error(data.message || "Invalid data format received.");
            }
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            toast({ title: "Error Generating Report", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [reportDate, user, chartOfAccounts, processRawData, toast]);

    const isBalanced = useMemo(() => {
        if (!processedData) return false;
        return Math.abs(processedData.assets.total - processedData.totalLiabilitiesAndEquity) < 0.01;
    }, [processedData]);

    const getExportableData = (data: ProcessedData | null): any[] => {
        if (!data) return [];
        const rows: { Account: string; Balance: string; }[] = [];
        const formatForExport = (amount: number) => {
            if (typeof amount !== 'number' || isNaN(amount)) return '';
            return amount.toFixed(2);
        };
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
        if (!processedData) {
            toast({ title: "No data to export", description: "Please generate a report first.", variant: "destructive" });
            return;
        }
        const doc = new jsPDF();
        const exportData = getExportableData(processedData);
        doc.setFontSize(18);
        doc.text('Balance Sheet', 14, 22);
        doc.setFontSize(11);
        doc.text(`As of: ${format(reportDate!, 'PPP')}`, 14, 30);
        autoTable(doc, {
            startY: 36,
            head: [['Account', 'Balance']],
            body: exportData.map(row => [row.Account, row.Balance]),
            theme: 'grid',
            headStyles: { fillColor: [34, 41, 47] },
            didParseCell: function (data) {
                if (data.column.dataKey === 1) { // Align 'Balance' column to the right
                    data.cell.styles.halign = 'right';
                }
            }
        });
        doc.save(`Balance-Sheet-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    }, [processedData, reportDate, toast]);
    
    useEffect(() => {
        // Auto-generate report when the page loads and the necessary data is available.
        if (user?.company_id && chartOfAccounts.length > 0) {
            generateReport();
        }
    }, [user, chartOfAccounts, generateReport]);
    

    const handleExportExcel = useCallback(() => {
        if (!processedData) {
            toast({ title: "No data to export", description: "Please generate a report first.", variant: "destructive" });
            return;
        }
        const exportData = getExportableData(processedData);
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [{ wch: 60 }, { wch: 20 }]; // Set column widths
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Balance Sheet");
        XLSX.writeFile(workbook, `Balance-Sheet-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    }, [processedData, toast]);
    
    const renderSection = (title: string, section: ReportSection, icon: React.ReactNode, bgColor: string) => (
        <React.Fragment>
            <TableRow className={`${bgColor} font-bold text-lg hover:${bgColor}`}>
                <TableCell colSpan={2} className="flex items-center">{icon} {title}</TableCell>
            </TableRow>
            {Object.entries(section.subGroups).map(([subTypeName, subGroup]) => (
                <React.Fragment key={subTypeName}>
                    <TableRow className="font-semibold bg-gray-50 hover:bg-gray-100">
                        <TableCell colSpan={2} className="pl-8">{subTypeName}</TableCell>
                    </TableRow>
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
            <TableRow className={`font-extrabold text-white hover:${bgColor} ${bgColor.replace('100', '600')}`}>
                <TableCell>TOTAL {title}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(section.total)}</TableCell>
            </TableRow>
        </React.Fragment>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Balance Sheet</h1>
             <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">As of Date</label>
                        <DatePicker date={reportDate} setDate={setReportDate} />
                    </div>
                    <Button onClick={generateReport} disabled={isLoading || chartOfAccounts.length === 0}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Report
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel}>Export Excel</Button>
<Button variant="destructive" onClick={handleExportPDF}>Export PDF</Button>

                </CardContent>
            </Card>

            {processedData && (
                <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                    <CardContent className="pt-6 flex justify-between items-center">
                         <div className={`flex items-center font-semibold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                            {isBalanced ? <CheckCircle className="h-5 w-5 mr-2"/> : <AlertCircle className="h-5 w-5 mr-2"/>}
                             Status: {isBalanced ? 'Balanced' : 'Not Balanced'}
                        </div>
                        <div className="text-sm font-mono">
                            Assets: {formatCurrency(processedData.assets.total)} | Liab. & Equity: {formatCurrency(processedData.totalLiabilitiesAndEquity)}
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
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-3/4">Account</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
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
