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
  FileText, Printer
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/* ================= HELPERS ================= */

const money = (v?: number) =>
  !v ? '-' : v.toLocaleString('en-US', { minimumFractionDigits: 2 });

/* ================= COMPONENT ================= */

export default function TrialBalancePage() {
  const { user } = useAuth();

  const [report, setReport] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date(2026, 0, 1));
  const [endDate, setEndDate] = useState(new Date());
  const [hideZero, setHideZero] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* -------- FETCH -------- */

  const loadReport = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const url = new URL('https://hariindustries.net/api/clearbook/balancetrial.php');
      url.searchParams.set('company_id', user.company_id);
      url.searchParams.set('fromDate', format(startDate, 'yyyy-MM-dd'));
      url.searchParams.set('toDate', format(endDate, 'yyyy-MM-dd'));

      const res = await fetch(url.toString());
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-600 text-center">{error}</div>;

  const { report: sections, grand_totals } = report;
  const balanced = Math.abs(grand_totals.debit - grand_totals.credit) < 0.01;

  /* ================= RENDER ================= */

  return (
    <div className="space-y-4">

      <h1 className="text-xl font-bold">⚖ Trial Balance Report</h1>

      {/* FILTER BAR */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <DatePicker date={startDate} setDate={setStartDate} />
          <DatePicker date={endDate} setDate={setEndDate} />
          <Checkbox checked={hideZero} onCheckedChange={v => setHideZero(Boolean(v))} />
          <span className="text-sm">Hide Zero Balances</span>

          <Button onClick={loadReport}><RefreshCcw className="mr-2" />Generate</Button>
          <Button className="bg-green-600"><FileSpreadsheet className="mr-2" />Export Excel</Button>
          <Button className="bg-orange-600"><FileText className="mr-2" />Export PDF</Button>
          <Button variant="outline"><Printer className="mr-2" />Print</Button>
        </CardContent>
      </Card>

      {/* PERIOD */}
      <div className="bg-cyan-100 p-3 rounded">
        Period: {format(startDate, 'MMMM dd, yyyy')} to {format(endDate, 'MMMM dd, yyyy')}
      </div>

      {/* STATUS */}
      <div className={`p-3 flex justify-between rounded ${balanced ? 'bg-green-100' : 'bg-red-100'}`}>
        <span className="flex items-center gap-2">
          {balanced ? <CheckCircle /> : <AlertCircle />}
          Status: {balanced ? 'Balanced' : 'Not Balanced'}
        </span>
        <span>
          Total Debit: {money(grand_totals.debit)} | Total Credit: {money(grand_totals.credit)}
        </span>
      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account Number</TableHead>
            <TableHead>Account Name</TableHead>
            <TableHead className="text-right">Debit Balance</TableHead>
            <TableHead className="text-right">Credit Balance</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
  {Object.entries(sections).map(([sectionName, section]: any) => {
    const accounts = hideZero
      ? section.accounts.filter((a: any) => a.debit !== 0 || a.credit !== 0)
      : section.accounts;

    return (
      <React.Fragment key={sectionName}>
        {/* SECTION HEADER – ALWAYS VISIBLE */}
        <TableRow className={
          sectionName === 'Asset' ? 'bg-blue-200 font-bold' :
          sectionName === 'Liability' ? 'bg-yellow-200 font-bold' :
          sectionName === 'Equity' ? 'bg-green-200 font-bold' :
          sectionName === 'Revenue' ? 'bg-cyan-200 font-bold' :
          sectionName === 'COGS' ? 'bg-gray-200 font-bold' :
          'bg-red-200 font-bold'
        }>
          <TableCell colSpan={4}>
            {sectionName === 'COGS'
              ? 'COST OF GOODS SOLD'
              : sectionName.toUpperCase()}
          </TableCell>
        </TableRow>

        {/* ACCOUNT ROWS */}
        {accounts.length > 0 ? (
          accounts.map((a: any) => (
            <TableRow key={a.account_code}>
              <TableCell>{a.account_code}</TableCell>
              <TableCell>{a.account_name}</TableCell>
              <TableCell className="text-right text-green-700">
                {money(a.debit)}
              </TableCell>
              <TableCell className="text-right text-red-600">
                {money(a.credit)}
              </TableCell>
            </TableRow>
          ))
        ) : (
          /* PLACEHOLDER ROW (IMPORTANT) */
          <TableRow>
            <TableCell colSpan={4} className="text-center text-gray-400 italic">
              No transactions for this period
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  })}
</TableBody>


        <TableFooter>
          <TableRow className="bg-black text-white font-bold">
            <TableCell colSpan={2}>GRAND TOTAL</TableCell>
            <TableCell className="text-right">{money(grand_totals.debit)}</TableCell>
            <TableCell className="text-right">{money(grand_totals.credit)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
