'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GrnList } from './GrnList';
import { GrnDetails } from './GrnDetails';
import { GrnCreator } from './GrnCreator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, PlusCircle, ArrowLeft, Search, Truck, RefreshCw, PackageOpen, ChevronRight, CalendarDays, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type GrnView = 'list' | 'details' | 'select_po' | 'creator';

type PoStatus = 'Approved' | 'Partially Received' | string;

interface PurchaseOrderForList {
  id: string | number;   // API returns integer; widened to avoid .split() crash
  po_number: string;
  supplier_name: string;
  po_date: string;
  total_amount?: number;
  status: PoStatus;
}

interface ApiResponse {
  purchase_orders?: PurchaseOrderForList[] | null;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_COLOURS = [
  'bg-emerald-600', 'bg-teal-600', 'bg-indigo-600',
  'bg-rose-600', 'bg-amber-600', 'bg-violet-600',
];
function avatarColour(id: string | number): string {
  const sum = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLOURS[sum % AVATAR_COLOURS.length];
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

/** Step pill shown at the top of multi-step flows */
interface StepIndicatorProps { step: 1 | 2; label1: string; label2: string }
function StepIndicator({ step, label1, label2 }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      {/* Step 1 */}
      <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
        step === 1
          ? 'bg-emerald-600 text-white'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
      }`}>
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
          step === 1 ? 'bg-white/20' : 'bg-emerald-200 dark:bg-emerald-800'
        }`}>1</span>
        {label1}
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />

      {/* Step 2 */}
      <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
        step === 2
          ? 'bg-emerald-600 text-white'
          : 'bg-muted text-muted-foreground'
      }`}>
        <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
          step === 2 ? 'bg-white/20' : 'bg-muted-foreground/20'
        }`}>2</span>
        {label2}
      </div>
    </div>
  );
}

