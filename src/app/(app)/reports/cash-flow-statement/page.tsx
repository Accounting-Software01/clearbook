'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Loader2, Download, Calendar, CheckCircle, XCircle, Printer,
    TrendingUp, TrendingDown, Activity, Building2, DollarSign
} from 'lucide-react';
import { format, subMonths } from 'date-fns';

interface Adjustment {
    account: string;
    change: number;
    change_display: string;
}

interface OperatingActivities {
    net_income: number;
    net_income_display: string;
    adjustments: Adjustment[];
    net_cash_operating: number;
    net_cash_operating_display: string;
}

interface InvestingActivities {
    purchase_of_assets: number;
    purchase_of_assets_display: string;
    net_cash_investing: number;
    net_cash_investing_display: string;
}

interface FinancingActivities {
    share_capital: number;
    share_capital_display: string;
    net_cash_financing: number;
    net_cash_financing_display: string;
}

interface Totals {
    net_cash_flow: number;
    net_cash_flow_display: string;
    beginning_cash: number;
    beginning_cash_display: string;
    ending_cash: number;
    ending_cash_display: string;
    is_consistent: boolean;
}

interface CashFlowData {
    success: boolean;
    method: string;
    period: {
        start_date: string;
        end_date: string;
        start_date_formatted: string;
        end_date_formatted: string;
    };
    operating_activities: OperatingActivities;
    investing_activities: InvestingActivities;
    financing_activities: FinancingActivities;
    totals: Totals;
}

const API_URL = 'https://hariindustries.net/api/clearbook/cashflow_indirect.php';

