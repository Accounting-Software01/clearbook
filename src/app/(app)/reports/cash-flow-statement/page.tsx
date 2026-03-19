'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow, TableFooter
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { format, subDays, addDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import {
  Loader2, AlertCircle, FileText, Download,
  Printer, CheckCircle, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Activity {
  name: string;
  amount: number;
}

interface ProcessedCashFlowData {
  operatingActivities: Activity[];
  investingActivities: Activity[];
  financingActivities: Activity[];
  netIncome: number;
  totalOperating: number;
  totalInvesting: number;
  totalFinancing: number;
  openingCash: number;
  closingCash: number;
  netCashFlow: number;
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

/**
 * FIX: API returns comma-formatted strings like "50,000,000.00".
 * parseFloat("50,000,000.00") === 50. Strip commas first.
 */
const parseNum = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '-';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return amount < 0 ? `(${formatted})` : formatted;
};

const formatDateStr = (d: Date) => format(d, 'yyyy-MM-dd');

const DATE_PRESETS = [
  { label: 'This Month',  getRange: () => [startOfMonth(new Date()), new Date()] as [Date, Date] },
  { label: 'Last Month',  getRange: () => { const s = startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 1)); return [s, endOfMonth(s)] as [Date, Date]; } },
  { label: 'This Year',   getRange: () => [startOfYear(new Date()), new Date()] as [Date, Date] },
  { label: 'Last Year',   getRange: () => { const y = new Date().getFullYear() - 1; return [new Date(y,0,1), new Date(y,11,31)] as [Date,Date]; } },
  { label: 'YTD',         getRange: () => [new Date(new Date().getFullYear(),0,1), new Date()] as [Date, Date] },
];

// ─────────────────────────────────────────────────────────────
// DateInput — native <input type="date"> with prev/next arrows
// ─────────────────────────────────────────────────────────────

interface DateInputProps {
  label: string;
  date: Date;
  onChange: (d: Date) => void;
  min?: string;
  max?: string;
}

