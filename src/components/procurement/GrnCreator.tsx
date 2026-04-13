'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, AlertCircle, Save, ArrowLeft, Package,
  PackageCheck, ChevronsDown, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PurchaseOrderLine {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  /**
   * NOTE — BACKEND FIX REQUIRED:
   * This field is not returned by the current get-purchase-orders.php query.
   * Add  `poi.vat_rate`  to the SELECT on purchase_order_items (poi) so the
   * frontend can read it.  Until then this will always be undefined → 0% VAT.
   */
  vat_rate?: number;
  quantity_received?: number;
}

interface PurchaseOrderDetails {
  id: string;
  po_number: string;
  supplier_name: string;
  po_date: string;
  status: string;
  items: PurchaseOrderLine[];
}

interface GrnLine extends PurchaseOrderLine {
  receiving_now: number;
}

interface GrnCreatorProps {
  poId: string;
  onGrnCreated: () => void;
  onCancel: () => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

type LineStatus = 'pending' | 'partial' | 'full' | 'over';

function lineStatus(line: GrnLine): LineStatus {
  const remaining = line.quantity - (line.quantity_received ?? 0);
  if (line.receiving_now === 0) return 'pending';
  if (line.receiving_now < remaining) return 'partial';
  if (line.receiving_now === remaining) return 'full';
  return 'over';
}

/** Returns true if every item on the PO has already been fully received */
function isPOFullyReceived(items: PurchaseOrderLine[]): boolean {
  if (!items.length) return false;
  return items.every((item) => (item.quantity_received ?? 0) >= item.quantity);
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

interface ProgressBarProps { done: number; total: number }
function ProgressBar({ done, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.min(100, (done / total) * 100);
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: pct >= 100 ? '#16a34a' : pct > 0 ? '#f59e0b' : '#e5e7eb',
        }}
      />
    </div>
  );
}

