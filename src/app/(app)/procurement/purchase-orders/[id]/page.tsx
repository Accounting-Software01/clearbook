'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, AlertCircle, BadgeCheck, ArrowLeft, Printer,
  XCircle, RefreshCw, Building2, CalendarDays, CalendarClock,
  Package, ClipboardList, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PurchaseOrderItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number;
  total_price: number;
  quantity_received?: number;
}

interface PurchaseOrderDetails {
  id: string;
  po_number: string;
  supplier_name: string;
  po_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  status: string;
  items: PurchaseOrderItem[];
}

interface ApiPurchaseOrder extends Omit<PurchaseOrderDetails, 'total_amount' | 'items'> {
  total_amount: string | number;
  items: any[];
}

type PoStatus = 'Draft' | 'Submitted' | 'Approved' | 'Partially Received' | 'Completed' | 'Cancelled' | string;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  badgeCls: string;
  headerCls: string;
  accentCls: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  Draft:               { label: 'Draft',               badgeCls: 'border-slate-300 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',                       headerCls: 'border-t-slate-400',    accentCls: 'text-slate-600' },
  Submitted:           { label: 'Submitted',           badgeCls: 'border-blue-400/50 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',                        headerCls: 'border-t-blue-500',     accentCls: 'text-blue-600' },
  Approved:            { label: 'Approved',            badgeCls: 'border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',          headerCls: 'border-t-emerald-500',  accentCls: 'text-emerald-600' },
  'Partially Received':{ label: 'Partially Received',  badgeCls: 'border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',                    headerCls: 'border-t-amber-500',    accentCls: 'text-amber-600' },
  Completed:           { label: 'Completed',           badgeCls: 'border-teal-400/50 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',                         headerCls: 'border-t-teal-500',     accentCls: 'text-teal-600' },
  Cancelled:           { label: 'Cancelled',           badgeCls: 'border-red-400/50 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',                              headerCls: 'border-t-red-500',      accentCls: 'text-red-600' },
};

