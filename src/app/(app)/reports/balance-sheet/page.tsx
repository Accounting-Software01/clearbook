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
import { Loader2, AlertCircle, CheckCircle, Scale, PiggyBank, Receipt, Landmark, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface Account {
    id: string; // Corresponds to account_code in the report
    account_name: string;
    account_type: string;
    sub_type: string;
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
    const [reportDate, setReportDate] = useState<Date | undefined>(new Date('2026-01-13'));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchChartOfAccounts = async () => {
            if (!user?.company_id) return;
            try {
                const response = await fetch(`/api/gl/get-chart-of-accounts.php?company_id=${user.company_id}`);
                const data = await response.json();
                if (data.success && Array.isArray(data.accounts)) {
                    setChartOfAccounts(data.accounts);
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
        const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
        const result: ProcessedData = {
            assets: { subGroups: {}, total: 0 },
            liabilities: { subGroups: {}, total: 0 },
            equity: { subGroups: {}, total: 0 },
            totalLiabilitiesAndEquity: 0
        };

        // 1. Calculate Net Income
        const revenueTotal = report.Revenue.total_credit - report.Revenue.total_debit;
        const cogsTotal = report.COGS.total_debit - report.COGS.total_credit;
        const expenseTotal = report.Expense.total_debit - report.Expense.total_credit;
        const netIncome = revenueTotal - cogsTotal - expenseTotal;

        // 2. Process Asset, Liability, and Equity sections
        const processSection = (
            sectionName: 'Asset' | 'Liability' | 'Equity',
            reportSection: TrialBalanceSectionData,
            targetSection: ReportSection
        ) => {
            reportSection.accounts.forEach(acc => {
                const balance = sectionName === 'Asset' ? acc.debit - acc.credit : acc.credit - acc.debit;
                
                if (Math.abs(balance) < 0.01) return;

                const accountInfo = accountMap.get(acc.account_code);
                const subType = accountInfo?.sub_type || 'General';

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

        // 3. Add Net Income to Equity
        const equitySubType = 'Retained Earnings';
        if (!result.equity.subGroups[equitySubType]) {
            result.equity.subGroups[equitySubType] = { accounts: [], total: 0 };
        }
        result.equity.subGroups[equitySubType].accounts.push({
            id: 'net-income',
            name: 'Current Period Earnings',
            balance: netIncome
        });
        
        // 4. Calculate all totals
        for (const section of [result.assets, result.liabilities, result.equity]) {
            section.total = 0;
            for (const subGroup of Object.values(section.subGroups)) {
                subGroup.total = subGroup.accounts.reduce((sum, acc) => sum + acc.balance, 0);
                section.total += subGroup.total;
            }
        }
        
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
        
        const formattedDate = format(reportDate, 'yyyy-MM-dd');
        const url = new URL('https://hariindustries.net/api/clearbook/trial-balance.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('end_date', formattedDate);

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
                    <Button variant="outline">Export Excel</Button>
                    <Button variant="destructive">Export PDF</Button>
                    <Button variant="outline">Print</Button>
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
