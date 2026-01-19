'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileText, Download, Printer, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Define interfaces for our data structures
interface Activity {
    name: string;
    amount: number;
}

interface ProcessedCashFlowData {
    operatingActivities: Activity[];
    investingActivities: Activity[];
    financingActivities: Activity[];
    netIncome: number;
    totalOperating: number;
    totalInvesting: number;
    totalFinancing: number;
    openingCash: number;
    closingCash: number;
    netCashFlow: number;
}

const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '-';
    }
    const formatted = new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const CashFlowStatementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState<ProcessedCashFlowData | null>(null);
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const processCashFlowData = (balances: any[], accounts: any[], netIncome: number): ProcessedCashFlowData => {
        const accountMap = new Map(accounts.map(acc => [acc.account_code, acc]));
        
        let operatingActivities: Activity[] = [];
        let investingActivities: Activity[] = [];
        let financingActivities: Activity[] = [];
        let openingCash = 0;
        let closingCash = 0;

        balances.forEach(bal => {
            const account = accountMap.get(bal.accountId);
            if (!account) return;

            // This is the raw change from the API. For assets, it will be negative if the asset increased.
            const change = bal.closingBalance - bal.openingBalance;
            
            // Segregate cash accounts to calculate opening and closing balances
            if (account.account_name.includes('Cash')) {
                // FIX #1: Correctly calculate cash balance.
                // Since the API sends asset balances as negative, we subtract to make them positive.
                openingCash -= bal.openingBalance;
                closingCash -= bal.closingBalance;
                return; 
            }

            // Skip accounts that didn't change
            if (Math.abs(change) < 0.01) return;

            const activityName = `${account.account_name} (${change > 0 ? 'Increase' : 'Decrease'})`;

            switch (account.account_type) {
                case 'Asset':
                    // FIX #2: Correctly calculate cash flow from assets.
                    // An increase in an asset is a use of cash (negative). The 'change' variable from the API is already negative for an asset increase, so we use it directly.
                    if ([ 'Accounts Receivable', 'Inventory'].some(sub => account.account_name.includes(sub))) {
                        operatingActivities.push({ name: activityName, amount: change });
                    } else { // Non-current assets -> Investing
                        investingActivities.push({ name: activityName, amount: change });
                    }
                    break;
                case 'Liability':
                    // This is correct. An increase in a liability is a source of cash (positive). 'change' is already positive.
                    if (['Accounts Payable'].some(sub => account.account_name.includes(sub))) {
                        operatingActivities.push({ name: activityName, amount: change });
                    } else { // Non-current liabilities -> Financing
                        financingActivities.push({ name: activityName, amount: change });
                    }
                    break;
                case 'Equity':
                    // This is correct.
                    financingActivities.push({ name: activityName, amount: change });
                    break;
            }
        });

        const totalOperating = operatingActivities.reduce((sum, item) => sum + item.amount, netIncome);
        const totalInvesting = investingActivities.reduce((sum, item) => sum + item.amount, 0);
        const totalFinancing = financingActivities.reduce((sum, item) => sum + item.amount, 0);
        
        // The Net Cash Flow is the sum of activities, NOT the difference in closing/opening cash.
        // We use the closing/opening cash for verification.
        const netCashFlow = totalOperating + totalInvesting + totalFinancing;

        return {
            operatingActivities, investingActivities, financingActivities, netIncome, totalOperating, totalInvesting, totalFinancing, openingCash, closingCash, netCashFlow
        };
    };


    const generateReport = useCallback(async () => {
        if (!fromDate || !toDate || !user?.company_id) {
            setError("Please select all required dates.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setData(null);

        const formatDateStr = (d: Date) => format(d, 'yyyy-MM-dd');
        const cashFlowUrl = `https://hariindustries.net/api/clearbook/cash-flow.php?company_id=${user.company_id}&fromDate=${formatDateStr(fromDate)}&toDate=${formatDateStr(toDate)}`;
        const accountsUrl = `https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${user.company_id}`;
        const incomeUrl = `https://hariindustries.net/api/clearbook/income-statement.php?company_id=${user.company_id}&fromDate=${formatDateStr(fromDate)}&toDate=${formatDateStr(toDate)}`;

        try {
            const [cashFlowRes, accountsRes, incomeRes] = await Promise.all([
                fetch(cashFlowUrl),
                fetch(accountsUrl),
                fetch(incomeUrl)
            ]);

            // Improved error checking
            if (!cashFlowRes.ok) throw new Error(`Failed to fetch Cash Flow data. Server responded with status ${cashFlowRes.status}`);
            if (!accountsRes.ok) throw new Error(`Failed to fetch Chart of Accounts. Server responded with status ${accountsRes.status}`);
            if (!incomeRes.ok) throw new Error(`Failed to fetch Income Statement. Server responded with status ${incomeRes.status}`);
            
            const [balances, accountsResponse, incomeResponse] = await Promise.all([cashFlowRes.json(), accountsRes.json(), incomeRes.json()]);

            let chartOfAccounts;
            if (Array.isArray(accountsResponse)) {
                chartOfAccounts = accountsResponse;
            } else if (accountsResponse.success && Array.isArray(accountsResponse.accounts)) {
                chartOfAccounts = accountsResponse.accounts;
            } else {
                throw new Error('Could not parse the chart of accounts data.');
            }

            if (!Array.isArray(balances)) throw new Error('Invalid data format from the cash-flow API.');
            if (!incomeResponse.success) throw new Error(incomeResponse.message || 'Failed to fetch net income.');

            const netIncome = incomeResponse.processedData?.netIncome?.amount || 0;
            const processedData = processCashFlowData(balances, chartOfAccounts, netIncome);

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
        const head = [['Description', 'Amount']];
        const body = [
                ['Net Income', formatCurrency(data.netIncome)],
                ...data.operatingActivities.map(item => [item.name, formatCurrency(item.amount)]),
                ['Net Cash from Operating Activities', formatCurrency(data.totalOperating)],
                [' ', ' '], // Spacer
                ['CASH FLOWS FROM INVESTING ACTIVITIES', ''],
                ...data.investingActivities.map(item => [item.name, formatCurrency(item.amount)]),
                ['Net Cash from Investing Activities', formatCurrency(data.totalInvesting)],
                [' ', ' '], // Spacer
                ['CASH FLOWS FROM FINANCING ACTIVITIES', ''],
                ...data.financingActivities.map(item => [item.name, formatCurrency(item.amount)]),
                ['Net Cash from Financing Activities', formatCurrency(data.totalFinancing)],
                 [' ', ' '], // Spacer
                ['NET INCREASE/(DECREASE) IN CASH', formatCurrency(data.netCashFlow)],
                ['Cash and Cash Equivalents, Beginning', formatCurrency(data.openingCash)],
                ['Cash and Cash Equivalents, End', formatCurrency(data.closingCash)],
            ];

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text("Cash Flow Statement", 14, 15);
            (doc as any).autoTable({ startY: 20, head: head, body: body, theme: 'striped' });
            doc.save('Cash_Flow_Statement.pdf');
        } else {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([['Cash Flow Statement'], [], ...head, ...body]);
            XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
            XLSX.writeFile(wb, 'Cash_Flow_Statement.xlsx');
        }
    };
    
    const isBalanced = useMemo(() => data ? Math.abs(data.openingCash + data.netCashFlow - data.closingCash) < 0.01 : false, [data]);

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Cash Flow Statement</h1>
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
                    <div className="space-y-2"><label className="text-sm font-medium">From Date</label><DatePicker date={fromDate} setDate={setFromDate} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">To Date</label><DatePicker date={toDate} setDate={setToDate} /></div>
                    <Button onClick={generateReport} disabled={isLoading} className="w-full col-span-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Report
                    </Button>
                </CardContent>
            </Card>

            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-4">Generating statement...</p></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}

            {data && (
                 <div className="space-y-4">
                    <Card>
                         <CardContent className="grid grid-cols-3 divide-x p-6">
                            <div className="text-center"><p className="text-sm text-muted-foreground">Opening Cash Balance</p><p className="text-2xl font-bold">{formatCurrency(data.openingCash)}</p></div>
                            <div className="text-center"><p className="text-sm text-muted-foreground">Net Cash Flow</p><p className="text-2xl font-bold">{formatCurrency(data.netCashFlow)}</p></div>
                            <div className="text-center"><p className="text-sm text-muted-foreground">Closing Cash Balance</p><p className="text-2xl font-bold">{formatCurrency(data.closingCash)}</p></div>
                        </CardContent>
                    </Card>
                    <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <CardContent className="p-3 flex items-center justify-center font-semibold text-sm">
                            {isBalanced ? <CheckCircle className="h-5 w-5 mr-2 text-green-700"/> : <AlertCircle className="h-5 w-5 mr-2 text-red-700"/>}
                            <span className={isBalanced ? 'text-green-700' : 'text-red-700'}>Verification: Opening + Net Flow equals Closing</span>
                        </CardContent>
                     </Card>

                    <Card>
                        <CardHeader><CardTitle>Statement Details</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow className="font-bold"><TableCell colSpan={2}>CASH FLOWS FROM OPERATING ACTIVITIES</TableCell></TableRow>
                                    <TableRow><TableCell className="pl-8">Net Income</TableCell><TableCell className="text-right">{formatCurrency(data.netIncome)}</TableCell></TableRow>
                                    {data.operatingActivities.map((item, i) => <TableRow key={i}><TableCell className="pl-8">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.amount)}</TableCell></TableRow>)}
                                    <TableRow className="font-semibold bg-gray-50"><TableCell>Net Cash from Operating Activities</TableCell><TableCell className="text-right">{formatCurrency(data.totalOperating)}</TableCell></TableRow>

                                    <TableRow className="font-bold pt-4"><TableCell colSpan={2}>CASH FLOWS FROM INVESTING ACTIVITIES</TableCell></TableRow>
                                    {data.investingActivities.length > 0 ? 
                                        data.investingActivities.map((item, i) => <TableRow key={i}><TableCell className="pl-8">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.amount)}</TableCell></TableRow>)
                                        : <TableRow><TableCell className="pl-8 text-muted-foreground" colSpan={2}>No investing activities in this period</TableCell></TableRow>}
                                    <TableRow className="font-semibold bg-gray-50"><TableCell>Net Cash from Investing Activities</TableCell><TableCell className="text-right">{formatCurrency(data.totalInvesting)}</TableCell></TableRow>

                                    <TableRow className="font-bold pt-4"><TableCell colSpan={2}>CASH FLOWS FROM FINANCING ACTIVITIES</TableCell></TableRow>
                                    {data.financingActivities.length > 0 ?
                                        data.financingActivities.map((item, i) => <TableRow key={i}><TableCell className="pl-8">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.amount)}</TableCell></TableRow>)
                                        : <TableRow><TableCell className="pl-8 text-muted-foreground" colSpan={2}>No financing activities in this period</TableCell></TableRow>}
                                    <TableRow className="font-semibold bg-gray-50"><TableCell>Net Cash from Financing Activities</TableCell><TableCell className="text-right">{formatCurrency(data.totalFinancing)}</TableCell></TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold text-lg"><TableCell>NET INCREASE/(DECREASE) IN CASH</TableCell><TableCell className="text-right">{formatCurrency(data.netCashFlow)}</TableCell></TableRow>
                                    <TableRow><TableCell className="pl-4">Cash and Cash Equivalents, Beginning of Period</TableCell><TableCell className="text-right">{formatCurrency(data.openingCash)}</TableCell></TableRow>
                                    <TableRow className="font-bold"><TableCell className="pl-4">Cash and Cash Equivalents, End of Period</TableCell><TableCell className="text-right">{formatCurrency(data.closingCash)}</TableCell></TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
             {!isLoading && !data && !error && <div className="text-center py-12 text-muted-foreground">Please generate a report to view the cash flow statement.</div>}
        </div>
    );
};

export default CashFlowStatementPage;
