'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Loader2, AlertCircle, CheckCircle, TrendingUp, ShoppingCart, TrendingDown, PiggyBank, Landmark, Users, ChevronsRight, Target, DollarSign, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Common Interfaces
interface Account {
    id: string;
    account_name: string;
    account_type: string;
    sub_type: string;
}
interface ReportAccount {
    id: string;
    name: string;
    balance: number;
}
interface ReportGroup {
    accounts: ReportAccount[];
    total: number;
}

// Processed Data Structure
interface ProcessedData {
    incomeStatement: {
        revenue: ReportGroup;
        cogs: ReportGroup;
        expenses: ReportGroup;
        grossProfit: number;
        netIncome: number;
    };
    balanceSheet: {
        assets: Record<string, ReportGroup>;
        liabilities: Record<string, ReportGroup>;
        equity: Record<string, ReportGroup>;
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number; // Includes Net Income
        totalLiabilitiesAndEquity: number;
    };
}

const formatCurrency = (amount: number | null | undefined, zeroAsDash = false) => {
    if (amount === null || amount === undefined || isNaN(amount) || (zeroAsDash && amount === 0)) {
        return '-';
    }
    const formatted = new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const FinancialStatementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [chartOfAccounts, setChartOfAccounts] = useState<Account[]>([]);
    const [data, setData] = useState<ProcessedData | null>(null);

    // Date States
    const [bsDate, setBsDate] = useState<Date | undefined>(new Date('2026-01-13'));
    const [isStartDate, setIsStartDate] = useState<Date | undefined>(new Date('2026-01-01'));
    const [isEndDate, setIsEndDate] = useState<Date | undefined>(new Date('2026-01-13'));
    const [compareBsDate, setCompareBsDate] = useState<Date | undefined>();

    const [hideZeroBalances, setHideZeroBalances] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Chart of Accounts
    useEffect(() => {
        if (user?.company_id) {
            fetch(`/api/gl/get-chart-of-accounts.php?company_id=${user.company_id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) setChartOfAccounts(data.accounts); 
                    else throw new Error(data.message);
                })
                .catch(e => toast({ title: "Error", description: `Could not load accounts: ${e.message}`, variant: "destructive" }));
        }
    }, [user, toast]);

    const processData = useCallback((bsData: any[], isData: any[], accounts: Account[]): ProcessedData => {
        const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
        const IS: ProcessedData['incomeStatement'] = { revenue: { accounts: [], total: 0 }, cogs: { accounts: [], total: 0 }, expenses: { accounts: [], total: 0 }, grossProfit: 0, netIncome: 0 };
        const BS: ProcessedData['balanceSheet'] = { assets: {}, liabilities: {}, equity: {}, totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalLiabilitiesAndEquity: 0 };

        // 1. Process Income Statement
        isData.forEach(item => {
            const acc = accountMap.get(item.accountId);
            if (!acc) return;
            const balance = -item.balance; // Credits (Revenue) are positive
            if (hideZeroBalances && balance === 0) return;

            if (acc.account_type === 'Revenue') IS.revenue.accounts.push({ id: acc.id, name: acc.account_name, balance });
            else if (acc.account_type === 'Cost of Goods Sold') IS.cogs.accounts.push({ id: acc.id, name: acc.account_name, balance });
            else if (acc.account_type === 'Expense') IS.expenses.accounts.push({ id: acc.id, name: acc.account_name, balance });
        });

        IS.revenue.total = IS.revenue.accounts.reduce((s, a) => s + a.balance, 0);
        IS.cogs.total = IS.cogs.accounts.reduce((s, a) => s + a.balance, 0);
        IS.expenses.total = IS.expenses.accounts.reduce((s, a) => s + a.balance, 0);
        IS.grossProfit = IS.revenue.total - IS.cogs.total;
        IS.netIncome = IS.grossProfit - IS.expenses.total;

        // 2. Process Balance Sheet
        bsData.forEach(item => {
            const acc = accountMap.get(item.accountId);
            if (!acc) return;
            const balance = acc.account_type.includes('Asset') ? item.balance : -item.balance;
            if (hideZeroBalances && balance === 0) return;

            let targetSection: Record<string, ReportGroup>;
            if (acc.account_type.includes('Asset')) targetSection = BS.assets;
            else if (acc.account_type.includes('Liabilit')) targetSection = BS.liabilities;
            else if (acc.account_type === 'Equity') targetSection = BS.equity;
            else return;
            
            const subType = acc.sub_type || 'General';
            if (!targetSection[subType]) targetSection[subType] = { accounts: [], total: 0 };
            targetSection[subType].accounts.push({ id: acc.id, name: acc.account_name, balance });
        });

        // 3. Sum up Balance Sheet & Add Net Income to Equity
        [BS.assets, BS.liabilities, BS.equity].forEach((section, index) => {
            let sectionTotal = 0;
            Object.values(section).forEach(group => {
                group.total = group.accounts.reduce((s, a) => s + a.balance, 0);
                sectionTotal += group.total;
            });
            if(index === 0) BS.totalAssets = sectionTotal;
            if(index === 1) BS.totalLiabilities = sectionTotal;
            if(index === 2) BS.totalEquity = sectionTotal + IS.netIncome; // Add Net Income here
        });

        BS.totalLiabilitiesAndEquity = BS.totalLiabilities + BS.totalEquity;

        return { incomeStatement: IS, balanceSheet: BS };
    }, [hideZeroBalances]);


    const generateReport = useCallback(async () => {
        if (!bsDate || !isStartDate || !isEndDate || !user?.company_id || chartOfAccounts.length === 0) {
            setError("Please select all required dates and ensure accounts are loaded.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setData(null);

        const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');
        const bsUrl = `https://hariindustries.net/api/clearbook/balance-sheet.php?company_id=${user.company_id}&reportDate=${formatDate(bsDate)}`;
        const isUrl = `https://hariindustries.net/api/clearbook/income-statement.php?company_id=${user.company_id}&fromDate=${formatDate(isStartDate)}&toDate=${formatDate(isEndDate)}`;

        try {
            const [bsRes, isRes] = await Promise.all([fetch(bsUrl), fetch(isUrl)]);
            if (!bsRes.ok || !isRes.ok) throw new Error('Failed to fetch one or more reports.');
            const [bsData, isData] = await Promise.all([bsRes.json(), isRes.json()]);

            if (!Array.isArray(bsData) || !Array.isArray(isData)) throw new Error('Invalid data format received');
            if (bsData.length === 0 || isData.length === 0) toast({ title: "No Data", description: "One or more reports returned no data for the selected period." });

            setData(processData(bsData, isData, chartOfAccounts));

        } catch (e: any) {
            setError(`Failed to generate report: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [bsDate, isStartDate, isEndDate, user, chartOfAccounts, processData, toast]);
    
    const isBalanced = useMemo(() => data ? Math.abs(data.balanceSheet.totalAssets - data.balanceSheet.totalLiabilitiesAndEquity) < 0.01 : false, [data]);

    // RENDER HELPERS
    const renderSummary = () => data && (
        <>
            <Card className="bg-blue-50 border-blue-200 text-sm">
                <CardContent className="p-4">
                    Balance Sheet As of: <span className="font-semibold">{format(bsDate!, 'MMMM dd, yyyy')}</span> | Income Statement Period: <span className="font-semibold">{format(isStartDate!, 'MMMM dd, yyyy')} to {format(isEndDate!, 'MMMM dd, yyyy')}</span>
                </CardContent>
            </Card>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.incomeStatement.revenue.total)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Net Income</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.incomeStatement.netIncome)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Total Assets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.balanceSheet.totalAssets)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Total Equity</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.balanceSheet.totalEquity)}</p></CardContent></Card>
            </div>
            <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <CardContent className="p-4 flex justify-between items-center">
                    <div className={`flex items-center font-semibold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}><CheckCircle className="h-5 w-5 mr-2"/> Balance Sheet Status: {isBalanced ? 'Balanced' : 'Out of Balance'}</div>
                    <div className="text-sm font-semibold">Total Assets: {formatCurrency(data.balanceSheet.totalAssets)} | Total Liabilities + Equity: {formatCurrency(data.balanceSheet.totalLiabilitiesAndEquity)}</div>
                </CardContent>
            </Card>
        </>
    );

    const renderIncomeStatement = () => data && (
        <Card>
            <CardHeader><CardTitle>INCOME STATEMENT (Profit & Loss)</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow className="font-bold"><TableCell colSpan={2} className="flex items-center"><TrendingUp className="mr-2 h-4 w-4"/> REVENUE</TableCell></TableRow>
                        {data.incomeStatement.revenue.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-10">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, true)}</TableCell></TableRow>)}
                        <TableRow className="font-semibold bg-gray-100"><TableCell>Total Revenue</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.revenue.total)}</TableCell></TableRow>
                        
                        <TableRow className="font-bold"><TableCell colSpan={2} className="flex items-center pt-6"><ShoppingCart className="mr-2 h-4 w-4"/> COST OF GOODS SOLD</TableCell></TableRow>
                        {data.incomeStatement.cogs.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-10">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, true)}</TableCell></TableRow>)}
                        <TableRow className="font-semibold bg-gray-100"><TableCell>Total Cost of Goods Sold</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.cogs.total)}</TableCell></TableRow>
                        
                        <TableRow className="font-bold text-lg bg-green-100"><TableCell className="flex items-center"><ChevronsRight className="mr-2 h-4 w-4"/> GROSS PROFIT</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.grossProfit)}</TableCell></TableRow>
                        
                        <TableRow className="font-bold"><TableCell colSpan={2} className="flex items-center pt-6"><TrendingDown className="mr-2 h-4 w-4"/> OPERATING EXPENSES</TableCell></TableRow>
                        {data.incomeStatement.expenses.accounts.length > 0 ? 
                            data.incomeStatement.expenses.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-10">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, true)}</TableCell></TableRow>)
                            : <TableRow><TableCell className="pl-10 text-muted-foreground">No operating expenses for this period</TableCell><TableCell className="text-right font-mono">-</TableCell></TableRow>}
                        <TableRow className="font-semibold bg-gray-100"><TableCell>Total Operating Expenses</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.expenses.total)}</TableCell></TableRow>
                    </TableBody>
                    <TableFooter><TableRow className="font-extrabold text-xl bg-gray-800 text-white hover:bg-black"><TableCell className="flex items-center"><Target className="mr-2 h-5 w-5"/>NET INCOME</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.netIncome)}</TableCell></TableRow></TableFooter>
                </Table>
            </CardContent>
        </Card>
    );

    const renderBalanceSheet = () => data && (
        <Card>
            <CardHeader><CardTitle>BALANCE SHEET (Statement of Financial Position)</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">{`Current Period (${format(bsDate!, 'MMM dd, yyyy')})`}</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow className="font-bold text-lg"><TableCell colSpan={2} className="flex items-center"><PiggyBank className="mr-2 h-5 w-5"/> ASSETS</TableCell></TableRow>
                        {Object.entries(data.balanceSheet.assets).map(([subType, group]) => <React.Fragment key={subType}> 
                            <TableRow className="font-semibold bg-gray-50"><TableCell colSpan={2} className="pl-8">{subType}</TableCell></TableRow>
                            {group.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-12">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, true)}</TableCell></TableRow>)}
                        </React.Fragment>)}
                        <TableRow className="font-bold bg-blue-100"><TableCell>TOTAL ASSETS</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalAssets)}</TableCell></TableRow>

                        <TableRow className="font-bold text-lg"><TableCell colSpan={2} className="flex items-center pt-6"><Landmark className="mr-2 h-5 w-5"/> LIABILITIES</TableCell></TableRow>
                        {Object.entries(data.balanceSheet.liabilities).map(([subType, group]) => <React.Fragment key={subType}> 
                            <TableRow className="font-semibold bg-gray-50"><TableCell colSpan={2} className="pl-8">{subType}</TableCell></TableRow>
                             {group.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-12">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, true)}</TableCell></TableRow>)}
                        </React.Fragment>)}
                         <TableRow className="font-bold bg-yellow-100"><TableCell>TOTAL LIABILITIES</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalLiabilities)}</TableCell></TableRow>

                        <TableRow className="font-bold text-lg"><TableCell colSpan={2} className="flex items-center pt-6"><Users className="mr-2 h-5 w-5"/> EQUITY</TableCell></TableRow>
                        {Object.entries(data.balanceSheet.equity).map(([subType, group]) => <React.Fragment key={subType}> 
                            <TableRow className="font-semibold bg-gray-50"><TableCell colSpan={2} className="pl-8">{subType}</TableCell></TableRow>
                            {group.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-12">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, true)}</TableCell></TableRow>)}
                        </React.Fragment>)}
                        <TableRow><TableCell className="pl-12">Net Income (Current Period)</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.netIncome)}</TableCell></TableRow>
                        <TableRow className="font-bold bg-green-100"><TableCell>TOTAL EQUITY</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalEquity)}</TableCell></TableRow>
                    </TableBody>
                     <TableFooter><TableRow className="font-extrabold text-xl bg-gray-800 text-white hover:bg-black"><TableCell>TOTAL LIABILITIES + EQUITY</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalLiabilitiesAndEquity)}</TableCell></TableRow></TableFooter>
                </Table>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Financial Statement</h1>
            <Card>
                <CardHeader><CardTitle>Report Controls</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2"><label className="text-sm font-medium">Balance Sheet As of</label><DatePicker date={bsDate} setDate={setBsDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">IS From Date</label><DatePicker date={isStartDate} setDate={setIsStartDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">IS To Date</label><DatePicker date={isEndDate} setDate={setIsEndDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Compare BS (Optional)</label><DatePicker date={compareBsDate} setDate={setCompareBsDate} /></div>
                    <div className="flex items-center space-x-2"><Checkbox id="hide-zero" checked={hideZeroBalances} onCheckedChange={(c) => setHideZeroBalances(c as boolean)} /><label htmlFor="hide-zero">Hide Zero Balances</label></div>
                    <Button onClick={generateReport} disabled={isLoading || chartOfAccounts.length === 0} className="w-full col-span-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Report
                    </Button>
                </CardContent>
            </Card>
            
            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-4">Generating statements...</span></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}

            {data && (
                <div className="space-y-6">
                    {renderSummary()}
                    {renderIncomeStatement()}
                    {renderBalanceSheet()}
                </div>
            )}

            {!isLoading && !data && !error && <div className="text-center py-12 text-muted-foreground">Please generate a report to view the financial statements.</div>}
        </div>
    );
};

export default FinancialStatementPage;