interface PoStatusBadgeProps { status: PoStatus }
function PoStatusBadge({ status }: PoStatusBadgeProps) {
  if (status === 'Approved') {
    return (
      <Badge variant="outline" className="border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px]">
        Approved
      </Badge>
    );
  }
  if (status === 'Partially Received') {
    return (
      <Badge variant="outline" className="border-amber-400/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-[10px]">
        Partially Received
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
}

interface PoCardProps {
  po: PurchaseOrderForList;
  onSelect: (id: string | number) => void;
}
function PoCard({ po, onSelect }: PoCardProps) {
  const initials = getInitials(po.supplier_name);
  const colour   = avatarColour(po.id);

  return (
    <div
      className="group relative flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 transition-all duration-150 hover:border-emerald-400/50 hover:shadow-md hover:shadow-emerald-100/40 dark:hover:shadow-emerald-900/20 cursor-pointer"
      onClick={() => onSelect(po.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(po.id)}
    >
      {/* Supplier avatar */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white select-none ${colour}`}>
        {initials}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide">
            {po.po_number}
          </span>
          <PoStatusBadge status={po.status} />
        </div>
        <p className="mt-1 text-sm font-medium truncate">{po.supplier_name}</p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {new Date(po.po_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          {po.total_amount !== undefined && (
            <span className="flex items-center gap-1 font-mono">
              ₦{fmt(po.total_amount)}
            </span>
          )}
        </div>
      </div>

      {/* Action */}
      <Button
        size="sm"
        className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={(e) => { e.stopPropagation(); onSelect(po.id); }}
        tabIndex={-1}
      >
        <Truck className="mr-1.5 h-3.5 w-3.5" />
        Receive
      </Button>

      {/* Hover arrow fallback (always visible on touch) */}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-emerald-600 transition-colors sm:hidden" />
    </div>
  );
}

// ─── SELECT PO VIEW ───────────────────────────────────────────────────────────

interface SelectPoViewProps {
  orders: PurchaseOrderForList[];
  isLoading: boolean;
  error: string | null;
  onSelect: (id: string | number) => void;
  onBack: () => void;
  onRetry: () => void;
}

function SelectPoView({ orders, isLoading, error, onSelect, onBack, onRetry }: SelectPoViewProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(q) ||
        po.supplier_name.toLowerCase().includes(q)
    );
  }, [orders, search]);

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <StepIndicator step={1} label1="Select PO" label2="Enter Quantities" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Select a Purchase Order</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose an approved or partially-received PO to create a GRN against.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 self-start">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to GRN List
        </Button>
      </div>

      {/* Search bar */}
      {!isLoading && !error && orders.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by PO number or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex h-52 flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm">Loading available purchase orders…</p>
        </div>
      ) : error ? (
        <div className="flex h-52 flex-col items-center justify-center gap-3 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="font-medium text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 text-muted-foreground">
          <PackageOpen className="h-10 w-10 opacity-30" />
          <div className="text-center">
            <p className="font-medium">
              {orders.length === 0
                ? 'No approved purchase orders available'
                : 'No results match your search'}
            </p>
            <p className="text-xs mt-0.5">
              {orders.length === 0
                ? 'Only Approved or Partially Received POs can be received against.'
                : 'Try a different PO number or supplier name.'}
            </p>
          </div>
          {orders.length === 0 && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Count */}
          <p className="text-xs text-muted-foreground font-medium px-0.5">
            {filtered.length} of {orders.length} order{orders.length !== 1 ? 's' : ''} available
          </p>

          {/* PO cards */}
          <div className="space-y-2">
            {filtered.map((po) => (
              <PoCard key={po.id} po={po} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN CONTROLLER ──────────────────────────────────────────────────────────

export function GrnTabContent() {
  const { user } = useAuth();

  const [view, setView]                   = useState<GrnView>('list');
  const [selectedPoId, setSelectedPoId]   = useState<string | null>(null);
  const [selectedGrnId, setSelectedGrnId] = useState<number | null>(null);
  const [selectableOrders, setSelectableOrders] = useState<PurchaseOrderForList[]>([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  // ── Fetch approvable POs ───────────────────────────────────────────────────

  const fetchSelectableOrders = useCallback(async () => {
    if (!user?.company_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api<ApiResponse>(`get-purchase-orders.php?company_id=${user.company_id}`);
      const orders = Array.isArray(data.purchase_orders) ? data.purchase_orders : [];
      setSelectableOrders(
        orders.filter((po) => po.status === 'Approved' || po.status === 'Partially Received')
      );
    } catch (e: any) {
      setError(e.message || 'An error occurred while fetching orders.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (view === 'select_po') fetchSelectableOrders();
  }, [view, fetchSelectableOrders]);

  // ── Navigation handlers ────────────────────────────────────────────────────

  const handleGoToCreateFlow  = ()                      => setView('select_po');
  const handlePoSelected      = (id: string | number)   => { setSelectedPoId(String(id)); setView('creator'); };
  const handleGrnCreated      = ()           => { setView('list'); setSelectedPoId(null); };
  const handleCancelCreation  = ()           => { setView('list'); setSelectedPoId(null); };
  const handleViewDetails     = (id: number) => { setSelectedGrnId(id); setView('details'); };
  const handleBackToList      = ()           => { setView('list'); setSelectedGrnId(null); };
  const handleBackToSelectPo  = ()           => { setView('select_po'); setSelectedPoId(null); };

  // ── Render ─────────────────────────────────────────────────────────────────

  switch (view) {

    case 'select_po':
      return (
        <SelectPoView
          orders={selectableOrders}
          isLoading={isLoading}
          error={error}
          onSelect={handlePoSelected}
          onBack={handleBackToList}
          onRetry={fetchSelectableOrders}
        />
      );

    case 'creator':
      return (
        <div className="space-y-3">
          {/* Step indicator stays visible in creator view too */}
          <StepIndicator step={2} label1="Select PO" label2="Enter Quantities" />
          <GrnCreator
            poId={selectedPoId!}
            onGrnCreated={handleGrnCreated}
            onCancel={handleBackToSelectPo}  // ← goes back to PO selection, not list
          />
        </div>
      );

    case 'details':
      return <GrnDetails grnId={selectedGrnId!} onBack={handleBackToList} />;

    case 'list':
    default:
      return <GrnList onViewDetails={handleViewDetails} onGoToCreate={handleGoToCreateFlow} />;
  }
}
