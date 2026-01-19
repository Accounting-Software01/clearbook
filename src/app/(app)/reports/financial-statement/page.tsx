'use client';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Loader2, AlertCircle, CheckCircle, TrendingUp, ShoppingCart, TrendingDown, PiggyBank, Landmark, Users, ChevronsRight, Target, DollarSign, FileText, Download, Printer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Interfaces
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
        totalEquity: number;
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
    const [data, setData] = useState<ProcessedData | null>(null);

    // Date States
    const [bsDate, setBsDate] = useState<Date | undefined>(new Date());
    const [isStartDate, setIsStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
    const [isEndDate, setIsEndDate] = useState<Date | undefined>(new Date());

    const [hideZeroBalances, setHideZeroBalances] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateReport = useCallback(async () => {
        if (!bsDate || !isStartDate || !isEndDate || !user?.company_id) {
            setError("Please select all required dates.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setData(null);

        const formatDateStr = (d: Date) => format(d, 'yyyy-MM-dd');
        const bsUrl = `https://hariindustries.net/api/clearbook/balance-sheet.php?company_id=${user.company_id}&toDate=${formatDateStr(bsDate)}`;
        const isUrl = `https://hariindustries.net/api/clearbook/income-statement.php?company_id=${user.company_id}&fromDate=${formatDateStr(isStartDate)}&toDate=${formatDateStr(isEndDate)}`;

        try {
            const [bsRes, isRes] = await Promise.all([fetch(bsUrl), fetch(isUrl)]);
            if (!bsRes.ok || !isRes.ok) throw new Error('Failed to fetch one or more reports.');
            const [bsData, isData] = await Promise.all([bsRes.json(), isRes.json()]);

            if (!bsData.success || !isData.success) {
                throw new Error(bsData.message || isData.message || 'API call failed');
            }
            
            const transformIsGroup = (group: any): ReportGroup => {
                if (!group || !Array.isArray(group.accounts)) return { accounts: [], total: 0 };
                return {
                    accounts: group.accounts.map((acc: any) => ({
                        id: acc.id,
                        name: acc.name,
                        balance: acc.amount 
                    })),
                    total: group.total
                };
            };
            
            const transformBsGroup = (groups: any): Record<string, ReportGroup> => {
                 if (!groups) return {};
                 const result: Record<string, ReportGroup> = {};
                 for (const key in groups) {
                     result[key] = {
                         accounts: groups[key].accounts.map((acc: any) => ({
                             id: acc.id,
                             name: acc.name,
                             balance: acc.balance
                         })),
                         total: groups[key].total
                     };
                 }
                 return result;
            };

            const processed: ProcessedData = {
                incomeStatement: {
                    revenue: transformIsGroup(isData.processedData.revenue),
                    cogs: transformIsGroup(isData.processedData.costOfGoodsSold),
                    expenses: transformIsGroup(isData.processedData.expenses),
                    grossProfit: isData.processedData.grossProfit.amount,
                    netIncome: isData.processedData.netIncome.amount,
                },
                balanceSheet: {
                    assets: transformBsGroup(bsData.processedData.assets.subGroups),
                    liabilities: transformBsGroup(bsData.processedData.liabilities.subGroups),
                    equity: transformBsGroup(bsData.processedData.equity.subGroups),
                    totalAssets: bsData.processedData.assets.total,
                    totalLiabilities: bsData.processedData.liabilities.total,
                    totalEquity: bsData.processedData.equity.total,
                    totalLiabilitiesAndEquity: bsData.processedData.totalLiabilitiesAndEquity
                }
            };
            setData(processed);
        } catch (e: any) {
            setError(`Failed to generate report: ${e.message}`);
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [bsDate, isStartDate, isEndDate, user, toast]);
    
    const handleExportExcel = () => {
        if (!data) return;
        const wb = XLSX.utils.book_new();
        
        // Income Statement
        const isHeader = ['INCOME STATEMENT', 'Amount'];
        const isData = [
            ...data.incomeStatement.revenue.accounts.map(a => [a.name, a.balance]),
            ['Total Revenue', data.incomeStatement.revenue.total],
            ...data.incomeStatement.cogs.accounts.map(a => [a.name, a.balance]),
            ['Total COGS', data.incomeStatement.cogs.total],
            ['Gross Profit', data.incomeStatement.grossProfit],
            ...data.incomeStatement.expenses.accounts.map(a => [a.name, a.balance]),
            ['Total Expenses', data.incomeStatement.expenses.total],
            ['Net Income', data.incomeStatement.netIncome]
        ];
        const isWs = XLSX.utils.aoa_to_sheet([isHeader, ...isData]);
        XLSX.utils.book_append_sheet(wb, isWs, "Income Statement");

        // Balance Sheet
        const bsHeader = ['BALANCE SHEET', 'Amount'];
        let bsData: (string | number)[][] = [];
        bsData.push(['ASSETS', '']);
        Object.values(data.balanceSheet.assets).forEach(g => { g.accounts.forEach(a => bsData.push([a.name, a.balance])) });
        bsData.push(['Total Assets', data.balanceSheet.totalAssets]);
        bsData.push(['LIABILITIES', '']);
        Object.values(data.balanceSheet.liabilities).forEach(g => { g.accounts.forEach(a => bsData.push([a.name, a.balance])) });
        bsData.push(['Total Liabilities', data.balanceSheet.totalLiabilities]);
        bsData.push(['EQUITY', '']);
        Object.values(data.balanceSheet.equity).forEach(g => { g.accounts.forEach(a => bsData.push([a.name, a.balance])) });
        bsData.push(['Total Equity', data.balanceSheet.totalEquity]);

        const bsWs = XLSX.utils.aoa_to_sheet([bsHeader, ...bsData]);
        XLSX.utils.book_append_sheet(wb, bsWs, "Balance Sheet");

        XLSX.writeFile(wb, 'Financial_Statement.xlsx');
    };

    const handleExportPdf = () => {
        if (!data) return;
        const doc = new jsPDF();
        const table = (config: any) => (doc as any).autoTable(config);

        doc.text("Financial Statement", 14, 15);
        
        // Income Statement
        table({
            startY: 20,
            head: [['INCOME STATEMENT', '']],
            body: [
                ...data.incomeStatement.revenue.accounts.map(a => [a.name, formatCurrency(a.balance)]),
                ['Total Revenue', formatCurrency(data.incomeStatement.revenue.total)],
                ...data.incomeStatement.cogs.accounts.map(a => [a.name, formatCurrency(a.balance)]),
                ['Total COGS', formatCurrency(data.incomeStatement.cogs.total)],
                ['Gross Profit', formatCurrency(data.incomeStatement.grossProfit)],
                ...data.incomeStatement.expenses.accounts.map(a => [a.name, formatCurrency(a.balance)]),
                ['Total Expenses', formatCurrency(data.incomeStatement.expenses.total)],
                ['Net Income', formatCurrency(data.incomeStatement.netIncome)],
            ]
        });

        // Balance Sheet
        table({
            head: [['BALANCE SHEET', '']],
            body: [
                ['ASSETS', ''],
                ...Object.values(data.balanceSheet.assets).flatMap(g => g.accounts.map(a => [a.name, formatCurrency(a.balance)])),
                ['Total Assets', formatCurrency(data.balanceSheet.totalAssets)],
                ['LIABILITIES', ''],
                ...Object.values(data.balanceSheet.liabilities).flatMap(g => g.accounts.map(a => [a.name, formatCurrency(a.balance)])),
                ['Total Liabilities', formatCurrency(data.balanceSheet.totalLiabilities)],
                ['EQUITY', ''],
                ...Object.values(data.balanceSheet.equity).flatMap(g => g.accounts.map(a => [a.name, formatCurrency(a.balance)])),
                ['Total Equity', formatCurrency(data.balanceSheet.totalEquity)],
            ]
        });
        
        doc.save('Financial_Statement.pdf');
    };
    
    const isBalanced = useMemo(() => data ? Math.abs(data.balanceSheet.totalAssets - data.balanceSheet.totalLiabilitiesAndEquity) < 0.01 : false, [data]);

    // RENDER HELPERS
    const renderSummary = () => data && (
        <div className="space-y-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardHeader><CardTitle>Total Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.incomeStatement.revenue.total)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Net Income</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.incomeStatement.netIncome)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Total Assets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.balanceSheet.totalAssets)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Total Equity</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(data.balanceSheet.totalEquity)}</p></CardContent></Card>
            </div>
            <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <CardContent className="p-4 flex justify-between items-center">
                    <div className={`flex items-center font-semibold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}><CheckCircle className="h-5 w-5 mr-2"/> Balance: {isBalanced ? 'Balanced' : 'Out of Balance'}</div>
                    <div className="text-sm font-semibold">Assets: {formatCurrency(data.balanceSheet.totalAssets)} | Liab. + Equity: {formatCurrency(data.balanceSheet.totalLiabilitiesAndEquity)}</div>
                </CardContent>
            </Card>
        </div>
    );

    const renderIncomeStatement = () => data && (
        <Card>
            <CardHeader><CardTitle>INCOME STATEMENT</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow className="font-bold"><TableCell colSpan={2}><TrendingUp className="inline-flex mr-2 h-4 w-4"/>REVENUE</TableCell></TableRow>
                        {data.incomeStatement.revenue.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-10">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, hideZeroBalances)}</TableCell></TableRow>)}
                        <TableRow className="font-semibold bg-gray-50"><TableCell>Total Revenue</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.revenue.total)}</TableCell></TableRow>
                        
                        <TableRow className="font-bold"><TableCell colSpan={2}><ShoppingCart className="inline-flex mr-2 h-4 w-4 pt-4"/>COST OF GOODS SOLD</TableCell></TableRow>
                        {data.incomeStatement.cogs.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-10">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, hideZeroBalances)}</TableCell></TableRow>)}
                        <TableRow className="font-semibold bg-gray-50"><TableCell>Total COGS</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.cogs.total)}</TableCell></TableRow>
                        
                        <TableRow className="font-bold text-lg bg-green-100"><TableCell><ChevronsRight className="inline-flex mr-2 h-4 w-4"/>GROSS PROFIT</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.grossProfit)}</TableCell></TableRow>
                        
                        <TableRow className="font-bold"><TableCell colSpan={2}><TrendingDown className="inline-flex mr-2 h-4 w-4 pt-4"/>OPERATING EXPENSES</TableCell></TableRow>
                        {data.incomeStatement.expenses.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-10">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, hideZeroBalances)}</TableCell></TableRow>)}
                        <TableRow className="font-semibold bg-gray-50"><TableCell>Total Operating Expenses</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.expenses.total)}</TableCell></TableRow>
                    </TableBody>
                    <TableFooter><TableRow className="font-extrabold text-xl bg-gray-800 text-white hover:bg-black"><TableCell><Target className="inline-flex mr-2 h-5 w-5"/>NET INCOME</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.incomeStatement.netIncome)}</TableCell></TableRow></TableFooter>
                </Table>
            </CardContent>
        </Card>
    );

    const renderBalanceSheet = () => data && (
        <Card>
            <CardHeader><CardTitle>BALANCE SHEET</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">{`As of ${format(bsDate!, 'MMM dd, yyyy')}`}</TableHead></TableRow></TableHeader>
                    <TableBody>
                        <TableRow className="font-bold text-lg"><TableCell colSpan={2}><PiggyBank className="inline-flex mr-2 h-5 w-5"/>ASSETS</TableCell></TableRow>
                        {Object.entries(data.balanceSheet.assets).map(([subType, group]) => <React.Fragment key={subType}> 
                            <TableRow className="font-semibold bg-gray-50"><TableCell colSpan={2} className="pl-8">{subType}</TableCell></TableRow>
                            {group.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-12">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, hideZeroBalances)}</TableCell></TableRow>)}
                        </React.Fragment>)}
                        <TableRow className="font-bold bg-blue-100"><TableCell>TOTAL ASSETS</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalAssets)}</TableCell></TableRow>

                        <TableRow className="font-bold text-lg"><TableCell colSpan={2} className="pt-6"><Landmark className="inline-flex mr-2 h-5 w-5"/>LIABILITIES</TableCell></TableRow>
                        {Object.entries(data.balanceSheet.liabilities).map(([subType, group]) => <React.Fragment key={subType}> 
                            <TableRow className="font-semibold bg-gray-50"><TableCell colSpan={2} className="pl-8">{subType}</TableCell></TableRow>
                             {group.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-12">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, hideZeroBalances)}</TableCell></TableRow>)}
                        </React.Fragment>)}
                         <TableRow className="font-bold bg-yellow-100"><TableCell>TOTAL LIABILITIES</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalLiabilities)}</TableCell></TableRow>

                        <TableRow className="font-bold text-lg"><TableCell colSpan={2} className="pt-6"><Users className="inline-flex mr-2 h-5 w-5"/>EQUITY</TableCell></TableRow>
                        {Object.entries(data.balanceSheet.equity).map(([subType, group]) => <React.Fragment key={subType}> 
                            <TableRow className="font-semibold bg-gray-50"><TableCell colSpan={2} className="pl-8">{subType}</TableCell></TableRow>
                            {group.accounts.map(acc => <TableRow key={acc.id}><TableCell className="pl-12">{acc.name}</TableCell><TableCell className="text-right font-mono">{formatCurrency(acc.balance, hideZeroBalances)}</TableCell></TableRow>)}
                        </React.Fragment>)}
                        <TableRow className="font-bold bg-green-100"><TableCell>TOTAL EQUITY</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalEquity)}</TableCell></TableRow>
                    </TableBody>
                     <TableFooter><TableRow className="font-extrabold text-xl bg-gray-800 text-white hover:bg-black"><TableCell>TOTAL LIABILITIES + EQUITY</TableCell><TableCell className="text-right font-mono">{formatCurrency(data.balanceSheet.totalLiabilitiesAndEquity)}</TableCell></TableRow></TableFooter>
                </Table>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Financial Statement</h1>
                {data && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleExportExcel}><Download className="mr-2 h-4 w-4" />Excel</Button>
                        <Button variant="outline" onClick={handleExportPdf}><Printer className="mr-2 h-4 w-4" />PDF</Button>
                    </div>
                )}
            </div>
            
            <Card>
                <CardHeader><CardTitle>Report Controls</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2"><label className="text-sm font-medium">Balance Sheet As of</label><DatePicker date={bsDate} setDate={setBsDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">IS From</label><DatePicker date={isStartDate} setDate={setIsStartDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">IS To</label><DatePicker date={isEndDate} setDate={setIsEndDate} /></div>
                    <div className="flex items-center space-x-2"><Checkbox id="hide-zero" checked={hideZeroBalances} onCheckedChange={(c) => setHideZeroBalances(c as boolean)} /><label htmlFor="hide-zero">Hide Zero Balances</label></div>
                    <Button onClick={generateReport} disabled={isLoading} className="w-full col-span-full lg:col-span-4">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Report
                    </Button>
                </CardContent>
            </Card>
            
            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-4">Generating financial statements...</p></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}

            {data && (
                <div className="space-y-6">
                    {renderSummary()}
                    {renderIncomeStatement()}
                    {renderBalanceSheet()}
                </div>
            )}

            {!isLoading && !data && !error && <div className="text-center py-12 text-muted-foreground">Please select your desired dates and generate a report.</div>}
        </div>
    );
};

export default FinancialStatementPage;
