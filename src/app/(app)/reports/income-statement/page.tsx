'use client';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import { format, subYears, isValid, isBefore, isAfter } from 'date-fns';
import { Loader2, AlertCircle, TrendingUp, ShoppingCart, TrendingDown, ChevronsRight, Target, Download, FileText, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Interfaces directly mapping to the new API output
interface ReportAccount {
    id: string;
    name: string;
    amount: number;
    percentage: number;
}

interface ReportSection {
    accounts: ReportAccount[];
    total: number;
    totalPercentage: number;
}

interface ProcessedData {
    revenue: ReportSection;
    costOfGoodsSold: ReportSection;
    grossProfit: { amount: number, percentage: number };
    expenses: ReportSection;
    netIncome: { amount: number, percentage: number };
    summary: {
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
        grossProfit?: number;
        netIncomePercentage?: number;
    };
    period?: {
        startDate: string;
        endDate: string;
    };
    generatedAt?: string;
}

// Cache type
type CacheKey = string;
type CacheEntry = {
    data: ProcessedData;
    timestamp: number;
};

// Helper to format currency values
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

// Color utility for profit/loss
const getIncomeColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    if (amount < 0) return 'text-red-600 dark:text-red-400';
    return 'text-foreground';
};

const IncomeStatementPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // States
    const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        const now = new Date();
        return new Date(now.getFullYear(), 0, 1); // Start of current year
    });
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [showPercentages, setShowPercentages] = useState(true);
    const [showZeroAccounts, setShowZeroAccounts] = useState(false);
    
    // Refs
    const reportCache = useRef<Map<CacheKey, CacheEntry>>(new Map());
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Generate cache key
    const generateCacheKey = useCallback((companyId: string, fromDate: string, toDate: string): CacheKey => {
        return `${companyId}-${fromDate}-${toDate}`;
    }, []);

    // Get cached data if valid
    const getCachedData = useCallback((cacheKey: CacheKey): ProcessedData | null => {
        const cached = reportCache.current.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
        return null;
    }, []);

    // Set cache
    const setCache = useCallback((cacheKey: CacheKey, data: ProcessedData) => {
        reportCache.current.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
    }, []);

    // Clear cache
    const clearCache = useCallback(() => {
        reportCache.current.clear();
        toast({
            title: "Cache Cleared",
            description: "All cached reports have been cleared."
        });
    }, [toast]);

    // Date validation
    const validateDateRange = useCallback((start: Date, end: Date): string | null => {
        if (!isValid(start) || !isValid(end)) {
            return "Invalid date selected";
        }
        
        if (isAfter(start, end)) {
            return "Start date must be before end date";
        }
        
        const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year
        if (end.getTime() - start.getTime() > maxRange) {
            return "Date range cannot exceed 1 year";
        }
        
        const minDate = new Date(2000, 0, 1);
        if (isBefore(start, minDate)) {
            return "Start date cannot be before January 1, 2000";
        }
        
        return null;
    }, []);

    // Generate report
    const generateReport = useCallback(async (isRetry = false) => {
        if (!startDate || !endDate) {
            toast({
                title: "Date Range Missing",
                description: "Please select a start and end date.",
                variant: 'destructive'
            });
            return;
        }
        
        const validationError = validateDateRange(startDate, endDate);
        if (validationError) {
            toast({
                title: "Invalid Date Range",
                description: validationError,
                variant: 'destructive'
            });
            return;
        }

        if (!user?.company_id) {
            toast({
                title: "Company not loaded",
                description: "Please wait and try again.",
                variant: 'destructive'
            });
            return;
        }

        setIsLoading(true);
        setError(null);
        
        const fromDate = format(startDate, 'yyyy-MM-dd');
        const toDate = format(endDate, 'yyyy-MM-dd');
        
        // Check cache first
        const cacheKey = generateCacheKey(user.company_id, fromDate, toDate);
        const cachedData = getCachedData(cacheKey);
        
        if (cachedData && !isRetry) {
            setProcessedData(cachedData);
            setIsLoading(false);
            toast({
                title: "Report Loaded from Cache",
                description: `Using cached data for ${fromDate} to ${toDate}`,
                variant: 'default'
            });
            return;
        }

        const url = new URL('https://hariindustries.net/api/clearbook/income-statement.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);

        try {
            const response = await fetch(url.toString(), {
                signal: AbortSignal.timeout(30000) // 30 second timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.success && data.processedData) {
                if (data.processedData.summary.totalRevenue === 0 && 
                    data.processedData.summary.totalExpenses === 0) {
                    toast({
                        title: "No Data Found",
                        description: "No transactions for the selected period.",
                        variant: 'default'
                    });
                }
                
                // Add period info
                const enhancedData: ProcessedData = {
                    ...data.processedData,
                    period: {
                        startDate: fromDate,
                        endDate: toDate
                    },
                    generatedAt: new Date().toISOString()
                };
                
                setProcessedData(enhancedData);
                setCache(cacheKey, enhancedData);
                setRetryCount(0);
                
                toast({
                    title: "Report Generated",
                    description: `Income statement for ${format(startDate, 'MMM d, yyyy')} to ${format(endDate, 'MMM d, yyyy')}`,
                    variant: 'default'
                });
            } else {
                throw new Error(data.message || "Invalid data format received from server.");
            }
        } catch (e: any) {
            // Network error retry logic
            if (e.name === 'AbortError' || e.message.includes('network') || e.message.includes('timeout')) {
                if (retryCount < 3) {
                    setRetryCount(prev => prev + 1);
                    toast({
                        title: `Retrying... (${retryCount + 1}/3)`,
                        description: "Network issue detected. Retrying...",
                        variant: 'default'
                    });
                    
                    setTimeout(() => {
                        generateReport(true);
                    }, 2000 * retryCount); // Exponential backoff
                    return;
                }
            }
            
            const errorMessage = e.message || "Unknown error occurred";
            setError(`Failed to load data: ${errorMessage}`);
            toast({
                title: "Error Generating Report",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, user?.company_id, user?.company_name, toast, retryCount, validateDateRange, generateCacheKey, getCachedData, setCache]);

    // Set quick date ranges
    const setQuickDateRange = useCallback((range: 'today' | 'month' | 'quarter' | 'year' | 'ytd') => {
        const now = new Date();
        let newStartDate: Date;
        let newEndDate: Date = now;

        switch (range) {
            case 'today':
                newStartDate = now;
                break;
            case 'month':
                newStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                newStartDate = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'year':
                newStartDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'ytd':
                newStartDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                newStartDate = new Date(now.getFullYear(), 0, 1);
        }

        setStartDate(newStartDate);
        setEndDate(newEndDate);
        
        toast({
            title: "Date Range Updated",
            description: `Set to ${range.toUpperCase()} range`,
            variant: 'default'
        });
    }, [toast]);

    // Export to PDF
    const exportToPDF = useCallback(async () => {
        if (!processedData) {
            toast({
                title: "No Data",
                description: "Generate a report first to export.",
                variant: 'destructive'
            });
            return;
        }

        setIsExporting(true);
        try {
            // Dynamically import jsPDF (only when needed)
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            
            const doc = new jsPDF();
            const companyName = user?.company_name || "Company";
            const dateRange = `${format(startDate!, 'MMM dd, yyyy')} - ${format(endDate!, 'MMM dd, yyyy')}`;
            
            // Header
            doc.setFontSize(20);
            doc.text(`Income Statement - ${companyName}`, 14, 15);
            doc.setFontSize(12);
            doc.text(`Period: ${dateRange}`, 14, 25);
            doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 32);
            
            // Summary section
            doc.setFontSize(14);
            doc.text("Financial Summary", 14, 45);
            
            const summaryData = [
                ['Total Revenue', formatCurrency(processedData.summary.totalRevenue)],
                ['Total Expenses', formatCurrency(processedData.summary.totalExpenses)],
                ['Net Income', formatCurrency(processedData.summary.netIncome)]
            ];
            
            // @ts-ignore - autoTable is added to jsPDF by jspdf-autotable
            doc.autoTable({
                startY: 50,
                head: [['Metric', 'Amount']],
                body: summaryData,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] }
            });
            
            // Add detailed sections
            let finalY = (doc as any).lastAutoTable.finalY + 10;
            
            // Revenue section
            doc.setFontSize(14);
            doc.text("Revenue Details", 14, finalY);
            
            const revenueData = processedData.revenue.accounts.map(acc => [
                acc.name,
                formatCurrency(acc.amount),
                showPercentages ? `${acc.percentage.toFixed(1)}%` : ''
            ]);
            
            // @ts-ignore
            doc.autoTable({
                startY: finalY + 5,
                head: [['Account', 'Amount', showPercentages ? '% Revenue' : '']],
                body: revenueData,
                foot: [['Total Revenue', formatCurrency(processedData.revenue.total), 
                       showPercentages ? `${processedData.revenue.totalPercentage.toFixed(1)}%` : '']],
                footStyles: { fillColor: [236, 240, 241] }
            });
            
            finalY = (doc as any).lastAutoTable.finalY + 10;
            
            // Save the PDF
            doc.save(`income-statement-${companyName}-${format(startDate!, 'yyyy-MM-dd')}-to-${format(endDate!, 'yyyy-MM-dd')}.pdf`);
            
            toast({
                title: "PDF Exported",
                description: "Income statement has been exported as PDF",
                variant: 'default'
            });
        } catch (error: any) {
            toast({
                title: "Export Failed",
                description: error.message || "Failed to export PDF",
                variant: 'destructive'
            });
        } finally {
            setIsExporting(false);
        }
    }, [processedData, startDate, endDate, user?.company_name, toast, showPercentages]);

    // Export to Excel
    const exportToExcel = useCallback(async () => {
        if (!processedData) {
            toast({
                title: "No Data",
                description: "Generate a report first to export.",
                variant: 'destructive'
            });
            return;
        }

        setIsExporting(true);
        try {
            const XLSX = await import('xlsx');
            
            const data: any[][] = [];
            
            // Header
            data.push(['Income Statement']);
            data.push(['Company:', user?.company_name || '']);
            data.push(['Period:', `${format(startDate!, 'MMM dd, yyyy')} to ${format(endDate!, 'MMM dd, yyyy')}`]);
            data.push(['Generated:', format(new Date(), 'MMM dd, yyyy HH:mm:ss')]);
            data.push([]);
            
            // Summary
            data.push(['FINANCIAL SUMMARY']);
            data.push(['Metric', 'Amount']);
            data.push(['Total Revenue', processedData.summary.totalRevenue]);
            data.push(['Total Expenses', processedData.summary.totalExpenses]);
            data.push(['Gross Profit', processedData.grossProfit.amount]);
            data.push(['Net Income', processedData.summary.netIncome]);
            data.push([]);
            
            // Revenue
            data.push(['REVENUE']);
            data.push(['Account', 'Amount', '% Revenue']);
            processedData.revenue.accounts.forEach(acc => {
                data.push([acc.name, acc.amount, acc.percentage]);
            });
            data.push(['Total Revenue', processedData.revenue.total, processedData.revenue.totalPercentage]);
            data.push([]);
            
            // COGS
            data.push(['COST OF GOODS SOLD']);
            data.push(['Account', 'Amount', '% Revenue']);
            processedData.costOfGoodsSold.accounts.forEach(acc => {
                data.push([acc.name, acc.amount, acc.percentage]);
            });
            data.push(['Total COGS', processedData.costOfGoodsSold.total, processedData.costOfGoodsSold.totalPercentage]);
            data.push([]);
            
            // Gross Profit
            data.push(['GROSS PROFIT', processedData.grossProfit.amount, processedData.grossProfit.percentage]);
            data.push([]);
            
            // Expenses
            data.push(['OPERATING EXPENSES']);
            data.push(['Account', 'Amount', '% Revenue']);
            processedData.expenses.accounts.forEach(acc => {
                data.push([acc.name, acc.amount, acc.percentage]);
            });
            data.push(['Total Expenses', processedData.expenses.total, processedData.expenses.totalPercentage]);
            data.push([]);
            
            // Net Income
            data.push(['NET INCOME', processedData.netIncome.amount, processedData.netIncome.percentage]);
            
            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(data);
            
            // Style column widths
            const wscols = [
                { wch: 40 }, // Account names
                { wch: 20 }, // Amounts
                { wch: 15 }  // Percentages
            ];
            ws['!cols'] = wscols;
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Income Statement");
            
            // Generate filename
            const fileName = `income-statement-${user?.company_name || 'report'}-${format(startDate!, 'yyyy-MM-dd')}-to-${format(endDate!, 'yyyy-MM-dd')}.xlsx`;
            
            // Save file
            XLSX.writeFile(wb, fileName);
            
            toast({
                title: "Excel Exported",
                description: "Income statement has been exported as Excel",
                variant: 'default'
            });
        } catch (error: any) {
            toast({
                title: "Export Failed",
                description: error.message || "Failed to export Excel",
                variant: 'destructive'
            });
        } finally {
            setIsExporting(false);
        }
    }, [processedData, startDate, endDate, user?.company_name, toast]);

    // Initialize report on component mount


    useEffect(() => {
        if (user?.company_id) {
            generateReport();
        }
    }, [user?.company_id, generateReport]); // <-- Corrected
    

    // Filter zero accounts based on preference
    const filterAccounts = useCallback((accounts: ReportAccount[]) => {
        if (showZeroAccounts) return accounts;
        return accounts.filter(acc => Math.abs(acc.amount) > 0.01);
    }, [showZeroAccounts]);

    // Render section with filtering
    const renderSection = (title: string, section: ReportSection, icon: React.ReactNode) => {
        const filteredAccounts = filterAccounts(section.accounts);
        
        if (filteredAccounts.length === 0) {
            return null;
        }

        return (
            <>
                <TableRow className="font-bold text-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <TableCell className="flex items-center gap-2">
                        {icon}
                        <span className="text-gray-700 dark:text-gray-300">{title}</span>
                    </TableCell>
                    <TableCell className="text-right"></TableCell>
                    {showPercentages && <TableCell className="text-right"></TableCell>}
                </TableRow>
                {filteredAccounts.map(acc => (
                    <TableRow key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="pl-10">{acc.name}</TableCell>
                        <TableCell className="text-right font-mono">
                            <span className={getIncomeColor(acc.amount)}>
                                {formatCurrency(acc.amount)}
                            </span>
                        </TableCell>
                        {showPercentages && (
                            <TableCell className="text-right font-mono text-gray-500">
                                {acc.percentage.toFixed(1)}%
                            </TableCell>
                        )}
                    </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-200 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <TableCell>Total {title}</TableCell>
                    <TableCell className="text-right font-mono">
                        <span className={getIncomeColor(section.total)}>
                            {formatCurrency(section.total)}
                        </span>
                    </TableCell>
                    {showPercentages && (
                        <TableCell className="text-right font-mono">
                            {section.totalPercentage.toFixed(1)}%
                        </TableCell>
                    )}
                </TableRow>
            </>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Income Statement</h1>
                    <p className="text-muted-foreground">View and analyze your company's profitability</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                        Company: {user?.company_name || 'N/A'}
                    </Badge>
                    <Badge variant="secondary" className="text-sm">
                        FY {startDate?.getFullYear()}
                    </Badge>
                </div>
            </div>

            {/* Quick Date Range Buttons */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2 mb-4">
                        <span className="text-sm font-medium self-center mr-2">Quick Range:</span>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('today')}>
                            Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('month')}>
                            This Month
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('quarter')}>
                            This Quarter
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('year')}>
                            This Year
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setQuickDateRange('ytd')}>
                            Year to Date
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="start-date" className="text-sm font-medium">
                                From Date
                            </Label>
                            <DatePicker 
                                date={startDate} 
                                setDate={setStartDate}
                                id="start-date"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-date" className="text-sm font-medium">
                                To Date
                            </Label>
                            <DatePicker 
                                date={endDate} 
                                setDate={setEndDate}
                                id="end-date"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Options</Label>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="show-percentages"
                                        checked={showPercentages}
                                        onCheckedChange={setShowPercentages}
                                    />
                                    <Label htmlFor="show-percentages" className="text-sm">
                                        Show %
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="show-zero"
                                        checked={showZeroAccounts}
                                        onCheckedChange={setShowZeroAccounts}
                                    />
                                    <Label htmlFor="show-zero" className="text-sm">
                                        Show Zero
                                    </Label>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                onClick={() => generateReport()} 
                                disabled={isLoading}
                                className="flex-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Generate Report
                                    </>
                                )}
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={clearCache}
                                title="Clear cached reports"
                            >
                                Clear Cache
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Export Buttons */}
            {processedData && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-3">
                            <Button 
                                onClick={exportToPDF} 
                                disabled={isExporting || !processedData}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                {isExporting ? 'Exporting...' : 'Export PDF'}
                            </Button>
                            <Button 
                                onClick={exportToExcel} 
                                disabled={isExporting || !processedData}
                                variant="outline"
                                className="flex items-center gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                {isExporting ? 'Exporting...' : 'Export Excel'}
                            </Button>
                            <div className="ml-auto text-sm text-muted-foreground">
                                Last updated: {processedData.generatedAt ? 
                                    format(new Date(processedData.generatedAt), 'MMM d, yyyy HH:mm') : 
                                    'Just now'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            {processedData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                                    <p className="text-2xl font-bold mt-2">
                                        {formatCurrency(processedData.summary.totalRevenue)}
                                    </p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                                    <p className="text-2xl font-bold mt-2">
                                        <span className={getIncomeColor(processedData.grossProfit.amount)}>
                                            {formatCurrency(processedData.grossProfit.amount)}
                                        </span>
                                    </p>
                                </div>
                                <ChevronsRight className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                                    <p className="text-2xl font-bold mt-2">
                                        {formatCurrency(processedData.summary.totalExpenses)}
                                    </p>
                                </div>
                                <TrendingDown className="h-8 w-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Net Income</p>
                                    <p className={`text-2xl font-bold mt-2 ${getIncomeColor(processedData.summary.netIncome)}`}>
                                        {formatCurrency(processedData.summary.netIncome)}
                                    </p>
                                    {showPercentages && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {processedData.netIncome.percentage.toFixed(1)}% of Revenue
                                        </p>
                                    )}
                                </div>
                                <Target className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Loading State */}
            {isLoading && retryCount === 0 && (
                <div className="flex flex-col justify-center items-center h-60 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-lg">Generating income statement...</p>
                    <p className="text-sm text-muted-foreground">
                        Fetching data for {format(startDate!, 'MMM d, yyyy')} to {format(endDate!, 'MMM d, yyyy')}
                    </p>
                </div>
            )}

            {/* Retry State */}
            {isLoading && retryCount > 0 && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Attempting to reconnect... (Retry {retryCount}/3)
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-4"
                            onClick={() => generateReport(true)}
                        >
                            Retry Now
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-4"
                            onClick={() => generateReport()}
                        >
                            Try Again
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Report Table */}
            {!isLoading && processedData && (
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50%]">Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        {showPercentages && (
                                            <TableHead className="text-right">% Revenue</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {renderSection('REVENUE', processedData.revenue, 
                                        <TrendingUp className="h-5 w-5" />)}
                                    
                                    {renderSection('COST OF GOODS SOLD', processedData.costOfGoodsSold, 
                                        <ShoppingCart className="h-5 w-5" />)}
                                    
                                    <TableRow className="font-bold bg-green-50 dark:bg-green-900/20 hover:bg-green-50 dark:hover:bg-green-900/20">
                                        <TableCell className="flex items-center gap-2">
                                            <ChevronsRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            <span className="text-green-700 dark:text-green-300">GROSS PROFIT</span>
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-lg">
                                            <span className={getIncomeColor(processedData.grossProfit.amount)}>
                                                {formatCurrency(processedData.grossProfit.amount)}
                                            </span>
                                        </TableCell>
                                        {showPercentages && (
                                            <TableCell className="text-right font-mono text-lg text-green-600 dark:text-green-400">
                                                {processedData.grossProfit.percentage.toFixed(1)}%
                                            </TableCell>
                                        )}
                                    </TableRow>
                                    
                                    {renderSection('OPERATING EXPENSES', processedData.expenses, 
                                        <TrendingDown className="h-5 w-5" />)}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-gray-800 dark:bg-gray-900 text-white dark:text-white hover:bg-gray-800 dark:hover:bg-gray-900">
                                        <TableCell className="flex items-center gap-2 text-lg font-extrabold">
                                            <Target className="h-6 w-6" />
                                            NET INCOME / (LOSS)
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-lg">
                                            <span className={getIncomeColor(processedData.netIncome.amount)}>
                                                {formatCurrency(processedData.netIncome.amount)}
                                            </span>
                                        </TableCell>
                                        {showPercentages && (
                                            <TableCell className="text-right font-mono text-lg">
                                                {processedData.netIncome.percentage.toFixed(1)}%
                                            </TableCell>
                                        )}
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                        
                        {/* Legend */}
                        <div className="p-4 border-t bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded"></div>
                                    <span>Gross Profit</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded"></div>
                                    <span>Section Headers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"></div>
                                    <span>Section Totals</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!isLoading && !processedData && !error && (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Report Generated</h3>
                        <p className="text-muted-foreground text-center mb-6">
                            Select a date range and click "Generate Report" to view your income statement.
                        </p>
                        <Button onClick={() => generateReport()}>
                            Generate Your First Report
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default IncomeStatementPage;