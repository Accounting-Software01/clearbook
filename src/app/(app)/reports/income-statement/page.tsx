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
  TableFooter
} from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2, AlertCircle, TrendingUp, ShoppingCart, TrendingDown, ChevronsRight, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface Account {
    id: string;
    account_name: string;
    account_type: string;
    sub_type: string;
}

interface BackendBalance {
    accountId: string;
    balance: number; // Net balance for the period for P&L accounts
}

interface ReportAccount {
    id: string;
    name: string;
    amount: number;
}

interface ReportSection {
    accounts: ReportAccount[];
    total: number;
}

interface ProcessedData {
    revenue: ReportSection;
    costOfGoodsSold: ReportSection;
    grossProfit: number;
    expenses: ReportSection;
    netIncome: number;
}

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '0.00';
    }
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

const IncomeStatementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [chartOfAccounts, setChartOfAccounts] = useState<Account[]>([]);
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
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

    const processData = useCallback((rawData: BackendBalance[], accounts: Account[]): ProcessedData => {
        const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
        const result: ProcessedData = {
            revenue: { accounts: [], total: 0 },
            costOfGoodsSold: { accounts: [], total: 0 },
            grossProfit: 0,
            expenses: { accounts: [], total: 0 },
            netIncome: 0
        };

        rawData.forEach(item => {
            const account = accountMap.get(item.accountId);
            if (!account || item.balance === 0) return;

            // P&L balances: credit is positive for revenue, debit is positive for expenses/cogs
            const amount = -item.balance;
            const newAccount: ReportAccount = { id: account.id, name: account.account_name, amount };

            if (account.account_type === 'Revenue') {
                result.revenue.accounts.push(newAccount);
                result.revenue.total += newAccount.amount;
            } else if (account.account_type === 'Cost of Goods Sold') {
                result.costOfGoodsSold.accounts.push(newAccount);
                result.costOfGoodsSold.total += newAccount.amount;
            } else if (account.account_type === 'Expense') {
                result.expenses.accounts.push(newAccount);
                result.expenses.total += newAccount.amount;
            }
        });

        result.grossProfit = result.revenue.total - result.costOfGoodsSold.total;
        result.netIncome = result.grossProfit - result.expenses.total;
        
        return result;
    }, []);

    const generateReport = useCallback(async () => {
        if (!startDate || !endDate) {
            setError("Please select a valid date range.");
            return;
        }
        if (!user?.company_id || chartOfAccounts.length === 0) {
            setError("Company or accounts not loaded.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setProcessedData(null);
        
        const fromDate = format(startDate, 'yyyy-MM-dd');
        const toDate = format(endDate, 'yyyy-MM-dd');
        const url = new URL('https://hariindustries.net/api/clearbook/income-statement.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            if (Array.isArray(data)) {
                 if(data.length === 0) toast({title: "No Data", description: "Report is empty for the selected period.", variant: 'default'});
                setProcessedData(processData(data, chartOfAccounts));
            } else {
                throw new Error("Invalid data format received from server.");
            }
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, user, chartOfAccounts, processData, toast]);

    const renderSection = (title: string, section: ReportSection, icon: React.ReactNode) => (
        <>
            <TableRow className="font-bold text-lg bg-gray-100 hover:bg-gray-100">
                <TableCell className="flex items-center">{icon} {title}</TableCell>
                <TableCell></TableCell>
            </TableRow>
            {section.accounts.map(acc => (
                <TableRow key={acc.id}>
                    <TableCell className="pl-10">{acc.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(acc.amount)}</TableCell>
                </TableRow>
            ))}
            <TableRow className="font-bold bg-gray-200 hover:bg-gray-200">
                <TableCell>Total {title}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(section.total)}</TableCell>
            </TableRow>
        </>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Income Statement</h1>
             <Card>
                <CardContent className="pt-6 flex flex-wrap items-end gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">From Date</label>
                        <DatePicker date={startDate} setDate={setStartDate} />
                    </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">To Date</label>
                        <DatePicker date={endDate} setDate={setEndDate} />
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
                 <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6 text-blue-800">
                        Period: {startDate && format(startDate, 'MMMM dd, yyyy')} to {endDate && format(endDate, 'MMMM dd, yyyy')}
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
                                    <TableHead className="w-3/4">Description</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderSection('REVENUE', processedData.revenue, <TrendingUp className="h-5 w-5 mr-2" />)}
                                {renderSection('COST OF GOODS SOLD', processedData.costOfGoodsSold, <ShoppingCart className="h-5 w-5 mr-2" />)}
                                
                                <TableRow className="font-extrabold bg-green-100 hover:bg-green-100 text-lg">
                                    <TableCell className="flex items-center"><ChevronsRight className="h-5 w-5 mr-2" /> GROSS PROFIT</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(processedData.grossProfit)}</TableCell>
                                </TableRow>
                                
                                {renderSection('EXPENSES', processedData.expenses, <TrendingDown className="h-5 w-5 mr-2" />)}
                            </TableBody>
                             <TableFooter>
                                <TableRow className="font-extrabold bg-gray-800 text-white hover:bg-black text-xl">
                                    <TableCell className="flex items-center"><Target className="h-5 w-5 mr-2" /> NET INCOME</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(processedData.netIncome)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex justify-center items-center h-60 text-muted-foreground"><p>Generate a report to view the Income Statement.</p></div>
            )}
        </div>
    );
};

export default IncomeStatementPage;
