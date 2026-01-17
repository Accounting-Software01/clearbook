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
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Loader2, AlertCircle, CheckCircle, FileDown, Briefcase, Landmark, Users, TrendingUp, ShoppingCart, TrendingDown } from 'lucide-react';
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import type { DateRange } from 'react-day-picker';
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
    debit: number;
    credit: number;
    type: string; 
    subType: string;
}

const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
        return '-';
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

const groupAccounts = (reportData: Omit<TrialBalanceEntry, 'type' | 'subType'>[], hideZeroBalances: boolean) => {
    const accountMap = new Map(chartOfAccounts.map(acc => [acc.code, acc]));
    
    const dataWithTypes = reportData
        .map(entry => {
            const accountDetails = accountMap.get(entry.accountId);
            return {
                ...entry,
                type: accountDetails?.type || 'Unknown',
                subType: accountDetails?.sub_type || 'Unknown'
            };
        })
        .filter(entry => !hideZeroBalances || entry.debit !== 0 || entry.credit !== 0);

    const groups = {
        Assets: { icon: <Briefcase className="h-4 w-4 mr-2"/>, types: ['Current Assets', 'Fixed Assets', 'Non-Current Assets'], accounts: {} as Record<string, TrialBalanceEntry[]> },
        Liabilities: { icon: <Landmark className="h-4 w-4 mr-2"/>, types: ['Current Liabilities', 'Non-Current Liabilities'], accounts: {} as Record<string, TrialBalanceEntry[]> },
        Equity: { icon: <Users className="h-4 w-4 mr-2"/>, types: ['Equity'], accounts: {} as Record<string, TrialBalanceEntry[]> },
        Revenue: { icon: <TrendingUp className="h-4 w-4 mr-2"/>, types: ['Revenue'], accounts: {} as Record<string, TrialBalanceEntry[]> },
        'Cost of Goods Sold': { icon: <ShoppingCart className="h-4 w-4 mr-2"/>, types: ['Cost of Goods Sold'], accounts: {} as Record<string, TrialBalanceEntry[]> },
        Expenses: { icon: <TrendingDown className="h-4 w-4 mr-2"/>, types: ['Expense'], accounts: {} as Record<string, TrialBalanceEntry[]> },
    };

    for (const entry of dataWithTypes) {
        const mainType = Object.keys(groups).find(g => (groups as any)[g].types.includes(entry.type)) || 'Unknown';
        if (mainType !== 'Unknown') {
            if (!(groups as any)[mainType].accounts[entry.type]) {
                (groups as any)[mainType].accounts[entry.type] = [];
            }
            (groups as any)[mainType].accounts[entry.type].push(entry);
        }
    }
    return groups;
};

