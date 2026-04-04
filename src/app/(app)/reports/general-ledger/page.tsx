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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow, 
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  addDays,
  subMonths,
  addMonths
} from 'date-fns';
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
  { value: 'all',     label: 'All Transactions' },
  { value: 'debit',   label: 'Debit Only' },
  { value: 'credit',  label: 'Credit Only' },
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
  try {
    return format(new Date(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
};

// FIX: API returns comma-formatted strings like "50,000,000.00"
// parseFloat("50,000,000.00") === 50 — strip commas first
const parseNum = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const getAccountColor = (type: string): { bg: string; text: string; border: string } => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    'Asset':     { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-500' },
    'Liability': { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-500' },
    'Equity':    { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-500' },
    'Revenue':   { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-500' },
    'Expense':   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-500' },
    'COGS':      { bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-500' },
  };
  return colors[type] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-400' };
};

const getAccountIcon = (type: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    'Asset':     <Banknote className="h-4 w-4" />,
    'Liability': <CreditCard className="h-4 w-4" />,
    'Equity':    <Shield className="h-4 w-4" />,
    'Revenue':   <TrendingUp className="h-4 w-4" />,
    'Expense':   <TrendingDown className="h-4 w-4" />,
    'COGS':      <Calculator className="h-4 w-4" />,
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
  
  doc.setFillColor(10, 45, 85);
  doc.rect(0, 0, 297, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GENERAL LEDGER REPORT', 148.5, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Detailed Transaction Ledger', 148.5, 22, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  let yPos = 35;
  doc.text(`Company: ${companyName || 'N/A'}`, 20, yPos);
  doc.text(`Account: ${summary.account_details.account_code} - ${summary.account_details.account_name}`, 120, yPos);
  yPos += 6;
  doc.text(`Period: ${format(fromDate, 'dd MMM yyyy')} to ${format(toDate, 'dd MMM yyyy')}`, 20, yPos);
  doc.text(`Account Type: ${summary.account_details.account_type}`, 120, yPos);
  
  yPos += 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 257, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT SUMMARY', 30, yPos + 8);
  doc.setFont('helvetica', 'normal');
  
  const summaryRows = [
    ['Opening Balance', formatCurrency(summary.opening_balance), 'Closing Balance', formatCurrency(summary.closing_balance)],
    ['Total Debit',     formatCurrency(summary.total_debit),     'Total Credit',    formatCurrency(summary.total_credit)],
    ['Net Movement',    formatCurrency(summary.net_movement),    'Transactions',    summary.transaction_count.toString()],
  ];
  
  yPos += 35;
  summaryRows.forEach((row, i) => {
    doc.text(row[0], 30,  yPos + (i * 6));
    doc.text(row[1], 100, yPos + (i * 6), { align: 'right' });
    doc.text(row[2], 160, yPos + (i * 6));
    doc.text(row[3], 230, yPos + (i * 6), { align: 'right' });
  });
  
  yPos += 25;
  const tableData = transactions.map(tx => [
    formatDate(tx.date),
    tx.reference,
    tx.description.substring(0, 50) + (tx.description.length > 50 ? '...' : ''),
    formatCurrency(tx.debit),
    formatCurrency(tx.credit),
    formatCurrency(tx.running_balance),
  ]);
  
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
  
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('CONFIDENTIAL - For authorized personnel only', 148.5, finalY + 6, { align: 'center' });
  
  doc.save(`Ledger_${summary.account_details.account_code}_${format(fromDate, 'yyyyMMdd')}_${format(toDate, 'yyyyMMdd')}.pdf`);
};

const generateExcelReport = (
  summary: LedgerSummary,
  transactions: Transaction[],
  fromDate: Date,
  toDate: Date
) => {
  const wb = XLSX.utils.book_new();
  
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
  
  const transactionHeaders = [['Date', 'Reference', 'Description', 'Debit (₦)', 'Credit (₦)', 'Running Balance (₦)', 'Journal Type', 'Posted By']];
  const transactionData = transactions.map(tx => [
    tx.date,
    tx.reference,
    tx.description,
    tx.debit,
    tx.credit,
    tx.running_balance,
    tx.journal_type || '',
    tx.posted_by || '',
  ]);
  
  const wsTransactions = XLSX.utils.aoa_to_sheet([...transactionHeaders, ...transactionData]);
  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions');
  
  XLSX.writeFile(wb, `Ledger_${summary.account_details.account_code}_${format(fromDate, 'yyyyMMdd')}.xlsx`);
};

// ====================================
// Reusable Single-Date Navigator
// ====================================

interface DateInputProps {
  label: string;
  date: Date;
  onChange: (d: Date) => void;
  max?: string;
  min?: string;
}

const DateInput: React.FC<DateInputProps> = ({ label, date, onChange, max, min }) => {
  const [inputValue, setInputValue] = useState(format(date, 'yyyy-MM-dd'));

  useEffect(() => {
    setInputValue(format(date, 'yyyy-MM-dd'));
  }, [date]);

  const commit = (val: string) => {
    const parsed = new Date(val + 'T00:00:00');
    if (!isNaN(parsed.getTime())) {
      onChange(parsed);
    } else {
      setInputValue(format(date, 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(subDays(date, 1))}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <input
          type="date"
          value={inputValue}
          min={min}
          max={max}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-xs 
                     ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring 
                     focus:ring-offset-2 cursor-pointer 
                     [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onChange(addDays(date, 1))}
          disabled={max ? format(date, 'yyyy-MM-dd') >= max : false}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// ====================================
// Main Component
// ====================================

const EMPTY_SUMMARY: LedgerSummary = {
  account_details: {
    account_name: 'N/A',
    account_type: 'N/A',
    account_code: '',
    normal_balance: 'debit',
  },
  period_str: 'N/A',
  opening_balance: 0,
  total_debit: 0,
  total_credit: 0,
  net_movement: 0,
  closing_balance: 0,
  transaction_count: 0,
};

const GeneralLedgerPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────────────────
  // Pending = what's in the filter panel, not yet fetched

  const [pendingFrom, setPendingFrom] = useState<Date>(startOfYear(new Date()));

  const [pendingTo,   setPendingTo]   = useState<Date>(new Date());
  // Applied = what was last fetched
  const [fromDate, setFromDate] = useState<Date>(startOfYear(new Date()));

  const [toDate,   setToDate]   = useState<Date>(new Date());

  const [accountCode,       setAccountCode]       = useState<string>(searchParams.get('account_code') || '');
  const [transactionType,   setTransactionType]   = useState<string>('all');
  const [searchTerm,        setSearchTerm]        = useState<string>('');
  const [sortBy,            setSortBy]            = useState<string>('date_desc');
  const [showZeroTx,        setShowZeroTx]        = useState<boolean>(true);

  const [accountsList, setAccountsList] = useState<ChartOfAccount[]>([]);
  const [summary,      setSummary]      = useState<LedgerSummary>(EMPTY_SUMMARY);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading,    setIsLoading]    = useState<boolean>(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeOpeningClosing: true,
    includeRunningBalance: true,
    includeTransactionDetails: true,
    format: 'detailed',
    passwordProtect: false,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  // ─── Fetch Accounts ───────────────────────────────────────────────────────
  // FIX: fallback company_id so the call is never blocked by missing auth
  const fetchAccounts = useCallback(async () => {
    const companyId = user?.company_id || 'HARI123';
    try {
      // CHANGE 1: Use the new API endpoint
      const response = await fetch(
        `https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${companyId}`
      );
      const data = await response.json();

      // CHANGE 2: The logic to handle the response
      // The new API returns a direct array, so we check if it's an array.
      if (Array.isArray(data)) {
        // If it's an array, we can set the accounts list directly.
        setAccountsList(data);
        
        // This part of the logic remains the same.
        const urlCode = searchParams.get('account_code');
        if (urlCode && data.some((a: ChartOfAccount) => a.account_code === urlCode)) {
          setAccountCode(urlCode);
        }
      } else {
        // If the API returns something other than an array, it's an error.
        throw new Error( (data && data.message) || 'Failed to load accounts: Invalid format');
      }
    } catch (error: any) {
      toast({ title: "Error Loading Accounts", description: error.message, variant: "destructive" });
    }
  }, [user?.company_id, searchParams, toast]);

  // ─── Fetch Ledger ─────────────────────────────────────────────────────────
  const fetchLedger = useCallback(async (
    code: string,
    from: Date,
    to: Date
  ) => {
    if (!code) {
      toast({ title: "Account Required", description: "Please select an account", variant: "destructive" });
      return;
    }

    const companyId = user?.company_id || 'HARI123'; // FIX: never block on auth
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        company_id: companyId,
        account_code: code,
        from_date: format(from, 'yyyy-MM-dd'),
        to_date: format(to, 'yyyy-MM-dd'),
      });

      const response = await fetch(
        `https://hariindustries.net/api/clearbook/get-general-ledger.php?${params.toString()}`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch ledger`);

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to generate ledger');

      setSummary({
        ...data.summary,
        opening_balance: parseNum(data.summary.opening_balance),
        total_debit:     parseNum(data.summary.total_debit),
        total_credit:    parseNum(data.summary.total_credit),
        net_movement:    parseNum(data.summary.net_movement),
        closing_balance: parseNum(data.summary.closing_balance),
      });

      const parsedTransactions = (data.transactions || []).map((tx: any) => ({
        ...tx,
        description:     tx.description || '—',   // FIX: API may return null
        debit:           parseNum(tx.debit),
        credit:          parseNum(tx.credit),
        running_balance: parseNum(tx.running_balance),
      }));

      setTransactions(parsedTransactions);
      // Apply the fetched dates
      setFromDate(from);
      setToDate(to);

      toast({
        title: "Ledger Generated",
        description: `${parsedTransactions.length} transactions loaded for ${format(from, 'dd MMM yyyy')} – ${format(to, 'dd MMM yyyy')}`,
      });
    } catch (error: any) {
      toast({ title: "Error Generating Ledger", description: error.message, variant: "destructive" });
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, toast]);

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If accountCode came from URL params, auto-fetch on mount
  useEffect(() => {
    const urlCode = searchParams.get('account_code');
    const urlDate = searchParams.get('date');
    if (urlCode) {
      const asOf = urlDate ? new Date(urlDate + 'T00:00:00') : new Date();
      const from = startOfYear(asOf);

      const to   = asOf;
      setPendingFrom(from);
      setPendingTo(to);
      fetchLedger(urlCode, from, to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    fetchLedger(accountCode, pendingFrom, pendingTo);
  };

  const handleReset = () => {
    const from = startOfMonth(new Date());
    const to   = new Date();
    setPendingFrom(from);
    setPendingTo(to);
    setSearchTerm('');
    setTransactionType('all');
    setSortBy('date_desc');
    setShowZeroTx(true);
  };

  // Quick period presets — update pending dates only; user still clicks Generate
  const handleQuickPeriod = (period: 'today' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    const presets: Record<string, [Date, Date]> = {
      today:   [now, now],
      month:   [startOfMonth(now), endOfMonth(now)],
      quarter: [startOfQuarter(now), endOfQuarter(now)],
      year:    [startOfYear(now), endOfYear(now)],
    };
    const [from, to] = presets[period];
    setPendingFrom(from);
    setPendingTo(to);
  };

  const handleExportPDF = () => {
    if (transactions.length === 0) {
      toast({ title: "No Data", description: "Cannot export empty ledger", variant: "destructive" });
      return;
    }
    generatePDFReport(summary, transactions, fromDate, toDate, exportOptions, user?.company_name);
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      toast({ title: "No Data", description: "Cannot export empty ledger", variant: "destructive" });
      return;
    }
    generateExcelReport(summary, transactions, fromDate, toDate);
  };

  // ─── Filtered / Sorted Transactions ───────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => {
      const matchesSearch = searchTerm === '' || 
        (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.reference.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = transactionType === 'all' ||
        (transactionType === 'debit'   && tx.debit > 0) ||
        (transactionType === 'credit'  && tx.credit > 0) ||
        (transactionType === 'journal' && tx.journal_type === 'Journal Entry') ||
        (transactionType === 'payment' && tx.journal_type === 'Payment') ||
        (transactionType === 'receipt' && tx.journal_type === 'Receipt');

      const passesZero = showZeroTx || (tx.debit !== 0 || tx.credit !== 0);

      return matchesSearch && matchesType && passesZero;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':    return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount_desc': return Math.max(b.debit, b.credit) - Math.max(a.debit, a.credit);
        case 'amount_asc':  return Math.max(a.debit, a.credit) - Math.max(b.debit, b.credit);
        case 'reference':   return a.reference.localeCompare(b.reference);
        default:            return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return filtered;
  }, [transactions, searchTerm, transactionType, showZeroTx, sortBy]);

  // ─── Derived Values ────────────────────────────────────────────────────────
  const hasLedger = summary.account_details.account_name !== 'N/A';
  const netMovement = summary.total_debit - summary.total_credit;

  // FIX: API doesn't always return normal_balance; derive from account_type
  // Asset, Expense, COGS → normal debit; Liability, Equity, Revenue → normal credit
  const debitNormalTypes = ['Asset', 'Expense', 'COGS'];
  const isDebitAccount = summary.account_details.normal_balance === 'debit' ||
    debitNormalTypes.includes(summary.account_details.account_type);

  // FIX: verify using closing = opening + net (for debit-normal accounts)
  // The API already computes closing correctly; just check it matches arithmetically
  const expectedClosing    = summary.opening_balance + (isDebitAccount ? netMovement : -netMovement);
  const balanceDiscrepancy = Math.abs(summary.closing_balance - expectedClosing);
  const debitPct           = (summary.total_debit + summary.total_credit) > 0
    ? (summary.total_debit / (summary.total_debit + summary.total_credit)) * 100 : 0;
  const creditPct = 100 - debitPct;

  const datesDiverge =
    format(pendingFrom, 'yyyy-MM-dd') !== format(fromDate, 'yyyy-MM-dd') ||
    format(pendingTo,   'yyyy-MM-dd') !== format(toDate, 'yyyy-MM-dd');

  const colors = getAccountColor(summary.account_details.account_type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ────────────────────────────────────────────────────────── */}
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
              <Badge
                variant={balanceDiscrepancy < 0.01 ? "default" : "destructive"}
                className="px-3 py-1"
              >
                {balanceDiscrepancy < 0.01
                  ? <><CheckCircle className="h-3 w-3 mr-1" />Reconciled</>
                  : <><AlertCircle className="h-3 w-3 mr-1" />Unreconciled</>
                }
              </Badge>
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Period: {format(fromDate, 'MMM dd, yyyy')} – {format(toDate, 'MMM dd, yyyy')}</span>
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-2" />
            <span>Transactions: {summary.transaction_count}</span>
          </div>
        </div>

        {/* ── Main Layout ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Filters Panel ─────────────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Ledger Filters
                </CardTitle>
                <CardDescription>Configure your ledger view</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Account selector */}
                <div className="space-y-2">
                  <Label>Account *</Label>
                  <Select value={accountCode} onValueChange={setAccountCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {accountsList.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No accounts loaded
                        </SelectItem>
                      ) : (
                        accountsList.map(account => (
                          <SelectItem key={account.account_code} value={account.account_code}>
                            <div className="flex items-center gap-2">
                              {getAccountIcon(account.account_type)}
                              <span className="font-mono text-xs">{account.account_code}</span>
                              <span className="truncate text-xs">{account.account_name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* FIX: native date inputs with prev/next arrows */}
                <div className="space-y-3">
                  <DateInput
                    label="From Date"
                    date={pendingFrom}
                    onChange={setPendingFrom}
                    max={format(pendingTo, 'yyyy-MM-dd')}
                  />
                  <DateInput
                    label="To Date"
                    date={pendingTo}
                    onChange={setPendingTo}
                    min={format(pendingFrom, 'yyyy-MM-dd')}
                    max={today}
                  />
                </div>

                {/* Quick period buttons */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Quick Period</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['today', 'month', 'quarter', 'year'] as const).map(p => (
                      <Button
                        key={p}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs capitalize"
                        onClick={() => handleQuickPeriod(p)}
                      >
                        {p === 'today' ? 'Today' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
                      </Button>
                    ))}
                  </div>
                </div>

                {datesDiverge && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                    Dates changed. Click "Generate Ledger" to apply.
                  </p>
                )}

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

                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="show-zero"
                    checked={showZeroTx}
                    onCheckedChange={(c) => setShowZeroTx(c as boolean)}
                  />
                  <Label htmlFor="show-zero" className="flex items-center gap-2 cursor-pointer text-sm">
                    {showZeroTx
                      ? <><Eye className="h-3.5 w-3.5" />Show Zero Transactions</>
                      : <><EyeOff className="h-3.5 w-3.5" />Hide Zero Transactions</>
                    }
                  </Label>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-2">
                <Button
                  onClick={handleGenerate}
                  className="w-full"
                  disabled={isLoading || !accountCode}
                >
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    : <><RefreshCw className="mr-2 h-4 w-4" />Generate Ledger</>
                  }
                </Button>
                <Button variant="outline" onClick={handleReset} className="w-full">
                  Reset Filters
                </Button>
              </CardFooter>
            </Card>

            {/* Account Summary Card */}
            {hasLedger && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-5 w-5" />
                    Account Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Balance Status</span>
                    <Badge variant={balanceDiscrepancy < 0.01 ? "default" : "destructive"}>
                      {balanceDiscrepancy < 0.01 ? 'OK' : 'Check'}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Debit Activity</span>
                      <span className="font-medium">{formatCurrency(summary.total_debit)}</span>
                    </div>
                    <Progress value={debitPct} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Credit Activity</span>
                      <span className="font-medium">{formatCurrency(summary.total_credit)}</span>
                    </div>
                    <Progress value={creditPct} className="h-1.5" />
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-500 mb-2">Account Type</div>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded ${colors.bg}`}>
                        <span className={colors.text}>{getAccountIcon(summary.account_details.account_type)}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{summary.account_details.account_type}</div>
                        <div className="text-xs text-gray-500">
                          Normal: {summary.account_details.normal_balance}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Main Content Area ─────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Search + Export Bar */}
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
                        <DropdownMenuItem onClick={() => window.print()}>
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
            {hasLedger && (
              <Card className={`border-l-4 ${colors.border} bg-gradient-to-r from-slate-50 to-white`}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${colors.bg}`}>
                        <span className={colors.text}>{getAccountIcon(summary.account_details.account_type)}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {summary.account_details.account_code} — {summary.account_details.account_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <Badge variant="outline" className={`${colors.text} border-current`}>
                            {summary.account_details.account_type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Normal: {summary.account_details.normal_balance}
                          </span>
                          <span className="text-xs text-gray-500">{summary.period_str}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(summary.closing_balance)}
                      </div>
                      <div className="text-xs text-gray-500">Closing Balance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            {hasLedger && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Opening Balance',
                    value: formatCurrency(summary.opening_balance),
                    sub: 'Start of period',
                    color: 'text-gray-900',
                  },
                  {
                    label: 'Total Debit',
                    value: formatCurrency(summary.total_debit),
                    sub: `${filteredTransactions.filter(t => t.debit > 0).length} entries`,
                    color: 'text-blue-700',
                  },
                  {
                    label: 'Total Credit',
                    value: formatCurrency(summary.total_credit),
                    sub: `${filteredTransactions.filter(t => t.credit > 0).length} entries`,
                    color: 'text-purple-700',
                  },
                  {
                    label: 'Net Movement',
                    value: formatCurrency(Math.abs(netMovement)),
                    sub: netMovement >= 0 ? 'Net Debit' : 'Net Credit',
                    color: netMovement >= 0 ? 'text-green-700' : 'text-red-600',
                  },
                ].map(card => (
                  <Card key={card.label}>
                    <CardContent className="p-4">
                      <div className="text-xs text-gray-500 mb-1">{card.label}</div>
                      <div className={`text-base font-bold ${card.color}`}>{card.value}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Transaction Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <CardTitle>Transaction Details</CardTitle>
                    <CardDescription>
                      {filteredTransactions.length} of {transactions.length} transactions shown
                      {balanceDiscrepancy > 0.01 && (
                        <span className="ml-2 text-red-600 font-medium">
                          • Discrepancy: {formatCurrency(balanceDiscrepancy)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs w-fit">
                    DR {formatCurrency(summary.total_debit)} / CR {formatCurrency(summary.total_credit)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-gray-600">Loading ledger transactions...</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {format(pendingFrom, 'dd MMM yyyy')} – {format(pendingTo, 'dd MMM yyyy')}
                    </p>
                  </div>
                ) : !accountCode ? (
                  <div className="text-center py-12">
                    <FileBarChart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Account</h3>
                    <p className="text-gray-500 max-w-sm mx-auto text-sm">
                      Choose an account from the filter panel and click Generate Ledger.
                    </p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
                    <p className="text-gray-500 max-w-sm mx-auto text-sm">
                      No transactions match your filters. Try a wider date range or different account.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={handleReset}>
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          <TableHead className="font-semibold text-xs">Date</TableHead>
                          <TableHead className="font-semibold text-xs">Reference</TableHead>
                          <TableHead className="font-semibold text-xs">Description</TableHead>
                          <TableHead className="text-right font-semibold text-xs">Debit</TableHead>
                          <TableHead className="text-right font-semibold text-xs">Credit</TableHead>
                          <TableHead className="text-right font-semibold text-xs">Running Balance</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Opening Balance Row */}
                        <TableRow className="bg-blue-50 hover:bg-blue-50">
                          <TableCell colSpan={3} className="font-semibold text-blue-800 text-sm">
                            Opening Balance
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                          <TableCell className="text-right font-bold text-blue-800">
                            {formatCurrency(summary.opening_balance)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>

                        {filteredTransactions.map((tx, i) => (
                          <TableRow key={`${tx.reference}-${i}`} className="hover:bg-gray-50">
                            <TableCell className="whitespace-nowrap">
                              <div className="text-sm font-medium">{formatDate(tx.date)}</div>
                              {tx.journal_type && (
                                <div className="text-xs text-gray-400">{tx.journal_type}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-xs text-gray-700">{tx.reference}</div>
                              {tx.posted_by && (
                                <div className="text-xs text-gray-400">By: {tx.posted_by}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-[220px] truncate text-sm" title={tx.description}>
                                {tx.description}
                              </div>
                            </TableCell>
                            <TableCell className={`text-right text-sm font-medium ${tx.debit > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
                              {tx.debit > 0 ? formatCurrency(tx.debit) : '—'}
                            </TableCell>
                            <TableCell className={`text-right text-sm font-medium ${tx.credit > 0 ? 'text-purple-700' : 'text-gray-300'}`}>
                              {tx.credit > 0 ? formatCurrency(tx.credit) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-sm">{formatCurrency(tx.running_balance)}</div>
                              <div className={`text-xs ${tx.running_balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {tx.running_balance >= 0 ? 'DR' : 'CR'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>

                      <TableFooter className="bg-gray-900">
                        <TableRow>
                          <TableCell colSpan={3} className="text-white font-bold text-sm">
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
                          <TableCell colSpan={5} className="text-gray-300 text-sm">
                            CLOSING BALANCE as of {format(toDate, 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell className="text-right text-white font-bold text-base">
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
                <div className="text-sm text-gray-500">
                  Showing <span className="font-semibold">{filteredTransactions.length}</span> of{' '}
                  <span className="font-semibold">{transactions.length}</span> transactions
                </div>
              </CardFooter>
            </Card>

            {/* Export Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Export Settings</CardTitle>
                <CardDescription>Configure your ledger export preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-opening"
                        checked={exportOptions.includeOpeningClosing}
                        onCheckedChange={(c) => setExportOptions({...exportOptions, includeOpeningClosing: c as boolean})}
                      />
                      <Label htmlFor="include-opening">Include Opening/Closing Balances</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-running"
                        checked={exportOptions.includeRunningBalance}
                        onCheckedChange={(c) => setExportOptions({...exportOptions, includeRunningBalance: c as boolean})}
                      />
                      <Label htmlFor="include-running">Include Running Balance Column</Label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-details"
                        checked={exportOptions.includeTransactionDetails}
                        onCheckedChange={(c) => setExportOptions({...exportOptions, includeTransactionDetails: c as boolean})}
                      />
                      <Label htmlFor="include-details">Include Transaction Details</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="password-protect"
                        checked={exportOptions.passwordProtect}
                        onCheckedChange={(c) => setExportOptions({...exportOptions, passwordProtect: c as boolean})}
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