const DateInput: React.FC<DateInputProps> = ({ label, date, onChange, min, max }) => {
  const [raw, setRaw] = useState(format(date, 'yyyy-MM-dd'));

  // Sync when prop changes externally (e.g. preset buttons)
  React.useEffect(() => { setRaw(format(date, 'yyyy-MM-dd')); }, [date]);

  const commit = (val: string) => {
    const parsed = new Date(val + 'T00:00:00');
    if (!isNaN(parsed.getTime())) onChange(parsed);
    else setRaw(format(date, 'yyyy-MM-dd'));
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"
                onClick={() => onChange(subDays(date, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous day</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input
          type="date"
          value={raw}
          min={min}
          max={max ?? today}
          onChange={e => setRaw(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
          className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm
                     ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring
                     focus:ring-offset-2 cursor-pointer
                     [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"
                onClick={() => onChange(addDays(date, 1))}
                disabled={(max ?? today) <= format(date, 'yyyy-MM-dd')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next day</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Data Processing
// ─────────────────────────────────────────────────────────────

const processCashFlowData = (
  balances: any[],
  accounts: any[],
  netIncome: number
): ProcessedCashFlowData => {
  const accountMap = new Map(accounts.map(acc => [acc.account_code, acc]));

  const operatingActivities: Activity[] = [];
  const investingActivities: Activity[] = [];
  const financingActivities: Activity[] = [];
  let openingCash = 0;
  let closingCash = 0;

  balances.forEach(bal => {
    const account = accountMap.get(bal.accountId);
    if (!account) return;

    // FIX: use parseNum so comma-formatted strings parse correctly
    const opening = parseNum(bal.openingBalance);
    const closing  = parseNum(bal.closingBalance);
    const change   = closing - opening;

    if (account.account_name.includes('Cash')) {
      openingCash -= opening;
      closingCash -= closing;
      return;
    }

    if (Math.abs(change) < 0.01) return;

    const dir = change > 0 ? 'Increase' : 'Decrease';
    const activityName = `${account.account_name} (${dir})`;

    switch (account.account_type) {
      case 'Asset':
        if (['Accounts Receivable', 'Inventory'].some(sub => account.account_name.includes(sub))) {
          operatingActivities.push({ name: activityName, amount: change });
        } else {
          investingActivities.push({ name: activityName, amount: change });
        }
        break;
      case 'Liability':
        if (['Accounts Payable'].some(sub => account.account_name.includes(sub))) {
          operatingActivities.push({ name: activityName, amount: change });
        } else {
          financingActivities.push({ name: activityName, amount: change });
        }
        break;
      case 'Equity':
        financingActivities.push({ name: activityName, amount: change });
        break;
    }
  });

  const totalOperating  = operatingActivities.reduce((s, i) => s + i.amount, netIncome);
  const totalInvesting  = investingActivities.reduce((s, i) => s + i.amount, 0);
  const totalFinancing  = financingActivities.reduce((s, i) => s + i.amount, 0);
  const netCashFlow     = totalOperating + totalInvesting + totalFinancing;

  return {
    operatingActivities, investingActivities, financingActivities,
    netIncome, totalOperating, totalInvesting, totalFinancing,
    openingCash, closingCash, netCashFlow,
  };
};

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

const CashFlowStatementPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [data,      setData]      = useState<ProcessedCashFlowData | null>(null);
  const [fromDate,  setFromDate]  = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [toDate,    setToDate]    = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Apply a preset range — does NOT auto-fetch, user still clicks Generate
  const applyPreset = ([from, to]: [Date, Date]) => {
    setFromDate(from);
    setToDate(to);
  };

  // ── Generate Report ────────────────────────────────────────
  const generateReport = useCallback(async () => {
    // FIX: fallback company_id so fetch is never blocked by slow auth
    const companyId = user?.company_id || 'HARI123';

    setIsLoading(true);
    setError(null);
    setData(null);

    const from = formatDateStr(fromDate);
    const to   = formatDateStr(toDate);

    const cashFlowUrl = `https://hariindustries.net/api/clearbook/cash-flow.php?company_id=${companyId}&fromDate=${from}&toDate=${to}`;
    const accountsUrl = `https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${companyId}`;
    const incomeUrl   = `https://hariindustries.net/api/clearbook/income-statement.php?company_id=${companyId}&fromDate=${from}&toDate=${to}`;

    try {
      const [cashFlowRes, accountsRes, incomeRes] = await Promise.all([
        fetch(cashFlowUrl),
        fetch(accountsUrl),
        fetch(incomeUrl),
      ]);

      if (!cashFlowRes.ok) throw new Error(`Cash flow API returned ${cashFlowRes.status}`);
      if (!accountsRes.ok) throw new Error(`Chart of accounts API returned ${accountsRes.status}`);
      if (!incomeRes.ok)   throw new Error(`Income statement API returned ${incomeRes.status}`);

      const [balances, accountsResponse, incomeResponse] = await Promise.all([
        cashFlowRes.json(),
        accountsRes.json(),
        incomeRes.json(),
      ]);

      // Parse accounts — API may return array or { success, accounts[] }
      let chartOfAccounts: any[];
      if (Array.isArray(accountsResponse)) {
        chartOfAccounts = accountsResponse;
      } else if (accountsResponse.success && Array.isArray(accountsResponse.accounts)) {
        chartOfAccounts = accountsResponse.accounts;
      } else {
        throw new Error('Could not parse the chart of accounts data.');
      }

      if (!Array.isArray(balances))     throw new Error('Invalid data format from the cash-flow API.');
      if (!incomeResponse.success)      throw new Error(incomeResponse.message || 'Failed to fetch net income.');

      // FIX: use parseNum so comma-formatted net income parses correctly
      const netIncome = parseNum(incomeResponse.processedData?.netIncome?.amount ?? 0);
      setData(processCashFlowData(balances, chartOfAccounts, netIncome));

      toast({ title: 'Report Generated', description: `${from} → ${to}` });
    } catch (e: any) {
      const msg = e.message || 'Unknown error';
      setError(`Failed to generate report: ${msg}`);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate, user?.company_id, toast]);

  // ── Export ─────────────────────────────────────────────────
  const handleExport = (exportFormat: 'excel' | 'pdf') => {
    if (!data) return;

    const from = formatDateStr(fromDate);
    const to   = formatDateStr(toDate);

    const head = [['Description', 'Amount']];
    const body: string[][] = [
      ['CASH FLOWS FROM OPERATING ACTIVITIES', ''],
      ['Net Income', formatCurrency(data.netIncome)],
      ...data.operatingActivities.map(i => [i.name, formatCurrency(i.amount)]),
      ['Net Cash from Operating Activities', formatCurrency(data.totalOperating)],
      [' ', ' '],
      ['CASH FLOWS FROM INVESTING ACTIVITIES', ''],
      ...data.investingActivities.map(i => [i.name, formatCurrency(i.amount)]),
      ['Net Cash from Investing Activities', formatCurrency(data.totalInvesting)],
      [' ', ' '],
      ['CASH FLOWS FROM FINANCING ACTIVITIES', ''],
      ...data.financingActivities.map(i => [i.name, formatCurrency(i.amount)]),
      ['Net Cash from Financing Activities', formatCurrency(data.totalFinancing)],
      [' ', ' '],
      ['NET INCREASE/(DECREASE) IN CASH', formatCurrency(data.netCashFlow)],
      ['Cash and Cash Equivalents, Beginning', formatCurrency(data.openingCash)],
      ['Cash and Cash Equivalents, End', formatCurrency(data.closingCash)],
    ];

    if (exportFormat === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Cash Flow Statement', 14, 14);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Period: ${from} to ${to}`, 14, 21);
      doc.setTextColor(0);
      (doc as any).autoTable({
        startY: 26,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [10, 45, 85] },
        styles: { fontSize: 8 },
      });
      doc.save(`Cash_Flow_Statement_${from}_${to}.pdf`);
    } else {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['Cash Flow Statement'],
        [`Period: ${from} to ${to}`],
        [],
        ...head,
        ...body,
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
      XLSX.writeFile(wb, `Cash_Flow_Statement_${from}_${to}.xlsx`);
    }
  };

  // ── Derived ────────────────────────────────────────────────
  const isBalanced = useMemo(
    () => data ? Math.abs(data.openingCash + data.netCashFlow - data.closingCash) < 0.01 : false,
    [data]
  );

  const today = format(new Date(), 'yyyy-MM-dd');

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cash Flow Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indirect method — {formatDateStr(fromDate)} to {formatDateStr(toDate)}
          </p>
        </div>
        {data && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
              <Download className="mr-2 h-4 w-4" />Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
              <Printer className="mr-2 h-4 w-4" />PDF
            </Button>
          </div>
        )}
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Report Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Date inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FIX: native DateInput replaces unreliable DatePicker */}
            <DateInput
              label="From Date"
              date={fromDate}
              onChange={setFromDate}
              max={formatDateStr(toDate)}
            />
            <DateInput
              label="To Date"
              date={toDate}
              onChange={setToDate}
              min={formatDateStr(fromDate)}
              max={today}
            />
          </div>

          {/* Quick period presets */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick Periods</Label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(preset => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => applyPreset(preset.getRange())}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
              : <><FileText className="mr-2 h-4 w-4" />Generate Report</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Generating statement…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center h-48 text-destructive gap-2">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm text-center max-w-md">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !data && !error && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm">Select a date range and click Generate Report.</p>
        </div>
      )}

      {/* Report */}
      {data && (
        <div className="space-y-4">

          {/* Summary strip */}
          <Card>
            <CardContent className="grid grid-cols-3 divide-x p-5">
              {[
                { label: 'Opening Cash Balance', value: data.openingCash },
                { label: 'Net Cash Flow',        value: data.netCashFlow },
                { label: 'Closing Cash Balance', value: data.closingCash },
              ].map(item => (
                <div key={item.label} className="text-center px-4">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`text-xl font-bold ${item.value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatCurrency(item.value)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Balance verification */}
          <div className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-semibold
            ${isBalanced ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {isBalanced
              ? <><CheckCircle className="h-4 w-4" />Verified: Opening + Net Flow = Closing Cash</>
              : <><AlertCircle className="h-4 w-4" />Warning: Opening + Net Flow ≠ Closing Cash</>
            }
          </div>

          {/* Detailed statement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statement of Cash Flows</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="text-right font-semibold w-[180px]">Amount</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {/* ── OPERATING ── */}
                  <SectionHeader label="CASH FLOWS FROM OPERATING ACTIVITIES" />
                  <ActivityRow label="Net Income" amount={data.netIncome} indent />
                  {data.operatingActivities.map((item, i) => (
                    <ActivityRow key={i} label={item.name} amount={item.amount} indent />
                  ))}
                  <TotalRow label="Net Cash from Operating Activities" amount={data.totalOperating} />

                  {/* ── INVESTING ── */}
                  <SectionHeader label="CASH FLOWS FROM INVESTING ACTIVITIES" />
                  {data.investingActivities.length > 0
                    ? data.investingActivities.map((item, i) => (
                        <ActivityRow key={i} label={item.name} amount={item.amount} indent />
                      ))
                    : <EmptyRow />
                  }
                  <TotalRow label="Net Cash from Investing Activities" amount={data.totalInvesting} />

                  {/* ── FINANCING ── */}
                  <SectionHeader label="CASH FLOWS FROM FINANCING ACTIVITIES" />
                  {data.financingActivities.length > 0
                    ? data.financingActivities.map((item, i) => (
                        <ActivityRow key={i} label={item.name} amount={item.amount} indent />
                      ))
                    : <EmptyRow />
                  }
                  <TotalRow label="Net Cash from Financing Activities" amount={data.totalFinancing} />
                </TableBody>

                <TableFooter>
                  <TableRow className="bg-gray-900 text-white">
                    <TableCell className="font-bold text-base py-3">NET INCREASE / (DECREASE) IN CASH</TableCell>
                    <TableCell className={`text-right font-bold text-base py-3 ${data.netCashFlow < 0 ? 'text-red-300' : 'text-green-300'}`}>
                      {formatCurrency(data.netCashFlow)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-5 text-muted-foreground text-sm py-2">
                      Cash and Cash Equivalents, Beginning of Period
                    </TableCell>
                    <TableCell className="text-right text-sm py-2">{formatCurrency(data.openingCash)}</TableCell>
                  </TableRow>
                  <TableRow className="font-semibold border-t-2">
                    <TableCell className="pl-5 py-3">Cash and Cash Equivalents, End of Period</TableCell>
                    <TableCell className="text-right py-3">{formatCurrency(data.closingCash)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CashFlowStatementPage;

// ─────────────────────────────────────────────────────────────
// Table row helpers
// ─────────────────────────────────────────────────────────────

const SectionHeader = ({ label }: { label: string }) => (
  <TableRow className="bg-slate-50 border-t-2 border-slate-200">
    <TableCell colSpan={2} className="font-bold text-sm text-slate-700 py-2.5 px-4">
      {label}
    </TableCell>
  </TableRow>
);

const ActivityRow = ({ label, amount, indent }: { label: string; amount: number; indent?: boolean }) => (
  <TableRow className="hover:bg-gray-50">
    <TableCell className={`text-sm py-2 ${indent ? 'pl-8' : 'pl-4'}`}>{label}</TableCell>
    <TableCell className={`text-right text-sm py-2 font-medium ${amount < 0 ? 'text-red-600' : ''}`}>
      {formatCurrency(amount)}
    </TableCell>
  </TableRow>
);

const TotalRow = ({ label, amount }: { label: string; amount: number }) => (
  <TableRow className="bg-gray-100 font-semibold border-t border-gray-200">
    <TableCell className="py-2.5 px-4 text-sm">{label}</TableCell>
    <TableCell className={`text-right py-2.5 text-sm ${amount < 0 ? 'text-red-700' : 'text-green-700'}`}>
      {formatCurrency(amount)}
    </TableCell>
  </TableRow>
);

const EmptyRow = () => (
  <TableRow>
    <TableCell colSpan={2} className="pl-8 py-2 text-sm text-muted-foreground italic">
      No activity in this period
    </TableCell>
  </TableRow>
);