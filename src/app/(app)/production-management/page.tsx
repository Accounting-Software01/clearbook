'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, PlusCircle, TrendingDown, AlertTriangle, CheckCircle,
  Eye, Package, Layers, Droplets, Box, RefreshCw, Factory,
  ChevronRight, BarChart3, Beaker, Zap
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hariindustries.net/api/clearbook/';
const CAPS_PER_CARTON = 9000;
const PALLET_PACKS = 100;
const KG_PER_BAG: Record<string, number> = { '18g': 30, '14g': 25 };
const GRAMS_PER_PREFORM: Record<string, number> = { '18g': 18, '14g': 14 };
const PACKS_PER_PRODUCT: Record<string, number> = { '75cl': 12, '50cl': 12, '33cl': 20 };

// ─── Types ────────────────────────────────────────────────────────────────────
interface RawMaterial {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  average_unit_cost: number;
  reorder_level?: number;
  inventory_account_id?: number;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  average_unit_cost: number;
  inventory_account_id?: number;
}

interface InjectionBatch {
  batch_number: string;
  production_date: string;
  shift: string;
  operator_name: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes: string;
  preform_type: '18g' | '14g';
  resin_used_kg: number;
  masterbatch_used_kg: number;
  good_preforms_qty: number;
  bad_preforms_qty: number;
  purge_weight_kg: number;
  bags_produced: number;
  preform_weight_grams: number;
}

interface InjectionBatchRecord extends InjectionBatch {
  id: number;
}

interface BlowingBatch {
  batch_number: string;
  production_date: string;
  shift: string;
  operator_name: string;
  status: 'draft' | 'wip' | 'completed' | 'cancelled';
  stage: 'blowing' | 'packaging' | 'completed';
  notes: string;
  preform_type: '18g' | '14g';
  preform_bags: number;
  finished_product: '75cl' | '50cl' | '33cl';
  preforms_taken: number;
  bottles_produced: number;
  bottles_damaged: number;
  bottles_filled: number;
  bottles_filled_damaged: number;
  caps_cartons_taken: number;
  caps_pieces_taken: number;
  caps_used: number;
  caps_good: number;
  caps_damaged: number;
  caps_left: number;
  caps_remaining_cartons: number;
  labels_taken: number;
  labels_used: number;
  labels_good: number;
  labels_damaged: number;
  labels_left: number;
  gum_boxes_taken: number;
  gum_used: number;
  gum_left: number;
  finished_pallets: number;
  finished_packs: number;
  finished_pieces: number;
  damaged_pieces: number;
  shrink_wrap_type: '60' | '70';
  shrink_wrap_used_kg: number;
}

interface BlowingBatchRecord extends BlowingBatch {
  id: number;
}

// ─── Default form values ──────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const defaultInjection = (operatorName = ''): InjectionBatch => ({
  batch_number: '',
  production_date: today(),
  shift: 'Morning',
  operator_name: operatorName,
  status: 'draft',
  notes: '',
  preform_type: '18g',
  resin_used_kg: 0,
  masterbatch_used_kg: 0,
  good_preforms_qty: 0,
  bad_preforms_qty: 0,
  purge_weight_kg: 0,
  bags_produced: 0,
  preform_weight_grams: 18,
});

