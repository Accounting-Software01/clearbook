'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, AlertCircle, Calendar, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface LedgerEntry {
  id: number;
  date: string;
  transaction_type: string;
  reference: string | null;
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

interface ItemLedgerProps {
  companyId: number;
  userRole: string | undefined;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount || 0);

const formatDate = (d: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: '2-digit' }); }
  catch { return d; }
};

/**
 * Ledger View — shows ALL items' transactions in one unified ledger.
 * Option A behavior: replaces the summary table entirely.
 */
const ItemLedger = ({ companyId, userRole }: ItemLedgerProps) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [txnFilter, setTxnFilter] = useState('');

  const fetchLedger = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        company_id: String(companyId),
        user_role: userRole || '',
      });
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (itemFilter) params.append('item_id', itemFilter);
      if (txnFilter) params.append('transaction_type', txnFilter);

      const res = await fetch(
        `https://hariindustries.net/api/clearbook/get-item-ledger.php?${params.toString()}`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || res.statusText);
      }
      const data = await res.json();
      setEntries(Array.isArray(data.ledger) ? data.ledger : []);
    } catch (e: any) {
      const msg = e?.message || 'Failed to fetch ledger.';
      setError(msg);
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setIsLoading(false);
    }
  }, [companyId, userRole, fromDate, toDate, itemFilter, txnFilter, toast]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const clearFilters = () => {
    setFromDate(''); setToDate(''); setItemFilter(''); setTxnFilter('');
  };

  const hasFilters = !!(fromDate || toDate || itemFilter || txnFilter);

  const totals = entries.reduce(
    (acc, e) => ({
      in_qty: acc.in_qty + (e.in_qty || 0),
      in_value: acc.in_value + (e.in_value || 0),
      out_qty: acc.out_qty + (e.out_qty || 0),
      out_value: acc.out_value + (e.out_value || 0),
    }),
    { in_qty: 0, in_value: 0, out_qty: 0, out_value: 0 }
  );

  const lastEntry = entries[entries.length - 1];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Item Ledger</h1>
          <p className="text-muted-foreground">
            Detailed transaction history and running balance across all items.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLedger} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="from" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" /> From
              </Label>
              <Input id="from" type="date" className="w-40" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="to" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" /> To
              </Label>
              <Input id="to" type="date" className="w-40" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="item" className="text-xs flex items-center gap-1">
                <Filter className="h-3 w-3" /> Item ID / SKU
              </Label>
              <Input id="item" placeholder="e.g. 42 or SKU-001" className="w-48" value={itemFilter} onChange={e => setItemFilter(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="txn" className="text-xs flex items-center gap-1">
                <Filter className="h-3 w-3" /> Transaction Type
              </Label>
              <Input id="txn" placeholder="e.g. Sale, Production" className="w-48" value={txnFilter} onChange={e => setTxnFilter(e.target.value)} />
            </div>
            <Button onClick={fetchLedger} disabled={isLoading}>Apply</Button>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
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
              <p>No transactions recorded{hasFilters ? ' for the selected filters' : ''}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {/* Grouped Header Row */}
                  <TableRow>
                    <TableHead rowSpan={2} className="align-bottom">Date</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Item</TableHead>
                    <TableHead rowSpan={2} className="align-bottom">Transaction</TableHead>
                    <TableHead colSpan={3} className="text-center border-l">In (Receipts / Production)</TableHead>
                    <TableHead colSpan={3} className="text-center border-l">Out (Issues / Sales)</TableHead>
                    <TableHead colSpan={3} className="text-center border-l">Running Balance</TableHead>
                  </TableRow>
                  {/* Sub Header Row */}
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
                    <TableRow key={entry.id ?? idx}>
                      <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                      <TableCell className="font-medium">
                        {(entry as any).item_name || (entry as any).item_sku || `#${(entry as any).item_id ?? ''}`}
                      </TableCell>
                      <TableCell className="font-medium">
                        {entry.transaction_type}
                        {entry.reference && (
                          <span className="text-muted-foreground ml-1 text-xs">({entry.reference})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono border-l">
                        {entry.in_qty ? entry.in_qty.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.in_cost ? formatCurrency(entry.in_cost) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.in_value ? formatCurrency(entry.in_value) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono border-l">
                        {entry.out_qty ? entry.out_qty.toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.out_cost ? formatCurrency(entry.out_cost) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.out_value ? formatCurrency(entry.out_value) : '—'}
                      </TableCell>
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
                      <TableCell colSpan={3} className="font-bold">Totals</TableCell>
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
                        {lastEntry?.running_qty.toLocaleString() ?? 0}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ItemLedger;
