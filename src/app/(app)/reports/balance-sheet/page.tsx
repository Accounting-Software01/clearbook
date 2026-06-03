'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Calendar, CheckCircle, XCircle, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface AccountBalance {
    code: string;
    name: string;
    type: string;
    parent: string | null;
    debit: number;
    credit: number;
    balance: number;
    balance_display: string;
}

interface BalanceSheetData {
    assets: AccountBalance[];
    liabilities: AccountBalance[];
    equity: AccountBalance[];
}

interface BalanceSheetTotals {
    total_assets: number;
    total_assets_display: string;
    total_liabilities: number;
    total_liabilities_display: string;
    total_equity: number;
    total_equity_display: string;
    total_liabilities_equity: number;
    total_liabilities_equity_display: string;
    is_balanced: boolean;
    difference: number;
    difference_display: string;
}

interface BalanceSheetResponse {
    success: boolean;
    as_of_date: string;
    balance_sheet: BalanceSheetData;
    totals: BalanceSheetTotals;
    formula: string;
}

const API_URL = 'https://hariindustries.net/api/clearbook/balance_sheet.php';

export default function BalanceSheet() {
    const [data, setData] = useState<BalanceSheetResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    const { toast } = useToast();
    const { user } = useAuth();
    const companyId = user?.company_id;
    const userId = user?.uid;

    const fetchBalanceSheet = useCallback(async () => {
        if (!companyId) {
            toast({ title: 'Error', description: 'Company ID not found', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        
        try {
            const url = new URL(API_URL);
            url.searchParams.set('company_id', companyId);
            url.searchParams.set('as_of_date', asOfDate);
            if (userId) url.searchParams.set('user_id', userId);
            
            const response = await fetch(url.toString());
            const result = await response.json();
            
            if (result.success) {
                setData(result);
            } else {
                throw new Error(result.error || result.message || 'Failed to fetch balance sheet');
            }
        } catch (error: any) {
            console.error('Balance sheet error:', error);
            toast({ 
                title: 'Error', 
                description: error.message || 'Failed to load balance sheet', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    }, [companyId, userId, asOfDate, toast]);

    useEffect(() => {
        fetchBalanceSheet();
    }, [fetchBalanceSheet]);

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        if (!data) return;
        
        const exportData = {
            as_of_date: data.as_of_date,
            generated_on: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            balance_sheet: data.balance_sheet,
            totals: data.totals
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `balance_sheet_${data.as_of_date}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({ title: 'Success', description: 'Balance sheet exported successfully' });
    };

    const renderAccountRow = (account: AccountBalance, index: number) => (
        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 hover:bg-gray-50 px-2">
            <span className="text-sm">
                <span className="font-mono text-xs text-gray-500">{account.code}</span>
                {' '}
                <span className="font-medium">{account.name}</span>
            </span>
            <span className={`text-sm font-mono font-medium ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {account.balance_display}
            </span>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!data || !data.success) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-500">Failed to load balance sheet</p>
                    <Button onClick={fetchBalanceSheet} className="mt-4">Retry</Button>
                </div>
            </div>
        );
    }

    const { balance_sheet, totals, as_of_date, formula } = data;

    return (
        <div className="printable-area p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header - Hidden on print */}
            <div className="print:hidden mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h1 className="text-2xl font-bold">Balance Sheet</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrint} size="sm">
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button variant="outline" onClick={handleExport} size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                        <Button onClick={fetchBalanceSheet} size="sm">
                            Refresh
                        </Button>
                    </div>
                </div>
                
                {/* Date Picker */}
                <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <input
                        type="date"
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                        className="border rounded px-3 py-1.5 text-sm"
                    />
                    <span className="text-sm text-gray-500">
                        Showing balances as of {format(new Date(as_of_date), 'dd MMMM yyyy')}
                    </span>
                </div>
            </div>

            {/* Header - Only on print */}
            <div className="hidden print:block mb-8 text-center">
                <h1 className="text-2xl font-bold">Balance Sheet</h1>
                <p className="text-gray-600">As of {format(new Date(as_of_date), 'dd MMMM yyyy')}</p>
                <p className="text-gray-500 text-sm">Generated on {format(new Date(), 'dd MMM yyyy hh:mm a')}</p>
            </div>

            {/* Balance Check Alert */}
            <div className={`mb-6 p-4 rounded-lg ${totals.is_balanced ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                    {totals.is_balanced ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                        <XCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className={totals.is_balanced ? 'text-green-700' : 'text-yellow-700'}>
                        {totals.is_balanced 
                            ? '✓ Books are balanced: Assets = Liabilities + Equity' 
                            : `⚠️ Difference of ${totals.difference_display}. Check your entries.`}
                    </span>
                </div>
            </div>

            {/* Balance Sheet Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ASSETS COLUMN */}
                <div>
                    <Card className="h-full">
                        <CardHeader className="bg-blue-50 border-b">
                            <CardTitle className="text-blue-800 text-xl">ASSETS</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-1">
                                {balance_sheet.assets.length > 0 ? (
                                    balance_sheet.assets.map((account, idx) => renderAccountRow(account, idx))
                                ) : (
                                    <div className="text-center text-gray-500 py-8">No asset accounts with balance</div>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t-2 border-blue-200">
                                <div className="flex justify-between items-center font-bold text-base">
                                    <span>Total Assets</span>
                                    <span className="text-blue-700">{totals.total_assets_display}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* LIABILITIES & EQUITY COLUMN */}
                <div className="space-y-6">
                    {/* LIABILITIES */}
                    <Card>
                        <CardHeader className="bg-red-50 border-b">
                            <CardTitle className="text-red-800 text-xl">LIABILITIES</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-1">
                                {balance_sheet.liabilities.length > 0 ? (
                                    balance_sheet.liabilities.map((account, idx) => renderAccountRow(account, idx))
                                ) : (
                                    <div className="text-center text-gray-500 py-8">No liability accounts with balance</div>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t-2 border-red-200">
                                <div className="flex justify-between items-center font-bold text-base">
                                    <span>Total Liabilities</span>
                                    <span className="text-red-700">{totals.total_liabilities_display}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* EQUITY */}
                    <Card>
                        <CardHeader className="bg-green-50 border-b">
                            <CardTitle className="text-green-800 text-xl">EQUITY</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-1">
                                {balance_sheet.equity.length > 0 ? (
                                    balance_sheet.equity.map((account, idx) => renderAccountRow(account, idx))
                                ) : (
                                    <div className="text-center text-gray-500 py-8">No equity accounts with balance</div>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t-2 border-green-200">
                                <div className="flex justify-between items-center font-bold text-base">
                                    <span>Total Equity</span>
                                    <span className="text-green-700">{totals.total_equity_display}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* TOTAL LIABILITIES + EQUITY */}
                    <Card className={`${totals.is_balanced ? 'bg-green-50' : 'bg-yellow-50'}`}>
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Total Liabilities + Equity</span>
                                <span className={totals.is_balanced ? 'text-green-700' : 'text-yellow-700'}>
                                    {totals.total_liabilities_equity_display}
                                </span>
                            </div>
                            <div className="text-center mt-4 pt-3 border-t text-sm text-gray-500">
                                {formula}
                            </div>
                            {totals.is_balanced && (
                                <div className="text-center mt-2 text-sm text-green-600">
                                    ✓ Assets equal Liabilities + Equity
                                </div>
                            )}
                            {!totals.is_balanced && (
                                <div className="text-center mt-2 text-sm text-yellow-600">
                                    Difference: {totals.difference_display}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer - Hidden on print */}
            <div className="print:hidden mt-8 text-center text-xs text-gray-400">
                <p>This is a system-generated balance sheet. For audit purposes, please retain supporting documentation.</p>
            </div>
        </div>
    );
}
