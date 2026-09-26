'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar,
  Filter,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface LedgerEntry {
  id: number;
  date: string;
  transaction_type: string;
  reference_type: string | null;
  reference_id: number | null;
  batch_number: string | null;
  item_id: number;
  sku: string | null;

  quantity: number;
  unit_cost: number;
  total_value: number;

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
  companyId: string;
  userRole: string | undefined;
}

const API_URL =
  'https://hariindustries.net/api/clearbook/get-item-ledger.php';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value: unknown): string => {
  return toNumber(value).toLocaleString('en-NG', {
    maximumFractionDigits: 2,
  });
};

const formatCurrency = (value: unknown): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
};

/**
 * Handles SQL DATE values such as:
 * 2026-09-26
 *
 * We deliberately avoid new Date('YYYY-MM-DD') because it can
 * shift the displayed date depending on timezone.
 */
const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';

  const datePart = value.substring(0, 10);
  const parts = datePart.split('-');

  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);

    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day)
    ) {
      const date = new Date(year, month - 1, day);

      return date.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    }
  }

  return value;
};

/**
 * Normalize API values.
 *
 * PHP/MySQL frequently returns DECIMAL values as strings.
 * Converting them here prevents calculations such as:
 *
 * "10" + "20" = "1020"
 *
 * instead of:
 *
 * 10 + 20 = 30
 */
