'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow, 
  TableFooter,
  TableCaption 
} from "@/components/ui/table";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  Input 
} from "@/components/ui/input";
import { 
  Label 
} from "@/components/ui/label";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
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
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Calendar,
  BarChart3,
  ArrowUpDown,
  Eye,
  EyeOff,
  Calculator,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Shield,
  FileBarChart,
  Layers,
  MoreHorizontal,
  ExternalLink,
  Save,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Checkbox } from "@/components/ui/checkbox";


// ====================================
// Types & Interfaces
// ====================================

interface ChartOfAccount {
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: 'debit' | 'credit';
}

interface Transaction {
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  journal_type?: string;
  posted_by?: string;
}

interface LedgerSummary {
  account_details: {
    account_name: string;
    account_type: string;
    account_code: string;
    normal_balance: 'debit' | 'credit';
    description?: string;
  };
  period_str: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  net_movement: number;
  closing_balance: number;
  transaction_count: number;
  average_debit?: number;
  average_credit?: number;
  largest_transaction?: number;
}

interface ExportOptions {
  includeOpeningClosing: boolean;
  includeRunningBalance: boolean;
  includeTransactionDetails: boolean;
  format: 'detailed' | 'summary';
  passwordProtect: boolean;
}

// ====================================
// Constants
// ====================================

const TRANSACTION_TYPES = [
  { value: 'all', label: 'All Transactions' },
  { value: 'debit', label: 'Debit Only' },
  { value: 'credit', label: 'Credit Only' },
  { value: 'journal', label: 'Journal Entries' },
  { value: 'payment', label: 'Payments' },
  { value: 'receipt', label: 'Receipts' },
];

const SORT_OPTIONS = [
  { label: 'Date (Newest First)', value: 'date_desc' },
  { label: 'Date (Oldest First)', value: 'date_asc' },
  { label: 'Amount (High to Low)', value: 'amount_desc' },
  { label: 'Amount (Low to High)', value: 'amount_asc' },
  { label: 'Reference', value: 'reference' },
];

