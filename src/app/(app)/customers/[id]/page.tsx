'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Printer, FileText, Mail, Phone, User, Calendar, DollarSign,
  TrendingUp, TrendingDown, ArrowDownRight, Search, FileSpreadsheet,
  ChevronLeft, ChevronRight, Edit, CheckCircle, Clock, AlertCircle,
  BarChart3, Home, Briefcase, Calculator, Archive, FileSignature,
  Receipt, CreditCardIcon, Loader2, BadgeCheck, Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─── Brand palette ─────────────────────────────────────────────────────────── */
const BRAND = {
  green:  '#28a745',
  orange: '#e05030',
  blue:   '#2563c0',
  purple: '#7c3aed',   // used for customer-credit/advance state
} as const;

/* ─── Types ──────────────────────────────────────────────────────────────────── */

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
  credit_days?: number;
  [key: string]: any;
}

interface LedgerTransaction {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;           // CAN BE NEGATIVE — customer advance/prepayment
  status?: string;
  transaction_id?: string;
}

interface ApiResponse {
  customer: any;
  ledger: LedgerTransaction[];
  current_balance: number;
  opening_balance: number;
}

interface PeriodSummary {
  opening_balance: number;
  closing_balance: number;
  total_debit: number;
  total_credit: number;
  net_movement: number;
}

/* ─── Accounting balance semantics ──────────────────────────────────────────────
 *
 *  In a customer (Accounts Receivable) context:
 *
 *    balance > 0   Customer owes US          → "Receivable"     (amber/red)
 *    balance = 0   Account fully settled     → "Settled"        (green)
 *    balance < 0   Customer has CREDIT with us                  (purple)
 *                  (advance payment / prepayment / overpayment)
 *
 *  The old PHP line  max(0, $runningBalance)  artificially floored this at 0,
 *  which hid legitimate credit positions.  Now that the backend is fixed, the
 *  frontend must render all three states properly.
 *
 * ─────────────────────────────────────────────────────────────────────────── */

type BalanceState = 'receivable' | 'settled' | 'credit';

interface ResolvedBalance {
  state:     BalanceState;
  label:     string;          // short label e.g. "Receivable"
  sublabel:  string;          // explanatory sub-text
  display:   string;          // formatted string e.g. "₦211,570,156.20 CR"
  textClass: string;
  bgClass:   string;
  color:     string;
}

/** Normalize -0 to 0 */
const normaliseZero = (n: number) => (Object.is(n, -0) ? 0 : n);

/**
 * Format as Nigerian Naira, always positive magnitude.
 * Caller decides whether to prefix CR / DR.
 */
const formatNGN = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(normaliseZero(amount)));
};

/**
 * The single source of truth for how a balance is displayed throughout the page.
 *
 * Positive  → DR (debit — customer owes us)
 * Zero      → Settled
 * Negative  → CR (credit — customer has advance with us)
 */
const resolveBalance = (raw: number): ResolvedBalance => {
  const n = normaliseZero(raw);

  if (n === 0) return {
    state:     'settled',
    label:     'Settled',
    sublabel:  'No outstanding balance',
    display:   '₦0.00',
    textClass: 'text-green-600',
    bgClass:   'bg-green-50',
    color:     BRAND.green,
  };

  if (n > 0) return {
    state:     'receivable',
    label:     'Receivable',
    sublabel:  'Customer owes you this amount',
    display:   `${formatNGN(n)} DR`,
    textClass: 'text-red-600',
    bgClass:   'bg-red-50',
    color:     BRAND.orange,
  };

  // n < 0  →  we owe the customer this amount (advance / overpayment)
  return {
    state:     'credit',
    label:     'We Owe Customer',
    sublabel:  `Your business owes this customer ${formatNGN(n)}`,
    display:   `${formatNGN(n)} CR`,    // e.g. "₦211,570,156.20 CR"
    textClass: 'text-purple-700',
    bgClass:   'bg-purple-50',
    color:     BRAND.purple,
  };
};

/* ─── Utility formatters ────────────────────────────────────────────────────── */