export default function CashFlowIndirect() {
    const [data, setData] = useState<CashFlowData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    const reportRef = useRef<HTMLDivElement>(null);
    
    const { toast } = useToast();
    const { user } = useAuth();
    const companyId = user?.company_id;
    const userId = user?.uid;

    const fetchCashFlow = useCallback(async () => {
        if (!companyId) {
            setError('Company ID not found');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const url = new URL(API_URL);
            url.searchParams.set('company_id', companyId);
            url.searchParams.set('start_date', startDate);
            url.searchParams.set('end_date', endDate);
            if (userId) url.searchParams.set('user_id', userId);
            
            const response = await fetch(url.toString());
            const result = await response.json();
            
            if (result.success) {
                setData(result);
            } else {
                throw new Error(result.error || 'Failed to fetch cash flow data');
            }
        } catch (error: any) {
            console.error('Cash flow error:', error);
            setError(error.message);
            toast({ 
                title: 'Error', 
                description: error.message || 'Failed to load cash flow statement', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    }, [companyId, userId, startDate, endDate, toast]);

    useEffect(() => {
        fetchCashFlow();
    }, [fetchCashFlow]);

    const exportToCSV = () => {
        if (!data) return;
        
        const csvRows = [
            ['CASH FLOW STATEMENT - INDIRECT METHOD'],
            ['For the period', `${data.period.start_date_formatted} to ${data.period.end_date_formatted}`],
            [],
            ['OPERATING ACTIVITIES', 'Amount (₦)'],
            ['Net Income', data.operating_activities.net_income_display],
            ['Adjustments for non-cash items:', ''],
            ...data.operating_activities.adjustments.map(adj => [adj.account, adj.change_display]),
            ['Net Cash from Operating Activities', data.operating_activities.net_cash_operating_display],
            [],
            ['INVESTING ACTIVITIES', 'Amount (₦)'],
            ['Purchase of Fixed Assets', `(${data.investing_activities.purchase_of_assets_display})`],
            ['Net Cash from Investing Activities', data.investing_activities.net_cash_investing_display],
            [],
            ['FINANCING ACTIVITIES', 'Amount (₦)'],
            ['Share Capital', data.financing_activities.share_capital_display],
            ['Net Cash from Financing Activities', data.financing_activities.net_cash_financing_display],
            [],
            ['SUMMARY', 'Amount (₦)'],
            ['Net Cash Increase/(Decrease)', data.totals.net_cash_flow_display],
            ['Beginning Cash Balance', data.totals.beginning_cash_display],
            ['Ending Cash Balance', data.totals.ending_cash_display],
            [],
            ['Verification', data.totals.is_consistent ? '✓ Cash flow is consistent' : '✗ Inconsistency detected']
        ];
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cashflow_indirect_${data.period.end_date}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({ title: 'Success', description: 'CSV exported successfully' });
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (error || !data || !data.success) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">{error || 'No data available'}</p>
                    <Button onClick={fetchCashFlow}>Retry</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {/* Header Controls */}
            <div className="print:hidden mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h1 className="text-2xl font-bold">Cash Flow Statement (Indirect Method)</h1>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-sm focus:outline-none w-32"
                            />
                            <span>to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-sm focus:outline-none w-32"
                            />
                        </div>
                        <Button variant="outline" onClick={exportToCSV} size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            CSV
                        </Button>
                        <Button variant="outline" onClick={handlePrint} size="sm">
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                        </Button>
                        <Button onClick={fetchCashFlow} size="sm">
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            <div ref={reportRef} className="bg-white">
                {/* Header */}
                <div className="text-center mb-8 pb-4 border-b">
                    <h1 className="text-2xl font-bold">Statement of Cash Flows</h1>
                    <p className="text-gray-600">(Indirect Method)</p>
                    <p className="text-gray-500 text-sm">
                        For the period {data.period.start_date_formatted} to {data.period.end_date_formatted}
                    </p>
                    <p className="text-gray-400 text-sm">Generated on {format(new Date(), 'dd MMM yyyy hh:mm a')}</p>
                </div>

                {/* Verification Badge */}
                <div className={`mb-6 p-3 rounded-lg text-sm ${data.totals.is_consistent ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                        {data.totals.is_consistent ? (
                            <CheckCircle className="h-4 w-4" />
                        ) : (
                            <XCircle className="h-4 w-4" />
                        )}
                        {data.totals.is_consistent 
                            ? '✓ Cash flow is consistent: Beginning + Net Flow = Ending' 
                            : '✗ Cash flow inconsistency detected'}
                    </div>
                </div>

                {/* OPERATING ACTIVITIES */}
                <div className="mb-6">
                    <div className="bg-blue-50 p-3 rounded-t-lg border-b">
                        <h3 className="font-bold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-blue-600" />
                            CASH FLOWS FROM OPERATING ACTIVITIES
                        </h3>
                    </div>
                    <div className="p-4 border-x border-b rounded-b-lg">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm">Net Income</span>
                            <span className="text-sm font-mono">{data.operating_activities.net_income_display}</span>
                        </div>
                        <div className="ml-4 mt-2 space-y-1">
                            <div className="text-xs text-gray-500 mb-1">Adjustments for non-cash items:</div>
                            {data.operating_activities.adjustments.map((adj, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1">
                                    <span className="text-sm text-gray-600">{adj.account}</span>
                                    <span className="text-sm font-mono">{adj.change_display}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 pt-2 border-t-2 font-bold flex justify-between">
                            <span>Net Cash from Operating Activities</span>
                            <span className={data.operating_activities.net_cash_operating >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {data.operating_activities.net_cash_operating_display}
                            </span>
                        </div>
                    </div>
                </div>

                {/* INVESTING ACTIVITIES */}
                <div className="mb-6">
                    <div className="bg-purple-50 p-3 rounded-t-lg border-b">
                        <h3 className="font-bold flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-purple-600" />
                            CASH FLOWS FROM INVESTING ACTIVITIES
                        </h3>
                    </div>
                    <div className="p-4 border-x border-b rounded-b-lg">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm">Purchase of Fixed Assets</span>
                            <span className="text-sm font-mono text-red-600">(₦{data.investing_activities.purchase_of_assets_display})</span>
                        </div>
                        <div className="mt-3 pt-2 border-t-2 font-bold flex justify-between">
                            <span>Net Cash from Investing Activities</span>
                            <span className={data.investing_activities.net_cash_investing >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {data.investing_activities.net_cash_investing_display}
                            </span>
                        </div>
                    </div>
                </div>

                {/* FINANCING ACTIVITIES */}
                <div className="mb-6">
                    <div className="bg-green-50 p-3 rounded-t-lg border-b">
                        <h3 className="font-bold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            CASH FLOWS FROM FINANCING ACTIVITIES
                        </h3>
                    </div>
                    <div className="p-4 border-x border-b rounded-b-lg">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm">Share Capital</span>
                            <span className="text-sm font-mono text-green-600">₦{data.financing_activities.share_capital_display}</span>
                        </div>
                        <div className="mt-3 pt-2 border-t-2 font-bold flex justify-between">
                            <span>Net Cash from Financing Activities</span>
                            <span className={data.financing_activities.net_cash_financing >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {data.financing_activities.net_cash_financing_display}
                            </span>
                        </div>
                    </div>
                </div>

                {/* SUMMARY */}
                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-lg mb-3">Summary</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm">Net Cash Increase/(Decrease)</span>
                            <span className="text-sm font-bold">{data.totals.net_cash_flow_display}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sm">Cash and Cash Equivalents, Beginning of Period</span>
                            <span className="text-sm">₦{data.totals.beginning_cash_display}</span>
                        </div>
                        <div className="border-t-2 pt-2 font-bold flex justify-between text-base">
                            <span>Cash and Cash Equivalents, End of Period</span>
                            <span className="text-blue-600">₦{data.totals.ending_cash_display}</span>
                        </div>
                    </div>
                </div>

                {/* Formula Verification */}
                <div className="mt-4 text-center text-xs text-gray-400">
                    <p>Beginning Cash + Net Cash Flow = Ending Cash</p>
                    <p>₦{data.totals.beginning_cash_display} + ({data.totals.net_cash_flow_display}) = ₦{data.totals.ending_cash_display}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="print:hidden mt-8 text-center text-xs text-gray-400">
                <p>This is a system-generated cash flow statement using the indirect method.</p>
            </div>
        </div>
    );
}
