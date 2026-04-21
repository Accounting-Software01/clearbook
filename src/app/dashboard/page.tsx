'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, UserCircle, Loader2, TrendingUp, TrendingDown,
  DollarSign, BarChart3, FileText, CheckCircle, Clock, XCircle,
  Package, Factory, ShoppingCart, Landmark, CreditCard,
  ArrowUpRight, ArrowDownRight, AlertCircle, Layers
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface KPIs {
  total_revenue_ytd: number;
  total_expense_ytd: number;
  net_profit_ytd: number;
  total_ar: number;
  total_ap: number;
  total_cash: number;
  overdue_invoices: number;
}

interface PlMonth { month: string; revenue: number; expenses: number; }
interface AgingBucket { bucket: string; invoice_count?: number; bill_count?: number; total_due?: number; total_outstanding?: number; }
interface ExpenseItem { account_name: string; account_type: string; total_debit: number; }
interface CashPosition { bank_name: string; account_name: string; currency: string; balance: number; }
interface Voucher { voucher_number: string; entry_date: string; voucher_type: string; narration: string; total_debits: number; total_credits: number; status: string; }

interface AccountingData {
  kpis: KPIs;
  pl_trend: PlMonth[];
  ar_aging: AgingBucket[];
  ap_aging: AgingBucket[];
  expense_breakdown: ExpenseItem[];
  cash_positions: CashPosition[];
  recent_vouchers: Voucher[];
}

interface SalesData {
  this_month: { invoice_count: number; total_value: number; outstanding: number };
  recent_invoices: { invoice_number: string; invoice_date: string; total_amount: number; amount_due: number; status: string; customer_name: string }[];
  top_customers: { customer_name: string; invoice_count: number; total_value: number }[];
}

interface InventoryData {
  finished_goods: { name: string; sku: string; quantity_on_hand: number; average_unit_cost: number; stock_value: number }[];
  low_stock: { name: string; sku: string; unit_of_measure: string; quantity_on_hand: number; reorder_level: number }[];
  rm_stock_value: number;
  fg_stock_value: number;
}

interface ProductionData {
  orders: { id: number; status: string; quantity_to_produce: number; total_production_cost: number; creation_date: string; product_name: string }[];
  summary: { total: number; pending: number; in_progress: number; completed: number; cancelled: number };
}

interface StaffData {
  sales: SalesData;
  inventory: InventoryData;
  production: ProductionData;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const pct = (part: number, total: number) => total === 0 ? 0 : Math.round((part / total) * 100);

const statusBadge = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'paid' || s === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (s === 'in progress' || s === 'issued' || s === 'partial') return 'bg-blue-100 text-blue-700';
  if (s === 'pending' || s === 'draft') return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

// ─── Reusable chart components ────────────────────────────────────────────────

/** Horizontal bar — percentage fill */
const HBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-700"
      style={{ width: `${max > 0 ? Math.min((value / max) * 100, 100) : 0}%`, backgroundColor: color }}
    />
  </div>
);

/** Simple SVG pie — slices array: {value, color, label} */
const PieChart = ({ slices }: { slices: { value: number; color: string; label: string }[] }) => {
  const total = slices.reduce((s, i) => s + i.value, 0);
  if (total === 0) return <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No data</div>;
  let cum = 0;
  const toXY = (p: number) => [Math.cos(2 * Math.PI * p), Math.sin(2 * Math.PI * p)];
  return (
    <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="w-full h-full">
      {slices.map((s) => {
        if (s.value === 0) return null;
        const frac = s.value / total;
        const [sx, sy] = toXY(cum);
        cum += frac;
        const [ex, ey] = toXY(cum);
        return (
          <path key={s.label}
            d={`M ${sx} ${sy} A 1 1 0 ${frac > 0.5 ? 1 : 0} 1 ${ex} ${ey} L 0 0`}
            fill={s.color} />
        );
      })}
    </svg>
  );
};