const normalizeLedgerEntry = (entry: any): LedgerEntry => {
  return {
    id: toNumber(entry.id),

    date: entry.date ?? '',

    transaction_type: String(entry.transaction_type ?? ''),

    reference_type:
      entry.reference_type !== null &&
      entry.reference_type !== undefined
        ? String(entry.reference_type)
        : null,

    reference_id:
      entry.reference_id !== null &&
      entry.reference_id !== undefined
        ? toNumber(entry.reference_id)
        : null,

    batch_number:
      entry.batch_number !== null &&
      entry.batch_number !== undefined
        ? String(entry.batch_number)
        : null,

    item_id: toNumber(entry.item_id),

    sku:
      entry.sku !== null &&
      entry.sku !== undefined &&
      entry.sku !== ''
        ? String(entry.sku)
        : null,

    quantity: toNumber(entry.quantity),
    unit_cost: toNumber(entry.unit_cost),
    total_value: toNumber(entry.total_value),

    in_qty: toNumber(entry.in_qty),
    in_cost: toNumber(entry.in_cost),
    in_value: toNumber(entry.in_value),

    out_qty: toNumber(entry.out_qty),
    out_cost: toNumber(entry.out_cost),
    out_value: toNumber(entry.out_value),

    running_qty: toNumber(entry.running_qty),
    running_avg_cost: toNumber(entry.running_avg_cost),
    running_value: toNumber(entry.running_value),
  };
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

const ItemLedger = ({
  companyId,
  userRole,
}: ItemLedgerProps) => {
  const { toast } = useToast();

  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filters */
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [txnFilter, setTxnFilter] = useState('');

  /* ------------------------------------------------------------------------ */
  /* Fetch ledger                                                             */
  /* ------------------------------------------------------------------------ */

  const fetchLedger = useCallback(async () => {
    if (!companyId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      params.set('company_id', String(companyId));
      params.set('user_role', userRole || '');

      if (fromDate) {
        params.set('from', fromDate);
      }

      if (toDate) {
        params.set('to', toDate);
      }

      if (itemFilter.trim()) {
        params.set('item_id', itemFilter.trim());
      }

      if (txnFilter.trim()) {
        params.set(
          'transaction_type',
          txnFilter.trim()
        );
      }

      const response = await fetch(
        `${API_URL}?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      const contentType =
        response.headers.get('content-type') || '';

      let data: any;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();

        throw new Error(
          text || `HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `HTTP ${response.status} ${response.statusText}`
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.message ||
            data?.error ||
            'The ledger request failed.'
        );
      }

      const rawLedger = Array.isArray(data?.ledger)
        ? data.ledger
        : [];

      const normalizedLedger =
        rawLedger.map(normalizeLedgerEntry);

      setEntries(normalizedLedger);
    } catch (err: any) {
      const message =
        err?.message ||
        'Failed to fetch item ledger.';

      setEntries([]);
      setError(message);

      toast({
        variant: 'destructive',
        title: 'Ledger Error',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    companyId,
    userRole,
    fromDate,
    toDate,
    itemFilter,
    txnFilter,
    toast,
  ]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  /* ------------------------------------------------------------------------ */
  /* Filters                                                                  */
  /* ------------------------------------------------------------------------ */

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setItemFilter('');
    setTxnFilter('');
  };

  const hasFilters =
    Boolean(fromDate) ||
    Boolean(toDate) ||
    Boolean(itemFilter.trim()) ||
    Boolean(txnFilter.trim());

  /* ------------------------------------------------------------------------ */
  /* Totals                                                                   */
  /* ------------------------------------------------------------------------ */

  const totals = entries.reduce(
    (acc, entry) => {
      acc.in_qty += entry.in_qty;
      acc.in_value += entry.in_value;

      acc.out_qty += entry.out_qty;
      acc.out_value += entry.out_value;

      return acc;
    },
    {
      in_qty: 0,
      in_value: 0,
      out_qty: 0,
      out_value: 0,
    }
  );

  const lastEntry =
    entries.length > 0
      ? entries[entries.length - 1]
      : null;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Item Ledger
          </h1>

          <p className="text-muted-foreground">
            Detailed transaction history and running
            inventory balance.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLedger}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${
              isLoading ? 'animate-spin' : ''
            }`}
          />

          Refresh
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filters                                                            */}
      {/* ------------------------------------------------------------------ */}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* From */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="ledger-from"
                className="flex items-center gap-1 text-xs"
              >
                <Calendar className="h-3 w-3" />
                From
              </Label>

              <Input
                id="ledger-from"
                type="date"
                className="w-40"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
              />
            </div>

            {/* To */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="ledger-to"
                className="flex items-center gap-1 text-xs"
              >
                <Calendar className="h-3 w-3" />
                To
              </Label>

              <Input
                id="ledger-to"
                type="date"
                className="w-40"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
              />
            </div>

            {/* Item */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="ledger-item"
                className="flex items-center gap-1 text-xs"
              >
                <Filter className="h-3 w-3" />
                Item ID / SKU
              </Label>

              <Input
                id="ledger-item"
                placeholder="e.g. 42 or SKU-001"
                className="w-48"
                value={itemFilter}
                onChange={(e) =>
                  setItemFilter(e.target.value)
                }
              />
            </div>

            {/* Transaction */}
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="ledger-transaction"
                className="flex items-center gap-1 text-xs"
              >
                <Filter className="h-3 w-3" />
                Transaction Type
              </Label>

              <Input
                id="ledger-transaction"
                placeholder="e.g. Sale, Production"
                className="w-48"
                value={txnFilter}
                onChange={(e) =>
                  setTxnFilter(e.target.value)
                }
              />
            </div>

            <Button
              onClick={fetchLedger}
              disabled={isLoading}
            >
              Apply
            </Button>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                disabled={isLoading}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Table Card                                                         */}
      {/* ------------------------------------------------------------------ */}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center rounded-lg bg-destructive/10 py-16 text-center text-destructive">
              <AlertCircle className="mb-2 h-10 w-10" />

              <p className="text-lg font-semibold">
                Unable to load ledger
              </p>

              <p className="mt-1 max-w-xl text-sm">
                {error}
              </p>

              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchLedger}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>
                No transactions recorded
                {hasFilters
                  ? ' for the selected filters'
                  : ''}
                .
              </p>
            </div>
          ) : (
            /*
             * Important:
             *
             * The table is intentionally wider than the card.
             * overflow-x-auto allows horizontal scrolling without
             * destroying the column structure.
             */
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1450px]">
                {/* ------------------------------------------------------ */}
                {/* Header                                                  */}
                {/* ------------------------------------------------------ */}

                <TableHeader>
                  <TableRow>
                    <TableHead
                      rowSpan={2}
                      className="w-[110px] align-bottom"
                    >
                      Date
                    </TableHead>

                    <TableHead
                      rowSpan={2}
                      className="w-[150px] align-bottom"
                    >
                      Item
                    </TableHead>

                    <TableHead
                      rowSpan={2}
                      className="w-[240px] align-bottom"
                    >
                      Transaction
                    </TableHead>

                    <TableHead
                      colSpan={3}
                      className="border-l text-center"
                    >
                      In
                    </TableHead>

                    <TableHead
                      colSpan={3}
                      className="border-l text-center"
                    >
                      Out
                    </TableHead>

                    <TableHead
                      colSpan={3}
                      className="border-l text-center"
                    >
                      Running Balance
                    </TableHead>
                  </TableRow>

                  <TableRow>
                    {/* In */}
                    <TableHead className="border-l text-right">
                      Qty
                    </TableHead>

                    <TableHead className="text-right">
                      Unit Cost
                    </TableHead>

                    <TableHead className="text-right">
                      Value
                    </TableHead>

                    {/* Out */}
                    <TableHead className="border-l text-right">
                      Qty
                    </TableHead>

                    <TableHead className="text-right">
                      Unit Cost
                    </TableHead>

                    <TableHead className="text-right">
                      Value
                    </TableHead>

                    {/* Running */}
                    <TableHead className="border-l text-right">
                      Qty
                    </TableHead>

                    <TableHead className="text-right">
                      Avg. Cost
                    </TableHead>

                    <TableHead className="text-right">
                      Value
                    </TableHead>
                  </TableRow>
                </TableHeader>

                {/* ------------------------------------------------------ */}
                {/* Body                                                    */}
                {/* ------------------------------------------------------ */}

                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow
                      key={`${entry.id}-${entry.item_id}-${index}`}
                    >
                      {/* Date */}
                      <TableCell className="whitespace-nowrap">
                        {formatDate(entry.date)}
                      </TableCell>

                      {/* Item */}
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">
                            {entry.sku
                              ? `#${entry.sku}`
                              : `#${entry.item_id}`}
                          </span>

                          {!entry.sku && (
                            <span className="text-xs text-muted-foreground">
                              Item ID: {entry.item_id}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Transaction */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {entry.transaction_type ||
                              'Transaction'}
                          </span>

                          {entry.batch_number && (
                            <span className="text-xs text-muted-foreground">
                              Batch: {entry.batch_number}
                            </span>
                          )}

                          {entry.reference_type && (
                            <span className="text-xs text-muted-foreground">
                              {entry.reference_type}
                              {entry.reference_id
                                ? ` #${entry.reference_id}`
                                : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* ------------------------------------------------ */}
                      {/* IN                                                 */}
                      {/* ------------------------------------------------ */}

                      <TableCell className="border-l text-right font-mono tabular-nums">
                        {entry.in_qty !== 0
                          ? formatNumber(entry.in_qty)
                          : '—'}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums">
                        {entry.in_qty !== 0
                          ? formatCurrency(entry.in_cost)
                          : '—'}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums">
                        {entry.in_value !== 0
                          ? formatCurrency(entry.in_value)
                          : '—'}
                      </TableCell>

                      {/* ------------------------------------------------ */}
                      {/* OUT                                                */}
                      {/* ------------------------------------------------ */}

                      <TableCell className="border-l text-right font-mono tabular-nums">
                        {entry.out_qty !== 0
                          ? formatNumber(entry.out_qty)
                          : '—'}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums">
                        {entry.out_qty !== 0
                          ? formatCurrency(entry.out_cost)
                          : '—'}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums">
                        {entry.out_value !== 0
                          ? formatCurrency(entry.out_value)
                          : '—'}
                      </TableCell>

                      {/* ------------------------------------------------ */}
                      {/* RUNNING BALANCE                                    */}
                      {/* ------------------------------------------------ */}

                      <TableCell className="border-l text-right font-mono font-semibold tabular-nums">
                        {formatNumber(entry.running_qty)}
                      </TableCell>

                      <TableCell className="text-right font-mono tabular-nums">
                        {formatCurrency(
                          entry.running_avg_cost
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono font-semibold tabular-nums">
                        {formatCurrency(
                          entry.running_value
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                {/* ------------------------------------------------------ */}
                {/* Footer                                                  */}
                {/* ------------------------------------------------------ */}

                {userRole !== 'staff' && (
                  <TableFooter>
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="font-bold"
                      >
                        Totals
                      </TableCell>

                      {/* In */}
                      <TableCell className="border-l text-right font-mono font-bold tabular-nums">
                        {formatNumber(totals.in_qty)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold">
                        —
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold tabular-nums">
                        {formatCurrency(
                          totals.in_value
                        )}
                      </TableCell>

                      {/* Out */}
                      <TableCell className="border-l text-right font-mono font-bold tabular-nums">
                        {formatNumber(totals.out_qty)}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold">
                        —
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold tabular-nums">
                        {formatCurrency(
                          totals.out_value
                        )}
                      </TableCell>

                      {/* Running */}
                      <TableCell className="border-l text-right font-mono font-bold tabular-nums">
                        {formatNumber(
                          lastEntry?.running_qty ?? 0
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold tabular-nums">
                        {formatCurrency(
                          lastEntry?.running_avg_cost ?? 0
                        )}
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold tabular-nums">
                        {formatCurrency(
                          lastEntry?.running_value ?? 0
                        )}
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
