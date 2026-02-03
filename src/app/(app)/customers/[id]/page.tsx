'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';import {
  Download,
  Printer,
  FileText,
  Mail,
  Phone,
  User,
  Building,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart,
  DownloadCloud,
  Share2,
  Copy,
  ExternalLink,
  Home,
  Briefcase,
  Wallet,
  Shield,
  Calculator,
  Archive,
  CalendarDays,
  FileSignature,
  Receipt,
  CreditCardIcon,
  Banknote,
  Landmark,
  Scale,
  FileBarChart2,
  Users,
  Store,
  Package,
  Truck,
  Factory,
  Wrench,
  Sparkles,
  Loader2
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* =====================================================
   TYPES
===================================================== */

interface CustomerProfile {
  customer_id: string;
  customer_name: string;
  email_address?: string;
  primary_phone_number?: string;
  secondary_phone_number?: string;
  customer_type: string;
  preferred_payment_method?: string;
  credit_limit: number;
  payment_terms?: string;
  status: string;
  balance: number;
  opening_balance: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  registration_number?: string;
  tax_id?: string;
  created_at?: string;
  last_transaction_date?: string;
  total_transactions?: number;
  credit_days?: number;
  notes?: string;
  [key: string]: any;
}

interface LedgerTransaction {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  voucher_type?: string;
  voucher_no?: string;
  particulars?: string;
  bill_no?: string;
  due_date?: string;
  status?: string;
  transaction_id?: string;
}

interface ApiResponse {
  customer: any;
  ledger: LedgerTransaction[];
  current_balance: number;
  opening_balance: number;
  period_summary?: {
    opening: number;
    closing: number;
    total_debit: number;
    total_credit: number;
  };
}

interface PeriodSummary {
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
  net_movement: number;
}

/* =====================================================
   UTILITY FUNCTIONS
===================================================== */

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, 'dd-MMM-yyyy') : 'Invalid Date';
};

const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  const date = parseISO(dateString);
  return isValid(date) ? format(date, 'dd-MMM-yyyy HH:mm') : 'Invalid Date';
};

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { color: string; icon: any }> = {
    'Active': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    'Inactive': { color: 'bg-gray-100 text-gray-800', icon: Clock },
    'Overdue': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
    'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    'Paid': { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    'Partial': { color: 'bg-orange-100 text-orange-800', icon: AlertCircle }
  };
  
  const config = statusMap[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock };
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
};

const getTransactionIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    'Invoice': FileText,
    'Receipt': Receipt,
    'Payment': CreditCardIcon,
    'Credit Note': FileSignature,
    'Journal': FileText,
    'Adjustment': Calculator,
    'Refund': ArrowDownRight,
    'Opening Balance': Archive
  };
  return iconMap[type] || FileText;
};

/* =====================================================
   COMPONENTS
===================================================== */

const Breadcrumbs = ({ code, name }: { code?: string; name?: string }) => (
  <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
    <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
      <Home className="h-4 w-4" />
      Dashboard
    </Link>
    <ChevronRight className="h-4 w-4" />
    <Link href="/customers" className="hover:text-blue-600">
      Customers
    </Link>
    <ChevronRight className="h-4 w-4" />
    <span className="font-semibold text-gray-900">
      {code} - {name?.substring(0, 20)}{name && name.length > 20 ? '...' : ''}
    </span>
  </nav>
);