// ====================================
// Utility Functions
// ====================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return format(new Date(dateString), 'dd MMM yyyy');
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
    'Equity': <Shield className="h-4 w-4" />,
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
  summary: LedgerSummary,
  transactions: Transaction[],
  fromDate: Date,
  toDate: Date,
  options: ExportOptions,
  companyName?: string
) => {
  const doc = new jsPDF('landscape');
  
  // Add professional header
  doc.setFillColor(10, 45, 85);
  doc.rect(0, 0, 297, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GENERAL LEDGER REPORT', 148.5, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Detailed Transaction Ledger', 148.5, 22, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  // Company and account information
  let yPos = 35;
  doc.text(`Company: ${companyName || 'N/A'}`, 20, yPos);
  doc.text(`Account: ${summary.account_details.account_code} - ${summary.account_details.account_name}`, 200, yPos);
  yPos += 6;
  doc.text(`Period: ${format(fromDate, 'dd MMM yyyy')} to ${format(toDate, 'dd MMM yyyy')}`, 20, yPos);
  doc.text(`Account Type: ${summary.account_details.account_type}`, 200, yPos);
  
  // Summary section
  yPos += 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 257, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT SUMMARY', 30, yPos + 8);
  doc.setFont('helvetica', 'normal');
  
  const summaryData = [
    ['Opening Balance', formatCurrency(summary.opening_balance), 'Closing Balance', formatCurrency(summary.closing_balance)],
    ['Total Debit', formatCurrency(summary.total_debit), 'Total Credit', formatCurrency(summary.total_credit)],
    ['Net Movement', formatCurrency(summary.net_movement), 'Transactions', summary.transaction_count.toString()],
  ];
  
  yPos += 35;
  summaryData.forEach((row, index) => {
    doc.text(row[0], 30, yPos + (index * 6));
    doc.text(row[1], 100, yPos + (index * 6), { align: 'right' });
    doc.text(row[2], 160, yPos + (index * 6));
    doc.text(row[3], 230, yPos + (index * 6), { align: 'right' });
  });
  
  // Prepare table data
  yPos += 25;
  const tableData = transactions.map(tx => [
    formatDate(tx.date),
    tx.reference,
    tx.description.substring(0, 50) + (tx.description.length > 50 ? '...' : ''),
    formatCurrency(tx.debit),
    formatCurrency(tx.credit),
    formatCurrency(tx.running_balance),
  ]);
  
  // Generate table
  (doc as any).autoTable({
    startY: yPos,
    head: [['Date', 'Reference', 'Description', 'Debit (₦)', 'Credit (₦)', 'Running Balance (₦)']],
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
  doc.text('This ledger report is generated for audit and reconciliation purposes.', 148.5, finalY, { align: 'center' });
  
  // Add page number
  doc.text(`Page 1 of 1`, 280, doc.internal.pageSize.height - 10, { align: 'right' });
  
  // Save PDF
  doc.save(`Ledger_${summary.account_details.account_code}_${format(fromDate, 'yyyyMMdd')}_${format(toDate, 'yyyyMMdd')}.pdf`);
};

const generateExcelReport = (
  summary: LedgerSummary,
  transactions: Transaction[],
  fromDate: Date,
  toDate: Date
) => {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['GENERAL LEDGER REPORT'],
    [''],
    ['Account Details'],
    ['Account Code:', summary.account_details.account_code],
    ['Account Name:', summary.account_details.account_name],
    ['Account Type:', summary.account_details.account_type],
    [''],
    ['Report Period:', `${format(fromDate, 'dd MMM yyyy')} to ${format(toDate, 'dd MMM yyyy')}`],
    ['Generated:', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
    [''],
    ['SUMMARY'],
    ['Opening Balance:', summary.opening_balance],
    ['Total Debit:', summary.total_debit],
    ['Total Credit:', summary.total_credit],
    ['Net Movement:', summary.net_movement],
    ['Closing Balance:', summary.closing_balance],
    ['Transaction Count:', summary.transaction_count],
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  
  // Transactions sheet
  const transactionHeaders = [['Date', 'Reference', 'Description', 'Debit (₦)', 'Credit (₦)', 'Running Balance (₦)']];
  const transactionData = transactions.map(tx => [
    new Date(tx.date),
    tx.reference,
    tx.description,
    tx.debit,
    tx.credit,
    tx.running_balance,
  ]);
  
  const wsTransactions = XLSX.utils.aoa_to_sheet([...transactionHeaders, ...transactionData]);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');
  
  // Save file
  XLSX.writeFile(wb, `Ledger_${summary.account_details.account_code}_${format(fromDate, 'yyyyMMdd')}.xlsx`);
};

// ====================================
// Main Component
// ====================================

const GeneralLedgerPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // State Management
  const [fromDate, setFromDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [accountCode, setAccountCode] = useState<string>(searchParams.get('account_code') || '');
  const [transactionType, setTransactionType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showZeroTransactions, setShowZeroTransactions] = useState<boolean>(true);
  
  const [accountsList, setAccountsList] = useState<ChartOfAccount[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    account_details: {
      account_name: 'N/A',
      account_type: 'N/A',
      account_code: '',
      normal_balance: 'debit'
    },
    period_str: 'N/A',
    opening_balance: 0,
    total_debit: 0,
    total_credit: 0,
    net_movement: 0,
    closing_balance: 0,
    transaction_count: 0
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeOpeningClosing: true,
    includeRunningBalance: true,
    includeTransactionDetails: true,
    format: 'detailed',
    passwordProtect: false,
  });

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    if (!user?.company_id) return;
    
    try {
      const response = await fetch(
        `https://hariindustries.net/api/clearbook/get-gl-accounts.php?company_id=${user.company_id}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAccountsList(data.accounts || []);
      } else {
        throw new Error(data.message || 'Failed to load accounts');
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Accounts",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [user?.company_id, toast]);

  // Fetch Ledger Data
  const fetchLedger = useCallback(async () => {
    if (!user?.company_id || !accountCode) return;
    
    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        company_id: user.company_id,
        account_code: accountCode,
        from_date: format(fromDate, 'yyyy-MM-dd'),
        to_date: format(toDate, 'yyyy-MM-dd'),
      });
      
      const response = await fetch(
        `https://hariindustries.net/api/clearbook/get-general-ledger.php?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch ledger`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate ledger');
      }
      
      setSummary({
        ...data.summary,
        opening_balance: parseFloat(data.summary.opening_balance) || 0,
        total_debit: parseFloat(data.summary.total_debit) || 0,
        total_credit: parseFloat(data.summary.total_credit) || 0,
        net_movement: parseFloat(data.summary.net_movement) || 0,
        closing_balance: parseFloat(data.summary.closing_balance) || 0,
      });
      
      // Parse transaction amounts
      const parsedTransactions = (data.transactions || []).map((tx: any) => ({
        ...tx,
        debit: parseFloat(tx.debit) || 0,
        credit: parseFloat(tx.credit) || 0,
        running_balance: parseFloat(tx.running_balance) || 0,
      }));
      
      setTransactions(parsedTransactions);
      
      toast({
        title: "Ledger Generated",
        description: `${parsedTransactions.length} transactions loaded`,
      });
    } catch (error: any) {
      toast({
        title: "Error Generating Ledger",
        description: error.message,
        variant: "destructive",
      });
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, accountCode, fromDate, toDate, toast]);

  // Effects
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accountCode && fromDate && toDate) {
      fetchLedger();
    }
  }, [accountCode, fromDate, toDate, fetchLedger]);

  // Handlers
  const handleGenerate = () => {
    if (!accountCode) {
      toast({
        title: "Account Required",
        description: "Please select an account to generate the ledger",
        variant: "destructive",
      });
      return;
    }
    fetchLedger();
  };

  const handleReset = () => {
    const date = new Date();
    date.setDate(1);
    setFromDate(date);
    setToDate(new Date());
    setSearchTerm('');
    setTransactionType('all');
    setSortBy('date_desc');
  };

  const handleExportPDF = () => {
    if (transactions.length === 0) {
      toast({
        title: "No Data",
        description: "Cannot export empty ledger",
        variant: "destructive",
      });
      return;
    }
    
    generatePDFReport(
      summary,
      transactions,
      fromDate,
      toDate,
      exportOptions,
      user?.company_name
    );
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      toast({
        title: "No Data",
        description: "Cannot export empty ledger",
        variant: "destructive",
      });
      return;
    }
    
    generateExcelReport(summary, transactions, fromDate, toDate);
  };

  const handleQuickPeriod = (period: 'today' | 'month' | 'quarter' | 'year') => {
    const today = new Date();
    
    switch (period) {
      case 'today':
        setFromDate(today);
        setToDate(today);
        break;
      case 'month':
        setFromDate(startOfMonth(today));
        setToDate(endOfMonth(today));
        break;
      case 'quarter':
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        setFromDate(quarterStart);
        setToDate(quarterEnd);
        break;
      case 'year':
        setFromDate(new Date(today.getFullYear(), 0, 1));
        setToDate(new Date(today.getFullYear(), 11, 31));
        break;
    }
  };

  // Filter and Sort Transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Transaction type filter
      const matchesType = transactionType === 'all' ||
        (transactionType === 'debit' && tx.debit > 0) ||
        (transactionType === 'credit' && tx.credit > 0) ||
        (transactionType === 'journal' && tx.journal_type === 'Journal Entry') ||
        (transactionType === 'payment' && tx.journal_type === 'Payment') ||
        (transactionType === 'receipt' && tx.journal_type === 'Receipt');
      
      // Zero transaction filter
      const passesZeroFilter = showZeroTransactions || (tx.debit !== 0 || tx.credit !== 0);
      
      return matchesSearch && matchesType && passesZeroFilter;
    });
    
    // Sort transactions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount_desc':
          return Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit);
        case 'amount_asc':
          return Math.max(a.debit, a.credit) - Math.max(b.debit, b.credit);
        case 'reference':
          return a.reference.localeCompare(b.reference);
        default: // 'date_desc'
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
    
    return filtered;
  }, [transactions, searchTerm, transactionType, showZeroTransactions, sortBy]);

  // Calculate additional metrics
  const netMovement = summary.total_debit - summary.total_credit;
  const isDebitAccount = summary.account_details.normal_balance === 'debit';
  const expectedClosing = summary.opening_balance + (isDebitAccount ? netMovement : -netMovement);
  const balanceDiscrepancy = Math.abs(summary.closing_balance - expectedClosing);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FileBarChart className="h-8 w-8 text-primary" />
                General Ledger Report
              </h1>
              <p className="text-gray-600 mt-1">
                Detailed transaction history and balance analysis for individual accounts
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {summary.account_details.account_code && (
                <Badge variant="outline" className="px-3 py-1">
                  <Layers className="h-3 w-3 mr-1" />
                  {summary.account_details.account_code}
                </Badge>
              )}
              <Badge variant={balanceDiscrepancy < 0.01 ? "success" : "destructive"} className="px-3 py-1">
                {balanceDiscrepancy < 0.01 ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Reconciled
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unreconciled
                  </>
                )}
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Period: {format(fromDate, 'MMM dd, yyyy')} to {format(toDate, 'MMM dd, yyyy')}</span>
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-2" />
            <span>Transactions: {summary.transaction_count}</span>
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
                  Ledger Filters
                </CardTitle>
                <CardDescription>
                  Configure your ledger view
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Account *</Label>
                  <Select value={accountCode} onValueChange={setAccountCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {accountsList.map(account => (
                        <SelectItem key={account.account_code} value={account.account_code}>
                          <div className="flex items-center gap-2">
                            {getAccountIcon(account.account_type)}
                            <span className="font-mono">{account.account_code}</span>
                            <span className="truncate">{account.account_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <DatePicker 
                      date={fromDate} 
                      setDate={setFromDate}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <DatePicker 
                      date={toDate} 
                      setDate={setToDate}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Transaction Type</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map(type => (
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
                      <SelectValue placeholder="Sort transactions" />
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
                
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="show-zero" 
                    checked={showZeroTransactions}
                    onCheckedChange={(checked) => setShowZeroTransactions(checked as boolean)}
                  />
                  <Label htmlFor="show-zero" className="flex items-center gap-2 cursor-pointer">
                    {showZeroTransactions ? (
                      <>
                        <Eye className="h-4 w-4" />
                        Show Zero Transactions
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide Zero Transactions
                      </>
                    )}
                  </Label>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2">
                <Button 
                  onClick={handleGenerate} 
                  className="w-full"
                  disabled={isLoading || !accountCode}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Ledger
                    </>
                  )}
                </Button>
                
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={handleReset}
                    className="w-full"
                  >
                    Reset
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full">
                        Quick Period
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleQuickPeriod('today')}>
                        Today
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickPeriod('month')}>
                        This Month
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickPeriod('quarter')}>
                        This Quarter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleQuickPeriod('year')}>
                        This Year
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
            
            {/* Account Summary */}
            {summary.account_details.account_name !== 'N/A' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Account Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Balance Status</span>
                    <Badge variant={balanceDiscrepancy < 0.01 ? "success" : "destructive"}>
                      {balanceDiscrepancy < 0.01 ? 'OK' : 'Check'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Debit Activity</span>
                      <span className="font-medium">{formatCurrency(summary.total_debit)}</span>
                    </div>
                    <Progress 
                      value={(summary.total_debit / (summary.total_debit + summary.total_credit)) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Credit Activity</span>
                      <span className="font-medium">{formatCurrency(summary.total_credit)}</span>
                    </div>
                    <Progress 
                      value={(summary.total_credit / (summary.total_debit + summary.total_credit)) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600 mb-2">Account Type</div>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded ${getAccountColor(summary.account_details.account_type).replace('text-', 'bg-')} bg-opacity-10`}>
                        {getAccountIcon(summary.account_details.account_type)}
                      </div>
                      <div>
                        <div className="font-medium">{summary.account_details.account_type}</div>
                        <div className="text-xs text-gray-500">
                          Normal Balance: {summary.account_details.normal_balance}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                        placeholder="Search transactions by description or reference..."
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
                            onClick={() => router.push(`/reports/account-balances?highlight=${accountCode}`)}
                            disabled={!accountCode}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Account Balance</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                        <DropdownMenuItem onClick={handleExportPDF} disabled={transactions.length === 0}>
                          <FileText className="mr-2 h-4 w-4" />
                          Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportExcel} disabled={transactions.length === 0}>
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

            {/* Account Details Banner */}
            {summary.account_details.account_name !== 'N/A' && (
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${getAccountColor(summary.account_details.account_type).replace('text-', 'bg-')} bg-opacity-20`}>
                        {getAccountIcon(summary.account_details.account_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-blue-900">
                          {summary.account_details.account_code} - {summary.account_details.account_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {summary.account_details.account_type}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              Normal {summary.account_details.normal_balance}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Period: {summary.period_str}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(summary.closing_balance)}
                      </div>
                      <div className="text-sm text-gray-600">Closing Balance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            {summary.account_details.account_name !== 'N/A' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Opening Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCurrency(summary.opening_balance)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Balance at start of period</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Debit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-green-700">
                      {formatCurrency(summary.total_debit)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{filteredTransactions.filter(t => t.debit > 0).length} debit entries</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Credit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(summary.total_credit)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{filteredTransactions.filter(t => t.credit > 0).length} credit entries</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Net Movement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${netMovement >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatCurrency(netMovement)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Change during period</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Transaction Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Transaction Details</CardTitle>
                    <CardDescription>
                      {filteredTransactions.length} transactions • Net Movement: {formatCurrency(summary.net_movement)}
                      {balanceDiscrepancy > 0.01 && (
                        <span className="ml-2 text-red-600">
                          • Discrepancy: {formatCurrency(balanceDiscrepancy)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1">
                      {formatCurrency(summary.total_debit)} / {formatCurrency(summary.total_credit)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-gray-600">Loading ledger transactions...</p>
                    <p className="text-sm text-gray-500 mt-2">Processing {summary.transaction_count} entries</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileBarChart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      No transactions match your current filters. Try adjusting your search criteria or date range.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100 hover:bg-gray-100">
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">Reference</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="text-right font-semibold">Debit</TableHead>
                          <TableHead className="text-right font-semibold">Credit</TableHead>
                          <TableHead className="text-right font-semibold">Running Balance</TableHead>
                          <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Opening Balance Row */}
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={3} className="font-bold">
                            Opening Balance
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(summary.opening_balance)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        
                        {/* Transactions */}
                        {filteredTransactions.map((transaction, index) => (
                          <TableRow key={`${transaction.reference}-${index}`} className="hover:bg-gray-50">
                            <TableCell className="whitespace-nowrap">
                              <div className="font-medium">{formatDate(transaction.date)}</div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(transaction.date), 'HH:mm')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-sm">{transaction.reference}</div>
                              {transaction.journal_type && (
                                <div className="text-xs text-gray-500">{transaction.journal_type}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[250px] truncate" title={transaction.description}>
                                {transaction.description}
                              </div>
                              {transaction.posted_by && (
                                <div className="text-xs text-gray-500">By: {transaction.posted_by}</div>
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${transaction.debit > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                              {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${transaction.credit > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold">
                                {formatCurrency(transaction.running_balance)}
                              </div>
                              <div className={`text-xs ${transaction.running_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.running_balance >= 0 ? 'Debit Balance' : 'Credit Balance'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      
                      <TableFooter className="bg-gray-900">
                        <TableRow>
                          <TableCell colSpan={3} className="text-white font-bold">
                            PERIOD TOTALS
                          </TableCell>
                          <TableCell className="text-right text-white font-bold">
                            {formatCurrency(summary.total_debit)}
                          </TableCell>
                          <TableCell className="text-right text-white font-bold">
                            {formatCurrency(summary.total_credit)}
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={5} className="text-white font-bold">
                            CLOSING BALANCE as of {format(toDate, 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right text-white font-bold text-lg">
                            {formatCurrency(summary.closing_balance)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col md:flex-row items-center justify-between border-t p-4">
                <div className="text-sm text-gray-600 mb-2 md:mb-0">
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page 1 of 1
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
                  Configure your ledger export preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-opening" 
                        checked={exportOptions.includeOpeningClosing}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, includeOpeningClosing: checked as boolean})
                        }
                      />
                      <Label htmlFor="include-opening">Include Opening/Closing Balances</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-running" 
                        checked={exportOptions.includeRunningBalance}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, includeRunningBalance: checked as boolean})
                        }
                      />
                      <Label htmlFor="include-running">Include Running Balance Column</Label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="include-details" 
                        checked={exportOptions.includeTransactionDetails}
                        onCheckedChange={(checked) => 
                          setExportOptions({...exportOptions, includeTransactionDetails: checked as boolean})
                        }
                      />
                      <Label htmlFor="include-details">Include Transaction Details</Label>
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

export default GeneralLedgerPage;