interface StatusPillProps { status: LineStatus }
function StatusPill({ status }: StatusPillProps) {
  const map: Record<LineStatus, { label: string; icon: React.ReactNode; cls: string }> = {
    pending: { label: 'Pending',  icon: <Clock className="h-3 w-3" />,        cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
    partial: { label: 'Partial',  icon: <AlertTriangle className="h-3 w-3" />, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
    full:    { label: 'Full',     icon: <CheckCircle2 className="h-3 w-3" />,  cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
    over:    { label: 'Over qty', icon: <AlertCircle className="h-3 w-3" />,   cls: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  };
  const { label, icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

interface SummaryRowProps { label: string; value: string; bold?: boolean; accent?: boolean; muted?: boolean }
function SummaryRow({ label, value, bold, accent, muted }: SummaryRowProps) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${accent ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : muted ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`font-mono text-sm ${bold ? 'font-bold text-base' : muted ? 'text-muted-foreground/60 line-through' : ''}`}>{value}</span>
    </div>
  );
}

// ─── ALREADY POSTED BANNER ────────────────────────────────────────────────────

interface AlreadyPostedBannerProps {
  order: PurchaseOrderDetails;
  onBack: () => void;
}
function AlreadyPostedBanner({ order, onBack }: AlreadyPostedBannerProps) {
  return (
    <Card className="mt-4 border-t-4 border-t-emerald-600 shadow-md">
      <CardHeader className="bg-gradient-to-r from-emerald-50/60 to-transparent p-5 dark:from-emerald-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">GRN Already Posted</CardTitle>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                {order.po_number}
              </Badge>
            </div>
            <CardDescription>
              All items on this purchase order have already been fully received and posted to the journal.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0 self-start">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20 p-5 text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <PackageCheck className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">All goods received</p>
            <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
              Supplier: <span className="font-medium">{order.supplier_name}</span>
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 divide-y text-sm overflow-hidden">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">{item.description}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="font-mono text-xs">
                    {item.quantity_received ?? 0} / {item.quantity} units
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-400/40 bg-emerald-50 text-emerald-700 text-[10px] dark:bg-emerald-950/30 dark:text-emerald-400"
                  >
                    Posted
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t bg-muted/20 px-5 py-4">
        <Button variant="outline" className="w-full" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Purchase Orders
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function GrnCreator({ poId, onGrnCreated, onCancel }: GrnCreatorProps) {
  const { toast } = useToast();
  const { user }  = useAuth();

  const [order, setOrder]               = useState<PurchaseOrderDetails | null>(null);
  const [lines, setLines]               = useState<GrnLine[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [grnDate, setGrnDate]           = useState(todayStr());

  // ── Fetch PO ────────────────────────────────────────────────────────────────

  const fetchPoDetails = useCallback(async () => {
    if (!user?.company_id || !poId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api<{ purchase_orders: PurchaseOrderDetails[] }>(
        `get-purchase-orders.php?company_id=${user.company_id}&id=${poId}`
      );
      const orderData = response.purchase_orders?.[0];
      if (!orderData) throw new Error('Purchase Order not found or API did not return expected data.');

      setOrder(orderData);

      // Only build editable lines if the PO is not already fully received
      if (!isPOFullyReceived(orderData.items)) {
        setLines(
          orderData.items.map((item) => ({
            ...item,
            // Default receiving_now to the remaining outstanding quantity
            receiving_now: item.quantity - (item.quantity_received ?? 0),
          }))
        );
      }
    } catch (e: any) {
      setError('Failed to load purchase order details. ' + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [poId, user?.company_id]);

  useEffect(() => {
    if (user) fetchPoDetails();
  }, [fetchPoDetails, user]);

  // ── Quantity change ──────────────────────────────────────────────────────────

  const handleQuantityChange = (lineId: number, raw: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const max     = line.quantity - (line.quantity_received ?? 0);
        const clamped = Math.min(max, Math.max(0, isNaN(raw) ? 0 : raw));
        return { ...line, receiving_now: clamped };
      })
    );
  };

  const handleSetAll = (mode: 'max' | 'zero') => {
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        receiving_now: mode === 'max'
          ? line.quantity - (line.quantity_received ?? 0)
          : 0,
      }))
    );
  };

  // ── Live totals (VAT reads vat_rate from each line) ─────────────────────────

  const { subTotal, totalVat, grandTotal, activeLineCount, hasVat } = useMemo(() => {
    let sub = 0, vat = 0, active = 0;
    for (const line of lines) {
      if (line.receiving_now > 0) {
        const lineAmt = line.receiving_now * (line.unit_price ?? 0);
        // vat_rate comes from the API; will be 0 until the backend fix is applied
        const lineVat = lineAmt * ((line.vat_rate ?? 0) / 100);
        sub    += lineAmt;
        vat    += lineVat;
        active += 1;
      }
    }
    return {
      subTotal:        sub,
      totalVat:        vat,
      grandTotal:      sub + vat,
      activeLineCount: active,
      hasVat:          vat > 0,
    };
  }, [lines]);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmitGrn = async () => {
    if (!user?.company_id || !user?.uid) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'User information is missing. Please log in again.' });
      return;
    }

    const receivedLines = lines
      .filter((l) => l.receiving_now > 0)
      .map((l) => ({ po_item_id: l.id, quantity_received: l.receiving_now }));

    if (receivedLines.length === 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Enter a quantity for at least one item.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api('create-grn.php', {
        method: 'POST',
        body: JSON.stringify({
          company_id:        user.company_id,
          user_id:           user.uid,
          purchase_order_id: poId,
          grn_date:          grnDate,
          lines:             receivedLines,
        }),
      });
      toast({ title: 'GRN Created', description: 'Goods Received Note and journal entries have been posted.' });
      onGrnCreated();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: e.message || 'An unknown error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
      <p className="text-sm">Loading purchase order…</p>
    </div>
  );

  if (error) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-destructive">
      <AlertCircle className="h-10 w-10" />
      <p className="font-medium">{error}</p>
      <Button variant="outline" size="sm" onClick={fetchPoDetails}>
        <RefreshCw className="mr-2 h-4 w-4" /> Retry
      </Button>
    </div>
  );

  if (!order) return null;

  // ── If PO is already fully received, show locked banner instead of form ──────
  if (isPOFullyReceived(order.items)) {
    return <AlreadyPostedBanner order={order} onBack={onCancel} />;
  }

  // ── Main GRN form ────────────────────────────────────────────────────────────

  return (
    <div className="mt-4 space-y-0">

      {/* Header */}
      <Card className="rounded-b-none border-b-0 border-t-4 border-t-emerald-600 shadow-md">
        <CardHeader className="bg-gradient-to-r from-emerald-50/60 to-transparent p-5 dark:from-emerald-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">Goods Received Note</CardTitle>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                  {order.po_number}
                </Badge>
              </div>
              <CardDescription>
                Enter quantities received. The journal will be posted automatically on save.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel} className="shrink-0 self-start">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
          </div>
        </CardHeader>

        {/* Meta bar */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t bg-muted/30 px-5 py-4 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Supplier</p>
            <p className="mt-0.5 text-sm font-medium">{order.supplier_name}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">PO Date</p>
            <p className="mt-0.5 text-sm">
              {new Date(order.po_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Items</p>
            <p className="mt-0.5 text-sm">{lines.length} line{lines.length !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <Label htmlFor="grnDate" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              GRN Date
            </Label>
            <Input
              id="grnDate"
              type="date"
              value={grnDate}
              onChange={(e) => setGrnDate(e.target.value)}
              className="mt-0.5 h-8 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Body: table + sidebar */}
      <div className="flex flex-col gap-0 lg:flex-row">

        {/* Lines table */}
        <Card className="flex-1 rounded-none border-x shadow-md lg:rounded-bl-xl">
          <CardContent className="p-0">

            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2.5 bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium">
                {activeLineCount} of {lines.length} item{lines.length !== 1 ? 's' : ''} selected for receiving
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSetAll('max')}>
                  <ChevronsDown className="mr-1.5 h-3 w-3" /> Set All to Max
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSetAll('zero')}>
                  Clear All
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4 w-[35%]">Item</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">VAT %</TableHead>
                    <TableHead className="text-center">Ordered</TableHead>
                    <TableHead className="text-center">Received</TableHead>
                    <TableHead className="text-center">Remaining</TableHead>
                    <TableHead className="text-center w-36">Receiving Now</TableHead>
                    <TableHead className="text-center pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const received    = line.quantity_received ?? 0;
                    const remaining   = line.quantity - received;
                    const status      = lineStatus(line);
                    const isFullyDone = remaining === 0;
                    const vatRate     = line.vat_rate ?? 0;

                    return (
                      <TableRow
                        key={line.id}
                        className={`
                          group transition-colors
                          ${isFullyDone ? 'opacity-40' : ''}
                          ${status === 'full' ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}
                        `}
                      >
                        {/* Description + progress bar */}
                        <TableCell className="pl-4 py-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="font-medium text-sm leading-tight">{line.description}</span>
                            </div>
                            <ProgressBar done={received + line.receiving_now} total={line.quantity} />
                          </div>
                        </TableCell>

                        {/* Unit price */}
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          ₦{fmt(line.unit_price ?? 0)}
                        </TableCell>

                        {/* VAT rate — shows warning icon if backend hasn't returned it */}
                        <TableCell className="text-right">
                          {line.vat_rate !== undefined ? (
                            <span className="font-mono text-sm">{vatRate}%</span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium"
                              title="vat_rate not returned by API — see backend fix note"
                            >
                              <AlertTriangle className="h-3 w-3" /> N/A
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-center text-sm tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums text-muted-foreground">{received}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm tabular-nums font-medium ${remaining === 0 ? 'text-muted-foreground line-through' : ''}`}>
                            {remaining}
                          </span>
                        </TableCell>

                        {/* Receiving now */}
                        <TableCell className="py-2">
                          <Input
                            type="number"
                            className={`
                              text-center font-semibold h-9 tabular-nums
                              ${status === 'full'    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 focus-visible:ring-emerald-400' : ''}
                              ${status === 'partial' ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
                              ${isFullyDone          ? 'bg-muted cursor-not-allowed' : ''}
                            `}
                            value={line.receiving_now}
                            onChange={(e) => handleQuantityChange(line.id, e.target.valueAsNumber)}
                            max={remaining}
                            min={0}
                            disabled={isFullyDone}
                          />
                        </TableCell>

                        <TableCell className="text-center pr-4">
                          <StatusPill status={isFullyDone ? 'full' : status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Live Journal Preview sidebar */}
        <Card className="rounded-none border-t-0 border-x shadow-md lg:border-t lg:border-l-0 lg:w-72 lg:rounded-br-xl lg:rounded-tr-xl">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Journal Preview
            </CardTitle>
            <CardDescription className="text-xs">Updates live as you enter quantities</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4">

            {/* Totals */}
            <div className="space-y-0.5">
              <SummaryRow label="Subtotal (ex. VAT)" value={`₦${fmt(subTotal)}`} />
              <SummaryRow
                label="VAT"
                value={`₦${fmt(totalVat)}`}
                muted={!hasVat && lines.some((l) => l.vat_rate === undefined)}
              />
              <Separator className="my-2" />
              <SummaryRow label="Grand Total" value={`₦${fmt(grandTotal)}`} bold accent />
            </div>

            {/* VAT warning if backend isn't sending vat_rate */}
            {lines.some((l) => l.vat_rate === undefined) && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  VAT rates are not returned by the API. Add{' '}
                  <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">poi.vat_rate</code>{' '}
                  to the items SELECT in <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">get-purchase-orders.php</code>.
                </span>
              </div>
            )}

            <Separator className="my-4" />

            {/* Will Post breakdown */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Will Post</p>
              <div className="rounded-lg border bg-muted/30 divide-y text-xs">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">DR Inventory</span>
                  <span className="font-mono font-medium">₦{fmt(subTotal)}</span>
                </div>
                {hasVat && (
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-muted-foreground">DR VAT Input</span>
                    <span className="font-mono font-medium">₦{fmt(totalVat)}</span>
                  </div>
                )}
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">CR Accounts Payable</span>
                  <span className="font-mono font-medium text-destructive">₦{fmt(grandTotal)}</span>
                </div>
              </div>

              <div className={`
                flex items-center justify-between rounded-md px-3 py-1.5 text-xs font-medium
                ${grandTotal > 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'}
              `}>
                <span>Balance</span>
                <span className="font-mono">{grandTotal > 0 ? '✓ Balanced' : '—'}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Items receiving</span>
                <span className="font-medium text-foreground">{activeLineCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Items pending</span>
                <span className="font-medium text-foreground">{lines.length - activeLineCount}</span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t bg-muted/20 px-5 py-4">
            <Button
              onClick={handleSubmitGrn}
              disabled={isSubmitting || activeLineCount === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow"
            >
              {isSubmitting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting…</>
                : <><Save className="mr-2 h-4 w-4" />Save & Post GRN</>
              }
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={onCancel}>
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}