const CustomerHeader = ({ customer }: { customer: CustomerProfile }) => (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white rounded-xl shadow-sm">
          <User className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{customer.customer_name}</h1>
            {getStatusBadge(customer.status)}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              {customer.customer_type}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              {customer.email_address || 'No email'}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {customer.primary_phone_number || 'No phone'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Customer ID: {customer.customer_id}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Contact
        </Button>
        <Button variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>
    </div>
  </div>
);

const CustomerInfoCard = ({ customer }: { customer: CustomerProfile }) => {
  const infoSections = [
    {
      title: 'Basic Information',
      icon: User,
      items: [
        { label: 'Customer Type', value: customer.customer_type },
        { label: 'Registration No.', value: customer.registration_number || 'N/A' },
        { label: 'Tax ID', value: customer.tax_id || 'N/A' },
        { label: 'Created On', value: formatDate(customer.created_at || '') },
      ]
    },
    {
      title: 'Contact Details',
      icon: Phone,
      items: [
        { label: 'Primary Phone', value: customer.primary_phone_number || 'N/A' },
        { label: 'Secondary Phone', value: customer.secondary_phone_number || 'N/A' },
        { label: 'Email', value: customer.email_address || 'N/A' },
        { label: 'Address', value: customer.address || 'N/A' },
      ]
    },
    {
      title: 'Financial Details',
      icon: DollarSign,
      items: [
        { label: 'Credit Limit', value: formatCurrency(customer.credit_limit) },
        { label: 'Payment Terms', value: customer.payment_terms || 'N/A' },
        { label: 'Credit Days', value: customer.credit_days ? `${customer.credit_days} days` : 'N/A' },
        { label: 'Preferred Payment', value: customer.preferred_payment_method || 'N/A' },
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {infoSections.map((section, index) => {
        const Icon = section.icon;
        return (
          <Card key={index} className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <dt className="text-sm text-gray-600">{item.label}</dt>
                    <dd className="text-sm font-medium text-gray-900">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const FinancialSummaryCard = ({ 
  ledger, 
  balance, 
  creditLimit,
  customer,
  onExportPDF,
  onExportExcel,
  onPrint,
  isLoading
}: { 
  ledger: LedgerTransaction[];
  balance: number;
  creditLimit: number;
  customer: CustomerProfile;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
  isLoading: boolean;
}) => {
  const totals = useMemo(() => {
    const totalDebit = ledger.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = ledger.reduce((sum, l) => sum + l.credit, 0);
    const totalTransactions = ledger.length;
    const overdueAmount = ledger
      .filter(l => l.status === 'Overdue')
      .reduce((sum, l) => sum + l.debit, 0);
    
    return { totalDebit, totalCredit, totalTransactions, overdueAmount };
  }, [ledger]);

  const creditUtilization = creditLimit > 0 ? (balance / creditLimit) * 100 : 0;

  return (
    <Card className="border border-gray-200 mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
              <CardDescription className="text-sm">
                As of {formatDate(new Date().toISOString())}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportPDF}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportExcel}
              disabled={isLoading}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onPrint}
              disabled={isLoading}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Current Balance</div>
            <div className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(balance)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {balance > 0 ? 'Receivable' : 'Payable'}
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Debit</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.totalDebit)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              From {totals.totalTransactions} transactions
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Credit</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.totalCredit)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Payments & adjustments
            </div>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Credit Utilization</div>
            <div className="text-2xl font-bold text-orange-600">
              {creditUtilization.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Limit: {formatCurrency(creditLimit)}
            </div>
          </div>
        </div>
        
        {totals.overdueAmount > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Overdue Amount: {formatCurrency(totals.overdueAmount)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LedgerTable = ({ 
  ledger, 
  periodSummary 
}: { 
  ledger: LedgerTransaction[];
  periodSummary?: PeriodSummary;
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const filteredLedger = useMemo(() => {
    return ledger.filter(transaction => {
      const matchesType = filterType === 'all' || transaction.type === filterType;
      const matchesSearch = 
        searchTerm === '' ||
        transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [ledger, filterType, searchTerm]);

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);
  const paginatedLedger = filteredLedger.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const transactionTypes = Array.from(new Set(ledger.map(t => t.type)));

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Ledger Transactions</CardTitle>
            <CardDescription>
              Showing {filteredLedger.length} transactions
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                className="pl-9 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {transactionTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {periodSummary && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Opening Balance</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(periodSummary.opening_balance)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Debit</div>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(periodSummary.total_debit)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Credit</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(periodSummary.total_credit)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Closing Balance</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(periodSummary.closing_balance)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Voucher Type</TableHead>
                <TableHead>Voucher No.</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLedger.length > 0 ? (
                paginatedLedger.map((transaction, index) => {
                  const TransactionIcon = getTransactionIcon(transaction.type);
                  return (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TransactionIcon className="h-4 w-4 text-gray-500" />
                          {transaction.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {transaction.reference}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {transaction.debit > 0 ? (
                          <span className="text-red-600">
                            {formatCurrency(transaction.debit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {transaction.credit > 0 ? (
                          <span className="text-green-600">
                            {formatCurrency(transaction.credit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(transaction.balance)}
                      </TableCell>
                      <TableCell>
                        {transaction.status ? getStatusBadge(transaction.status) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* =====================================================
   PDF EXPORT FUNCTION
===================================================== */

const generateProfessionalPDF = (
  customer: CustomerProfile,
  ledger: LedgerTransaction[],
  periodSummary?: PeriodSummary
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Header with company info
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('CLEARBOOKS ACCOUNTING', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Customer Ledger Report', pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(9);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pageWidth - 10, 15, { align: 'right' });
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(10, 30, pageWidth - 10, 30);
  
  // Customer Information Section
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('CUSTOMER INFORMATION', 14, 40);
  
  doc.setFontSize(9);
  const customerInfo = [
    [`Customer Name:`, customer.customer_name],
    [`Customer ID:`, customer.customer_id],
    [`Customer Type:`, customer.customer_type],
    [`Status:`, customer.status],
    [`Balance:`, formatCurrency(customer.balance)],
    [`Credit Limit:`, formatCurrency(customer.credit_limit)],
    [`Phone:`, customer.primary_phone_number || 'N/A'],
    [`Email:`, customer.email_address || 'N/A'],
  ];
  
  let yPos = 50;
  customerInfo.forEach(([label, value]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label, 14, yPos);
    doc.setTextColor(40, 40, 40);
    doc.text(value, 60, yPos);
    yPos += 6;
  });
  
  // Period Summary if available
  if (periodSummary) {
    yPos += 5;
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('PERIOD SUMMARY', 14, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    const summaryData = [
      ['Opening Balance', formatCurrency(periodSummary.opening_balance)],
      ['Total Debit', formatCurrency(periodSummary.total_debit)],
      ['Total Credit', formatCurrency(periodSummary.total_credit)],
      ['Closing Balance', formatCurrency(periodSummary.closing_balance)],
    ];
    
    summaryData.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label, 14, yPos);
      doc.setTextColor(40, 40, 40);
      doc.text(value, 80, yPos);
      yPos += 6;
    });
  }
  
  // Ledger Table
  yPos += 10;
  const tableHeaders = [
    ['Date', 'Voucher Type', 'Voucher No.', 'Particulars', 'Debit', 'Credit', 'Balance']
  ];
  
  const tableData = ledger.map(transaction => [
    formatDate(transaction.date),
    transaction.type,
    transaction.reference,
    transaction.description.substring(0, 30) + (transaction.description.length > 30 ? '...' : ''),
    transaction.debit > 0 ? formatCurrency(transaction.debit) : '-',
    transaction.credit > 0 ? formatCurrency(transaction.credit) : '-',
    formatCurrency(transaction.balance)
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer on each page
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'This is a computer-generated document. No signature required.',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }
  });
  
  // Save the PDF
  doc.save(`Customer-Ledger-${customer.customer_id}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

/* =====================================================
   MAIN PAGE COMPONENT
===================================================== */

export default function CustomerLedgerPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [data, setData] = useState<{
    customer: CustomerProfile;
    ledger: LedgerTransaction[];
    balance: number;
    periodSummary?: PeriodSummary;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()).toISOString().split('T')[0],
    end: endOfMonth(new Date()).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!user?.company_id || !id) return;

    const fetchLedger = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://hariindustries.net/api/clearbook/get_customer_details.php?company_id=${user.company_id}&customer_id=${id}`
        );

        const json: ApiResponse = await res.json();

        // Calculate period summary
        const totalDebit = json.ledger.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = json.ledger.reduce((sum, l) => sum + l.credit, 0);
        
        setData({
          customer: {
            ...json.customer,
            balance: json.current_balance
          },
          ledger: json.ledger,
          balance: json.current_balance,
          periodSummary: {
            opening_balance: json.opening_balance || 0,
            closing_balance: json.current_balance,
            total_debit: totalDebit,
            total_credit: totalCredit,
            net_movement: totalCredit - totalDebit
          }
        });
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error Loading Ledger',
          description: e.message || 'Failed to load customer ledger data'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [user, id, toast]);

  const handleExportPDF = () => {
    if (!data) return;
    
    setExportLoading(true);
    try {
      generateProfessionalPDF(data.customer, data.ledger, data.periodSummary);
      toast({
        title: 'PDF Generated',
        description: 'Customer ledger PDF has been downloaded',
        className: 'bg-green-50 border-green-200'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to generate PDF'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    
    setExportLoading(true);
    try {
      // Redirect to server-side Excel generation
      window.open(
        `https://hariindustries.net/api/clearbook/customer-ledger-pdf.php?company_id=${user?.company_id}&customer_id=${id}&user_id=${user?.uid}&format=excel`,
        '_blank'
      );
      toast({
        title: 'Excel Export Initiated',
        description: 'Excel file download will begin shortly',
        className: 'bg-blue-50 border-blue-200'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to export Excel file'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading customer ledger...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Customer Not Found</h2>
        <p className="text-gray-600 mb-4">The customer ledger could not be loaded.</p>
        <Button onClick={() => router.push('/customers')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs code={data.customer.customer_id} name={data.customer.customer_name} />
        
        <CustomerHeader customer={data.customer} />
        
        <Tabs defaultValue="ledger" className="mb-6">
          <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ledger" className="space-y-6">
            <CustomerInfoCard customer={data.customer} />
            
            <FinancialSummaryCard
              ledger={data.ledger}
              balance={data.balance}
              creditLimit={Number(data.customer.credit_limit)}
              customer={data.customer}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
              onPrint={handlePrint}
              isLoading={exportLoading}
            />
            
            <LedgerTable 
              ledger={data.ledger}
              periodSummary={data.periodSummary}
            />
          </TabsContent>
          
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Add detailed customer info here */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Print Styles */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}