const formatDate = (s: string) => {
  if (!s) return 'N/A';
  const d = parseISO(s);
  return isValid(d) ? format(d, 'dd-MMM-yyyy') : 'Invalid Date';
};

const formatDateTime = (s: string) => {
  if (!s) return 'N/A';
  const d = parseISO(s);
  return isValid(d) ? format(d, 'dd-MMM-yyyy HH:mm') : 'Invalid Date';
};

const getStatusBadge = (status: string) => {
  const map: Record<string, { color: string; icon: any }> = {
    Active:   { color: 'bg-green-100 text-green-800',   icon: CheckCircle },
    Inactive: { color: 'bg-gray-100 text-gray-800',     icon: Clock },
    Overdue:  { color: 'bg-red-100 text-red-800',       icon: AlertCircle },
    Pending:  { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    Paid:     { color: 'bg-blue-100 text-blue-800',     icon: CheckCircle },
    Partial:  { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  };
  const cfg = map[status] || { color: 'bg-gray-100 text-gray-800', icon: Clock };
  const Icon = cfg.icon;
  return <Badge className={`${cfg.color} flex items-center gap-1`}><Icon className="h-3 w-3" />{status}</Badge>;
};

const getTxIcon = (type: string) => ({
  Invoice:          FileText,
  Receipt:          Receipt,
  Payment:          CreditCardIcon,
  'Credit Note':    FileSignature,
  Journal:          FileText,
  Adjustment:       Calculator,
  Refund:           ArrowDownRight,
  'Opening Balance': Archive,
}[type] ?? FileText);

/* ─── BalanceTile ─────────────────────────────────────────────────────────────
 *  A reusable tile that renders any balance with the correct accounting
 *  semantics.  Used in the summary card and in the period strip.
 * ─────────────────────────────────────────────────────────────────────────── */
const BalanceTile = ({
  label,
  amount,
  sub,
  size = 'md',
}: {
  label: string;
  amount: number;
  sub?: string;
  size?: 'sm' | 'md';
}) => {
  const bal = resolveBalance(amount);
  return (
    <div className={`p-4 rounded-lg ${bal.bgClass}`}>
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <div className={`font-bold ${size === 'sm' ? 'text-lg' : 'text-2xl'} ${bal.textClass}`}>
        {bal.display}
      </div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      <div className="flex items-center gap-1 mt-1">
        {bal.state === 'settled'    && <BadgeCheck className="h-3 w-3 text-green-500" />}
        {bal.state === 'receivable' && <TrendingUp  className="h-3 w-3 text-red-400" />}
        {bal.state === 'credit'     && <Wallet      className="h-3 w-3 text-purple-500" />}
        <span className="text-xs text-gray-500">{bal.label}</span>
      </div>
    </div>
  );
};

/* ─── LedgerBalanceCell ──────────────────────────────────────────────────────
 *  Renders the running-balance column in the ledger table.
 *
 *  Positive  → red     "₦X,XXX.XX DR"  (customer still owes)
 *  Zero      → grey    "₦0.00"         (settled at this point)
 *  Negative  → purple  "₦X,XXX.XX CR"  (customer in credit — advance)
 * ─────────────────────────────────────────────────────────────────────────── */
const LedgerBalanceCell = ({ raw }: { raw: number }) => {
  const bal = resolveBalance(raw);
  return (
    <span className={`font-bold tabular-nums ${bal.textClass}`}>
      {bal.display}
    </span>
  );
};

/* ─── Components ─────────────────────────────────────────────────────────────── */

const Breadcrumbs = ({ code, name }: { code?: string; name?: string }) => (
  <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
    <Link href="/dashboard" className="hover:text-blue-600 flex items-center gap-1">
      <Home className="h-4 w-4" /> Dashboard
    </Link>
    <ChevronRight className="h-4 w-4" />
    <Link href="/customers" className="hover:text-blue-600">Customers</Link>
    <ChevronRight className="h-4 w-4" />
    <span className="font-semibold text-gray-900">
      {code} – {name?.substring(0, 20)}{name && name.length > 20 ? '…' : ''}
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
            <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{customer.customer_type}</span>
            <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{customer.email_address || 'No email'}</span>
            <span className="flex items-center gap-1"><Phone className="h-4 w-4" />{customer.primary_phone_number || 'No phone'}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />ID: {customer.customer_id}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Edit</Button>
        <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-2" />Contact</Button>
        <Button variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" />Print</Button>
      </div>
    </div>
  </div>
);

const CustomerInfoCard = ({ customer }: { customer: CustomerProfile }) => {
  const sections = [
    {
      title: 'Basic Information', icon: User,
      items: [
        { label: 'Customer Type',    value: customer.customer_type },
        { label: 'Registration No.', value: customer.registration_number || 'N/A' },
        { label: 'Tax ID',           value: customer.tax_id || 'N/A' },
        { label: 'Created On',       value: formatDate(customer.created_at || '') },
      ],
    },
    {
      title: 'Contact Details', icon: Phone,
      items: [
        { label: 'Primary Phone',   value: customer.primary_phone_number || 'N/A' },
        { label: 'Secondary Phone', value: customer.secondary_phone_number || 'N/A' },
        { label: 'Email',           value: customer.email_address || 'N/A' },
        { label: 'Address',         value: customer.address || 'N/A' },
      ],
    },
    {
      title: 'Financial Details', icon: DollarSign,
      items: [
        { label: 'Credit Limit',      value: formatNGN(customer.credit_limit) },
        { label: 'Payment Terms',     value: customer.payment_terms || 'N/A' },
        { label: 'Credit Days',       value: customer.credit_days ? `${customer.credit_days} days` : 'N/A' },
        { label: 'Preferred Payment', value: customer.preferred_payment_method || 'N/A' },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {sections.map((s, i) => {
        const Icon = s.icon;
        return (
          <Card key={i} className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg"><Icon className="h-5 w-5 text-blue-600" /></div>
                <CardTitle className="text-lg">{s.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {s.items.map((item, j) => (
                  <div key={j} className="flex justify-between">
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

/* ─── FinancialSummaryCard ───────────────────────────────────────────────────── */
const FinancialSummaryCard = ({
  ledger, balance, creditLimit, customer,
  onExportPDF, onExportExcel, onPrint, isLoading,
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
    const totalDebit    = ledger.reduce((s, l) => s + l.debit,  0);
    const totalCredit   = ledger.reduce((s, l) => s + l.credit, 0);
    const overdueAmount = ledger.filter(l => l.status === 'Overdue').reduce((s, l) => s + l.debit, 0);
    return { totalDebit, totalCredit, totalTransactions: ledger.length, overdueAmount };
  }, [ledger]);

  const bal                = resolveBalance(balance);
  const creditUtilization  = creditLimit > 0 ? (Math.abs(balance) / creditLimit) * 100 : 0;

  return (
    <Card className="border border-gray-200 mb-6 border-t-4" style={{ borderTopColor: BRAND.green }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <BarChart3 className="h-5 w-5" style={{ color: BRAND.green }} />
            </div>
            <div>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
              <CardDescription className="text-sm">As of {formatDate(new Date().toISOString())}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onExportPDF} disabled={isLoading}
              style={{ borderColor: BRAND.orange, color: BRAND.orange }} className="hover:bg-orange-50">
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onExportExcel} disabled={isLoading}
              style={{ borderColor: BRAND.green, color: BRAND.green }} className="hover:bg-green-50">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint} disabled={isLoading}
              style={{ borderColor: BRAND.blue, color: BRAND.blue }} className="hover:bg-blue-50">
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Current balance — uses BalanceTile so semantics are consistent */}
          <BalanceTile label="Current Balance" amount={balance} sub={bal.sublabel} />

          {/* Total Debit — always positive, DR side */}
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Invoiced (DR)</div>
            <div className="text-2xl font-bold text-red-600">{formatNGN(totals.totalDebit)}</div>
            <div className="text-xs text-gray-500 mt-1">From {totals.totalTransactions} transactions</div>
          </div>

          {/* Total Credit — always positive, CR side */}
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Total Received (CR)</div>
            <div className="text-2xl font-bold" style={{ color: BRAND.green }}>{formatNGN(totals.totalCredit)}</div>
            <div className="text-xs text-gray-500 mt-1">Payments & credit notes</div>
          </div>

          {/* Credit utilisation */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Credit Utilization</div>
            <div className="text-2xl font-bold text-orange-600">{creditUtilization.toFixed(1)}%</div>
            <div className="text-xs text-gray-500 mt-1">Limit: {formatNGN(creditLimit)}</div>
          </div>
        </div>

        {/* Contextual banners — only one shows at a time */}
        {totals.overdueAmount > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">Overdue amount: {formatNGN(totals.overdueAmount)} DR</span>
          </div>
        )}

        {bal.state === 'settled' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2" style={{ color: BRAND.green }}>
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span className="font-medium">Account fully settled — no outstanding balance.</span>
          </div>
        )}

        {/* ── Credit / Advance banner ──────────────────────────────────────
         *  This is the key new state.  The customer has paid MORE than they
         *  owe, creating a credit that can be offset against future invoices.
         *  This was previously hidden by  max(0, $runningBalance)  in PHP.
         * ──────────────────────────────────────────────────────────────── */}
        {bal.state === 'credit' && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="font-semibold">
                Your business owes this customer {bal.display}
              </span>
            </div>
            <p className="text-xs text-purple-600 ml-6">
              The customer has paid more than they were invoiced for. This credit must be
              refunded or offset against a future invoice — it is a liability on your side.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ─── LedgerTable ────────────────────────────────────────────────────────────── */
const LedgerTable = ({
  ledger, periodSummary,
}: {
  ledger: LedgerTransaction[];
  periodSummary?: PeriodSummary;
}) => {
  const [filterType,   setFilterType]   = useState('all');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const itemsPerPage = 10;

  const filteredLedger = useMemo(() => ledger.filter(t => {
    const matchType   = filterType === 'all' || t.type === filterType;
    const matchSearch = !searchTerm ||
      t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchSearch;
  }), [ledger, filterType, searchTerm]);

  const totalPages      = Math.ceil(filteredLedger.length / itemsPerPage);
  const paginatedLedger = filteredLedger.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const txTypes         = Array.from(new Set(ledger.map(t => t.type)));

  return (
    <Card className="border border-gray-200 border-t-4" style={{ borderTopColor: BRAND.blue }}>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Ledger Transactions</CardTitle>
            <CardDescription>
              Showing {filteredLedger.length} transactions &mdash; balance shown per accounting convention
              (DR = customer owes, CR = customer has credit)
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search transactions…" className="pl-9 w-full sm:w-64"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filter by type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {txTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Period summary strip */}
        {periodSummary && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Opening Balance</div>
                <div className={`text-base font-semibold ${resolveBalance(periodSummary.opening_balance).textClass}`}>
                  {resolveBalance(periodSummary.opening_balance).display}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Invoiced DR</div>
                <div className="text-base font-semibold text-red-600">{formatNGN(periodSummary.total_debit)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Received CR</div>
                <div className="text-base font-semibold" style={{ color: BRAND.green }}>{formatNGN(periodSummary.total_credit)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Closing Balance</div>
                <div className={`text-base font-semibold ${resolveBalance(periodSummary.closing_balance).textClass}`}>
                  {resolveBalance(periodSummary.closing_balance).display}
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
                <TableHead className="text-right">Debit (DR)</TableHead>
                <TableHead className="text-right">Credit (CR)</TableHead>
                {/* Balance heading explains convention */}
                <TableHead className="text-right">
                  Balance
                  <span className="block text-[10px] font-normal text-gray-400 leading-none">DR = owed / CR = credit</span>
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLedger.length > 0 ? paginatedLedger.map((tx, i) => {
                const Icon = getTxIcon(tx.type);
                return (
                  <TableRow key={i} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        {tx.type}
                      </div>
                    </TableCell>
                    <TableCell><span className="font-mono text-sm">{tx.reference}</span></TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>

                    {/* Debit column */}
                    <TableCell className="text-right font-medium">
                      {tx.debit > 0
                        ? <span className="text-red-600">{formatNGN(tx.debit)}</span>
                        : <span className="text-gray-300">—</span>}
                    </TableCell>

                    {/* Credit column */}
                    <TableCell className="text-right font-medium">
                      {tx.credit > 0
                        ? <span style={{ color: BRAND.green }}>{formatNGN(tx.credit)}</span>
                        : <span className="text-gray-300">—</span>}
                    </TableCell>

                    {/* Running balance — uses LedgerBalanceCell for DR/CR colouring */}
                    <TableCell className="text-right">
                      <LedgerBalanceCell raw={tx.balance} />
                    </TableCell>

                    <TableCell>{tx.status ? getStatusBadge(tx.status) : '—'}</TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-200" />
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1
                        : currentPage <= 3 ? i + 1
                        : currentPage >= totalPages - 2 ? totalPages - 4 + i
                        : currentPage - 2 + i;
                return (
                  <Button key={p} variant={currentPage === p ? 'default' : 'outline'} size="sm"
                    onClick={() => setCurrentPage(p)} className="w-8 h-8 p-0"
                    style={currentPage === p ? { backgroundColor: BRAND.green } : {}}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* ─── PDF export ─────────────────────────────────────────────────────────────── */

const generatePDF = (customer: CustomerProfile, ledger: LedgerTransaction[], periodSummary?: PeriodSummary) => {
  const doc  = new jsPDF();
  const pw   = doc.internal.pageSize.getWidth();
  const ph   = doc.internal.pageSize.getHeight();
  const bal  = resolveBalance(customer.balance);

  doc.setFontSize(16); doc.setTextColor(40, 40, 40);
  doc.text('CLEARBOOKS ACCOUNTING', pw / 2, 15, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(100, 100, 100);
  doc.text('Customer Ledger Report', pw / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Generated: ${formatDateTime(new Date().toISOString())}`, pw - 10, 15, { align: 'right' });
  doc.setDrawColor(200, 200, 200); doc.line(10, 30, pw - 10, 30);

  doc.setFontSize(11); doc.setTextColor(40, 40, 40);
  doc.text('CUSTOMER INFORMATION', 14, 40);

  let y = 50;
  const info: [string, string][] = [
    ['Customer Name:', customer.customer_name],
    ['Customer ID:',   customer.customer_id],
    ['Customer Type:', customer.customer_type],
    ['Status:',        customer.status],
    ['Balance:',       bal.display],
    ['Balance Type:',  bal.label],
    ['Credit Limit:',  formatNGN(customer.credit_limit)],
    ['Phone:',         customer.primary_phone_number || 'N/A'],
    ['Email:',         customer.email_address || 'N/A'],
  ];
  info.forEach(([l, v]) => {
    doc.setTextColor(100, 100, 100); doc.text(l, 14, y);
    doc.setTextColor(40, 40, 40);   doc.text(v, 60, y);
    y += 6;
  });

  if (periodSummary) {
    y += 5;
    doc.setFontSize(11); doc.setTextColor(40, 40, 40); doc.text('PERIOD SUMMARY', 14, y);
    y += 10; doc.setFontSize(9);
    [
      ['Opening Balance', resolveBalance(periodSummary.opening_balance).display],
      ['Total Invoiced (DR)', formatNGN(periodSummary.total_debit)],
      ['Total Received (CR)', formatNGN(periodSummary.total_credit)],
      ['Closing Balance', resolveBalance(periodSummary.closing_balance).display],
    ].forEach(([l, v]) => {
      doc.setTextColor(100, 100, 100); doc.text(l, 14, y);
      doc.setTextColor(40, 40, 40);   doc.text(v, 80, y);
      y += 6;
    });
  }

  autoTable(doc, {
    startY: y + 10,
    head: [['Date', 'Voucher Type', 'Voucher No.', 'Particulars', 'Debit DR', 'Credit CR', 'Balance']],
    body: ledger.map(t => [
      formatDate(t.date), t.type, t.reference,
      t.description.substring(0, 30) + (t.description.length > 30 ? '…' : ''),
      t.debit  > 0 ? formatNGN(t.debit)  : '—',
      t.credit > 0 ? formatNGN(t.credit) : '—',
      resolveBalance(t.balance).display,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [40, 167, 69], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 }, 3: { cellWidth: 38 },
      4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, pw / 2, ph - 10, { align: 'center' });
      doc.text('Computer-generated document. No signature required.', pw / 2, ph - 5, { align: 'center' });
    },
  });

  doc.save(`Customer-Ledger-${customer.customer_id}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

/* ─── Main page ──────────────────────────────────────────────────────────────── */

export default function CustomerLedgerPage() {
  const { id }    = useParams() as { id: string };
  const { user }  = useAuth();
  const { toast } = useToast();
  const router    = useRouter();

  const [data, setData] = useState<{
    customer: CustomerProfile;
    ledger:   LedgerTransaction[];
    balance:  number;
    periodSummary?: PeriodSummary;
  } | null>(null);

  const [loading,       setLoading]       = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (!user?.company_id || !id) return;
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `https://hariindustries.net/api/clearbook/get_customer_details.php?company_id=${user.company_id}&customer_id=${id}`,
        );
        const json: ApiResponse = await res.json();

        const totalDebit    = json.ledger.reduce((s, l) => s + l.debit,  0);
        const totalCredit   = json.ledger.reduce((s, l) => s + l.credit, 0);
        // Normalise -0
        const currentBalance = normaliseZero(json.current_balance);

        setData({
          customer:      { ...json.customer, balance: currentBalance },
          ledger:        json.ledger,
          balance:       currentBalance,
          periodSummary: {
            opening_balance: normaliseZero(json.opening_balance || 0),
            closing_balance: currentBalance,
            total_debit:     totalDebit,
            total_credit:    totalCredit,
            net_movement:    totalCredit - totalDebit,
          },
        });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error Loading Ledger', description: e.message });
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [user, id, toast]);

  const handleExportPDF = () => {
    if (!data) return;
    setExportLoading(true);
    try {
      generatePDF(data.customer, data.ledger, data.periodSummary);
      toast({ title: 'PDF Generated', description: 'Customer ledger PDF downloaded', className: 'bg-green-50 border-green-200' });
    } catch {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Failed to generate PDF' });
    } finally { setExportLoading(false); }
  };

  const handleExportExcel = () => {
    if (!data) return;
    setExportLoading(true);
    try {
      window.open(
        `https://hariindustries.net/api/clearbook/customer-ledger-pdf.php?company_id=${user?.company_id}&customer_id=${id}&user_id=${user?.uid}&format=excel`,
        '_blank',
      );
      toast({ title: 'Excel Export Initiated', description: 'File download will begin shortly', className: 'bg-blue-50 border-blue-200' });
    } catch {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Failed to export Excel' });
    } finally { setExportLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: BRAND.blue }} />
        <p className="text-gray-600">Loading customer ledger…</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">Customer Not Found</h2>
      <Button onClick={() => router.push('/customers')}><ChevronLeft className="h-4 w-4 mr-2" />Back to Customers</Button>
    </div>
  );

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
              ledger={data.ledger} balance={data.balance}
              creditLimit={Number(data.customer.credit_limit)} customer={data.customer}
              onExportPDF={handleExportPDF} onExportExcel={handleExportExcel}
              onPrint={() => window.print()} isLoading={exportLoading}
            />
            <LedgerTable ledger={data.ledger} periodSummary={data.periodSummary} />
          </TabsContent>

          <TabsContent value="details">
            <Card><CardHeader><CardTitle>Detailed Customer Information</CardTitle></CardHeader><CardContent /></Card>
          </TabsContent>
        </Tabs>

        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .print-area, .print-area * { visibility: visible; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