const TrialBalancePage = () => {
    const { user } = useAuth();
    const [reportData, setReportData] = useState<BackendBalance[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date('2026-01-01'));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date('2026-01-13'));
    const [hideZeroBalances, setHideZeroBalances] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!startDate || !endDate) {
            setError("Please select a valid date range for the report.");
            return;
        }
        if (!user?.company_id) {
            setError("Could not determine your company. Please ensure you are logged in correctly.");
            return;
        }
        setIsLoading(true);
        setError(null);
        const fromDate = format(startDate, 'yyyy-MM-dd');
        const toDate = format(endDate, 'yyyy-MM-dd');
        const url = new URL('https://hariindustries.net/api/clearbook/trial-balance.php');
        url.searchParams.append('company_id', user.company_id);
        if (user.uid) {
            url.searchParams.append('user_id', String(user.uid));
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
            setReportData(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
            setReportData([]);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, user]);

    const groupedData = useMemo(() => groupAccounts(reportData, hideZeroBalances), [reportData, hideZeroBalances]);

    const totals = useMemo(() => {
        let grandTotalDebit = 0;
        let grandTotalCredit = 0;
        const groupTotals: Record<string, { debit: number, credit: number }> = {};

        for (const groupName in groupedData) {
            let groupDebit = 0;
            let groupCredit = 0;
            const group = (groupedData as any)[groupName];
            for (const subTypeName in group.accounts) {
                for (const account of group.accounts[subTypeName]) {
                    groupDebit += account.debit;
                    groupCredit += account.credit;
                }
            }
            groupTotals[groupName] = { debit: groupDebit, credit: groupCredit };
            grandTotalDebit += groupDebit;
            grandTotalCredit += groupCredit;
        }
        return { grandTotalDebit, grandTotalCredit, groupTotals };
    }, [groupedData]);

    const isBalanced = Math.abs(totals.grandTotalDebit - totals.grandTotalCredit) < 0.01;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Trial Balance Report</h1>
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Start Date</label>
                            <DatePicker date={startDate} setDate={setStartDate} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">End Date</label>
                            <DatePicker date={endDate} setDate={setEndDate} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="hide-zero" checked={hideZeroBalances} onCheckedChange={(c) => setHideZeroBalances(c as boolean)} />
                            <label htmlFor="hide-zero" className="text-sm font-medium">Hide Zero Balances</label>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <Button onClick={generateReport} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Generate Report
                        </Button>
                        <Button variant="outline">Export Excel</Button>
                        <Button variant="destructive">Export PDF</Button>
                        <Button variant="outline">Print</Button>
                    </div>
                </CardContent>
            </Card>

            {reportData.length > 0 && (
                <>
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6 text-blue-800">
                           Period: {startDate && format(startDate, 'MMMM dd, yyyy')} to {endDate && format(endDate, 'MMMM dd, yyyy')}
                        </CardContent>
                    </Card>
                    <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <CardContent className="pt-6 flex justify-between items-center">
                            <div className={`flex items-center font-semibold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                                <CheckCircle className="h-5 w-5 mr-2"/> Status: {isBalanced ? 'Balanced' : 'Not Balanced'}
                            </div>
                            <div className="text-sm font-semibold">
                                Total Debit Balances: {formatCurrency(totals.grandTotalDebit)} | Total Credit Balances: {formatCurrency(totals.grandTotalCredit)}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {isLoading ? (
                <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : error ? (
                <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>
            ) : reportData.length > 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/4">Account Number</TableHead>
                                    <TableHead className="w-1/2">Account Name</TableHead>
                                    <TableHead className="text-right">Debit Balance</TableHead>
                                    <TableHead className="text-right">Credit Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(groupedData).map(([groupName, groupData]) => {
                                    const groupTotal = totals.groupTotals[groupName];
                                    if (groupTotal.debit === 0 && groupTotal.credit === 0 && hideZeroBalances) return null;

                                    return (
                                        <React.Fragment key={groupName}>
                                            <TableRow className="bg-gray-100 font-bold">
                                                <TableCell colSpan={4} className="flex items-center">{groupData.icon} {groupName.toUpperCase()}</TableCell>
                                            </TableRow>
                                            {Object.entries(groupData.accounts).map(([subTypeName, accounts]) => (
                                                <React.Fragment key={subTypeName}>
                                                    <TableRow className="font-semibold bg-gray-50">
                                                        <TableCell colSpan={4} className="pl-8">{subTypeName}</TableCell>
                                                    </TableRow>
                                                    {accounts.map(acc => (
                                                        <TableRow key={acc.accountId}>
                                                            <TableCell className="pl-12">{acc.accountId}</TableCell>
                                                            <TableCell>{acc.accountName}</TableCell>
                                                            <TableCell className="text-right font-mono text-green-600">{formatCurrency(acc.debit)}</TableCell>
                                                            <TableCell className="text-right font-mono text-red-600">{formatCurrency(acc.credit)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                            <TableRow className="bg-blue-100 font-bold">
                                                <TableCell colSpan={2}>TOTAL {groupName.toUpperCase()}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(groupTotal.debit)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(groupTotal.credit)}</TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-gray-800 text-white font-bold">
                                    <TableCell colSpan={2}>GRAND TOTAL</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totals.grandTotalDebit)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totals.grandTotalCredit)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to see the trial balance.</p></div>
            )}
        </div>
    );
};

export default TrialBalancePage;