'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button 
} from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { 
  Input 
} from "@/components/ui/input";
import { 
  Label 
} from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DatePicker 
} from '@/components/ui/date-picker';
import { 
  Checkbox 
} from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Badge 
} from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Download, 
  Printer, 
  Filter, 
  Search, 
  Eye, 
  EyeOff,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Settings,
  FileBarChart,
  Users,
  Building,
  CreditCard,
  Banknote,
  Calculator,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ====================================
// Types & Interfaces
// ====================================

interface AccountBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: string;
  credit: string;
  net_balance: string;
  net_balance_val: number;
  opening_balance?: number;
  closing_balance?: number;
  transaction_count?: number;
}

interface ReportSummary {
  total_accounts: number;
  total_debit: string;
  total_credit: string;
  is_balanced: boolean;
  asset: string;
  liability: string;
  equity: string;
  revenue: string;
  cogs: string;
  expense: string;
  net_assets?: number;
  debt_ratio?: number;
  current_ratio?: number;
  gross_margin?: number;
  net_income?: number;
}

interface ExportOptions {
  format: 'detailed' | 'summary';
  includeCharts: boolean;
  includeAnalysis: boolean;
  includeNotes: boolean;
  passwordProtect: boolean;
}

interface AccountTypeFilter {
  value: string;
  label: string;
  icon: React.ReactNode;
}

// ====================================
// Constants
// ====================================

const ACCOUNT_TYPES: AccountTypeFilter[] = [
  { value: 'all', label: 'All Accounts', icon: <Layers className="h-4 w-4" /> },
  { value: 'Asset', label: 'Assets', icon: <Banknote className="h-4 w-4" /> },
  { value: 'Liability', label: 'Liabilities', icon: <CreditCard className="h-4 w-4" /> },
  { value: 'Equity', label: 'Equity', icon: <Building className="h-4 w-4" /> },
  { value: 'Revenue', label: 'Revenue', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'Expense', label: 'Expenses', icon: <TrendingDown className="h-4 w-4" /> },
  { value: 'COGS', label: 'Cost of Goods', icon: <Calculator className="h-4 w-4" /> },
];

const BALANCE_TYPES = [
  { label: 'All Balances', value: 'all' },
  { label: 'Debit Balances Only', value: 'debit' },
  { label: 'Credit Balances Only', value: 'credit' },
  { label: 'Zero Balances Only', value: 'zero' },
];

const SORT_OPTIONS = [
  { label: 'Account Code', value: 'code' },
  { label: 'Account Name', value: 'name' },
  { label: 'Net Balance (High to Low)', value: 'balance_desc' },
  { label: 'Net Balance (Low to High)', value: 'balance_asc' },
  { label: 'Debit Amount', value: 'debit' },
  { label: 'Credit Amount', value: 'credit' },
];

// ====================================
// Utility Functions
// ====================================

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num || 0);
};

const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
};

const getAccountColor = (type: string): string => {
  const colors: Record<string, { bg: string; text: string }> = {
    'Asset': { bg: 'bg-blue-50', text: 'text-blue-700' },
    'Liability': { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    'Equity': { bg: 'bg-green-50', text: 'text-green-700' },
    'Revenue': { bg: 'bg-purple-50', text: 'text-purple-700' },
    'Expense': { bg: 'bg-red-50', text: 'text-red-700' },
    'COGS': { bg: 'bg-gray-50', text: 'text-gray-700' },
  };
  return colors[type]?.text || 'text-gray-700';
};

const getAccountIcon = (type: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    'Asset': <Banknote className="h-4 w-4" />,
    'Liability': <CreditCard className="h-4 w-4" />,
    'Equity': <Building className="h-4 w-4" />,
    'Revenue': <TrendingUp className="h-4 w-4" />,
    'Expense': <TrendingDown className="h-4 w-4" />,
    'COGS': <Calculator className="h-4 w-4" />,
  };
  return icons[type] || <Layers className="h-4 w-4" />;
};

// ====================================
// Export Functions
// ====================================

