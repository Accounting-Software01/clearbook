'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, FileText, Download, Printer } from 'lucide-react';
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

const CashInflowPage = () => {
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

            const change = bal.closingBalance - bal.openingBalance;
            
            if (account.account_name.includes('Cash')) {
                openingCash -= bal.openingBalance;
                closingCash -= bal.closingBalance;
                return; 
            }

            if (Math.abs(change) < 0.01) return;
            
            // We only care about inflows (positive changes for cash)
            // For assets, a decrease is a cash inflow (change is positive).
            // For liabilities, an increase is a cash inflow (change is positive).
             if(change < 0 && (account.account_type === 'Asset' || account.account_type === 'Liability')) return;

            const activityName = `${account.account_name} (${change > 0 ? 'Increase' : 'Decrease'})`;

            switch (account.account_type) {
                case 'Asset':
                    if ([ 'Accounts Receivable', 'Inventory'].some(sub => account.account_name.includes(sub))) {
                        operatingActivities.push({ name: activityName, amount: change });
                    } else { // Non-current assets -> Investing
                        investingActivities.push({ name: activityName, amount: change });
                    }
                    break;
                case 'Liability':
                    if (['Accounts Payable'].some(sub => account.account_name.includes(sub))) {
                        operatingActivities.push({ name: activityName, amount: change });
                    } else { // Non-current liabilities -> Financing
                        financingActivities.push({ name: activityName, amount: change });
                    }
                    break;
                case 'Equity':
                     // Equity changes can be inflows (e.g. issuing stock)
                    if(change > 0){
                        financingActivities.push({ name: activityName, amount: change });
                    }
                    break;
            }
        });

        const totalOperating = operatingActivities.reduce((sum, item) => sum + item.amount, netIncome > 0 ? netIncome : 0);
        const totalInvesting = investingActivities.reduce((sum, item) => sum + item.amount, 0);
        const totalFinancing = financingActivities.reduce((sum, item) => sum + item.amount, 0);
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
                ...(data.netIncome > 0 ? [['Net Income', formatCurrency(data.netIncome)]] : []),
                ...data.operatingActivities.map(item => [item.name, formatCurrency(item.amount)]).filter(row => row[1] !== '-'),
                ['Net Cash Inflow from Operating Activities', formatCurrency(data.totalOperating)],
                [' ', ' '],
                ['CASH INFLOWS FROM INVESTING ACTIVITIES', ''],
                ...data.investingActivities.map(item => [item.name, formatCurrency(item.amount)]).filter(row => row[1] !== '-'),
                ['Net Cash Inflow from Investing Activities', formatCurrency(data.totalInvesting)],
                [' ', ' '],
                ['CASH INFLOWS FROM FINANCING ACTIVITIES', ''],
                ...data.financingActivities.map(item => [item.name, formatCurrency(item.amount)]).filter(row => row[1] !== '-'),
                ['Net Cash Inflow from Financing Activities', formatCurrency(data.totalFinancing)],
                 [' ', ' '],
                ['TOTAL CASH INFLOW', formatCurrency(data.netCashFlow)],
            ];

        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text("Cash Inflow Report", 14, 15);
            (doc as any).autoTable({ startY: 20, head: head, body: body, theme: 'striped' });
            doc.save('Cash_Inflow_Report.pdf');
        } else {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([['Cash Inflow Report'], [], ...head, ...body]);
            XLSX.utils.book_append_sheet(wb, ws, 'Cash Inflow');
            XLSX.writeFile(wb, 'Cash_Inflow_Report.xlsx');
        }
    };
    
    const totalInflow = useMemo(() => data ? data.totalOperating + data.totalInvesting + data.totalFinancing : 0, [data]);

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Cash Inflow</h1>
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

            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-4">Generating report...</p></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}

            {data && (
                 <div className="space-y-4">
                    <Card>
                         <CardContent className="p-6">
                            <div className="text-center"><p className="text-sm text-muted-foreground">Total Cash Inflow</p><p className="text-3xl font-bold">{formatCurrency(totalInflow)}</p></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Inflow Details</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    <TableRow className="font-bold"><TableCell colSpan={2}>OPERATING ACTIVITIES</TableCell></TableRow>
                                    {data.netIncome > 0 && <TableRow><TableCell className="pl-8">Net Income</TableCell><TableCell className="text-right">{formatCurrency(data.netIncome)}</TableCell></TableRow>}
                                    {data.operatingActivities.map((item, i) => item.amount > 0 && <TableRow key={i}><TableCell className="pl-8">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.amount)}</TableCell></TableRow>).filter(Boolean)}
                                    <TableRow className="font-semibold bg-gray-50"><TableCell>Net Cash Inflow from Operating Activities</TableCell><TableCell className="text-right">{formatCurrency(data.totalOperating)}</TableCell></TableRow>

                                    <TableRow className="font-bold pt-4"><TableCell colSpan={2}>INVESTING ACTIVITIES</TableCell></TableRow>
                                    {data.investingActivities.length > 0 ? 
                                        data.investingActivities.map((item, i) => item.amount > 0 && <TableRow key={i}><TableCell className="pl-8">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.amount)}</TableCell></TableRow>).filter(Boolean)
                                        : <TableRow><TableCell className="pl-8 text-muted-foreground" colSpan={2}>No investing inflows in this period</TableCell></TableRow>}
                                    <TableRow className="font-semibold bg-gray-50"><TableCell>Net Cash Inflow from Investing Activities</TableCell><TableCell className="text-right">{formatCurrency(data.totalInvesting)}</TableCell></TableRow>

                                    <TableRow className="font-bold pt-4"><TableCell colSpan={2}>FINANCING ACTIVITIES</TableCell></TableRow>
                                    {data.financingActivities.length > 0 ?
                                        data.financingActivities.map((item, i) => item.amount > 0 && <TableRow key={i}><TableCell className="pl-8">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.amount)}</TableCell></TableRow>).filter(Boolean)
                                        : <TableRow><TableCell className="pl-8 text-muted-foreground" colSpan={2}>No financing inflows in this period</TableCell></TableRow>}
                                    <TableRow className="font-semibold bg-gray-50"><TableCell>Net Cash Inflow from Financing Activities</TableCell><TableCell className="text-right">{formatCurrency(data.totalFinancing)}</TableCell></TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-bold text-lg"><TableCell>TOTAL CASH INFLOW</TableCell><TableCell className="text-right">{formatCurrency(totalInflow)}</TableCell></TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
             {!isLoading && !data && !error && <div className="text-center py-12 text-muted-foreground">Please generate a report to view the cash inflow.</div>}
        </div>
    );
};

export default CashInflowPage;