/** Grouped vertical bar chart (revenue vs expenses) */
const BarChart = ({ data, keys, colors }: { data: Record<string, number & { label: string }>[]; keys: string[]; colors: string[] }) => {
  const maxVal = data.reduce((m, d) => Math.max(m, ...keys.map(k => (d[k] as number) || 0)), 1);
  return (
    <div className="flex items-end gap-1 w-full h-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex items-end gap-0.5 w-full" style={{ height: '100%' }}>
            {keys.map((k, ki) => (
              <div key={k} className="flex-1 rounded-t-sm transition-all duration-500"
                style={{ height: `${Math.max(((d[k] as number || 0) / maxVal) * 100, 1)}%`, backgroundColor: colors[ki] }} />
            ))}
          </div>
          <span className="text-[9px] text-gray-500 text-center leading-tight">{d['month'] as string}</span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

const KpiCard = ({
  label, value, icon: Icon, color, sub, trend
}: {
  label: string; value: string; icon: React.ElementType;
  color: string; sub?: string; trend?: 'up' | 'down' | 'neutral'
}) => (
  <Card className={`shadow border-l-4 hover:shadow-md transition-all duration-200`} style={{ borderLeftColor: color }}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 truncate">{value}</p>
          {sub && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trend === 'down' ? 'text-red-500' : trend === 'up' ? 'text-emerald-600' : 'text-gray-500'}`}>
              {trend === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {trend === 'down' && <ArrowDownRight className="h-3 w-3" />}
              {sub}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── ACCOUNTANT DASHBOARD ────────────────────────────────────────────────────

function AccountantDashboard({ data }: { data: AccountingData }) {
  const { kpis, pl_trend, ar_aging, ap_aging, expense_breakdown, cash_positions, recent_vouchers } = data;

  const EXPENSE_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#ec4899','#06b6d4','#84cc16'];
  const totalExp = expense_breakdown.reduce((s, e) => s + e.total_debit, 0);

  const arTotal = ar_aging.reduce((s, b) => s + (b.total_due ?? 0), 0);
  const apTotal = ap_aging.reduce((s, b) => s + (b.total_outstanding ?? 0), 0);

  const arColors: Record<string, string> = { 'Current': '#10b981', '1-30 days': '#f59e0b', '31-60 days': '#f97316', '61-90 days': '#ef4444', '90+ days': '#7f1d1d' };
  const apColors: Record<string, string> = { 'Current': '#10b981', '1-30 days': '#f59e0b', '31-60 days': '#f97316', '60+ days': '#ef4444' };

  const netPositive = kpis.net_profit_ytd >= 0;

  return (
    <div className="space-y-6">

      {/* ── Row 1: 4 KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Revenue YTD" value={fmt(kpis.total_revenue_ytd)} icon={TrendingUp} color="#10b981" sub="Year to date" trend="up" />
        <KpiCard label="Expenses YTD" value={fmt(kpis.total_expense_ytd)} icon={TrendingDown} color="#ef4444" sub="Year to date" trend="neutral" />
        <KpiCard label="Net Profit YTD" value={fmt(kpis.net_profit_ytd)} icon={DollarSign} color={netPositive ? '#10b981' : '#ef4444'}
          sub={netPositive ? 'Profitable' : 'Loss position'} trend={netPositive ? 'up' : 'down'} />
        <KpiCard label="Cash & Bank" value={fmt(kpis.total_cash)} icon={Landmark} color="#3b82f6" sub="Net cash position" trend="neutral" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total AR" value={fmt(kpis.total_ar)} icon={CreditCard} color="#f59e0b" sub="Receivables outstanding" trend="neutral" />
        <KpiCard label="Total AP" value={fmt(kpis.total_ap)} icon={FileText} color="#8b5cf6" sub="Payables outstanding" trend="neutral" />
        <KpiCard label="Overdue Invoices" value={String(kpis.overdue_invoices)} icon={AlertTriangle} color="#ef4444"
          sub={kpis.overdue_invoices > 0 ? 'Requires attention' : 'None overdue'} trend={kpis.overdue_invoices > 0 ? 'down' : 'up'} />
        <KpiCard label="Net AR vs AP" value={fmt(kpis.total_ar - kpis.total_ap)} icon={BarChart3}
          color={kpis.total_ar >= kpis.total_ap ? '#10b981' : '#ef4444'}
          sub={kpis.total_ar >= kpis.total_ap ? 'Favourable' : 'Payables exceed receivables'}
          trend={kpis.total_ar >= kpis.total_ap ? 'up' : 'down'} />
      </div>

      {/* ── Row 2: P&L bar chart + Expense pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 1 — Revenue vs Expenses trend */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" /> Revenue vs Expenses (6 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pl_trend.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No data available</p>
            ) : (
              <>
                <div className="h-40">
                  <BarChart data={pl_trend as any} keys={['revenue','expenses']} colors={['#10b981','#ef4444']} />
                </div>
                <div className="flex gap-4 mt-2 justify-center">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-500" /> Revenue</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400" /> Expenses</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Chart 2 — Expense breakdown pie */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" /> Expense Breakdown (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expense_breakdown.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No expense data</p>
            ) : (
              <div className="flex gap-4 items-center">
                <div className="w-32 h-32 flex-shrink-0">
                  <PieChart slices={expense_breakdown.map((e, i) => ({
                    value: e.total_debit,
                    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
                    label: e.account_name
                  }))} />
                </div>
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {expense_breakdown.slice(0, 6).map((e, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                      <p className="text-xs text-gray-600 truncate flex-1">{e.account_name}</p>
                      <p className="text-xs font-semibold text-gray-800 flex-shrink-0">{pct(e.total_debit, totalExp)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: AR Aging + AP Aging ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 3 — AR Aging */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Accounts Receivable Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ar_aging.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No outstanding receivables</p>
            ) : (
              <div className="space-y-3">
                {ar_aging.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{b.bucket}</span>
                      <span className="text-gray-500">{fmt(b.total_due ?? 0)} · {b.invoice_count} inv.</span>
                    </div>
                    <HBar value={b.total_due ?? 0} max={arTotal} color={arColors[b.bucket] ?? '#6b7280'} />
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between text-xs font-semibold text-gray-700">
                  <span>Total AR</span><span>{fmt(arTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart 4 — AP Aging */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-500" /> Accounts Payable Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ap_aging.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No outstanding payables</p>
            ) : (
              <div className="space-y-3">
                {ap_aging.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{b.bucket}</span>
                      <span className="text-gray-500">{fmt(b.total_outstanding ?? 0)} · {b.bill_count} bills</span>
                    </div>
                    <HBar value={b.total_outstanding ?? 0} max={apTotal} color={apColors[b.bucket] ?? '#6b7280'} />
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between text-xs font-semibold text-gray-700">
                  <span>Total AP</span><span>{fmt(apTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Cash positions + Recent JVs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Chart 5 — Bank/Cash balances */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-600" /> Bank & Cash Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cash_positions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No bank accounts configured</p>
            ) : (
              <div className="space-y-3">
                {cash_positions.map((p, i) => {
                  const maxBal = Math.max(...cash_positions.map(x => Math.abs(x.balance)), 1);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 truncate pr-2">{p.bank_name} — {p.currency}</span>
                        <span className={`font-semibold flex-shrink-0 ${p.balance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {fmt(p.balance)}
                        </span>
                      </div>
                      <HBar value={Math.abs(p.balance)} max={maxBal} color={p.balance >= 0 ? '#3b82f6' : '#ef4444'} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent journal vouchers */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-600" /> Recent Journal Vouchers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {recent_vouchers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No posted vouchers</p>
              ) : (
                <div className="space-y-2">
                  {recent_vouchers.map((v, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{v.voucher_number}</p>
                        <p className="text-xs text-gray-500 truncate">{v.voucher_type} · {fmtDate(v.entry_date)}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {typeof v.narration === 'string' && v.narration.startsWith('{')
                            ? JSON.parse(v.narration)?.description || 'Journal Entry'
                            : v.narration || '—'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-emerald-700">{fmt(v.total_debits)}</p>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">posted</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── STAFF DASHBOARD ─────────────────────────────────────────────────────────

function StaffDashboard({ data }: { data: StaffData }) {
  const { sales, inventory, production } = data;
  const maxCustomer = Math.max(...(sales.top_customers?.map(c => c.total_value) ?? [1]), 1);

  return (
    <div className="space-y-6">

      {/* ── Sales KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Invoices This Month" value={String(sales.this_month?.invoice_count ?? 0)} icon={FileText} color="#3b82f6" sub="Current month" trend="neutral" />
        <KpiCard label="Revenue This Month" value={fmt(sales.this_month?.total_value ?? 0)} icon={TrendingUp} color="#10b981" sub="Total invoiced" trend="up" />
        <KpiCard label="Outstanding" value={fmt(sales.this_month?.outstanding ?? 0)} icon={Clock} color="#f59e0b" sub="Amount due" trend="neutral" />
      </div>

      {/* Inventory KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Raw Material Stock Value" value={fmt(inventory.rm_stock_value)} icon={Package} color="#8b5cf6" sub="Current valuation" trend="neutral" />
        <KpiCard label="Finished Goods Value" value={fmt(inventory.fg_stock_value)} icon={Layers} color="#06b6d4" sub="Current valuation" trend="neutral" />
      </div>

      {/* ── Row 2: Recent invoices + Top customers ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" /> Recent Sales Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-52">
              {sales.recent_invoices.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No invoices</p>
              ) : (
                <div className="space-y-2">
                  {sales.recent_invoices.map((inv, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">#{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500 truncate">{inv.customer_name} · {fmtDate(inv.invoice_date)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-gray-800">{fmt(inv.total_amount)}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusBadge(inv.status)}`}>{inv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top customers bar */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-emerald-600" /> Top Customers (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.top_customers.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No customer data</p>
            ) : (
              <div className="space-y-3">
                {sales.top_customers.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 truncate pr-2">{c.customer_name}</span>
                      <span className="text-gray-500 flex-shrink-0">{fmt(c.total_value)}</span>
                    </div>
                    <HBar value={c.total_value} max={maxCustomer} color="#3b82f6" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Inventory + Production ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Low stock alerts */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Low / Zero Stock Raw Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-52">
              {inventory.low_stock.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-6">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-xs text-gray-400">All materials above reorder level</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inventory.low_stock.map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${item.quantity_on_hand === 0 ? 'bg-red-50' : 'bg-amber-50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.sku} · {item.unit_of_measure}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-bold ${item.quantity_on_hand === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.quantity_on_hand} {item.unit_of_measure}
                        </p>
                        <p className="text-[10px] text-gray-400">Reorder: {item.reorder_level}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Production orders */}
        <Card className="shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Factory className="h-4 w-4 text-indigo-600" /> Production Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary pills */}
            {production.summary && (
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: 'Pending',     val: production.summary.pending,     color: 'bg-yellow-100 text-yellow-700' },
                  { label: 'In Progress', val: production.summary.in_progress, color: 'bg-blue-100 text-blue-700' },
                  { label: 'Completed',   val: production.summary.completed,   color: 'bg-emerald-100 text-emerald-700' },
                  { label: 'Cancelled',   val: production.summary.cancelled,   color: 'bg-red-100 text-red-700' },
                ].map(p => (
                  <span key={p.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>
                    {p.label}: {p.val}
                  </span>
                ))}
              </div>
            )}
            <ScrollArea className="h-36">
              {production.orders.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No production orders</p>
              ) : (
                <div className="space-y-2">
                  {production.orders.map((o, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">PO-{o.id} · {o.product_name}</p>
                        <p className="text-xs text-gray-500">Qty: {o.quantity_to_produce} · {fmtDate(o.creation_date)}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${statusBadge(o.status)}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Finished goods table */}
      <Card className="shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-600" /> Finished Goods Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventory.finished_goods.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No finished goods</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {['Product','SKU','Qty on Hand','Unit Cost','Stock Value'].map(h => (
                      <th key={h} className="text-left py-2 px-2 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.finished_goods.map((g, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-800">{g.name}</td>
                      <td className="py-2 px-2 text-gray-500">{g.sku}</td>
                      <td className="py-2 px-2 text-gray-700">{g.quantity_on_hand.toLocaleString()}</td>
                      <td className="py-2 px-2 text-gray-700">{fmt(g.average_unit_cost)}</td>
                      <td className="py-2 px-2 font-semibold text-emerald-700">{fmt(g.stock_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [companyInfo, setCompanyInfo]     = useState<{ name: string; business_type: string } | null>(null);
  const [dashData, setDashData]           = useState<AccountingData | StaffData | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [lastLogin, setLastLogin]         = useState<string | null>(null);

  const isAccountingRole = user?.role === 'admin' || user?.role === 'accountant';

  // ── Fetch dashboard data ──────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    if (!user?.company_id || !user?.role) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://hariindustries.net/api/clearbook/get-dashboard-data.php?company_id=${user.company_id}&role=${user.role}`
      );
      if (!res.ok) throw new Error('Failed to load dashboard data');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'API error');
      setDashData(json.data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Dashboard Error', description: (err as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, user?.role, toast]);

  // ── Fetch company info ────────────────────────────────────────────────────
  const fetchCompany = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const res = await fetch(`https://hariindustries.net/api/clearbook/get-company-details.php?company_id=${user.company_id}`);
      if (res.ok) setCompanyInfo(await res.json());
    } catch { /* silent */ }
  }, [user?.company_id]);

  useEffect(() => {
    if (user) {
      const now = new Date();
      setLastLogin(`${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      fetchDashboard();
      fetchCompany();
    }
  }, [user, fetchDashboard, fetchCompany]);

  // ── Auth loading ──────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  // ── Role badge config ─────────────────────────────────────────────────────
  const roleMeta: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    admin:      { color: 'bg-purple-100 text-purple-700', icon: UserCircle,  label: 'Administrator' },
    accountant: { color: 'bg-blue-100 text-blue-700',     icon: Landmark,    label: 'Accountant' },
    staff:      { color: 'bg-emerald-100 text-emerald-700', icon: Package,   label: 'Staff' },
  };
  const rm = roleMeta[user.role] ?? roleMeta.staff;
  const RoleIcon = rm.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              {companyInfo ? `${companyInfo.name}` : 'ClearBook Africa'}
            </h1>
            {companyInfo && (
              <p className="text-sm text-gray-500 mt-0.5">{companyInfo.business_type}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${rm.color}`}>
                <RoleIcon className="h-3.5 w-3.5" /> {rm.label}
              </span>
              {lastLogin && (
                <span className="text-xs text-gray-400">Last login: {lastLogin}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Welcome back</p>
              <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
              <p className="text-xs text-gray-400">{user.company_id}</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-blue-500 opacity-20 animate-pulse" />
              <UserCircle className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>

        {/* ── Section label ── */}
        <div className="flex items-center gap-2 mb-4">
          {isAccountingRole
            ? <><Landmark className="h-4 w-4 text-blue-600" /><span className="text-sm font-semibold text-gray-700">Accounting & Finance Overview</span></>
            : <><BarChart3 className="h-4 w-4 text-emerald-600" /><span className="text-sm font-semibold text-gray-700">Operations Dashboard</span></>
          }
          <div className="flex-1 border-t border-gray-200 ml-2" />
        </div>

        {/* ── Dashboard content ── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading {isAccountingRole ? 'accounting' : 'operations'} data...</p>
            </div>
          </div>
        ) : !dashData ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <XCircle className="h-10 w-10 mb-3" />
            <p className="text-sm">No data available</p>
          </div>
        ) : isAccountingRole ? (
          <AccountantDashboard data={dashData as AccountingData} />
        ) : (
          <StaffDashboard data={dashData as StaffData} />
        )}

        {/* ── Footer ── */}
        <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> System Active
            </span>
            <span>Data refreshed just now</span>
          </div>
          <span>© {new Date().getFullYear()} ClearBook Africa by Sagheer+ Lab</span>
        </div>
      </div>
    </div>
  );
}
