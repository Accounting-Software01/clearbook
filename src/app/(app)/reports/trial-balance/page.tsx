'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader,
  TableRow, TableFooter
} from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import {
  Loader2, CheckCircle, AlertCircle,
  RefreshCcw, FileSpreadsheet,
  FileText, Printer,
  Eye, EyeOff,
  Calendar, Search, Scale
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/* ================= HELPERS ================= */

const money = (v?: number) =>
  !v ? '-' : v.toLocaleString('en-US', { minimumFractionDigits: 2 });

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);

/**
 * Returns true for any account that is an internal auto/system account.
 * These are INCLUDED in grand_total calculations but HIDDEN from display.
 *
 * Matching logic (case-insensitive):
 *   account_name starts with "auto"   → e.g. "Auto Debit Control", "Auto-generated"
 *   account_code starts with "AUTO"   → e.g. "AUTO-001"
 *
 * Extend the conditions here if new patterns arise.
 */
const isAutoAccount = (account: { account_name: string; account_code: string }): boolean => {
  const name = (account.account_name ?? '').toLowerCase().trim();
  const code = (account.account_code ?? '').toLowerCase().trim();
  return name.startsWith('auto') || code.startsWith('auto');
};

/* ================= PDF EXPORT ================= */

const generatePDF = (
  sections: any,
  grand_totals: any,
  startDate: Date,
  endDate: Date,
  companyName?: string,
) => {
  const doc = new jsPDF('landscape');

  doc.setFillColor(10, 45, 85);
  doc.rect(0, 0, 297, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TRIAL BALANCE REPORT', 148.5, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Financial Position Statement', 148.5, 18, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  let yPos = 30;
  doc.text(`Company: ${companyName || 'Not Available'}`, 20, yPos);
  doc.text(`Period: ${format(startDate, 'dd MMMM yyyy')} to ${format(endDate, 'dd MMMM yyyy')}`, 200, yPos);
  yPos += 6;
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, yPos);
  doc.text('Note: Internal auto/system accounts are excluded from this report.', 120, yPos);

  yPos += 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 257, 15, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', 30, yPos + 8);
  yPos += 20;
  doc.setFont('helvetica', 'normal');

  const isBalanced = Math.abs(grand_totals.debit - grand_totals.credit) < 0.01;
  doc.text(`Status: ${isBalanced ? 'BALANCED' : 'NOT BALANCED'}`, 30, yPos);
  doc.text(`Total Debit: ${formatCurrency(grand_totals.debit)}`, 100, yPos);
  doc.text(`Total Credit: ${formatCurrency(grand_totals.credit)}`, 200, yPos);

  yPos += 15;
  const tableData: any[] = [];

  Object.entries(sections).forEach(([sectionName, section]: any) => {
    // Exclude auto accounts from the PDF too
    const visibleAccounts = section.accounts.filter((a: any) => !isAutoAccount(a));

    tableData.push([{
      content: `${sectionName === 'COGS' ? 'COST OF GOODS SOLD' : sectionName.toUpperCase()} SECTION`,
      colSpan: 4,
      styles: { fillColor: [220, 220, 220], fontStyle: 'bold' },
    }]);

    visibleAccounts.forEach((account: any) => {
      tableData.push([
        account.account_code,
        account.account_name,
        { content: formatCurrency(account.debit),  styles: { halign: 'right' } },
        { content: formatCurrency(account.credit), styles: { halign: 'right' } },
      ]);
    });

    tableData.push([
      { content: `TOTAL ${sectionName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: formatCurrency(section.total_debit),  styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(section.total_credit), styles: { halign: 'right', fontStyle: 'bold' } },
    ]);

    tableData.push(['', '', '', '']);
  });

  tableData.push([
    { content: 'GRAND TOTAL', colSpan: 2, styles: { fillColor: [0,0,0], textColor: [255,255,255], fontStyle: 'bold' } },
    { content: formatCurrency(grand_totals.debit),  styles: { halign: 'right', fillColor: [0,0,0], textColor: [255,255,255], fontStyle: 'bold' } },
    { content: formatCurrency(grand_totals.credit), styles: { halign: 'right', fillColor: [0,0,0], textColor: [255,255,255], fontStyle: 'bold' } },
  ]);

  (doc as any).autoTable({
    startY: yPos,
    head: [['Account Code', 'Account Name', 'Debit Balance (₦)', 'Credit Balance (₦)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [10, 45, 85], textColor: [255,255,255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Generated by ClearBooks Accounting System', 148.5, finalY, { align: 'center' });

  doc.save(`TrialBalance_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.pdf`);
};

/* ================= EXCEL EXPORT ================= */

const generateExcel = (
  sections: any,
  grand_totals: any,
  startDate: Date,
  endDate: Date,
) => {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['TRIAL BALANCE REPORT'],
    [''],
    ['Report Period:', `${format(startDate, 'dd MMMM yyyy')} to ${format(endDate, 'dd MMMM yyyy')}`],
    ['Generated:', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
    ['Note:', 'Internal auto/system accounts are excluded from this report.'],
    [''],
    ['Total Debit:',  grand_totals.debit],
    ['Total Credit:', grand_totals.credit],
    ['Balance Status:', Math.abs(grand_totals.debit - grand_totals.credit) < 0.01 ? 'BALANCED' : 'NOT BALANCED'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

  const data: any[][] = [['Section', 'Account Code', 'Account Name', 'Debit (₦)', 'Credit (₦)']];

  Object.entries(sections).forEach(([sectionName, section]: any) => {
    const visibleAccounts = section.accounts.filter((a: any) => !isAutoAccount(a));
    visibleAccounts.forEach((account: any) => {
      data.push([sectionName, account.account_code, account.account_name, account.debit, account.credit]);
    });
    data.push([sectionName + ' TOTAL', '', '', section.total_debit, section.total_credit]);
    data.push(['', '', '', '', '']);
  });

  data.push(['GRAND TOTAL', '', '', grand_totals.debit, grand_totals.credit]);

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Trial Balance');
  XLSX.writeFile(wb, `TrialBalance_${format(startDate, 'yyyyMMdd')}.xlsx`);
};

/* ================= COMPONENT ================= */

export default function TrialBalancePage() {
  const { user } = useAuth();

  const [report,     setReport]     = useState<any>(null);
  const [startDate,  setStartDate]  = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [endDate,    setEndDate]    = useState<Date>(new Date());
  const [hideZero,   setHideZero]   = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  /* ── Fetch ── */
  const loadReport = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    setError(null);
    try {
      const url = new URL('https://hariindustries.net/api/clearbook/balancetrial.php');
      url.searchParams.set('company_id', user.company_id);
      url.searchParams.set('fromDate', format(startDate, 'yyyy-MM-dd'));
      url.searchParams.set('toDate',   format(endDate,   'yyyy-MM-dd'));

      const res  = await fetch(url.toString());
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setReport(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [user, startDate, endDate]);

  /* ── Export handlers ── */
  const handleExportPDF   = () => report && generatePDF(report.report,   report.grand_totals, startDate, endDate, user?.company_name);
  const handleExportExcel = () => report && generateExcel(report.report, report.grand_totals, startDate, endDate);

  const handlePrint = () => {
    if (!report) return;
    const pw = window.open('', '_blank');
    if (!pw) return;

    const { grand_totals } = report;
    const isBalanced = Math.abs(grand_totals.debit - grand_totals.credit) < 0.01;

    pw.document.write(`<!DOCTYPE html><html><head>
      <title>Trial Balance</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px}
        h1{color:#1e40af}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#f3f4f6;padding:10px;text-align:left;border:1px solid #d1d5db}
        td{padding:8px;border:1px solid #d1d5db}
        .sh{font-weight:bold}
        .dr{text-align:right;color:#059669}
        .cr{text-align:right;color:#dc2626}
        .gt{background:#1f2937;color:#fff;font-weight:bold}
        .note{font-size:11px;color:#6b7280;font-style:italic;margin-bottom:12px}
        @media print{.noprint{display:none}}
      </style>
    </head><body>
      <h1>Trial Balance Report</h1>
      <p>${format(startDate,'MMMM dd, yyyy')} – ${format(endDate,'MMMM dd, yyyy')}</p>
      <p class="note">Internal auto/system accounts are excluded from this view but included in grand totals.</p>
      <div style="background:${isBalanced?'#d1fae5':'#fee2e2'};padding:12px;border-radius:6px;margin-bottom:16px">
        ${isBalanced?'✓ BALANCED':'✗ NOT BALANCED'} &nbsp;|&nbsp;
        DR: ${money(grand_totals.debit)} &nbsp;|&nbsp; CR: ${money(grand_totals.credit)}
      </div>
      <table><thead><tr>
        <th>Account Code</th><th>Account Name</th>
        <th style="text-align:right">Debit</th><th style="text-align:right">Credit</th>
      </tr></thead><tbody>
      ${Object.entries(report.report).map(([sn, sec]: any) => {
        const rows = sec.accounts.filter((a: any) => !isAutoAccount(a));
        return `
          <tr><td colspan="4" class="sh" style="background:#f3f4f6">
            ${sn === 'COGS' ? 'COST OF GOODS SOLD' : sn.toUpperCase()}
          </td></tr>
          ${rows.map((a: any) => `
            <tr>
              <td>${a.account_code}</td><td>${a.account_name}</td>
              <td class="dr">${money(a.debit)}</td>
              <td class="cr">${money(a.credit)}</td>
            </tr>`).join('')}`;
      }).join('')}
      <tr class="gt">
        <td colspan="2">GRAND TOTAL</td>
        <td style="text-align:right">${money(grand_totals.debit)}</td>
        <td style="text-align:right">${money(grand_totals.credit)}</td>
      </tr>
      </tbody></table>
      <p style="font-size:11px;color:#6b7280;text-align:center">Generated by ClearBooks Accounting System</p>
      <div class="noprint" style="margin-top:20px;text-align:center">
        <button onclick="window.print()" style="padding:10px 20px;background:#1e40af;color:#fff;border:none;border-radius:5px;cursor:pointer">Print</button>
        <button onclick="window.close()" style="padding:10px 20px;margin-left:10px;background:#6b7280;color:#fff;border:none;border-radius:5px;cursor:pointer">Close</button>
      </div>
    </body></html>`);
    pw.document.close();
  };

  /* ── States ── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-gray-600">Loading trial balance…</p>
    </div>
  );

  if (error) return (
    <div className="text-center p-8">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-red-700 mb-2">Error Loading Report</h2>
      <p className="text-gray-600 mb-4">{error}</p>
      <Button onClick={loadReport} variant="outline"><RefreshCcw className="mr-2 h-4 w-4" />Try Again</Button>
    </div>
  );

  const { report: sections, grand_totals } = report;
  const balanced = Math.abs(grand_totals.debit - grand_totals.credit) < 0.01;

  /* Count auto accounts across all sections (for the info badge) */
  const autoAccountCount = Object.values(sections as Record<string, any>)
    .flatMap((s: any) => s.accounts)
    .filter((a: any) => isAutoAccount(a)).length;

  /* ================= RENDER ================= */
  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" />
            Trial Balance Report
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive overview of all ledger account balances</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {balanced
            ? <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" />Balanced</span>
            : <span className="flex items-center gap-1"><AlertCircle className="h-4 w-4" />Not Balanced</span>}
        </div>
      </div>

      {/* Controls */}
      <Card className="shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <DatePicker date={startDate} setDate={setStartDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <DatePicker date={endDate} setDate={setEndDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Actions</label>
              <div className="flex gap-2">
                <Button onClick={loadReport} className="flex-1" variant="outline">
                  <RefreshCcw className="mr-2 h-4 w-4" />Refresh
                </Button>
                <Button onClick={() => { const d = new Date(); d.setDate(1); setStartDate(d); setEndDate(new Date()); }} variant="ghost">
                  Reset
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Export</label>
              <div className="flex gap-2">
                <Button onClick={handleExportPDF}   className="flex-1 bg-red-600 hover:bg-red-700 text-white"><FileText      className="mr-2 h-4 w-4" />PDF</Button>
                <Button onClick={handleExportExcel} className="flex-1 bg-green-600 hover:bg-green-700 text-white"><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
                <Button onClick={handlePrint} variant="outline"><Printer className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox id="hide-zero" checked={hideZero} onCheckedChange={v => setHideZero(!!v)} />
                <label htmlFor="hide-zero" className="text-sm cursor-pointer flex items-center gap-1.5">
                  {hideZero ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {hideZero ? 'Hide Zero Balances' : 'Show Zero Balances'}
                </label>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search accounts…"
                  className="pl-10 pr-3 py-2 border rounded-md text-sm w-64"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <Calendar className="inline h-4 w-4 mr-1" />
              {format(startDate, 'MMM dd, yyyy')} to {format(endDate, 'MMM dd, yyyy')}
            </div>
          </div>

          {/* ── Auto-account info strip ──────────────────────────────────────
           *  Shown only when auto accounts exist. Explains they are hidden
           *  from display but INCLUDED in the grand-total calculation so the
           *  balance still checks out correctly.
           * ──────────────────────────────────────────────────────────────── */}
          {autoAccountCount > 0 && (
            <div className="flex items-start gap-2 text-xs rounded-lg border px-3 py-2.5"
              style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' }}>
              <EyeOff className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>{autoAccountCount} internal auto/system account{autoAccountCount > 1 ? 's are' : ' is'} hidden</strong>{' '}
                from this view but <strong>included in the grand total calculation</strong>.
                The report is balanced correctly — these accounts are internal control entries only.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary banner */}
      <div className={`p-4 rounded-lg ${balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${balanced ? 'bg-green-100' : 'bg-red-100'}`}>
              {balanced
                ? <CheckCircle className="h-6 w-6 text-green-600" />
                : <AlertCircle className="h-6 w-6 text-red-600" />}
            </div>
            <div>
              <h3 className="font-semibold">Financial Status: {balanced ? 'Balanced' : 'Not Balanced'}</h3>
              <p className="text-sm text-gray-600">Total Debit = Total Credit (all accounts including system entries)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{money(grand_totals.debit)}</div>
              <div className="text-sm text-gray-600">Total Debit</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{money(grand_totals.credit)}</div>
              <div className="text-sm text-gray-600">Total Credit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Account Number</TableHead>
                <TableHead className="font-semibold">Account Name</TableHead>
                <TableHead className="text-right font-semibold">Debit Balance</TableHead>
                <TableHead className="text-right font-semibold">Credit Balance</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {Object.entries(sections as Record<string, any>).map(([sectionName, section]) => {
                /* ── Three-layer filter:
                 *   1. isAutoAccount  → always hide from display (totals unaffected)
                 *   2. hideZero       → user toggle
                 *   3. searchTerm     → live search
                 * Grand totals come from the API and are never re-computed here.
                 */
                let accounts = (section.accounts as any[]).filter(a => !isAutoAccount(a));

                if (hideZero) {
                  accounts = accounts.filter(a => a.debit !== 0 || a.credit !== 0);
                }
                if (searchTerm) {
                  const q = searchTerm.toLowerCase();
                  accounts = accounts.filter(a =>
                    a.account_name.toLowerCase().includes(q) ||
                    a.account_code.toLowerCase().includes(q),
                  );
                }

                const sectionBg: Record<string, string> = {
                  Asset:     'bg-blue-50',
                  Liability: 'bg-yellow-50',
                  Equity:    'bg-green-50',
                  Revenue:   'bg-purple-50',
                  COGS:      'bg-gray-50',
                  Expense:   'bg-red-50',
                };

                return (
                  <React.Fragment key={sectionName}>
                    {/* Section header — always visible */}
                    <TableRow className={sectionBg[sectionName] ?? 'bg-gray-50'}>
                      <TableCell colSpan={4} className="font-bold py-3">
                        <div className="flex items-center justify-between">
                          <span>
                            {sectionName === 'COGS' ? 'COST OF GOODS SOLD' : sectionName.toUpperCase()}
                          </span>
                          <span className="text-sm font-normal text-gray-500">
                            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                            {searchTerm ? ' (filtered)' : ''}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Account rows — auto accounts are already excluded above */}
                    {accounts.length > 0 ? accounts.map((a: any) => (
                      <TableRow key={a.account_code} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">{a.account_code}</TableCell>
                        <TableCell>{a.account_name}</TableCell>
                        <TableCell className="text-right font-medium text-green-700">{money(a.debit)}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">{money(a.credit)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-400 italic">
                          {searchTerm
                            ? `No accounts matching "${searchTerm}" in this section`
                            : hideZero
                              ? 'All accounts in this section have zero balances'
                              : 'No accounts available for this period'}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>

            {/* Grand total row — uses API values, never re-computed */}
            <TableFooter>
              <TableRow className="bg-gray-900 text-white font-bold">
                <TableCell colSpan={2}>GRAND TOTAL</TableCell>
                <TableCell className="text-right text-green-300">{money(grand_totals.debit)}</TableCell>
                <TableCell className="text-right text-red-300">{money(grand_totals.credit)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
