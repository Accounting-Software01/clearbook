'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Loader2, 
    Download, 
    Calendar, 
    CheckCircle, 
    XCircle, 
    Printer,
    FileText,
    FileSpreadsheet,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Building2
} from 'lucide-react';
import { format } from 'date-fns';

// Import PDF libraries
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface AccountBalance {
    code: string;
    name: string;
    balance: number;
    balance_display: string;
}

interface BalanceSheetData {
    assets: AccountBalance[];
    liabilities: AccountBalance[];
    equity: AccountBalance[];
    totals: {
        total_assets: number;
        total_assets_display: string;
        total_liabilities: number;
        total_liabilities_display: string;
        total_equity: number;
        total_equity_display: string;
        is_balanced: boolean;
    };
}

interface IncomeStatementData {
    revenue: AccountBalance[];
    expenses: AccountBalance[];
    totals: {
        total_revenue: number;
        total_revenue_display: string;
        total_expenses: number;
        total_expenses_display: string;
        net_income: number;
        net_income_display: string;
        is_profitable: boolean;
    };
}

interface FinancialData {
    success: boolean;
    as_of_date: string;
    generated_at: string;
    company_id: string;
    balance_sheet: BalanceSheetData;
    income_statement: IncomeStatementData;
    formula: string;
}

const API_URL = 'https://hariindustries.net/api/clearbook/financial_statements.php';

