'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, AlertCircle, Eye, PlusCircle, Search,
  RefreshCw, PackageOpen, Truck, CheckCircle2, Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface GrnSummary {
  id: number;
  grn_number: string;
  received_date: string;
  supplier_name: string;
  po_number: string;
  status: string;
}

interface GrnListProps {
  onViewDetails: (grnId: number) => void;
  onGoToCreate: () => void;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_COLOURS = [
  'bg-emerald-600', 'bg-teal-600', 'bg-indigo-600',
  'bg-rose-600', 'bg-amber-600', 'bg-violet-600',
];
function avatarColour(id: number): string {
  return AVATAR_COLOURS[id % AVATAR_COLOURS.length];
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();

  if (s === 'completed' || s === 'posted') return (
    <Badge variant="outline" className="border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1 text-[10px]">
      <CheckCircle2 className="h-3 w-3" />{status}
    </Badge>
  );

  if (s === 'partial' || s === 'partially received') return (
    <Badge variant="outline" className="border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 gap-1 text-[10px]">
      <Truck className="h-3 w-3" />{status}
    </Badge>
  );

  return (
    <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 gap-1 text-[10px]">
      <Clock className="h-3 w-3" />{status}
    </Badge>
  );
}

// ─── STATS ROW ────────────────────────────────────────────────────────────────

interface StatChipProps { label: string; count: number; accent?: boolean }
function StatChip({ label, count, accent }: StatChipProps) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
      accent ? 'border-emerald-400/40 bg-emerald-50/60 dark:bg-emerald-950/20' : 'bg-muted/40'
    }`}>
      <span className={`text-lg font-bold tabular-nums ${accent ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
        {count}
      </span>
      <span className="text-muted-foreground text-xs leading-tight">{label}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function GrnList({ onViewDetails, onGoToCreate }: GrnListProps) {
  const { user } = useAuth();

  const [grns, setGrns]         = useState<GrnSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchGrns = useCallback(async () => {
    if (!user?.company_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api<{ grns: GrnSummary[] }>(`get-grns.php?company_id=${user.company_id}`);
      setGrns(response.grns || []);
    } catch (e: any) {
      setError('Failed to load Goods Received Notes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => { fetchGrns(); }, [fetchGrns]);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const uniqueStatuses = useMemo(
    () => [...new Set(grns.map((g) => g.status))].sort(),
    [grns]
  );

  const completedCount = useMemo(
    () => grns.filter((g) => g.status.toLowerCase() === 'completed' || g.status.toLowerCase() === 'posted').length,
    [grns]
  );

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return grns.filter((g) => {
      const matchSearch =
        !q ||
        g.grn_number.toLowerCase().includes(q) ||
        g.supplier_name.toLowerCase().includes(q) ||
        g.po_number.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || g.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [grns, search, statusFilter]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Goods Received Notes</CardTitle>
            <CardDescription>All GRNs recorded and posted for your company.</CardDescription>
          </div>
          <Button
            onClick={onGoToCreate}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create New GRN
          </Button>
        </div>

        {/* Stats chips — only when data is loaded */}
        {!isLoading && !error && grns.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <StatChip label="Total GRNs" count={grns.length} />
            <StatChip label="Completed" count={completedCount} accent />
            <StatChip label="Other" count={grns.length - completedCount} />
          </div>
        )}

        {/* Search + filter */}
        {!isLoading && !error && grns.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by GRN number, supplier, or PO…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {uniqueStatuses.length > 1 && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm">Loading goods received notes…</p>
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-destructive">
            <AlertCircle className="h-10 w-10" />
            <p className="font-medium text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchGrns}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 text-muted-foreground">
            <PackageOpen className="h-10 w-10 opacity-30" />
            <div className="text-center">
              <p className="font-medium">
                {grns.length === 0 ? 'No GRNs recorded yet' : 'No results match your search'}
              </p>
              <p className="text-xs mt-0.5">
                {grns.length === 0
                  ? 'Create your first Goods Received Note to get started.'
                  : 'Try adjusting your search or status filter.'}
              </p>
            </div>
            {grns.length === 0 && (
              <Button
                size="sm"
                onClick={onGoToCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Create First GRN
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4 w-8" />
                    <TableHead>GRN Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="hidden md:table-cell">PO Number</TableHead>
                    <TableHead className="hidden sm:table-cell">Received Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((grn) => (
                    <TableRow
                      key={grn.id}
                      className="group cursor-pointer transition-colors hover:bg-muted/30"
                      onClick={() => onViewDetails(grn.id)}
                    >
                      {/* Supplier avatar */}
                      <TableCell className="pl-4 py-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white select-none shrink-0 ${avatarColour(grn.id)}`}>
                          {getInitials(grn.supplier_name)}
                        </div>
                      </TableCell>

                      {/* GRN number */}
                      <TableCell>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide">
                          {grn.grn_number}
                        </span>
                      </TableCell>

                      {/* Supplier */}
                      <TableCell className="font-medium text-sm">{grn.supplier_name}</TableCell>

                      {/* PO number */}
                      <TableCell className="hidden md:table-cell">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {grn.po_number}
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {new Date(grn.received_date).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={grn.status} />
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          onClick={(e) => { e.stopPropagation(); onViewDetails(grn.id); }}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Footer count */}
            <p className="mt-3 text-right text-xs text-muted-foreground">
              Showing {filtered.length} of {grns.length} GRN{grns.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