function getStatusConfig(status: PoStatus): StatusConfig {
  return STATUS_MAP[status] ?? STATUS_MAP['Draft'];
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

interface MetaItemProps { icon: React.ReactNode; label: string; value: string }
function MetaItem({ icon, label, value }: MetaItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

interface TotalRowProps { label: string; value: string; bold?: boolean; accent?: boolean; borderTop?: boolean }
function TotalRow({ label, value, bold, accent, borderTop }: TotalRowProps) {
  return (
    <div className={`flex justify-between py-1.5 ${borderTop ? 'border-t mt-1 pt-2.5' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? 'font-bold text-base' : ''} ${accent ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
        {value}
      </span>
    </div>
  );
}

// ─── RECEIPT PROGRESS BAR ─────────────────────────────────────────────────────

function ReceiptBar({ received, ordered }: { received: number; ordered: number }) {
  const pct = ordered === 0 ? 0 : Math.min(100, (received / ordered) * 100);
  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct >= 100 ? '#16a34a' : '#f59e0b' }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
        {received}/{ordered}
      </span>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrderDetailsPage() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const router    = useRouter();
  const params    = useParams();
  const poId      = params.id as string;

  const [order, setOrder]                   = useState<PurchaseOrderDetails | null>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrderDetails = useCallback(async () => {
    if (!user?.company_id || !poId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api<{ purchase_orders: ApiPurchaseOrder[] }>(
        `get-purchase-orders.php?company_id=${user.company_id}&id=${poId}`
      );
      const raw = response.purchase_orders?.[0];
      if (!raw) throw new Error('Purchase Order not found.');

      setOrder({
        ...raw,
        total_amount: Number(raw.total_amount),
        items: raw.items.map((item: any) => ({
          ...item,
          quantity:          Number(item.quantity),
          unit_price:        Number(item.unit_price),
          vat_rate:          item.vat_rate !== undefined ? Number(item.vat_rate) : undefined,
          total_price:       Number(item.total_price),
          quantity_received: item.quantity_received !== undefined ? Number(item.quantity_received) : 0,
        })),
      });
    } catch (e: any) {
      setError(e.message || 'An error occurred while fetching the purchase order.');
    } finally {
      setIsLoading(false);
    }
  }, [user, poId]);

  useEffect(() => {
    if (user) fetchOrderDetails();
  }, [fetchOrderDetails, user]);

  // ── Derived totals ─────────────────────────────────────────────────────────

  const { subTotal, totalVat, grandTotal } = useMemo(() => {
    if (!order) return { subTotal: 0, totalVat: 0, grandTotal: 0 };
    let sub = 0, vat = 0;
    for (const item of order.items) {
      const lineAmt = item.quantity * item.unit_price;
      sub += lineAmt;
      vat += lineAmt * ((item.vat_rate ?? 0) / 100);
    }
    return { subTotal: sub, totalVat: vat, grandTotal: sub + vat };
  }, [order]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleAction = async (action: 'approve' | 'cancel') => {
    if (!user?.company_id || !poId || !user.id) return;
    setIsActionLoading(true);
    try {
      await api('purchase-order-actions.php', {
        method: 'POST',
        body: JSON.stringify({
          action, po_id: poId,
          company_id: user.company_id,
          user_id: user.id,
        }),
      });
      toast({
        title: 'Action Complete',
        description: `Purchase Order ${action === 'approve' ? 'approved' : 'cancelled'} successfully.`,
      });
      fetchOrderDetails();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: e.message });
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex h-72 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      <p className="text-sm">Loading purchase order…</p>
    </div>
  );

  if (error) return (
    <div className="flex h-72 flex-col items-center justify-center gap-3 text-destructive">
      <AlertCircle className="h-10 w-10" />
      <p className="font-medium">{error}</p>
      <Button variant="outline" size="sm" onClick={fetchOrderDetails}>
        <RefreshCw className="mr-2 h-4 w-4" /> Retry
      </Button>
    </div>
  );

  if (!order) return (
    <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
      <ClipboardList className="h-10 w-10 opacity-30" />
      <p className="font-medium">No purchase order found.</p>
    </div>
  );

  const statusCfg    = getStatusConfig(order.status);
  const canApprove   = user?.role === 'admin' && order.status === 'Submitted';
  const isCancelled  = order.status === 'Cancelled';
  const totalReceived = order.items.reduce((s, i) => s + (i.quantity_received ?? 0), 0);
  const totalOrdered  = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6">

      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 -ml-2 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className={`border-t-4 shadow-md ${statusCfg.headerCls}`}>

        {/* ── Header ── */}
        <CardHeader className="bg-gradient-to-r from-muted/60 to-transparent p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            {/* Title + badge */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <ClipboardList className={`h-5 w-5 ${statusCfg.accentCls}`} />
                <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  {order.po_number}
                </h1>
                <Badge variant="outline" className={`${statusCfg.badgeCls} text-[10px] font-semibold`}>
                  {order.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Purchase Order Details</p>
            </div>

            {/* Print */}
            <Button variant="outline" size="sm" className="shrink-0 self-start" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print PO
            </Button>
          </div>

          {/* Meta bar */}
          <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border bg-card/60 px-4 py-3 sm:grid-cols-4">
            <MetaItem
              icon={<Building2 className="h-3 w-3" />}
              label="Supplier"
              value={order.supplier_name}
            />
            <MetaItem
              icon={<CalendarDays className="h-3 w-3" />}
              label="PO Date"
              value={fmtDate(order.po_date)}
            />
            <MetaItem
              icon={<CalendarClock className="h-3 w-3" />}
              label="Expected Delivery"
              value={fmtDate(order.expected_delivery_date)}
            />
            <MetaItem
              icon={<Package className="h-3 w-3" />}
              label="Items"
              value={`${order.items.length} line${order.items.length !== 1 ? 's' : ''}`}
            />
          </div>

          {/* Receipt progress (only if partially/fully received) */}
          {(order.status === 'Approved' || order.status === 'Partially Received' || order.status === 'Completed') && totalOrdered > 0 && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground text-xs font-medium">Overall Receipt</span>
              <div className="flex-1">
                <ReceiptBar received={totalReceived} ordered={totalOrdered} />
              </div>
              <span className={`text-xs font-semibold ${totalReceived >= totalOrdered ? 'text-emerald-600' : 'text-amber-600'}`}>
                {totalReceived >= totalOrdered ? 'Fully Received' : `${totalOrdered - totalReceived} units pending`}
              </span>
            </div>
          )}
        </CardHeader>

        {/* ── Items table ── */}
        <CardContent className="p-0">
          <div className="px-5 pb-2 pt-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Order Items
            </h2>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-5 w-[40%]">Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  {order.items.some((i) => i.vat_rate !== undefined) && (
                    <TableHead className="text-right">VAT %</TableHead>
                  )}
                  <TableHead className="text-right">Line Total</TableHead>
                  {order.items.some((i) => i.quantity_received !== undefined) && (
                    <TableHead className="text-center pr-5">Received</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No items found for this order.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.items.map((item) => {
                    const lineTotal   = item.quantity * item.unit_price;
                    const received    = item.quantity_received ?? 0;
                    const fullyRecvd  = received >= item.quantity;

                    return (
                      <TableRow key={item.id} className="group transition-colors">
                        <TableCell className="pl-5 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="font-medium text-sm">{item.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          ₦{fmt(item.unit_price)}
                        </TableCell>
                        {order.items.some((i) => i.vat_rate !== undefined) && (
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {item.vat_rate !== undefined ? `${item.vat_rate}%` : '—'}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono text-sm font-medium">
                          ₦{fmt(lineTotal)}
                        </TableCell>
                        {order.items.some((i) => i.quantity_received !== undefined) && (
                          <TableCell className="pr-5">
                            <div className="flex justify-center">
                              <ReceiptBar received={received} ordered={item.quantity} />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Totals panel ── */}
          <div className="flex justify-end px-5 pb-6 pt-2">
            <div className="w-full max-w-xs rounded-xl border bg-muted/20 px-4 py-3 space-y-0">
              <TotalRow label="Subtotal" value={`₦${fmt(subTotal)}`} />
              {totalVat > 0 && <TotalRow label="VAT" value={`₦${fmt(totalVat)}`} />}
              <TotalRow
                label="Grand Total"
                value={`₦${fmt(grandTotal || order.total_amount)}`}
                bold
                accent
                borderTop
              />
            </div>
          </div>
        </CardContent>

        {/* ── Footer actions ── */}
        <CardFooter className="flex flex-col-reverse gap-3 border-t bg-muted/30 px-5 py-4 sm:flex-row sm:justify-between sm:items-center">

          {/* Status note for non-actionable states */}
          {!canApprove && !isCancelled && (
            <p className="text-xs text-muted-foreground">
              {order.status === 'Draft'
                ? 'This PO is in draft — submit it for approval.'
                : order.status === 'Approved' || order.status === 'Partially Received'
                ? 'This PO has been approved and is ready to receive against.'
                : order.status === 'Completed'
                ? 'All items on this PO have been fully received.'
                : ''}
            </p>
          )}

          {isCancelled && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              This purchase order has been cancelled.
            </div>
          )}

          {/* Admin approval actions */}
          {canApprove && (
            <div className="flex items-center gap-2 sm:ml-auto">

              {/* Cancel PO */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled={isActionLoading}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel PO
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-destructive" /> Cancel Purchase Order?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently cancel{' '}
                      <span className="font-semibold text-foreground">{order.po_number}</span>.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleAction('cancel')}
                      disabled={isActionLoading}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      {isActionLoading
                        ? <>
                        : 'Yes, cancel order'
                      }
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Approve PO */}
              <Button
                onClick={() => handleAction('approve')}
                disabled={isActionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow"
              >
                {isActionLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving…</>
                  : <>
                }
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