export default function FinancialStatements() {
    const [data, setData] = useState<FinancialData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('balance-sheet');
    const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isExporting, setIsExporting] = useState(false);
    
    const reportRef = useRef<HTMLDivElement>(null);
    
    const { toast } = useToast();
    const { user } = useAuth();
    const companyId = user?.company_id;
    const userId = user?.uid;

    const fetchFinancials = useCallback(async () => {
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
            url.searchParams.set('type', 'all');
            url.searchParams.set('format', 'json');
            if (userId) url.searchParams.set('user_id', userId);
            
            const response = await fetch(url.toString());
            const result = await response.json();
            
            if (result.success) {
                setData(result);
            } else {
                throw new Error(result.error || result.message || 'Failed to fetch financial data');
            }
        } catch (error: any) {
            console.error('Financial data error:', error);
            toast({ 
                title: 'Error', 
                description: error.message || 'Failed to load financial statements', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    }, [companyId, userId, asOfDate, toast]);

    useEffect(() => {
        fetchFinancials();
    }, [fetchFinancials]);

    const exportToPDF = async () => {
        if (!reportRef.current) return;
        
        setIsExporting(true);
        
        try {
            const element = reportRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save(`financial_statements_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
            
            toast({ 
                title: 'Success', 
                description: 'PDF exported successfully', 
                variant: 'default' 
            });
        } catch (error) {
            console.error('PDF export error:', error);
            toast({ 
                title: 'Error', 
                description: 'Failed to export PDF', 
                variant: 'destructive' 
            });
        } finally {
            setIsExporting(false);
        }
    };

    const exportToCSV = () => {
        if (!data) return;
        
        // Prepare CSV data
        const csvRows = [];
        
        // Balance Sheet CSV
        csvRows.push(['BALANCE SHEET']);
        csvRows.push(['As of', format(new Date(data.as_of_date), 'dd MMM yyyy')]);
        csvRows.push([]);
        csvRows.push(['ASSETS', 'Amount']);
        data.balance_sheet.assets.forEach(asset => {
            csvRows.push([`${asset.code} - ${asset.name}`, asset.balance_display]);
        });
        csvRows.push(['TOTAL ASSETS', data.balance_sheet.totals.total_assets_display]);
        csvRows.push([]);
        csvRows.push(['LIABILITIES', 'Amount']);
        data.balance_sheet.liabilities.forEach(liability => {
            csvRows.push([`${liability.code} - ${liability.name}`, liability.balance_display]);
        });
        csvRows.push(['TOTAL LIABILITIES', data.balance_sheet.totals.total_liabilities_display]);
        csvRows.push([]);
        csvRows.push(['EQUITY', 'Amount']);
        data.balance_sheet.equity.forEach(equity => {
            csvRows.push([`${equity.code} - ${equity.name}`, equity.balance_display]);
        });
        csvRows.push(['TOTAL EQUITY', data.balance_sheet.totals.total_equity_display]);
        csvRows.push([]);
        
        // Income Statement CSV
        csvRows.push(['INCOME STATEMENT']);
        csvRows.push(['For the period ending', format(new Date(data.as_of_date), 'dd MMM yyyy')]);
        csvRows.push([]);
        csvRows.push(['REVENUE', 'Amount']);
        data.income_statement.revenue.forEach(rev => {
            csvRows.push([`${rev.code} - ${rev.name}`, rev.balance_display]);
        });
        csvRows.push(['TOTAL REVENUE', data.income_statement.totals.total_revenue_display]);
        csvRows.push([]);
        csvRows.push(['EXPENSES', 'Amount']);
        data.income_statement.expenses.forEach(exp => {
            csvRows.push([`${exp.code} - ${exp.name}`, exp.balance_display]);
        });
        csvRows.push(['TOTAL EXPENSES', data.income_statement.totals.total_expenses_display]);
        csvRows.push([]);
        csvRows.push(['NET INCOME (LOSS)', data.income_statement.totals.net_income_display]);
        
        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial_statements_${data.as_of_date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({ title: 'Success', description: 'CSV exported successfully' });
    };

    const renderAccountList = (accounts: AccountBalance[], title: string) => (
        <div className="space-y-1">
            <h4 className="font-semibold text-gray-700 mt-4 mb-2">{title}</h4>
            {accounts.length > 0 ? (
                accounts.map((account, idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                        <span className="text-sm">
                            <span className="font-mono text-xs text-gray-500">{account.code}</span>
                            {' '}
                            {account.name}
                        </span>
                        <span className="text-sm font-mono font-medium">{account.balance_display}</span>
                    </div>
                ))
            ) : (
                <div className="text-sm text-gray-400 italic py-2">No accounts with balance</div>
            )}
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
                    <p className="text-gray-500">Failed to load financial statements</p>
                    <Button onClick={fetchFinancials} className="mt-4">Retry</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header Controls */}
            <div className="print:hidden mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h1 className="text-2xl font-bold">Financial Statements</h1>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <input
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                                className="bg-transparent border-none text-sm focus:outline-none"
                            />
                        </div>
                        <Button variant="outline" onClick={exportToCSV} size="sm" disabled={isExporting}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            CSV
                        </Button>
                        <Button variant="outline" onClick={exportToPDF} size="sm" disabled={isExporting}>
                            {isExporting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Printer className="mr-2 h-4 w-4" />
                            )}
                            PDF
                        </Button>
                        <Button onClick={fetchFinancials} size="sm">
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Report Content - For PDF Export */}
            <div ref={reportRef} className="bg-white">
                {/* Header */}
                <div className="text-center mb-8 pb-4 border-b">
                    <h1 className="text-2xl font-bold">Financial Statements</h1>
                    <p className="text-gray-600">As of {format(new Date(data.as_of_date), 'dd MMMM yyyy')}</p>
                    <p className="text-gray-400 text-sm">Generated on {format(new Date(), 'dd MMM yyyy hh:mm a')}</p>
                </div>

                {/* Tabs for on-screen viewing */}
                <div className="print:hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
                            <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="balance-sheet">
                            <BalanceSheetView data={data} />
                        </TabsContent>
                        
                        <TabsContent value="income-statement">
                            <IncomeStatementView data={data} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Print/PDF view - both statements visible */}
                <div className="hidden print:block">
                    <BalanceSheetView data={data} />
                    <div className="page-break"></div>
                    <IncomeStatementView data={data} />
                </div>
            </div>

            {/* Footer - Hidden on print */}
            <div className="print:hidden mt-8 text-center text-xs text-gray-400">
                <p>This is a system-generated financial report. For audit purposes, please retain supporting documentation.</p>
            </div>

            <style jsx global>{`
                @media print {
                    .page-break {
                        page-break-before: always;
                    }
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}

// Balance Sheet Component
function BalanceSheetView({ data }: { data: FinancialData }) {
    return (
        <div>
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Balance Sheet</h2>
                <p className="text-gray-500 text-sm">As of {format(new Date(data.as_of_date), 'dd MMMM yyyy')}</p>
            </div>

            {/* Balance Check Alert */}
            <div className={`mb-6 p-3 rounded-lg text-sm ${data.balance_sheet.totals.is_balanced ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                {data.balance_sheet.totals.is_balanced ? (
                    <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> ✓ Books are balanced: Assets = Liabilities + Equity</div>
                ) : (
                    <div className="flex items-center gap-2"><XCircle className="h-4 w-4" /> ✗ Books are NOT balanced</div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ASSETS */}
                <div>
                    <div className="bg-blue-50 p-3 rounded-t-lg border-b border-blue-200">
                        <h3 className="font-bold text-blue-800 flex items-center gap-2"><Building2 className="h-4 w-4" /> ASSETS</h3>
                    </div>
                    <div className="p-4 border-x border-b rounded-b-lg">
                        {renderAccountList(data.balance_sheet.assets, 'Current Assets')}
                        <div className="mt-4 pt-3 border-t-2 font-bold flex justify-between">
                            <span>Total Assets</span>
                            <span className="text-blue-700">{data.balance_sheet.totals.total_assets_display}</span>
                        </div>
                    </div>
                </div>

                {/* LIABILITIES & EQUITY */}
                <div className="space-y-6">
                    <div>
                        <div className="bg-red-50 p-3 rounded-t-lg border-b border-red-200">
                            <h3 className="font-bold text-red-800 flex items-center gap-2"><DollarSign className="h-4 w-4" /> LIABILITIES</h3>
                        </div>
                        <div className="p-4 border-x border-b rounded-b-lg">
                            {renderAccountList(data.balance_sheet.liabilities, 'Current Liabilities')}
                            <div className="mt-4 pt-3 border-t-2 font-bold flex justify-between">
                                <span>Total Liabilities</span>
                                <span className="text-red-700">{data.balance_sheet.totals.total_liabilities_display}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="bg-green-50 p-3 rounded-t-lg border-b border-green-200">
                            <h3 className="font-bold text-green-800 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> EQUITY</h3>
                        </div>
                        <div className="p-4 border-x border-b rounded-b-lg">
                            {renderAccountList(data.balance_sheet.equity, 'Shareholders Equity')}
                            <div className="mt-4 pt-3 border-t-2 font-bold flex justify-between">
                                <span>Total Equity</span>
                                <span className="text-green-700">{data.balance_sheet.totals.total_equity_display}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="font-bold flex justify-between text-lg">
                            <span>Total Liabilities + Equity</span>
                            <span className={data.balance_sheet.totals.is_balanced ? 'text-green-700' : 'text-red-700'}>
                                {data.balance_sheet.totals.total_equity_display}
                            </span>
                        </div>
                        <div className="text-center text-sm text-gray-500 mt-2">{data.formula}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Income Statement Component
function IncomeStatementView({ data }: { data: FinancialData }) {
    const { totals } = data.income_statement;
    const isProfitable = totals.is_profitable;
    
    return (
        <div>
            <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Income Statement</h2>
                <p className="text-gray-500 text-sm">For the period ending {format(new Date(data.as_of_date), 'dd MMMM yyyy')}</p>
            </div>

            <div className="max-w-2xl mx-auto">
                {/* REVENUE */}
                <div className="bg-green-50 p-3 rounded-t-lg border-b border-green-200">
                    <h3 className="font-bold text-green-800 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> REVENUE</h3>
                </div>
                <div className="p-4 border-x">
                    {renderAccountList(data.income_statement.revenue, 'Sales Revenue')}
                </div>
                <div className="p-3 border-x border-b rounded-b-lg bg-gray-50 font-bold flex justify-between">
                    <span>Total Revenue</span>
                    <span className="text-green-700">{totals.total_revenue_display}</span>
                </div>

                {/* EXPENSES */}
                <div className="mt-6 bg-red-50 p-3 rounded-t-lg border-b border-red-200">
                    <h3 className="font-bold text-red-800 flex items-center gap-2"><TrendingDown className="h-4 w-4" /> EXPENSES</h3>
                </div>
                <div className="p-4 border-x">
                    {renderAccountList(data.income_statement.expenses, 'Operating Expenses')}
                </div>
                <div className="p-3 border-x border-b rounded-b-lg bg-gray-50 font-bold flex justify-between">
                    <span>Total Expenses</span>
                    <span className="text-red-700">{totals.total_expenses_display}</span>
                </div>

                {/* NET INCOME */}
                <div className={`mt-6 p-4 rounded-lg text-center ${isProfitable ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="font-bold text-lg">
                        NET INCOME (LOSS)
                    </div>
                    <div className={`text-2xl font-bold ${isProfitable ? 'text-green-700' : 'text-red-700'}`}>
                        {totals.net_income_display}
                    </div>
                    {isProfitable ? (
                        <div className="text-sm text-green-600 mt-1">✓ Profitable period</div>
                    ) : (
                        <div className="text-sm text-red-600 mt-1">⚠ Operating at a loss</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function renderAccountList(accounts: AccountBalance[], title: string) {
    if (accounts.length === 0) {
        return <div className="text-sm text-gray-400 italic py-2">No accounts with balance</div>;
    }
    
    return (
        <div className="space-y-1">
            <h4 className="font-semibold text-gray-700 mb-2">{title}</h4>
            {accounts.map((account, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b border-gray-100">
                    <span className="text-sm">
                        <span className="font-mono text-xs text-gray-500">{account.code}</span>
                        {' '}
                        {account.name}
                    </span>
                    <span className="text-sm font-mono font-medium">{account.balance_display}</span>
                </div>
            ))}
        </div>
    );
}