const defaultBlowing = (operatorName = ''): BlowingBatch => ({
  batch_number: '',
  production_date: today(),
  shift: 'Morning',
  operator_name: operatorName,
  status: 'draft',
  stage: 'blowing',
  notes: '',
  preform_type: '18g',
  preform_bags: 0,
  finished_product: '75cl',
  preforms_taken: 0,
  bottles_produced: 0,
  bottles_damaged: 0,
  bottles_filled: 0,
  bottles_filled_damaged: 0,
  caps_cartons_taken: 0,
  caps_pieces_taken: 0,
  caps_used: 0,
  caps_good: 0,
  caps_damaged: 0,
  caps_left: 0,
  caps_remaining_cartons: 0,
  labels_taken: 0,
  labels_used: 0,
  labels_good: 0,
  labels_damaged: 0,
  labels_left: 0,
  gum_boxes_taken: 0,
  gum_used: 0,
  gum_left: 0,
  finished_pallets: 0,
  finished_packs: 0,
  finished_pieces: 0,
  damaged_pieces: 0,
  shrink_wrap_type: '60',
  shrink_wrap_used_kg: 0,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeBatchNumber = (prefix: string, date: string) => {
  const d = date.replace(/-/g, '');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${d}-${rand}`;
};

const calcPreformsFromBags = (bags: number, type: '18g' | '14g') => {
  const totalKg = bags * KG_PER_BAG[type];
  return Math.round((totalKg * 1000) / GRAMS_PER_PREFORM[type]);
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
}) => (
  <Card className="overflow-hidden border-0 shadow-sm">
    <CardContent className="p-0">
      <div className={`h-1 w-full ${color}`} />
      <div className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color} bg-opacity-10`}>
          <Icon className={`h-5 w-5 text-current opacity-70`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    wip: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600 border-red-200' },
  };
  const s = map[status] ?? { label: status, className: '' };
  return <Badge variant="outline" className={`text-xs font-medium ${s.className}`}>{s.label}</Badge>;
};

const SectionLabel = ({ children, color = 'text-slate-700' }: { children: React.ReactNode; color?: string }) => (
  <p className={`text-xs font-semibold uppercase tracking-widest ${color} mb-2`}>{children}</p>
);

const InfoRow = ({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) => (
  <div className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-emerald-600' : ''}`}>{value}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductionModule = () => {
  const { user, getToken } = useAuth();
  const { toast } = useToast();

  // ── Data state ──
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [obsoleteItems, setObsoleteItems] = useState<RawMaterial[]>([]);
  const [injectionBatches, setInjectionBatches] = useState<InjectionBatchRecord[]>([]);
  const [blowingBatches, setBlowingBatches] = useState<BlowingBatchRecord[]>([]);

  // ── UI state ──
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [isStockErrorDialogOpen, setIsStockErrorDialogOpen] = useState(false);
  const [isInjectionModalOpen, setIsInjectionModalOpen] = useState(false);
  const [isBlowingModalOpen, setIsBlowingModalOpen] = useState(false);
  const [selectedViewBatch, setSelectedViewBatch] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewType, setViewType] = useState<'injection' | 'blowing'>('injection');
  const [mounted, setMounted] = useState(false);

  // ── Form state ──
  const [injectionForm, setInjectionForm] = useState<InjectionBatch>(() => defaultInjection());
  const [blowingForm, setBlowingForm] = useState<BlowingBatch>(() => defaultBlowing());

  // Fix hydration mismatch
  useEffect(() => { setMounted(true); }, []);

  // ── Stable API call ──
  const apiCall = useCallback(async (endpoint: string, method = 'GET', data?: any) => {
    const token = await getToken();
    const res = await fetch(`${API_BASE_URL}/production.php?action=${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return res.json();
  }, [getToken]);

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rawRes, productsRes, obsoleteRes, injectionRes, blowingRes] = await Promise.all([
        apiCall('inventory&type=raw'),
        apiCall('inventory&type=products'),
        apiCall('inventory&type=obsolete'),
        apiCall('batches&type=injection'),
        apiCall('batches&type=blowing'),
      ]);
      if (rawRes.success) setRawMaterials(rawRes.data);
      if (productsRes.success) setProducts(productsRes.data);
      if (obsoleteRes.success) setObsoleteItems(obsoleteRes.data);
      if (injectionRes.success) setInjectionBatches(injectionRes.data);
      if (blowingRes.success) setBlowingBatches(blowingRes.data);
    } catch (err: any) {
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Auto-generate injection batch number ──
  useEffect(() => {
    setInjectionForm(prev => ({
      ...prev,
      batch_number: makeBatchNumber('INJ', prev.production_date),
    }));
  }, [injectionForm.production_date]);

  // ── Auto-generate blowing batch number ──
  useEffect(() => {
    setBlowingForm(prev => ({
      ...prev,
      batch_number: makeBatchNumber('BP', prev.production_date),
    }));
  }, [blowingForm.production_date]);

  // ── Auto-calc good preforms from bags ──
  useEffect(() => {
    if (injectionForm.bags_produced <= 0) return;
    const type = injectionForm.preform_weight_grams === 18 ? '18g' : '14g';
    const qty = calcPreformsFromBags(injectionForm.bags_produced, type);
    setInjectionForm(prev => ({ ...prev, good_preforms_qty: qty }));
  }, [injectionForm.bags_produced, injectionForm.preform_weight_grams]);

  // ── Auto-calc caps good ──
  useEffect(() => {
    setBlowingForm(prev => ({
      ...prev,
      caps_good: Math.max(0, prev.caps_used - prev.caps_damaged),
    }));
  }, [blowingForm.caps_used, blowingForm.caps_damaged]);

  // ── Auto-calc labels good ──
  useEffect(() => {
    setBlowingForm(prev => ({
      ...prev,
      labels_good: Math.max(0, prev.labels_used - prev.labels_damaged),
    }));
  }, [blowingForm.labels_used, blowingForm.labels_damaged]);

  // ── Derived inventory helpers ──
  const getPreformAvailable = useCallback((type: string) => {
    return products.find(p => p.sku === `PREFORM-${type}`)?.quantity_on_hand ?? 0;
  }, [products]);

  const getCapsAvailable = useCallback(() =>
    rawMaterials.find(r => r.sku === 'CAPS')?.quantity_on_hand ?? 0, [rawMaterials]);

  const getLabelsAvailable = useCallback(() =>
    rawMaterials.find(r => r.sku === 'LABELS')?.quantity_on_hand ?? 0, [rawMaterials]);

  const getGumAvailable = useCallback(() =>
    rawMaterials.find(r => r.sku === 'GUM')?.quantity_on_hand ?? 0, [rawMaterials]);

  // ── Injection derived values ──
  const injectionCalc = useMemo(() => {
    const totalInputKg = injectionForm.resin_used_kg + injectionForm.masterbatch_used_kg;
    const totalOutputKg = (injectionForm.good_preforms_qty * injectionForm.preform_weight_grams) / 1000;
    const badKg = (injectionForm.bad_preforms_qty * injectionForm.preform_weight_grams) / 1000;
    const efficiency = totalInputKg > 0 ? ((totalOutputKg / totalInputKg) * 100).toFixed(1) : '0.0';
    return { totalInputKg, totalOutputKg, badKg, efficiency };
  }, [injectionForm.resin_used_kg, injectionForm.masterbatch_used_kg,
      injectionForm.good_preforms_qty, injectionForm.bad_preforms_qty,
      injectionForm.preform_weight_grams]);

  // ── Blowing derived values ──
  const blowingCalc = useMemo(() => {
    const yieldPct = blowingForm.preforms_taken > 0
      ? ((blowingForm.bottles_produced / blowingForm.preforms_taken) * 100).toFixed(1)
      : '0.0';
    const ppp = PACKS_PER_PRODUCT[blowingForm.finished_product] ?? 12;
    const totalPieces =
      blowingForm.finished_pallets * PALLET_PACKS * ppp
      + blowingForm.finished_packs * ppp
      + blowingForm.finished_pieces;
    const totalPacks = blowingForm.finished_pallets * PALLET_PACKS + blowingForm.finished_packs;
    return { yieldPct, totalPieces, totalPacks };
  }, [blowingForm.preforms_taken, blowingForm.bottles_produced, blowingForm.finished_product,
      blowingForm.finished_pallets, blowingForm.finished_packs, blowingForm.finished_pieces]);

  // ── Open modals ──
  const openInjectionModal = useCallback(() => {
    setInjectionForm({
      ...defaultInjection(user?.full_name ?? ''),
      batch_number: makeBatchNumber('INJ', today()),
    });
    setIsInjectionModalOpen(true);
  }, [user?.full_name]);

  const openBlowingModal = useCallback(() => {
    setBlowingForm({
      ...defaultBlowing(user?.full_name ?? ''),
      batch_number: makeBatchNumber('BP', today()),
    });
    setIsBlowingModalOpen(true);
  }, [user?.full_name]);

  // ── View batch ──
  const viewBatchDetails = useCallback(async (batchId: number, type: 'injection' | 'blowing') => {
    setIsLoading(true);
    try {
      const res = await apiCall(`batches&type=${type}&batch_id=${batchId}`);
      if (res.success && res.data.length > 0) {
        setSelectedViewBatch(res.data[0]);
        setViewType(type);
        setIsViewDialogOpen(true);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  // ── Submit injection ──
  const submitInjection = useCallback(async () => {
    if (injectionForm.resin_used_kg === 0 && injectionForm.masterbatch_used_kg === 0) {
      toast({ title: 'Validation', description: 'Enter resin or masterbatch amount', variant: 'destructive' });
      return;
    }
    if (injectionForm.bags_produced === 0) {
      toast({ title: 'Validation', description: 'Enter bags produced', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiCall('injection', 'POST', injectionForm);
      if (res.success) {
        toast({ title: 'Success', description: res.message });
        setIsInjectionModalOpen(false);
        await fetchData();
      } else if (res.stock_issue) {
        setStockErrors(res.errors ?? [res.message]);
        setIsStockErrorDialogOpen(true);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [injectionForm, apiCall, fetchData, toast]);

  // ── Submit blowing ──
  const submitBlowing = useCallback(async () => {
    if (blowingForm.preforms_taken === 0) {
      toast({ title: 'Validation', description: 'Enter preforms to use', variant: 'destructive' });
      return;
    }
    if (blowingForm.bottles_produced === 0) {
      toast({ title: 'Validation', description: 'Enter bottles produced', variant: 'destructive' });
      return;
    }
    if (blowingCalc.totalPieces === 0) {
      toast({ title: 'Validation', description: 'Enter finished goods (pallets, packs, or pieces)', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiCall('blowing', 'POST', blowingForm);
      if (res.success) {
        toast({ title: 'Success', description: res.message });
        setIsBlowingModalOpen(false);
        await fetchData();
      } else if (res.stock_issue) {
        setStockErrors(res.errors ?? [res.message]);
        setIsStockErrorDialogOpen(true);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [blowingForm, blowingCalc.totalPieces, apiCall, fetchData, toast]);

  // ── Inject form change helpers ──
  const setInj = useCallback(<K extends keyof InjectionBatch>(key: K, val: InjectionBatch[K]) => {
    setInjectionForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const setBlo = useCallback(<K extends keyof BlowingBatch>(key: K, val: BlowingBatch[K]) => {
    setBlowingForm(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── Guard hydration ──
  if (!mounted) return null;

  if (isLoading && injectionBatches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading production data…</p>
      </div>
    );
  }

  const totalPreforms = getPreformAvailable('18G') + getPreformAvailable('14G');

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Factory className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Production Management</h1>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Injection Molding <ChevronRight className="h-3 w-3" /> Blowing &amp; Packaging
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={openInjectionModal} variant="outline" className="border-sky-300 text-sky-700 hover:bg-sky-50 gap-1.5">
            <Droplets className="h-4 w-4" />
            New Injection Batch
          </Button>
          <Button onClick={openBlowingModal} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
            <Box className="h-4 w-4" />
            New Blowing Batch
          </Button>
          <Button onClick={fetchData} variant="outline" size="icon" className="shrink-0" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Preforms" value={totalPreforms.toLocaleString()} sub="In stock" icon={Package} color="bg-sky-500" />
        <StatCard label="Caps" value={`${getCapsAvailable()} ctns`} sub={`${(getCapsAvailable() * CAPS_PER_CARTON).toLocaleString()} pcs`} icon={Layers} color="bg-amber-500" />
        <StatCard label="Labels" value={getLabelsAvailable().toLocaleString()} sub="Pieces" icon={Package} color="bg-violet-500" />
        <StatCard label="Gum" value={`${getGumAvailable()} boxes`} sub="1 box = 1 pc" icon={Box} color="bg-indigo-500" />
        <StatCard label="Total Batches" value={injectionBatches.length + blowingBatches.length} sub="All time" icon={BarChart3} color="bg-orange-500" />
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="preform-inventory">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            ['preform-inventory', 'Preforms'],
            ['raw-materials', 'Raw Materials'],
            ['finished-products', 'Finished Products'],
            ['obsolete', 'Obsolete / Scrap'],
            ['injection-batches', 'Injection Batches'],
            ['blowing-batches', 'Blowing Batches'],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="text-xs">{l}</TabsTrigger>
          ))}
        </TabsList>

        {/* Preforms */}
        <TabsContent value="preform-inventory">
          <InventoryTable
            title="Preform Inventory"
            description="Preforms produced from injection molding."
            rows={products.filter(p => p.sku.includes('PREFORM'))}
            renderQty={item => item.quantity_on_hand.toLocaleString()}
          />
        </TabsContent>

        {/* Raw Materials */}
        <TabsContent value="raw-materials">
          <InventoryTable
            title="Raw Materials"
            description="Materials consumed in production."
            rows={rawMaterials.filter(r => !r.sku.includes('SCRAP'))}
            renderQty={item =>
              item.unit_of_measure === 'CARTON'
                ? `${item.quantity_on_hand.toLocaleString()} ctns (${(item.quantity_on_hand * CAPS_PER_CARTON).toLocaleString()} pcs)`
                : item.quantity_on_hand.toLocaleString()
            }
          />
        </TabsContent>

        {/* Finished Products */}
        <TabsContent value="finished-products">
          <InventoryTable
            title="Finished Products"
            description="Completed products ready for sale."
            rows={products.filter(p => !p.sku.includes('PREFORM'))}
            renderQty={item => item.quantity_on_hand.toLocaleString()}
          />
        </TabsContent>

        {/* Obsolete */}
        <TabsContent value="obsolete">
          <InventoryTable
            title="Obsolete & Scrap"
            description="Damaged items and production waste."
            rows={obsoleteItems}
            renderQty={item => item.quantity_on_hand.toLocaleString()}
            emptyText="No scrap items found"
          />
        </TabsContent>

        {/* Injection Batches */}
        <TabsContent value="injection-batches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Beaker className="h-4 w-4" /> Injection Molding Batches</CardTitle>
              <CardDescription>Preform production history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-2 px-3">Batch #</th>
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-right py-2 px-3">Resin (KG)</th>
                      <th className="text-right py-2 px-3">Bags</th>
                      <th className="text-right py-2 px-3">Good Preforms</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {injectionBatches.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No injection batches found</td></tr>
                    ) : injectionBatches.map(b => (
                      <tr key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs">{b.batch_number}</td>
                        <td className="py-2.5 px-3">{b.production_date}</td>
                        <td className="py-2.5 px-3">{b.preform_type}</td>
                        <td className="py-2.5 px-3 text-right">{b.resin_used_kg.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right">{b.bags_produced.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{b.good_preforms_qty.toLocaleString()}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={b.status} /></td>
                        <td className="py-2.5 px-3">
                          <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(b.id, 'injection')}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blowing Batches */}
        <TabsContent value="blowing-batches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap className="h-4 w-4" /> Blowing &amp; Packaging Batches</CardTitle>
              <CardDescription>Bottle production and packaging history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-2 px-3">Batch #</th>
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Product</th>
                      <th className="text-right py-2 px-3">Preforms</th>
                      <th className="text-right py-2 px-3">Pallets</th>
                      <th className="text-right py-2 px-3">Total Packs</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {blowingBatches.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No blowing batches found</td></tr>
                    ) : blowingBatches.map(b => (
                      <tr key={b.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs">{b.batch_number}</td>
                        <td className="py-2.5 px-3">{b.production_date}</td>
                        <td className="py-2.5 px-3 font-medium">{b.finished_product}</td>
                        <td className="py-2.5 px-3 text-right">{b.preforms_taken.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right">{b.finished_pallets.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">
                          {(b.finished_pallets * PALLET_PACKS + b.finished_packs).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3"><StatusBadge status={b.status} /></td>
                        <td className="py-2.5 px-3">
                          <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(b.id, 'blowing')}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Stock Error Dialog ── */}
      <Dialog open={isStockErrorDialogOpen} onOpenChange={setIsStockErrorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Insufficient Stock
            </DialogTitle>
            <DialogDescription>Cannot proceed — stock issues detected:</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stockErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg text-sm text-red-700">
                <span className="mt-0.5">•</span> {err}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsStockErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Batch Dialog ── */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewType === 'injection' ? 'Injection Batch' : 'Blowing Batch'} Details</DialogTitle>
            <DialogDescription className="font-mono">{selectedViewBatch?.batch_number}</DialogDescription>
          </DialogHeader>

          {selectedViewBatch && (
            <div className="space-y-4">
              {/* Common header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
                {[
                  ['Batch #', selectedViewBatch.batch_number],
                  ['Date', selectedViewBatch.production_date],
                  ['Shift', selectedViewBatch.shift],
                  ['Operator', selectedViewBatch.operator_name || '—'],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-muted-foreground">{l}</p>
                    <p className="font-medium mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              {viewType === 'injection' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-sky-600">Input</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      <InfoRow label="Resin Used" value={`${selectedViewBatch.resin_used_kg?.toLocaleString()} KG`} />
                      <InfoRow label="Masterbatch Used" value={`${selectedViewBatch.masterbatch_used_kg?.toLocaleString()} KG`} />
                      <InfoRow label="Total Input" value={`${(selectedViewBatch.resin_used_kg + selectedViewBatch.masterbatch_used_kg).toLocaleString()} KG`} highlight />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-600">Output</CardTitle></CardHeader>
                    <CardContent className="space-y-1">
                      <InfoRow label="Preform Type" value={selectedViewBatch.preform_type} />
                      <InfoRow label="Bags Produced" value={selectedViewBatch.bags_produced?.toLocaleString()} />
                      <InfoRow label="Good Preforms" value={`${selectedViewBatch.good_preforms_qty?.toLocaleString()} pcs`} highlight />
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Preforms', color: 'sky', rows: [
                      ['Bags Used', `${selectedViewBatch.preform_bags} bags`],
                      ['Preforms Taken', `${selectedViewBatch.preforms_taken?.toLocaleString()} pcs`],
                      ['Bottles Produced', `${selectedViewBatch.bottles_produced?.toLocaleString()} pcs`],
                      ['Damaged', `${selectedViewBatch.bottles_damaged?.toLocaleString()} pcs`],
                    ]},
                    { title: 'Filling', color: 'emerald', rows: [
                      ['Bottles Filled', `${selectedViewBatch.bottles_filled?.toLocaleString()} pcs`],
                      ['Damaged', `${selectedViewBatch.bottles_filled_damaged?.toLocaleString()} pcs`],
                    ]},
                    { title: 'Caps', color: 'amber', rows: [
                      ['Cartons Taken', `${selectedViewBatch.caps_cartons_taken?.toLocaleString()}`],
                      ['Pieces Taken', `${selectedViewBatch.caps_pieces_taken?.toLocaleString()} pcs`],
                      ['Used', `${selectedViewBatch.caps_used?.toLocaleString()} pcs`],
                      ['Good', `${selectedViewBatch.caps_good?.toLocaleString()} pcs`],
                      ['Damaged', `${selectedViewBatch.caps_damaged?.toLocaleString()} pcs`],
                      ['Left', `${selectedViewBatch.caps_left?.toLocaleString()} pcs`],
                    ]},
                    { title: 'Labels', color: 'violet', rows: [
                      ['Taken', `${selectedViewBatch.labels_taken?.toLocaleString()} pcs`],
                      ['Used', `${selectedViewBatch.labels_used?.toLocaleString()} pcs`],
                      ['Good', `${selectedViewBatch.labels_good?.toLocaleString()} pcs`],
                      ['Damaged', `${selectedViewBatch.labels_damaged?.toLocaleString()} pcs`],
                      ['Left', `${selectedViewBatch.labels_left?.toLocaleString()} pcs`],
                    ]},
                    { title: 'Gum', color: 'indigo', rows: [
                      ['Boxes Taken', `${selectedViewBatch.gum_boxes_taken}`],
                      ['Used', `${selectedViewBatch.gum_used}`],
                      ['Left', `${selectedViewBatch.gum_left}`],
                    ]},
                    { title: 'Finished Goods', color: 'orange', rows: [
                      ['Pallets (100 pks)', `${selectedViewBatch.finished_pallets}`],
                      ['Packs', `${selectedViewBatch.finished_packs}`],
                      ['Pieces', `${selectedViewBatch.finished_pieces}`],
                      ['Total Packs', `${(selectedViewBatch.finished_pallets * PALLET_PACKS + selectedViewBatch.finished_packs).toLocaleString()}`],
                    ]},
                  ].map(({ title, color, rows }) => (
                    <Card key={title}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-sm text-${color}-600`}>{title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {rows.map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter><Button onClick={() => setIsViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Injection Modal ── */}
      <Dialog open={isInjectionModalOpen} onOpenChange={setIsInjectionModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-sky-500" /> Injection Molding Production
            </DialogTitle>
            <DialogDescription>Record injection molding data to produce preforms.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Batch metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="text-xs">Batch Number</Label>
                <Input value={injectionForm.batch_number} readOnly className="font-mono text-xs mt-1 bg-muted/50" />
              </div>
              <div>
                <Label className="text-xs">Production Date</Label>
                <Input type="date" value={injectionForm.production_date} className="mt-1"
                  onChange={e => setInj('production_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Shift</Label>
                <Select value={injectionForm.shift} onValueChange={v => setInj('shift', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning (6AM–2PM)</SelectItem>
                    <SelectItem value="Afternoon">Afternoon (2PM–10PM)</SelectItem>
                    <SelectItem value="Night">Night (10PM–6AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Operator</Label>
                <Input value={injectionForm.operator_name} className="mt-1"
                  onChange={e => setInj('operator_name', e.target.value)} placeholder="Name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Input */}
              <div className="space-y-2 p-4 rounded-xl bg-sky-50 border border-sky-100">
                <SectionLabel color="text-sky-700">Input Materials</SectionLabel>
                <div>
                  <Label className="text-xs">Resin (PET) — KG</Label>
                  <Input type="number" step="0.001" className="mt-1"
                    value={injectionForm.resin_used_kg || ''}
                    onChange={e => setInj('resin_used_kg', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label className="text-xs">Masterbatch — KG</Label>
                  <Input type="number" step="0.001" className="mt-1"
                    value={injectionForm.masterbatch_used_kg || ''}
                    onChange={e => setInj('masterbatch_used_kg', parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              {/* Output */}
              <div className="space-y-2 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <SectionLabel color="text-emerald-700">Output</SectionLabel>
                <div>
                  <Label className="text-xs">Preform Type</Label>
                  <Select value={injectionForm.preform_weight_grams.toString()}
                    onValueChange={v => {
                      const w = parseInt(v);
                      setInjectionForm(prev => ({
                        ...prev,
                        preform_weight_grams: w,
                        preform_type: w === 18 ? '18g' : '14g',
                      }));
                    }}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="18">18g — 75CL / 50CL bottles</SelectItem>
                      <SelectItem value="14">14g — 33CL bottles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Bags Produced</Label>
                    <Input type="number" className="mt-1"
                      value={injectionForm.bags_produced || ''}
                      onChange={e => setInj('bags_produced', parseInt(e.target.value) || 0)} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {injectionForm.preform_weight_grams === 18 ? '1 bag = 30kg ≈ 1,667 pcs' : '1 bag = 25kg ≈ 1,786 pcs'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">Good Preforms (auto)</Label>
                    <Input readOnly className="mt-1 bg-white font-semibold text-emerald-700"
                      value={injectionForm.good_preforms_qty.toLocaleString()} />
                  </div>
                </div>
              </div>
            </div>

            {/* Waste + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-xl bg-red-50 border border-red-100">
                <SectionLabel color="text-red-700">Waste</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Bad Preforms (KG)</Label>
                    <Input type="number" step="0.001" className="mt-1"
                      value={injectionCalc.badKg || ''}
                      onChange={e => {
                        const kg = parseFloat(e.target.value) || 0;
                        setInj('bad_preforms_qty', Math.round((kg * 1000) / injectionForm.preform_weight_grams));
                      }} />
                  </div>
                  <div>
                    <Label className="text-xs">Purge Weight (KG)</Label>
                    <Input type="number" step="0.001" className="mt-1"
                      value={injectionForm.purge_weight_kg || ''}
                      onChange={e => setInj('purge_weight_kg', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <SectionLabel color="text-slate-700">Summary</SectionLabel>
                <InfoRow label="Total Input" value={`${injectionCalc.totalInputKg} KG`} />
                <InfoRow label="Total Output" value={`${injectionCalc.totalOutputKg.toFixed(2)} KG`} highlight />
                <InfoRow label="Material Efficiency" value={`${injectionCalc.efficiency}%`} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Remarks</Label>
              <Textarea className="mt-1" placeholder="Any issues or notes…"
                value={injectionForm.notes} onChange={e => setInj('notes', e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsInjectionModalOpen(false)}>Cancel</Button>
            <Button onClick={submitInjection} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Complete &amp; Add to Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Blowing Modal ── */}
      <Dialog open={isBlowingModalOpen} onOpenChange={setIsBlowingModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5 text-emerald-500" /> Blowing &amp; Packaging Production
            </DialogTitle>
            <DialogDescription>Blowing → Filling → Capping → Labelling → Packaging</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Batch metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="text-xs">Batch Number</Label>
                <Input value={blowingForm.batch_number} readOnly className="font-mono text-xs mt-1 bg-muted/50" />
              </div>
              <div>
                <Label className="text-xs">Production Date</Label>
                <Input type="date" value={blowingForm.production_date} className="mt-1"
                  onChange={e => setBlo('production_date', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Shift</Label>
                <Select value={blowingForm.shift} onValueChange={v => setBlo('shift', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning (6AM–2PM)</SelectItem>
                    <SelectItem value="Afternoon">Afternoon (2PM–10PM)</SelectItem>
                    <SelectItem value="Night">Night (10PM–6AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Operator</Label>
                <Input value={blowingForm.operator_name} className="mt-1"
                  onChange={e => setBlo('operator_name', e.target.value)} placeholder="Name" />
              </div>
            </div>

            {/* Preforms + Blowing/Filling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 space-y-3">
                <SectionLabel color="text-sky-700">Preforms Selection</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={blowingForm.preform_type}
                      onValueChange={(v: '18g' | '14g') => setBlo('preform_type', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18g">18g (30 kg/bag)</SelectItem>
                        <SelectItem value="14g">14g (25 kg/bag)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Bags to Use</Label>
                    <Input type="number" className="mt-1"
                      value={blowingForm.preform_bags || ''}
                      onChange={e => {
                        const bags = parseInt(e.target.value) || 0;
                        const pieces = calcPreformsFromBags(bags, blowingForm.preform_type);
                        setBlowingForm(prev => ({ ...prev, preform_bags: bags, preforms_taken: pieces }));
                      }} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {blowingForm.preform_type === '18g' ? '1 bag ≈ 1,667 pcs' : '1 bag ≈ 1,786 pcs'}
                    </p>
                  </div>
                </div>
                {blowingForm.preforms_taken > 0 && (
                  <div className="p-2.5 bg-sky-100 rounded-lg text-sm space-y-1">
                    <InfoRow label="Total Preforms" value={`${blowingForm.preforms_taken.toLocaleString()} pcs`} highlight />
                    <p className="text-xs text-muted-foreground">
                      Available: {getPreformAvailable(blowingForm.preform_type).toLocaleString()} pcs
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-3">
                <SectionLabel color="text-emerald-700">Blowing &amp; Filling</SectionLabel>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Bottles Produced</Label>
                    <Input type="number" className="mt-1" value={blowingForm.bottles_produced || ''}
                      onChange={e => setBlo('bottles_produced', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Damaged</Label>
                    <Input type="number" className="mt-1" value={blowingForm.bottles_damaged || ''}
                      onChange={e => setBlo('bottles_damaged', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Bottles Filled</Label>
                    <Input type="number" className="mt-1" value={blowingForm.bottles_filled || ''}
                      onChange={e => setBlo('bottles_filled', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Yield: <span className="font-semibold text-emerald-700">{blowingCalc.yieldPct}%</span></p>
              </div>
            </div>

            {/* Caps + Labels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Caps */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-3">
                <SectionLabel color="text-amber-700">Caps Management</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Cartons Taken</Label>
                    <Input type="number" className="mt-1" value={blowingForm.caps_cartons_taken || ''}
                      onChange={e => {
                        const cartons = parseInt(e.target.value) || 0;
                        setBlowingForm(prev => ({
                          ...prev,
                          caps_cartons_taken: cartons,
                          caps_pieces_taken: cartons * CAPS_PER_CARTON,
                          caps_remaining_cartons: getCapsAvailable() - cartons,
                        }));
                      }} />
                    <p className="text-xs text-muted-foreground mt-1">9,000 pcs/carton</p>
                  </div>
                  <div>
                    <Label className="text-xs">Pieces Taken (auto)</Label>
                    <Input readOnly className="mt-1 bg-white" value={blowingForm.caps_pieces_taken.toLocaleString()} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Caps Used</Label>
                    <Input type="number" className="mt-1" value={blowingForm.caps_used || ''}
                      onChange={e => {
                        const used = parseInt(e.target.value) || 0;
                        setBlowingForm(prev => ({
                          ...prev,
                          caps_used: used,
                          caps_left: prev.caps_pieces_taken - used,
                        }));
                      }} />
                  </div>
                  <div>
                    <Label className="text-xs">Caps Damaged</Label>
                    <Input type="number" className="mt-1" value={blowingForm.caps_damaged || ''}
                      onChange={e => setBlo('caps_damaged', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Good Capping (auto)</Label>
                    <Input readOnly className="mt-1 bg-white font-semibold text-emerald-700"
                      value={blowingForm.caps_good.toLocaleString()} />
                  </div>
                  <div>
                    <Label className="text-xs">Caps Left</Label>
                    <Input readOnly className="mt-1 bg-white" value={blowingForm.caps_left.toLocaleString()} />
                  </div>
                </div>
                <div className="p-2 bg-amber-100 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between"><span>Available:</span><span className="font-semibold">{getCapsAvailable()} cartons</span></div>
                  <div className="flex justify-between"><span>After taking:</span><span className="font-semibold">{blowingForm.caps_remaining_cartons || getCapsAvailable()} cartons</span></div>
                </div>
              </div>

              {/* Labels */}
              <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 space-y-3">
                <SectionLabel color="text-violet-700">Labels Management</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Pieces Taken</Label>
                    <Input type="number" className="mt-1" value={blowingForm.labels_taken || ''}
                      onChange={e => setBlo('labels_taken', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Labels Used</Label>
                    <Input type="number" className="mt-1" value={blowingForm.labels_used || ''}
                      onChange={e => {
                        const used = parseInt(e.target.value) || 0;
                        setBlowingForm(prev => ({
                          ...prev,
                          labels_used: used,
                          labels_left: prev.labels_taken - used,
                        }));
                      }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Labels Damaged</Label>
                    <Input type="number" className="mt-1" value={blowingForm.labels_damaged || ''}
                      onChange={e => setBlo('labels_damaged', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Good Labels (auto)</Label>
                    <Input readOnly className="mt-1 bg-white font-semibold text-emerald-700"
                      value={blowingForm.labels_good.toLocaleString()} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Labels Left</Label>
                    <Input readOnly className="mt-1 bg-white" value={blowingForm.labels_left.toLocaleString()} />
                  </div>
                </div>
                <div className="p-2 bg-violet-100 rounded-lg text-xs">
                  <div className="flex justify-between"><span>Available:</span><span className="font-semibold">{getLabelsAvailable().toLocaleString()} pcs</span></div>
                </div>
              </div>
            </div>

            {/* Gum + Shrink Wrap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-3">
                <SectionLabel color="text-indigo-700">Gum / Glue (1 box = 1 piece)</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Boxes Taken</Label>
                    <Input type="number" className="mt-1" value={blowingForm.gum_boxes_taken || ''}
                      onChange={e => setBlo('gum_boxes_taken', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Gum Used</Label>
                    <Input type="number" className="mt-1" value={blowingForm.gum_used || ''}
                      onChange={e => {
                        const used = parseInt(e.target.value) || 0;
                        setBlowingForm(prev => ({ ...prev, gum_used: used, gum_left: prev.gum_boxes_taken - used }));
                      }} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Gum Left</Label>
                  <Input readOnly className="mt-1 bg-white" value={blowingForm.gum_left} />
                </div>
                <div className="p-2 bg-indigo-100 rounded-lg text-xs">
                  <div className="flex justify-between"><span>Available:</span><span className="font-semibold">{getGumAvailable()} boxes</span></div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-pink-50 border border-pink-100 space-y-3">
                <SectionLabel color="text-pink-700">Shrink Wrap</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Roll Type</Label>
                    <Select value={blowingForm.shrink_wrap_type}
                      onValueChange={(v: '60' | '70') => setBlo('shrink_wrap_type', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">60 KG Roll</SelectItem>
                        <SelectItem value="70">70 KG Roll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Quantity (KG)</Label>
                    <Input type="number" step="0.1" className="mt-1" value={blowingForm.shrink_wrap_used_kg || ''}
                      onChange={e => setBlo('shrink_wrap_used_kg', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Finished Goods + Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 space-y-3">
                <SectionLabel color="text-orange-700">Finished Goods</SectionLabel>
                <div>
                  <Label className="text-xs">Product Type</Label>
                  <Select value={blowingForm.finished_product}
                    onValueChange={(v: '75cl' | '50cl' | '33cl') => setBlo('finished_product', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="75cl">75cl (12-pack)</SelectItem>
                      <SelectItem value="50cl">50cl (12-pack)</SelectItem>
                      <SelectItem value="33cl">33cl (20-pack)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Pallets</Label>
                    <p className="text-[10px] text-muted-foreground">100 packs each</p>
                    <Input type="number" className="mt-1" value={blowingForm.finished_pallets || ''}
                      onChange={e => setBlo('finished_pallets', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Packs</Label>
                    <p className="text-[10px] text-muted-foreground">{PACKS_PER_PRODUCT[blowingForm.finished_product]} pcs each</p>
                    <Input type="number" className="mt-1" value={blowingForm.finished_packs || ''}
                      onChange={e => setBlo('finished_packs', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">Pieces</Label>
                    <p className="text-[10px] text-muted-foreground">Loose</p>
                    <Input type="number" className="mt-1" value={blowingForm.finished_pieces || ''}
                      onChange={e => setBlo('finished_pieces', parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Damaged Pieces</Label>
                  <Input type="number" className="mt-1" value={blowingForm.damaged_pieces || ''}
                    onChange={e => setBlo('damaged_pieces', parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 space-y-2">
                <SectionLabel color="text-teal-700">Production Summary</SectionLabel>
                <InfoRow label="Preforms Used" value={`${blowingForm.preforms_taken.toLocaleString()} pcs`} />
                <InfoRow label="Bottles Produced" value={`${blowingForm.bottles_produced.toLocaleString()} pcs`} />
                <InfoRow label="Bottles Filled" value={`${blowingForm.bottles_filled.toLocaleString()} pcs`} />
                <InfoRow label="Caps Used" value={`${blowingForm.caps_used.toLocaleString()} pcs`} />
                <InfoRow label="Good Capping" value={`${blowingForm.caps_good.toLocaleString()} pcs`} highlight />
                <div className="border-t pt-2 mt-2 space-y-1">
                  <InfoRow label="Total Packs" value={`${blowingCalc.totalPacks.toLocaleString()} packs`} highlight />
                  <InfoRow label="Total Pieces" value={`${blowingCalc.totalPieces.toLocaleString()} pcs`} highlight />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Remarks</Label>
              <Textarea className="mt-1" placeholder="Any issues or notes…"
                value={blowingForm.notes} onChange={e => setBlo('notes', e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsBlowingModalOpen(false)}>Cancel</Button>
            <Button onClick={submitBlowing} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Complete Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Generic Inventory Table ──────────────────────────────────────────────────
const InventoryTable = ({
  title, description, rows, renderQty, emptyText = 'No items found',
}: {
  title: string;
  description: string;
  rows: (RawMaterial | Product)[];
  renderQty: (item: any) => string;
  emptyText?: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left py-2 px-3">SKU</th>
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">UOM</th>
              <th className="text-right py-2 px-3">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">{emptyText}</td></tr>
            ) : rows.map((item) => (
              <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{item.sku}</td>
                <td className="py-2.5 px-3 font-medium">{item.name}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{item.unit_of_measure}</td>
                <td className="py-2.5 px-3 text-right font-semibold">{renderQty(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

export default ProductionModule;
