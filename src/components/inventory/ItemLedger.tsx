'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, AlertCircle, Calendar, Package, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ------------------------------------------------------------------
 * Response shape from the WAVG-only endpoint
 * ------------------------------------------------------------------ */
export interface LedgerEntry {
  date: string;
  transaction_type: string;    // "IN" | "SALE" | "FREEBIE"
  reference: string | null;    // batch number or invoice number

  in_qty: number;
  in_cost: number;
  in_value: number;

  out_qty: number;
  out_cost: number;
  out_value: number;

  running_qty: number;
  running_avg_cost: number;
  running_value: number;
}

interface ProductOption {
  id: number;
  name: string;
  sku: string;
}

interface ItemLedgerProps {
  companyId: string;
  userRole: string | undefined;
  items: ProductOption[];   // passed in from the parent page
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);

const formatDate = (d: string) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: '2-digit',
    });
  } catch {
    return d;
  }
};

const ItemLedger = ({ companyId, userRole, items }: ItemLedgerProps) => {
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* ---------------------------------------------------------------
   * Fetch ledger for the selected product
   * --------------------------------------------------------------- */
  const fetchLedger = useCallback(async () => {
    if (!companyId || !selectedItemId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        company_id: companyId,
        item_id: selectedItemId,
      });
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(
        `https://hariindustries.net/api/clearbook/get-item-ledger.php?${params.toString()}`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `HTTP ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setEntries(Array.isArray(data.ledger) ? data.ledger : []);
    } catch (e: any) {
      const msg = e?.message || 'Failed to fetch ledger.';
      setError(msg);
      setEntries([]);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, selectedItemId, fromDate, toDate, toast]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const hasFilters = !!(fromDate || toDate);

  /* ---------------------------------------------------------------
   * Totals (over the current filter window)
   * --------------------------------------------------------------- */
  const totals = entries.reduce(
    (acc, e) => ({
      in_qty:    acc.in_qty    + (e.in_qty    || 0),
      in_value:  acc.in_value  + (e.in_value  || 0),
      out_qty:   acc.out_qty   + (e.out_qty   || 0),
      out_value: acc.out_value + (e.out_value || 0),
    }),
    { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
  );

  const lastEntry = entries[entries.length - 1];
  const selectedProduct = items.find(i => String(i.id) === selectedItemId);

  /* ---------------------------------------------------------------
   * Render
   * --------------------------------------------------------------- */
  return (
    <div className="space-y-4">

      {/* ---- Product picker + date filters ---- */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">

            {/* Product selector */}
            <div className="flex flex-col gap-1 min-w-[260px]">
              <Label htmlFor="product" className="text-xs flex items-center gap-1">
                <Package className="h-3 w-3" /> Product
              </Label>
              <select
                id="product"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">— Select a product —</option>
                {items.map(it => (
                  <option key={it.id} value={it.id}>
                    {it.sku ? `#${it.sku} — ` : `#${it.id} — `}{it.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="from" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" /> From
              </Label>
              <Input
                id="from"
                type="date"
                className="w-40"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={!selectedItemId}
              />
            </div>

            {/* To */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="to" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" /> To
              </Label>
              <Input
                id="to"
                type="date"
                className="w-40"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={!selectedItemId}
              />
            </div>

            <Button onClick={fetchLedger} disabled={!selectedItemId || isLoading}>
              {isLoading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</>
                : <><RefreshCw className="mr-2 h-4 w-4" />Apply</>}
            </Button>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} disabled={!selectedItemId}>
                <X className="mr-2 h-4 w-4" /> Clear dates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- Ledger table ---- */}
      {!selectedItemId ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium">Select a product to view its weighted-average ledger.</p>
              <p className="mt-1 text-sm">
                The ledger traces how the moving-average cost evolves as stock comes in from production
                and goes out through sales.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="h-10 w-10 mb-2" />
                <p className="text-lg font-semibold">An Error Occurred</p>
                <p>{error}</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No transactions recorded for this product{hasFilters ? ' in the selected date range' : ''}.</p>
              </div>
            ) : (
              <>
                {/* Selected product summary line */}
                <div className="mb-4 pb-3 border-b">
                  <div className="text-sm text-muted-foreground">Ledger for</div>
                  <div className="text-lg font-semibold">
                    {selectedProduct?.sku ? `#${selectedProduct.sku} — ` : `#${selectedProduct?.id} — `}
                    {selectedProduct?.name}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[1300px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead rowSpan={2} className="align-bottom">Date</TableHead>
                        <TableHead rowSpan={2} className="align-bottom">Transaction</TableHead>
                        <TableHead colSpan={3} className="text-center border-l">
                          In (Production)
                        </TableHead>
                        <TableHead colSpan={3} className="text-center border-l">
                          Out (Sales)
                        </TableHead>
                        <TableHead colSpan={3} className="text-center border-l">
                          Running Balance
                        </TableHead>
                      </TableRow>
                      <TableRow>
                        <TableHead className="text-right border-l">Qty</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right border-l">Qty</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right border-l">Qty</TableHead>
                        <TableHead className="text-right">Avg. Cost</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {entries.map((entry, idx) => (
                        <TableRow key={`${entry.date}-${idx}`}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {entry.transaction_type}
                            {entry.reference && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                ({entry.reference})
                              </span>
                            )}
                          </TableCell>

                          {/* In */}
                          <TableCell className="text-right font-mono border-l">
                            {entry.in_qty ? entry.in_qty.toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.in_cost ? formatCurrency(entry.in_cost) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.in_value ? formatCurrency(entry.in_value) : '—'}
                          </TableCell>

                          {/* Out */}
                          <TableCell className="text-right font-mono border-l">
                            {entry.out_qty ? entry.out_qty.toLocaleString() : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.out_cost ? formatCurrency(entry.out_cost) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {entry.out_value ? formatCurrency(entry.out_value) : '—'}
                          </TableCell>

                          {/* Running */}
                          <TableCell className="text-right font-mono border-l font-semibold">
                            {entry.running_qty.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(entry.running_avg_cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(entry.running_value)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>

                    {userRole !== 'staff' && (
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2} className="font-bold">Totals</TableCell>

                          <TableCell className="text-right font-mono border-l font-bold">
                            {totals.in_qty.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">—</TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(totals.in_value)}
                          </TableCell>

                          <TableCell className="text-right font-mono border-l font-bold">
                            {totals.out_qty.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">—</TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(totals.out_value)}
                          </TableCell>

                          <TableCell className="text-right font-mono border-l font-bold">
                            {lastEntry?.running_qty.toLocaleString() ?? '0'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(lastEntry?.running_avg_cost ?? 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {formatCurrency(lastEntry?.running_value ?? 0)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ItemLedger;