const generatePDFReport = (
  balances: AccountBalance[],
  summary: ReportSummary,
  asOfDate: Date,
  filters: any,
  companyName?: string
) => {
  const doc = new jsPDF('landscape');
  
  // Add professional header
  doc.setFillColor(10, 45, 85);
  doc.rect(0, 0, 297, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT BALANCES REPORT', 148.5, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Financial Position Statement', 148.5, 22, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  // Company and period information
  let yPos = 35;
  doc.text(`Company: ${companyName || 'N/A'}`, 20, yPos);
  doc.text(`Report Date: ${format(asOfDate, 'dd MMMM yyyy')}`, 200, yPos);
  yPos += 6;
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, yPos);
  doc.text(`Accounts: ${summary.total_accounts}`, 200, yPos);
  
  // Summary section
  yPos += 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 257, 25, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', 30, yPos + 8);
  doc.setFont('helvetica', 'normal');
  
  const summaryData = [
    ['Total Debit', formatCurrency(summary.total_debit), 'Total Credit', formatCurrency(summary.total_credit)],
    ['Assets', formatCurrency(summary.asset), 'Liabilities', formatCurrency(summary.liability)],
    ['Equity', formatCurrency(summary.equity), 'Revenue', formatCurrency(summary.revenue)],
    ['COGS', formatCurrency(summary.cogs), 'Expenses', formatCurrency(summary.expense)],
  ];
  
  yPos += 30;
  summaryData.forEach((row, index) => {
    doc.text(row[0], 30, yPos + (index * 6));
    doc.text(row[1], 100, yPos + (index * 6), { align: 'right' });
    doc.text(row[2], 160, yPos + (index * 6));
    doc.text(row[3], 230, yPos + (index * 6), { align: 'right' });
  });
  
  // Prepare table data
  yPos += 30;
  const tableData = balances.map(account => [
    account.account_code,
    account.account_name,
    account.account_type,
    formatCurrency(account.debit),
    formatCurrency(account.credit),
    formatCurrency(account.net_balance_val),
  ]);
  
  // Generate table
  (doc as any).autoTable({
    startY: yPos,
    head: [['Account Code', 'Account Name', 'Type', 'Debit (₦)', 'Credit (₦)', 'Net Balance (₦)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [10, 45, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  // Add footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This report is generated for internal accounting purposes and compliance.', 148.5, finalY, { align: 'center' });
  
  // Add confidentiality notice
  doc.text('CONFIDENTIAL - For authorized personnel only', 148.5, finalY + 6, { align: 'center' });
  
  // Save PDF
  doc.save(`Account_Balances_${format(asOfDate, 'yyyyMMdd')}.pdf`);
};

const generateExcelReport = (balances: AccountBalance[], summary: ReportSummary, asOfDate: Date) => {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['ACCOUNT BALANCES REPORT - SUMMARY'],
    [''],
    ['Report Date:', format(asOfDate, 'dd MMMM yyyy')],
    ['Generated:', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
    [''],
    ['FINANCIAL OVERVIEW'],
    ['Total Accounts:', summary.total_accounts],
    ['Total Debit:', parseCurrency(summary.total_debit)],
    ['Total Credit:', parseCurrency(summary.total_credit)],
    ['Balance Status:', summary.is_balanced ? 'BALANCED' : 'NOT BALANCED'],
    [''],
    ['CATEGORY TOTALS'],
    ['Assets:', parseCurrency(summary.asset)],
    ['Liabilities:', parseCurrency(summary.liability)],
    ['Equity:', parseCurrency(summary.equity)],
    ['Revenue:', parseCurrency(summary.revenue)],
    ['COGS:', parseCurrency(summary.cogs)],
    ['Expenses:', parseCurrency(summary.expense)],
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  
  // Details sheet
  const detailHeaders = [['Account Code', 'Account Name', 'Account Type', 'Debit (₦)', 'Credit (₦)', 'Net Balance (₦)']];
  const detailData = balances.map(account => [
    account.account_code,
    account.account_name,
    account.account_type,
    parseCurrency(account.debit),
    parseCurrency(account.credit),
    account.net_balance_val,
  ]);
  
  const wsDetails = XLSX.utils.aoa_to_sheet([...detailHeaders, ...detailData]);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Account Balances');
  
  // Analysis sheet
  const analysisData = [
    ['FINANCIAL ANALYSIS'],
    [''],
    ['Ratios & Metrics'],
    ['Debt Ratio:', summary.debt_ratio ? `${(summary.debt_ratio * 100).toFixed(2)}%` : 'N/A'],
    ['Current Ratio:', summary.current_ratio ? summary.current_ratio.toFixed(2) : 'N/A'],
    ['Gross Margin:', summary.gross_margin ? `${(summary.gross_margin * 100).toFixed(2)}%` : 'N/A'],
    ['Net Income:', summary.net_income ? formatCurrency(summary.net_income) : 'N/A'],
    ['Net Assets:', summary.net_assets ? formatCurrency(summary.net_assets) : 'N/A'],
  ];
  
  const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisData);
  XLSX.utils.book_append_sheet(wb, wsAnalysis, 'Financial Analysis');
  
  // Save file
  XLSX.writeFile(wb, `Account_Balances_${format(asOfDate, 'yyyyMMdd')}.xlsx`);
};

// ====================================
// Main Component
// ====================================

const AccountBalancesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // State Management
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [accountClass, setAccountClass] = useState<string>('all');
  const [balanceType, setBalanceType] = useState<string>('all');
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('code');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    total_accounts: 0,
    total_debit: '0.00',
    total_credit: '0.00',
    is_balanced: false,
    asset: '0.00',
    liability: '0.00',
    equity: '0.00',
    revenue: '0.00',
    cogs: '0.00',
    expense: '0.00',
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'detailed',
    includeCharts: true,
    includeAnalysis: true,
    includeNotes: true,
    passwordProtect: false,
  });

  // Fetch Data
  const fetchBalances = useCallback(async () => {
    if (!user?.company_id) return;
    
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        company_id: user.company_id,
        as_of_date: format(asOfDate, 'yyyy-MM-dd'),
        account_class: accountClass,
      });
      
      const response = await fetch(
        `https://hariindustries.net/api/clearbook/get-account-balances.php?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch data`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load account balances');
      }
      
      setBalances(data.accounts || []);
      setSummary(data.summary || {
        total_accounts: 0,
        total_debit: '0.00',
        total_credit: '0.00',
        is_balanced: false,
        asset: '0.00',
        liability: '0.00',
        equity: '0.00',
        revenue: '0.00',
        cogs: '0.00',
        expense: '0.00',
      });
      
      toast({
        title: "Report Generated",
        description: `${data.accounts?.length || 0} accounts loaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error Loading Report",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setBalances([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.company_id, asOfDate, accountClass, toast]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Filter and Sort Balances
  const filteredBalances = useMemo(() => {
    let filtered = balances.filter(account => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_code.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Account class filter
      const matchesClass = accountClass === 'all' || account.account_type === accountClass;
      
      // Zero balance filter
      const isZeroBalance = account.net_balance_val === 0;
      const passesZeroFilter = !hideZeroBalances || !isZeroBalance;
      
      // Balance type filter
      const passesBalanceFilter = balanceType === 'all' ||
        (balanceType === 'debit' && parseCurrency(account.debit) > 0) ||
        (balanceType === 'credit' && parseCurrency(account.credit) > 0) ||
        (balanceType === 'zero' && isZeroBalance);
      
      return matchesSearch && matchesClass && passesZeroFilter && passesBalanceFilter;
    });
    
    // Sort filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.account_name.localeCompare(b.account_name);
        case 'balance_desc':
          return b.net_balance_val - a.net_balance_val;
        case 'balance_asc':
          return a.net_balance_val - b.net_balance_val;
        case 'debit':
          return parseCurrency(b.debit) - parseCurrency(a.debit);
        case 'credit':
          return parseCurrency(b.credit) - parseCurrency(a.credit);
        default: // 'code'
          return a.account_code.localeCompare(b.account_code);
      }
    });
    
    return filtered;
  }, [balances, searchTerm, accountClass, hideZeroBalances, balanceType, sortBy]);

  // Handlers
  const handleGenerateReport = () => {
    setIsRefreshing(true);
    fetchBalances();
  };

  const handleResetFilters = () => {
    setAccountClass('all');
    setBalanceType('all');
    setHideZeroBalances(true);
    setSearchTerm('');
    setSortBy('code');
    setSelectedAccounts([]);
  };

  const handleExportPDF = () => {
    if (filteredBalances.length === 0) {
      toast({
        title: "No Data",
        description: "Cannot export empty report",
        variant: "destructive",
      });
      return;
    }
    
    generatePDFReport(
      filteredBalances,
      summary,
      asOfDate,
      { accountClass, balanceType, hideZeroBalances },
      user?.company_name
    );
    
    toast({
      title: "PDF Generated",
      description: "Your report has been downloaded",
    });
  };

  const handleExportExcel = () => {
    if (filteredBalances.length === 0) {
      toast({
        title: "No Data",
        description: "Cannot export empty report",
        variant: "destructive",
      });
      return;
    }
    
    generateExcelReport(filteredBalances, summary, asOfDate);
    
    toast({
      title: "Excel Generated",
      description: "Your report has been downloaded",
    });
  };

  const handleViewLedger = (accountCode: string) => {
    router.push(`/reports/general-ledger?account_code=${accountCode}&date=${format(asOfDate, 'yyyy-MM-dd')}`);
  };

  const handleSelectAccount = (accountCode: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountCode)
        ? prev.filter(code => code !== accountCode)
        : [...prev, accountCode]
    );
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === filteredBalances.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(filteredBalances.map(acc => acc.account_code));
    }
  };

  // Calculate derived metrics
  const totalDebitValue = parseCurrency(summary.total_debit);
  const totalCreditValue = parseCurrency(summary.total_credit);
  const balanceVariance = Math.abs(totalDebitValue - totalCreditValue);
  const balancePercentage = totalCreditValue > 0 
    ? (totalDebitValue / totalCreditValue) * 100 
    : totalDebitValue > 0 ? 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FileBarChart className="h-8 w-8 text-primary" />
                Account Balances Report
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive overview of all general ledger account balances as of {format(asOfDate, 'MMMM dd, yyyy')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={summary.is_balanced ? "success" : "destructive"} className="px-3 py-1">
                {summary.is_balanced ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Balanced
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Balanced
                  </>
                )}
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Users className="h-3 w-3 mr-1" />
                {summary.total_accounts} Accounts
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Report Period: {format(asOfDate, 'MMMM dd, yyyy')}</span>
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-2" />
            <span>Last Generated: {format(new Date(), 'HH:mm')}</span>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Report Filters
                </CardTitle>
                <CardDescription>
                  Customize your account balances view
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>As of Date</Label>
                  <DatePicker 
                    date={asOfDate} 
                    setDate={setAsOfDate}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Account Class</Label>
                  <Select value={accountClass} onValueChange={setAccountClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account class" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            {type.icon}
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Balance Type</Label>
                  <Select value={balanceType} onValueChange={setBalanceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select balance type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BALANCE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-4">
                  <Checkbox 
                    id="hide-zero" 
                    checked={hideZeroBalances}
                    onCheckedChange={(checked) => setHideZeroBalances(checked as boolean)}
                  />
                  <Label htmlFor="hide-zero" className="flex items-center gap-2 cursor-pointer">
                    {hideZeroBalances ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide Zero Balances
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" />
                        Show Zero Balances
                      </>
                    )}
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  onClick={handleGenerateReport} 
                  className="w-full"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Report
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </CardFooter>
            </Card>
            
            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Debit vs Credit</span>
                    <span>{balancePercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(balancePercentage, 100)} className="h-2" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-700">
                      {formatCurrency(totalDebitValue)}
                    </div>
                    <div className="text-xs text-green-600">Total Debit</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-lg font-bold text-red-700">
                      {formatCurrency(totalCreditValue)}
                    </div>
                    <div className="text-xs text-red-600">Total Credit</div>
                  </div>
                </div>
                
                {balanceVariance > 0.01 && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm font-medium text-yellow-700">
                      Variance: {formatCurrency(balanceVariance)}
                    </div>
                    <div className="text-xs text-yellow-600">Requires reconciliation</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Controls Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search accounts by name or code..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                          >
                            {viewMode === 'list' ? (
                              <PieChart className="h-4 w-4" />
                            ) : (
                              <Layers className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Switch to {viewMode === 'list' ? 'Grid' : 'List'} View
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Settings className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                        <DropdownMenuItem onClick={handleExportPDF}>
                          <FileText className="mr-2 h-4 w-4" />
                          Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportExcel}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export as Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Printer className="mr-2 h-4 w-4" />
                          Print Report
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries({
                'Asset': summary.asset,
                'Liability': summary.liability,
                'Equity': summary.equity,
                'Revenue': summary.revenue,
                'COGS': summary.cogs,
                'Expense': summary.expense,
              }).map(([type, amount]) => (
                <Card key={type} className={type === 'Asset' ? 'border-l-4 border-l-blue-500' : 
                                          type === 'Liability' ? 'border-l-4 border-l-yellow-500' :
                                          type === 'Equity' ? 'border-l-4 border-l-green-500' :
                                          type === 'Revenue' ? 'border-l-4 border-l-purple-500' :
                                          type === 'COGS' ? 'border-l-4 border-l-gray-500' :
                                          'border-l-4 border-l-red-500'}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-600">{type}</div>
                        <div className="text-xl font-bold mt-1">
                          {formatCurrency(amount)}
                        </div>
                      </div>
                      <div className={`p-2 rounded-full ${getAccountColor(type).replace('text-', 'bg-')} bg-opacity-20`}>
                        {getAccountIcon(type)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Account Balances Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Account Balances</CardTitle>
                    <CardDescription>
                      Showing {filteredBalances.length} of {balances.length} accounts
                      {selectedAccounts.length > 0 && ` • ${selectedAccounts.length} selected`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAccounts.length > 0 && (
                      <Button variant="outline" size="sm">
                        Batch Actions ({selectedAccounts.length})
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      {selectedAccounts.length === filteredBalances.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-gray-600">Loading account balances...</p>
                    <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your financial data</p>
                  </div>
                ) : filteredBalances.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts Found</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      No accounts match your current filters. Try adjusting your search criteria or date range.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={selectedAccounts.length === filteredBalances.length}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead className="w-[100px]">Code</TableHead>
                          <TableHead>Account Name</TableHead>
                          <TableHead className="w-[120px]">Type</TableHead>
                          <TableHead className="text-right w-[150px]">Debit</TableHead>
                          <TableHead className="text-right w-[150px]">Credit</TableHead>
                          <TableHead className="text-right w-[150px]">Net Balance</TableHead>
                          <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBalances.map((account) => (
                          <TableRow key={account.account_code} className="hover:bg-gray-50">
                            <TableCell>
                              <Checkbox
                                checked={selectedAccounts.includes(account.account_code)}
                                onCheckedChange={() => handleSelectAccount(account.account_code)}
                              />
                            </TableCell>
                            <TableCell className="font-mono font-medium">
                              {account.account_code}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${getAccountColor(account.account_type).replace('text-', 'bg-')} bg-opacity-10`}>
                                  {getAccountIcon(account.account_type)}
                                </div>
                                <span className="font-medium">{account.account_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`${getAccountColor(account.account_type)} border-current`}
                              >
                                {account.account_type}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${parseCurrency(account.debit) > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                              {formatCurrency(account.debit)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${parseCurrency(account.credit) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {formatCurrency(account.credit)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-lg">
                                {formatCurrency(account.net_balance_val)}
                              </div>
                              <div className={`text-xs ${account.net_balance_val > 0 ? 'text-green-600' : account.net_balance_val < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                {account.net_balance_val > 0 ? 'Debit Balance' : account.net_balance_val < 0 ? 'Credit Balance' : 'Zero Balance'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewLedger(account.account_code)}>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Ledger
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Account
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col md:flex-row items-center justify-between border-t p-4">
                <div className="text-sm text-gray-600 mb-2 md:mb-0">
                  Total Net Balance: <span className="font-bold">{formatCurrency(
                    filteredBalances.reduce((sum, acc) => sum + acc.net_balance_val, 0)
                  )}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page 1 of 1 • {filteredBalances.length} accounts
                  </span>
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>

            {/* Export Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Export Settings</CardTitle>
                <CardDescription>
                  Configure your report export preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-charts" 
                        checked={exportOptions.includeCharts}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, includeCharts: checked as boolean})
                        }
                      />
                      <Label htmlFor="include-charts">Include Charts & Graphs</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-analysis" 
                        checked={exportOptions.includeAnalysis}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, includeAnalysis: checked as boolean})
                        }
                      />
                      <Label htmlFor="include-analysis">Include Financial Analysis</Label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-notes" 
                        checked={exportOptions.includeNotes}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, includeNotes: checked as boolean})
                        }
                      />
                      <Label htmlFor="include-notes">Include Notes & Comments</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="password-protect" 
                        checked={exportOptions.passwordProtect}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, passwordProtect: checked as boolean})
                        }
                      />
                      <Label htmlFor="password-protect" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Password Protect PDF
                      </Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountBalancesPage;