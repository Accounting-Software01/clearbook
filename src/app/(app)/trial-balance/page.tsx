'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Loader2, AlertCircle, CheckCircle, Briefcase, Landmark, Users, TrendingUp, ShoppingCart, TrendingDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- INTERFACES ---
interface BalanceEntry {
    accountId: string;
    accountName: string;
    account_type: string;
    debit: number;
    credit: number;
}

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount) || amount === 0) return '-';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

const TrialBalancePage = () => {
    const { user } = useAuth();
    
    // --- STATE MANAGEMENT ---
    const [reportData, setReportData] = useState<BalanceEntry[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), 0, 1));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [hideZeroBalances, setHideZeroBalances] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGenerated, setIsGenerated] = useState(false);

    // --- API CALL --- 
    const generateReport = useCallback(async () => {
        if (!startDate || !endDate || !user?.company_id) {
            setError("Please select a valid date range and ensure you are logged in.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setReportData([]);

        const url = new URL('https://hariindustries.net/api/clearbook/trial-balance.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('fromDate', format(startDate, 'yyyy-MM-dd'));
        url.searchParams.append('toDate', format(endDate, 'yyyy-MM-dd'));

        try {
            const response = await fetch(url.toString());
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            if (data.success === false) throw new Error(data.message || "Backend returned an error.");
            setReportData(Array.isArray(data) ? data : []);
            setIsGenerated(true);
        } catch (e: any) {
            setError(`Failed to load data: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, user]);

    // --- DATA PROCESSING & GROUPING ---
    const { groupedData, totals } = useMemo(() => {
        if (!reportData) return { groupedData: {}, totals: {} };
        
        const groups: Record<string, { icon: JSX.Element, accounts: BalanceEntry[] }> = {
            Assets: { icon: <Briefcase className="h-4 w-4 mr-2"/>, accounts: [] },
            Liabilities: { icon: <Landmark className="h-4 w-4 mr-2"/>, accounts: [] },
            Equity: { icon: <Users className="h-4 w-4 mr-2"/>, accounts: [] },
            Revenue: { icon: <TrendingUp className="h-4 w-4 mr-2"/>, accounts: [] },
            'Cost of Goods Sold': { icon: <ShoppingCart className="h-4 w-4 mr-2"/>, accounts: [] },
            Expenses: { icon: <TrendingDown className="h-4 w-4 mr-2"/>, accounts: [] },
        };
        
        reportData.forEach(acc => {
             if (acc.account_type === 'Expense' && acc.accountName.toLowerCase().includes('cost of goods sold')) {
                groups['Cost of Goods Sold'].accounts.push(acc);
             }
             else if (acc.account_type === 'Asset') groups.Assets.accounts.push(acc);
             else if (acc.account_type === 'Liability') groups.Liabilities.accounts.push(acc);
             else if (acc.account_type === 'Equity') groups.Equity.accounts.push(acc);
             else if (acc.account_type === 'Revenue') groups.Revenue.accounts.push(acc);
             else if (acc.account_type === 'Expense') groups.Expenses.accounts.push(acc);
        });

        let grandTotalDebit = 0;
        let grandTotalCredit = 0;
        const groupTotals: Record<string, { debit: number, credit: number }> = {};

        for (const groupName in groups) {
            const currentGroup = groups[groupName];
            const groupTotal = currentGroup.accounts.reduce((sum, current) => ({debit: sum.debit + current.debit, credit: sum.credit + current.credit}), {debit: 0, credit: 0});
            groupTotals[groupName] = groupTotal;
            grandTotalDebit += groupTotal.debit;
            grandTotalCredit += groupTotal.credit;
        }

        return { 
            groupedData: groups,
            totals: { grandTotalDebit, grandTotalCredit, groupTotals }
        };
    }, [reportData]);

    const isBalanced = Math.abs(totals.grandTotalDebit - totals.grandTotalCredit) < 0.01;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Trial Balance Report</h1>
            <Card>
                 <CardContent className="pt-6">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">Start Date</label><DatePicker date={startDate} setDate={setStartDate} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">End Date</label><DatePicker date={endDate} setDate={setEndDate} /></div>
                        <div className="flex items-center space-x-2 pt-6"><Checkbox id="hide-zero" checked={hideZeroBalances} onCheckedChange={(c) => setHideZeroBalances(c as boolean)} /><label htmlFor="hide-zero" className="text-sm font-medium">Hide Zero Balances</label></div>
                         <div className="flex items-center gap-2 pt-6">
                            <Button onClick={generateReport} disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Report</Button>
                            <Button variant="outline">Export Excel</Button>
                            <Button variant="destructive">Export PDF</Button>
                            <Button variant="outline">Print</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isGenerated && (
                <>
                    <Card className="bg-blue-50 border-blue-200"><CardContent className="pt-6 text-blue-800">Period: {startDate && format(startDate, 'MMMM dd, yyyy')} to {endDate && format(endDate, 'MMMM dd, yyyy')}</CardContent></Card>
                    <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <CardContent className="pt-6 flex justify-between items-center">
                            <div className={`flex items-center font-semibold ${isBalanced ? 'text-green-700' : 'text-red-700'}`}><CheckCircle className="h-5 w-5 mr-2"/> Status: {isBalanced ? 'Balanced' : 'Not Balanced'}</div>
                            <div className="text-sm font-semibold">Total Debit Balances: {formatCurrency(totals.grandTotalDebit)} | Total Credit Balances: {formatCurrency(totals.grandTotalCredit)}</div>
                        </CardContent>
                    </Card>
                </>
            )}

            {isLoading && <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {error && <div className="flex flex-col justify-center items-center h-60 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>}
            
            {isGenerated && !isLoading && !error && (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow><TableHead className="w-1/4">Account Number</TableHead><TableHead className="w-1/2">Account Name</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {Object.entries(groupedData).map(([groupName, groupData]) => {
                                     const groupTotal = totals.groupTotals[groupName];
                                     if (hideZeroBalances && groupTotal.debit === 0 && groupTotal.credit === 0) return null;
                                     return (
                                        <React.Fragment key={groupName}>
                                            <TableRow className="bg-gray-100 font-bold"><TableCell colSpan={4} className="flex items-center">{groupData.icon} {groupName.toUpperCase()}</TableCell></TableRow>
                                            {groupData.accounts.map((acc: BalanceEntry) => (
                                                <TableRow key={acc.accountId}>
                                                    <TableCell className="pl-12">{acc.accountId}</TableCell>
                                                    <TableCell>{acc.accountName}</TableCell>
                                                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(acc.debit)}</TableCell>
                                                    <TableCell className="text-right font-mono text-red-600">{formatCurrency(acc.credit)}</TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow className="bg-blue-100 font-bold"><TableCell colSpan={2}>TOTAL {groupName.toUpperCase()}</TableCell><TableCell className="text-right font-mono">{formatCurrency(groupTotal.debit)}</TableCell><TableCell className="text-right font-mono text-red-600">{formatCurrency(groupTotal.credit)}</TableCell></TableRow>
                                        </React.Fragment>
                                     )
                                })}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-gray-800 text-white font-bold"><TableCell colSpan={2}>GRAND TOTAL</TableCell><TableCell className="text-right font-mono">{formatCurrency(totals.grandTotalDebit)}</TableCell><TableCell className="text-right font-mono text-red-600">{formatCurrency(totals.grandTotalCredit)}</TableCell></TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default TrialBalancePage;
