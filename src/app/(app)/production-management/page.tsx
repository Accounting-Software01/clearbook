'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Droplets,
  Box,
  RefreshCw
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const API_BASE_URL = 'https://hariindustries.net/api/clearbook';

interface RawMaterial {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  average_unit_cost: number;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  average_unit_cost: number;
}

interface InjectionBatch {
  id?: number;
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

interface BlowingBatch {
  id?: number;
  batch_number: string;
  production_date: string;
  shift: string;
  operator_name: string;
  status: 'draft' | 'wip' | 'completed' | 'cancelled';
  stage: 'blowing' | 'packaging' | 'completed';
  notes: string;
  preform_type: '18g' | '14g';
  preform_bags: number;
  preforms_taken: number;
  bottles_good: number;
  bottles_damaged: number;
  bottles_produced: number;
  bottles_filled: number;
  caps_cartons_taken: number;
  caps_pieces_taken: number;
  caps_good: number;
  caps_damaged: number;
  caps_used: number;
  caps_left: number;
  caps_remaining_cartons: number;
  labels_taken: number;
  labels_good: number;
  labels_damaged: number;
  labels_used: number;
  labels_left: number;
  gum_boxes_taken: number;
  gum_good: number;
  gum_damaged: number;
  gum_used: number;
  gum_left: number;
  shrink_wrap_type: '60' | '70';
  shrink_wrap_taken: number;
  shrink_wrap_good: number;
  shrink_wrap_damaged: number;
  shrink_wrap_used_kg: number;
  shrink_wrap_left: number;
  finished_product: '75cl' | '50cl' | '33cl';
  finished_pallets: number;
  finished_packs: number;
  finished_pieces: number;
  damaged_pieces: number;
}

const ProductionModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [isStockErrorDialogOpen, setIsStockErrorDialogOpen] = useState(false);

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [injectionBatches, setInjectionBatches] = useState<InjectionBatch[]>([]);
  const [blowingBatches, setBlowingBatches] = useState<BlowingBatch[]>([]);

  const [isInjectionModalOpen, setIsInjectionModalOpen] = useState(false);
  const [isBlowingModalOpen, setIsBlowingModalOpen] = useState(false);

  const [selectedViewBatch, setSelectedViewBatch] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewType, setViewType] = useState<'injection' | 'blowing'>('injection');

  const CAPS_PER_CARTON = 9000;
  const PALLET_PACKS = 100;
  const getPacksPerProduct = (product: string) => product === '33cl' ? 20 : 12;

  const [injectionBatch, setInjectionBatch] = useState<InjectionBatch>({
    batch_number: '',
    production_date: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    operator_name: '',
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
  const [badPreformsKgInput, setBadPreformsKgInput] = useState<string>('0');

  const [blowingBatch, setBlowingBatch] = useState<BlowingBatch>({
    batch_number: '',
    production_date: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    operator_name: '',
    status: 'draft',
    stage: 'blowing',
    notes: '',
    preform_type: '18g',
    preform_bags: 0,
    preforms_taken: 0,
    bottles_good: 0,
    bottles_damaged: 0,
    bottles_produced: 0,
    bottles_filled: 0,
    caps_cartons_taken: 0,
    caps_pieces_taken: 0,
    caps_good: 0,
    caps_damaged: 0,
    caps_used: 0,
    caps_left: 0,
    caps_remaining_cartons: 0,
    labels_taken: 0,
    labels_good: 0,
    labels_damaged: 0,
    labels_used: 0,
    labels_left: 0,
    gum_boxes_taken: 0,
    gum_good: 0,
    gum_damaged: 0,
    gum_used: 0,
    gum_left: 0,
    shrink_wrap_type: '70',
    shrink_wrap_taken: 0,
    shrink_wrap_good: 0,
    shrink_wrap_damaged: 0,
    shrink_wrap_used_kg: 0,
    shrink_wrap_left: 0,
    finished_product: '75cl',
    finished_pallets: 0,
    finished_packs: 0,
    finished_pieces: 0,
    damaged_pieces: 0,
  });

  const generateInjectionBatchNumber = (productionDate: string) => {
    const date = productionDate.replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INJ-${date}-${random}`;
  };

  const generateBlowingBatchNumber = (productionDate: string) => {
    const date = productionDate.replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BP-${date}-${random}`;
  };

  const apiCall = async (endpoint: string, method: string = 'GET', data?: any) => {
    try {
      let url = `${API_BASE_URL}/production.php?action=${endpoint}`;
      if (method === 'GET') {
        url = `${url}&company_id=${user?.company_id}`;
        if (data?.batch_id) url = `${url}&batch_id=${data.batch_id}`;
        if (data?.type) url = `${url}&type=${data.type}`;
      }
      const requestOptions: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (method === 'POST' && data) {
        requestOptions.body = JSON.stringify({
          ...data,
          company_id: user?.company_id,
          user_id: user?.uid,
        });
      }
      const response = await fetch(url, requestOptions);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error: any) {
      console.error('API Error:', error);
      return { success: false, message: error.message, data: [] };
    }
  };

  const fetchData = useCallback(async () => {
    if (!user?.company_id) return;
    setIsLoading(true);
    try {
      const [rawRes, productsRes, injectionRes, blowingRes] = await Promise.all([
        apiCall('inventory&type=raw', 'GET', { type: 'raw' }),
        apiCall('inventory&type=products', 'GET', { type: 'products' }),
        apiCall('batches&type=injection', 'GET', { type: 'injection' }),
        apiCall('batches&type=blowing', 'GET', { type: 'blowing' }),
      ]);
      if (rawRes.success && rawRes.data) setRawMaterials(rawRes.data);
      if (productsRes.success && productsRes.data) setProducts(productsRes.data);
      if (injectionRes.success && injectionRes.data) setInjectionBatches(injectionRes.data);
      if (blowingRes.success && blowingRes.data) setBlowingBatches(blowingRes.data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (user?.company_id) fetchData();
  }, [fetchData, user?.company_id]);

  // Injection calculations
  const injectionTotalInputKg = injectionBatch.resin_used_kg + injectionBatch.masterbatch_used_kg;
  const injectionTotalOutputKg = (injectionBatch.good_preforms_qty * injectionBatch.preform_weight_grams) / 1000;
  const injectionEfficiency = injectionTotalInputKg > 0
    ? ((injectionTotalOutputKg / injectionTotalInputKg) * 100).toFixed(1)
    : 0;

  const calculateGoodPreforms = () => {
    if (injectionBatch.bags_produced > 0 && injectionBatch.preform_weight_grams > 0) {
      const kgPerBag = injectionBatch.preform_weight_grams === 18 ? 30 : 25;
      const totalKg = injectionBatch.bags_produced * kgPerBag;
      const pieces = (totalKg * 1000) / injectionBatch.preform_weight_grams;
      setInjectionBatch(prev => ({ ...prev, good_preforms_qty: Math.round(pieces) }));
    }
  };

  // Only sync badPreformsKgInput when preform TYPE changes (weight per piece changes)
  // Do NOT sync when bad_preforms_qty changes — that would fight the user's typing
  useEffect(() => {
    const kgValue = (injectionBatch.bad_preforms_qty * injectionBatch.preform_weight_grams) / 1000;
    setBadPreformsKgInput(kgValue.toFixed(3));
  }, [injectionBatch.preform_weight_grams]); // only on type change, NOT bad_preforms_qty

  const calculateTotalFinishedPieces = () => {
    const packsPerProduct = getPacksPerProduct(blowingBatch.finished_product);
    return (blowingBatch.finished_pallets * PALLET_PACKS * packsPerProduct)
      + (blowingBatch.finished_packs * packsPerProduct)
      + blowingBatch.finished_pieces;
  };

  useEffect(() => {
    if (injectionBatch.production_date && injectionBatch.status === 'draft' && !injectionBatch.batch_number) {
      setInjectionBatch(prev => ({ ...prev, batch_number: generateInjectionBatchNumber(prev.production_date) }));
    }
  }, [injectionBatch.production_date, injectionBatch.status]);

  useEffect(() => {
    if (blowingBatch.production_date && blowingBatch.status === 'draft' && !blowingBatch.batch_number) {
      setBlowingBatch(prev => ({ ...prev, batch_number: generateBlowingBatchNumber(prev.production_date) }));
    }
  }, [blowingBatch.production_date, blowingBatch.status]);

  useEffect(() => {
    calculateGoodPreforms();
  }, [injectionBatch.bags_produced, injectionBatch.preform_weight_grams]);

  const viewBatchDetails = async (batchId: number, type: 'injection' | 'blowing') => {
    setIsLoading(true);
    try {
      const response = await apiCall(`batches&type=${type}&batch_id=${batchId}`, 'GET', { batch_id: batchId, type });
      if (response.success && response.data && response.data.length > 0) {
        setSelectedViewBatch(response.data[0]);
        setViewType(type);
        setIsViewDialogOpen(true);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const startNewInjectionBatch = () => {
    const selectedDate = new Date().toISOString().split('T')[0];
    setInjectionBatch({
      batch_number: generateInjectionBatchNumber(selectedDate),
      production_date: selectedDate,
      shift: 'Morning',
      operator_name: user?.full_name || '',
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
    setBadPreformsKgInput('0');
    setIsInjectionModalOpen(true);
  };

  const startNewBlowingBatch = () => {
    const selectedDate = new Date().toISOString().split('T')[0];
    setBlowingBatch({
      batch_number: generateBlowingBatchNumber(selectedDate),
      production_date: selectedDate,
      shift: 'Morning',
      operator_name: user?.full_name || '',
      status: 'draft',
      stage: 'blowing',
      notes: '',
      preform_type: '18g',
      preform_bags: 0,
      preforms_taken: 0,
      bottles_good: 0,
      bottles_damaged: 0,
      bottles_produced: 0,
      bottles_filled: 0,
      caps_cartons_taken: 0,
      caps_pieces_taken: 0,
      caps_good: 0,
      caps_damaged: 0,
      caps_used: 0,
      caps_left: 0,
      caps_remaining_cartons: 0,
      labels_taken: 0,
      labels_good: 0,
      labels_damaged: 0,
      labels_used: 0,
      labels_left: 0,
      gum_boxes_taken: 0,
      gum_good: 0,
      gum_damaged: 0,
      gum_used: 0,
      gum_left: 0,
      shrink_wrap_type: '70',
      shrink_wrap_taken: 0,
      shrink_wrap_good: 0,
      shrink_wrap_damaged: 0,
      shrink_wrap_used_kg: 0,
      shrink_wrap_left: 0,
      finished_product: '75cl',
      finished_pallets: 0,
      finished_packs: 0,
      finished_pieces: 0,
      damaged_pieces: 0,
    });
    setIsBlowingModalOpen(true);
  };

  const completeInjectionProduction = async () => {
    if (injectionBatch.resin_used_kg === 0 && injectionBatch.masterbatch_used_kg === 0) {
      toast({ title: 'Validation Error', description: 'Please enter resin or masterbatch amount', variant: 'destructive' });
      return;
    }
    if (injectionBatch.bags_produced === 0) {
      toast({ title: 'Validation Error', description: 'Please enter bags produced', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiCall('injection', 'POST', injectionBatch);
      if (response.success) {
        toast({ title: 'Success', description: response.message });
        setIsInjectionModalOpen(false);
        await fetchData();
      } else {
        if (response.stock_issue) {
          setStockErrors(response.errors || [response.message]);
          setIsStockErrorDialogOpen(true);
        } else {
          throw new Error(response.message || 'Failed to process injection');
        }
      }
    } catch (error: any) {
      toast({ title: 'Process Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const processBlowingStage = async () => {
    if (blowingBatch.preforms_taken === 0) {
      toast({ title: 'Validation Error', description: 'Please enter preforms taken (bags)', variant: 'destructive' });
      return;
    }
    const totalFinishedPieces = calculateTotalFinishedPieces();
    if (totalFinishedPieces === 0) {
      toast({ title: 'Validation Error', description: 'Please enter finished goods (pallets, packs, or pieces)', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await apiCall('blowing', 'POST', blowingBatch);
      if (response.success) {
        toast({ title: 'Success', description: response.message });
        setIsBlowingModalOpen(false);
        await fetchData();
      } else {
        if (response.stock_issue) {
          setStockErrors(response.errors || [response.message]);
          setIsStockErrorDialogOpen(true);
        } else {
          throw new Error(response.message || 'Failed to process blowing');
        }
      }
    } catch (error: any) {
      toast({ title: 'Process Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':     return <Badge variant="outline" className="bg-gray-100 text-gray-600">Draft</Badge>;
      case 'wip':       return <Badge className="bg-blue-500">WIP</Badge>;
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'cancelled': return <Badge className="bg-red-500">Cancelled</Badge>;
      default:          return <Badge>{status}</Badge>;
    }
  };

  const getPreformAvailable = (type: string) => {
    const sku = type === '18g' ? '1' : '2';
    const preform = rawMaterials.find(r => r.sku === sku);
    return preform?.quantity_on_hand || 0;
  };

  const getCapsAvailable = () => rawMaterials.find(r => r.sku === '4')?.quantity_on_hand || 0;
  const getLabelsAvailable = (product: string) => {
    const sku = product === '75cl' ? '5' : product === '50cl' ? '6' : '7';
    return rawMaterials.find(r => r.sku === sku)?.quantity_on_hand || 0;
  };
  const getGumAvailable = () => rawMaterials.find(r => r.sku === '10')?.quantity_on_hand || 0;
  const getShrinkAvailable = (type: string) => {
    const sku = type === '60' ? '9' : '8';
    return rawMaterials.find(r => r.sku === sku)?.quantity_on_hand || 0;
  };

  const handleNumberChange = (setter: Function, field: string, value: string) => {
    const numValue = parseFloat(value);
    const finalValue = isNaN(numValue) ? 0 : Math.max(0, numValue);
    setter((prev: any) => ({ ...prev, [field]: finalValue }));
  };

  // Derived blowing totals
  const totalPreformsUsed = (blowingBatch.bottles_filled || 0) + (blowingBatch.bottles_damaged || 0);
  const preformsRemaining = blowingBatch.preforms_taken - totalPreformsUsed;
  const blowingYield = blowingBatch.preforms_taken > 0
    ? ((blowingBatch.bottles_filled || 0) / blowingBatch.preforms_taken * 100).toFixed(1)
    : '0.0';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Management</h1>
          <p className="text-muted-foreground">Injection Molding → Blowing & Packaging</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={startNewInjectionBatch} variant="outline" className="border-blue-500 text-blue-600">
            <Droplets className="mr-2 h-4 w-4" />
            New Injection Batch
          </Button>
          <Button onClick={startNewBlowingBatch} className="bg-green-600">
            <Box className="mr-2 h-4 w-4" />
            New Blowing Batch
          </Button>
          <Button onClick={fetchData} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="raw-materials">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-4">
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-products">Finished Products</TabsTrigger>
          <TabsTrigger value="injection-batches">Injection</TabsTrigger>
          <TabsTrigger value="blowing-batches">Blowing</TabsTrigger>
        </TabsList>

        {/* Raw Materials Tab */}
        <TabsContent value="raw-materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Materials Inventory</CardTitle>
              <CardDescription>Materials used in production.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">UOM</th>
                      <th className="text-right p-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.filter(r => !r.sku.includes('SCRAP')).map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className="p-2 text-right">
                          {item.unit_of_measure === 'CARTON'
                            ? `${item.quantity_on_hand.toLocaleString()} cartons (${(item.quantity_on_hand * CAPS_PER_CARTON).toLocaleString()} pcs)`
                            : item.quantity_on_hand.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finished Products Tab */}
        <TabsContent value="finished-products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Finished Products Inventory</CardTitle>
              <CardDescription>Completed products ready for sale.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">UOM</th>
                      <th className="text-right p-2">Quantity (Packs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className="p-2 text-right">{item.quantity_on_hand.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Injection Batches Tab */}
        <TabsContent value="injection-batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Injection Molding Batches</CardTitle>
              <CardDescription>Preform production batches.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Batch #</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Preform</th>
                      <th className="text-right p-2">Resin (KG)</th>
                      <th className="text-right p-2">Bags</th>
                      <th className="text-right p-2">Preforms</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {injectionBatches.map((batch) => (
                      <tr key={batch.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{batch.batch_number}</td>
                        <td className="p-2">{batch.production_date}</td>
                        <td className="p-2">{batch.preform_type}</td>
                        <td className="p-2 text-right">{batch.resin_used_kg.toLocaleString()}</td>
                        <td className="p-2 text-right">{batch.bags_produced.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold text-green-600">{batch.good_preforms_qty.toLocaleString()}</td>
                        <td className="p-2">{getStatusBadge(batch.status)}</td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(batch.id!, 'injection')}>
                            <Eye className="h-4 w-4" />
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

        {/* Blowing Batches Tab */}
        <TabsContent value="blowing-batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blowing & Packaging Batches</CardTitle>
              <CardDescription>Bottle production and packaging batches.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Batch #</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Product</th>
                      <th className="text-right p-2">Preforms</th>
                      <th className="text-right p-2">Pallets</th>
                      <th className="text-right p-2">Packs</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blowingBatches.map((batch) => (
                      <tr key={batch.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{batch.batch_number}</td>
                        <td className="p-2">{batch.production_date}</td>
                        <td className="p-2">{batch.finished_product}</td>
                        <td className="p-2 text-right">{batch.preforms_taken.toLocaleString()}</td>
                        <td className="p-2 text-right">{batch.finished_pallets.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold text-green-600">
                          {((batch.finished_pallets * PALLET_PACKS) + batch.finished_packs).toLocaleString()}
                        </td>
                        <td className="p-2">{getStatusBadge(batch.status)}</td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(batch.id!, 'blowing')}>
                            <Eye className="h-4 w-4" />
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

      {/* Stock Error Dialog */}
      <Dialog open={isStockErrorDialogOpen} onOpenChange={setIsStockErrorDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Insufficient Stock
            </DialogTitle>
            <DialogDescription>Cannot proceed due to insufficient stock:</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stockErrors.map((error, index) => (
              <div key={index} className="p-2 bg-red-50 rounded-lg text-sm text-red-700">• {error}</div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsStockErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Batch Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewType === 'injection' ? 'Injection Batch Details' : 'Blowing Batch Details'}</DialogTitle>
            <DialogDescription>Batch #{selectedViewBatch?.batch_number}</DialogDescription>
          </DialogHeader>

          {selectedViewBatch && viewType === 'injection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div><Label>Batch Number</Label><p className="font-mono text-sm">{selectedViewBatch.batch_number}</p></div>
                <div><Label>Production Date</Label><p>{selectedViewBatch.production_date}</p></div>
                <div><Label>Shift</Label><p>{selectedViewBatch.shift}</p></div>
                <div><Label>Operator</Label><p>{selectedViewBatch.operator_name || '-'}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">INPUT</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Resin Used:</span><span className="font-semibold">{selectedViewBatch.resin_used_kg?.toLocaleString()} KG</span></div>
                      <div className="flex justify-between"><span>Masterbatch Used:</span><span className="font-semibold">{selectedViewBatch.masterbatch_used_kg?.toLocaleString()} KG</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Total Input:</span><span className="font-bold">{(selectedViewBatch.resin_used_kg + selectedViewBatch.masterbatch_used_kg).toLocaleString()} KG</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">OUTPUT</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Preform Type:</span><span className="font-semibold">{selectedViewBatch.preform_type}</span></div>
                      <div className="flex justify-between"><span>Bags Produced:</span><span className="font-semibold">{selectedViewBatch.bags_produced?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Good Preforms:</span><span className="font-semibold text-green-600">{selectedViewBatch.good_preforms_qty?.toLocaleString()} pcs</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {selectedViewBatch && viewType === 'blowing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div><Label>Batch Number</Label><p className="font-mono text-sm">{selectedViewBatch.batch_number}</p></div>
                <div><Label>Production Date</Label><p>{selectedViewBatch.production_date}</p></div>
                <div><Label>Shift</Label><p>{selectedViewBatch.shift}</p></div>
                <div><Label>Operator</Label><p>{selectedViewBatch.operator_name || '-'}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">PREFORMS</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Bags Used:</span><span className="font-semibold">{selectedViewBatch.preform_bags} bags</span></div>
                      <div className="flex justify-between"><span>Preforms Taken:</span><span className="font-semibold">{selectedViewBatch.preforms_taken?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Bottles Blown:</span><span className="font-semibold">{selectedViewBatch.bottles_produced?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Bottles Filled:</span><span className="font-semibold text-green-600">{selectedViewBatch.bottles_filled?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Waste Bottles:</span><span className="font-semibold text-red-600">{selectedViewBatch.bottles_damaged?.toLocaleString()} pcs</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">CAPS</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Cartons Taken:</span><span className="font-semibold">{selectedViewBatch.caps_cartons_taken?.toLocaleString()} cartons</span></div>
                      <div className="flex justify-between"><span>Good Caps:</span><span className="font-semibold text-green-600">{selectedViewBatch.caps_good?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Waste Caps:</span><span className="font-semibold text-red-600">{selectedViewBatch.caps_damaged?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Caps Left:</span><span className="font-semibold">{selectedViewBatch.caps_left?.toLocaleString()} pcs</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-600">LABELS & GUM</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Labels Taken:</span><span className="font-semibold">{selectedViewBatch.labels_taken?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Good Labels:</span><span className="font-semibold text-green-600">{selectedViewBatch.labels_good?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Waste Labels:</span><span className="font-semibold text-red-600">{selectedViewBatch.labels_damaged?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between border-t pt-1 mt-1"><span>Gum Used:</span><span className="font-semibold">{selectedViewBatch.gum_used} boxes</span></div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600">FINISHED GOODS</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Product:</span><span className="font-semibold">{selectedViewBatch.finished_product}</span></div>
                      <div className="flex justify-between"><span>Pallets:</span><span className="font-semibold">{selectedViewBatch.finished_pallets}</span></div>
                      <div className="flex justify-between"><span>Packs:</span><span className="font-semibold">{selectedViewBatch.finished_packs}</span></div>
                      <div className="flex justify-between"><span>Pieces:</span><span className="font-semibold">{selectedViewBatch.finished_pieces}</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2">
                        <span>Total Packs:</span>
                        <span className="font-bold text-green-600">
                          {((selectedViewBatch.finished_pallets * PALLET_PACKS) + selectedViewBatch.finished_packs).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== INJECTION MODAL ==================== */}
      <Dialog open={isInjectionModalOpen} onOpenChange={setIsInjectionModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Injection Molding Production</DialogTitle>
            <DialogDescription>Record injection molding data to produce preforms.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div><Label>Batch Number</Label><Input value={injectionBatch.batch_number} readOnly className="font-mono text-sm bg-gray-100" /></div>
            <div>
              <Label>Production Date</Label>
              <Input type="date" value={injectionBatch.production_date}
                onChange={e => setInjectionBatch({ ...injectionBatch, production_date: e.target.value })} />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={injectionBatch.shift} onValueChange={val => setInjectionBatch({ ...injectionBatch, shift: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operator Name</Label>
              <Input placeholder="Enter operator name" value={injectionBatch.operator_name}
                onChange={e => setInjectionBatch({ ...injectionBatch, operator_name: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* INPUT */}
              <div className="space-y-2">
                <Label className="text-blue-600 font-semibold">INPUT</Label>
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div>
                    <Label>Resin (PET Material) - KG</Label>
                    <Input type="number" min="0" step="0.001" placeholder="KG"
                      value={injectionBatch.resin_used_kg}
                      onChange={e => handleNumberChange(setInjectionBatch, 'resin_used_kg', e.target.value)} />
                  </div>
                  <div>
                    <Label>Masterbatch - KG</Label>
                    <Input type="number" min="0" step="0.001" placeholder="KG"
                      value={injectionBatch.masterbatch_used_kg}
                      onChange={e => handleNumberChange(setInjectionBatch, 'masterbatch_used_kg', e.target.value)} />
                  </div>
                </div>
              </div>
              {/* OUTPUT */}
              <div className="space-y-2">
                <Label className="text-green-600 font-semibold">OUTPUT</Label>
                <div className="p-3 bg-green-50 rounded-lg space-y-2">
                  <div>
                    <Label>Preform Type</Label>
                    <Select value={injectionBatch.preform_weight_grams.toString()}
                      onValueChange={val => {
                        const weight = parseInt(val);
                        setInjectionBatch({ ...injectionBatch, preform_weight_grams: weight, preform_type: weight === 18 ? '18g' : '14g' });
                      }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18">18g Preform</SelectItem>
                        <SelectItem value="14">14g Preform</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Bags Produced</Label>
                      <Input type="number" min="0" value={injectionBatch.bags_produced}
                        onChange={e => handleNumberChange(setInjectionBatch, 'bags_produced', e.target.value)} />
                    </div>
                    <div>
                      <Label>Good Preforms (Auto)</Label>
                      <Input type="number" value={injectionBatch.good_preforms_qty} readOnly className="bg-gray-100 font-semibold text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WASTE */}
              <div className="space-y-2">
                <Label className="text-red-600 font-semibold">WASTE</Label>
                <div className="p-3 bg-red-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Bad Preforms (KG)</Label>
                      <Input type="number" min="0" step="0.001" placeholder="0.000"
                        value={badPreformsKgInput}
                        onChange={e => {
                          const kgValue = parseFloat(e.target.value) || 0;
                          setBadPreformsKgInput(e.target.value);
                          const pieces = Math.round((kgValue * 1000) / injectionBatch.preform_weight_grams);
                          setInjectionBatch({ ...injectionBatch, bad_preforms_qty: pieces });
                        }} />
                    </div>
                    <div>
                      <Label>Purge Weight (KG)</Label>
                      <Input type="number" min="0" step="0.001" placeholder="0.000"
                        value={injectionBatch.purge_weight_kg}
                        onChange={e => setInjectionBatch({ ...injectionBatch, purge_weight_kg: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                </div>
              </div>
              {/* SUMMARY */}
              <div className="space-y-2">
                <Label className="text-purple-600 font-semibold">PRODUCTION SUMMARY</Label>
                <div className="p-3 bg-purple-50 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between"><span>Total Input:</span><span className="font-semibold">{injectionTotalInputKg} KG</span></div>
                  <div className="flex justify-between"><span>Total Output:</span><span className="font-semibold text-green-600">{injectionTotalOutputKg.toFixed(2)} KG</span></div>
                  <div className="flex justify-between"><span>Efficiency:</span><span className="font-semibold">{injectionEfficiency}%</span></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>REMARKS</Label>
              <Textarea placeholder="Any issues or notes..."
                value={injectionBatch.notes}
                onChange={e => setInjectionBatch({ ...injectionBatch, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInjectionModalOpen(false)}>Cancel</Button>
            <Button onClick={completeInjectionProduction} disabled={isSubmitting} className="bg-green-600">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Complete Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== BLOWING MODAL ==================== */}
      <Dialog open={isBlowingModalOpen} onOpenChange={setIsBlowingModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Blowing & Packaging Production</DialogTitle>
            <DialogDescription>Blowing → Filling → Capping → Packaging</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div><Label>Batch Number</Label><Input value={blowingBatch.batch_number} readOnly className="font-mono text-sm bg-gray-100" /></div>
            <div>
              <Label>Production Date</Label>
              <Input type="date" value={blowingBatch.production_date}
                onChange={e => setBlowingBatch({ ...blowingBatch, production_date: e.target.value })} />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={blowingBatch.shift} onValueChange={val => setBlowingBatch({ ...blowingBatch, shift: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operator Name</Label>
              <Input placeholder="Enter operator name" value={blowingBatch.operator_name}
                onChange={e => setBlowingBatch({ ...blowingBatch, operator_name: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4">

            {/* PREFORMS + BLOWING & FILLING */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preforms */}
              <div className="space-y-2">
                <Label className="text-blue-600 font-semibold">PREFORMS SELECTION</Label>
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Preform Type</Label>
                      <Select value={blowingBatch.preform_type}
                        onValueChange={(val: any) => setBlowingBatch({ ...blowingBatch, preform_type: val, preform_bags: 0, preforms_taken: 0 })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18g">18g (30kg/bag)</SelectItem>
                          <SelectItem value="14g">14g (25kg/bag)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bags Taken</Label>
                      <Input type="number" min="0" value={blowingBatch.preform_bags || 0}
                        onChange={e => {
                          const bags = Math.max(0, parseInt(e.target.value) || 0);
                          const kgPerBag = blowingBatch.preform_type === '18g' ? 30 : 25;
                          const pieces = Math.round((bags * kgPerBag * 1000) / (blowingBatch.preform_type === '18g' ? 18 : 14));
                          setBlowingBatch({ ...blowingBatch, preform_bags: bags, preforms_taken: pieces });
                        }} />
                    </div>
                  </div>
                  <div className="p-2 bg-blue-100 rounded text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Preforms Taken:</span>
                      <span className="font-bold">{blowingBatch.preforms_taken.toLocaleString()} pcs</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Available in stock:</span>
                      <span>{getPreformAvailable(blowingBatch.preform_type).toLocaleString()} KG</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blowing & Filling */}
              <div className="space-y-2">
                <Label className="text-green-600 font-semibold">BLOWING & FILLING</Label>
                <div className="p-3 bg-green-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Bottles Blown</Label>
                      <Input type="number" min="0"
                        value={blowingBatch.bottles_good || 0}
                        onChange={e => {
                          const good = Math.max(0, parseInt(e.target.value) || 0);
                          setBlowingBatch({
                            ...blowingBatch,
                            bottles_good: good,
                            bottles_produced: good + (blowingBatch.bottles_damaged || 0),
                          });
                        }} />
                    </div>
                    <div>
                      <Label>Bottles Filled</Label>
                      <Input type="number" min="0"
                        value={blowingBatch.bottles_filled || 0}
                        onChange={e => handleNumberChange(setBlowingBatch, 'bottles_filled', e.target.value)} />
                    </div>
                    <div>
                      <Label>Waste Bottles</Label>
                      <Input type="number" min="0"
                        value={blowingBatch.bottles_damaged || 0}
                        onChange={e => {
                          const waste = Math.max(0, parseInt(e.target.value) || 0);
                          setBlowingBatch({
                            ...blowingBatch,
                            bottles_damaged: waste,
                            bottles_produced: (blowingBatch.bottles_good || 0) + waste,
                          });
                        }} />
                    </div>
                  </div>
                  {/* Preform usage summary */}
                  <div className="p-2 bg-green-100 rounded text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Total Preforms Used:</span>
                      <span className="font-bold">{totalPreformsUsed.toLocaleString()} pcs</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preforms Taken:</span>
                      <span className="font-semibold">{blowingBatch.preforms_taken.toLocaleString()} pcs</span>
                    </div>
                    <div className={`flex justify-between border-t pt-1 mt-1 font-semibold ${preformsRemaining > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                      <span>Remaining / Unaccounted:</span>
                      <span>{preformsRemaining.toLocaleString()} pcs</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Yield (Filled / Taken):</span>
                      <span className="font-semibold text-green-700">{blowingYield}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CAPS + LABELS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Caps */}
              <div className="space-y-2">
                <Label className="text-yellow-600 font-semibold">CAPS MANAGEMENT</Label>
                <div className="p-3 bg-yellow-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Cartons Taken</Label>
                      <Input type="number" min="0" value={blowingBatch.caps_cartons_taken || 0}
                        onChange={e => {
                          const cartons = Math.max(0, parseInt(e.target.value) || 0);
                          const pieces = cartons * CAPS_PER_CARTON;
                          setBlowingBatch({ ...blowingBatch, caps_cartons_taken: cartons, caps_pieces_taken: pieces, caps_remaining_cartons: getCapsAvailable() - cartons });
                        }} />
                    </div>
                    <div>
                      <Label>Pieces Taken (Auto)</Label>
                      <Input value={(blowingBatch.caps_pieces_taken || 0).toLocaleString()} readOnly className="bg-gray-100" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Good Caps</Label>
                      <Input type="number" min="0" value={blowingBatch.caps_good || 0}
                        onChange={e => {
                          const good = Math.max(0, parseInt(e.target.value) || 0);
                          const waste = blowingBatch.caps_damaged || 0;
                          setBlowingBatch({ ...blowingBatch, caps_good: good, caps_used: good + waste, caps_left: (blowingBatch.caps_pieces_taken || 0) - (good + waste) });
                        }} />
                    </div>
                    <div>
                      <Label>Waste Caps</Label>
                      <Input type="number" min="0" value={blowingBatch.caps_damaged || 0}
                        onChange={e => {
                          const waste = Math.max(0, parseInt(e.target.value) || 0);
                          const good = blowingBatch.caps_good || 0;
                          setBlowingBatch({ ...blowingBatch, caps_damaged: waste, caps_used: good + waste, caps_left: (blowingBatch.caps_pieces_taken || 0) - (good + waste) });
                        }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Caps Used (Auto)</Label><Input value={blowingBatch.caps_used || 0} readOnly className="bg-gray-100 font-semibold" /></div>
                    <div><Label>Caps Left (Auto)</Label><Input value={blowingBatch.caps_left || 0} readOnly className="bg-gray-100" /></div>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded text-sm">
                    <div className="flex justify-between"><span>Available:</span><span>{getCapsAvailable().toLocaleString()} cartons</span></div>
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className="space-y-2">
                <Label className="text-purple-600 font-semibold">LABELS MANAGEMENT</Label>
                <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                  <div>
                    <Label>Labels Taken (Pieces)</Label>
                    <Input type="number" min="0" value={blowingBatch.labels_taken || 0}
                      onChange={e => handleNumberChange(setBlowingBatch, 'labels_taken', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Good Labels</Label>
                      <Input type="number" min="0" value={blowingBatch.labels_good || 0}
                        onChange={e => {
                          const good = Math.max(0, parseInt(e.target.value) || 0);
                          const waste = blowingBatch.labels_damaged || 0;
                          setBlowingBatch({ ...blowingBatch, labels_good: good, labels_used: good + waste, labels_left: (blowingBatch.labels_taken || 0) - (good + waste) });
                        }} />
                    </div>
                    <div>
                      <Label>Waste Labels</Label>
                      <Input type="number" min="0" value={blowingBatch.labels_damaged || 0}
                        onChange={e => {
                          const waste = Math.max(0, parseInt(e.target.value) || 0);
                          const good = blowingBatch.labels_good || 0;
                          setBlowingBatch({ ...blowingBatch, labels_damaged: waste, labels_used: good + waste, labels_left: (blowingBatch.labels_taken || 0) - (good + waste) });
                        }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Labels Used (Auto)</Label><Input value={blowingBatch.labels_used || 0} readOnly className="bg-gray-100 font-semibold" /></div>
                    <div><Label>Labels Left (Auto)</Label><Input value={blowingBatch.labels_left || 0} readOnly className="bg-gray-100" /></div>
                  </div>
                  <div className="p-2 bg-purple-100 rounded text-sm">
                    <div className="flex justify-between"><span>Available:</span><span>{getLabelsAvailable(blowingBatch.finished_product).toLocaleString()} pcs</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* GUM + SHRINK WRAP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gum */}
              <div className="space-y-2">
                <Label className="text-indigo-600 font-semibold">GUM / GLUE</Label>
                <div className="p-3 bg-indigo-50 rounded-lg space-y-2">
                  <div>
                    <Label>Boxes Taken</Label>
                    <Input type="number" min="0" value={blowingBatch.gum_boxes_taken || 0}
                      onChange={e => handleNumberChange(setBlowingBatch, 'gum_boxes_taken', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Good Gum</Label>
                      <Input type="number" min="0" value={blowingBatch.gum_good || 0}
                        onChange={e => {
                          const good = Math.max(0, parseInt(e.target.value) || 0);
                          const waste = blowingBatch.gum_damaged || 0;
                          setBlowingBatch({ ...blowingBatch, gum_good: good, gum_used: good + waste, gum_left: (blowingBatch.gum_boxes_taken || 0) - (good + waste) });
                        }} />
                    </div>
                    <div>
                      <Label>Waste Gum</Label>
                      <Input type="number" min="0" value={blowingBatch.gum_damaged || 0}
                        onChange={e => {
                          const waste = Math.max(0, parseInt(e.target.value) || 0);
                          const good = blowingBatch.gum_good || 0;
                          setBlowingBatch({ ...blowingBatch, gum_damaged: waste, gum_used: good + waste, gum_left: (blowingBatch.gum_boxes_taken || 0) - (good + waste) });
                        }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Gum Used (Auto)</Label><Input value={blowingBatch.gum_used || 0} readOnly className="bg-gray-100 font-semibold" /></div>
                    <div><Label>Gum Left (Auto)</Label><Input value={blowingBatch.gum_left || 0} readOnly className="bg-gray-100" /></div>
                  </div>
                  <div className="p-2 bg-indigo-100 rounded text-sm">
                    <div className="flex justify-between"><span>Available:</span><span>{getGumAvailable().toLocaleString()} boxes</span></div>
                  </div>
                </div>
              </div>

              {/* Shrink Wrap */}
              <div className="space-y-2">
                <Label className="text-pink-600 font-semibold">SHRINK WRAP</Label>
                <div className="p-3 bg-pink-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Type</Label>
                      <Select value={blowingBatch.shrink_wrap_type}
                        onValueChange={(val: any) => setBlowingBatch({ ...blowingBatch, shrink_wrap_type: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60kg Roll</SelectItem>
                          <SelectItem value="70">70kg Roll</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Taken (KG)</Label>
                      <Input type="number" min="0" step="0.1" value={blowingBatch.shrink_wrap_taken || 0}
                        onChange={e => handleNumberChange(setBlowingBatch, 'shrink_wrap_taken', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Good Shrink Wrap</Label>
                      <Input type="number" min="0" step="0.1" value={blowingBatch.shrink_wrap_good || 0}
                        onChange={e => {
                          const good = Math.max(0, parseFloat(e.target.value) || 0);
                          const waste = blowingBatch.shrink_wrap_damaged || 0;
                          setBlowingBatch({ ...blowingBatch, shrink_wrap_good: good, shrink_wrap_used_kg: good + waste, shrink_wrap_left: (blowingBatch.shrink_wrap_taken || 0) - (good + waste) });
                        }} />
                    </div>
                    <div>
                      <Label>Waste Shrink Wrap</Label>
                      <Input type="number" min="0" step="0.1" value={blowingBatch.shrink_wrap_damaged || 0}
                        onChange={e => {
                          const waste = Math.max(0, parseFloat(e.target.value) || 0);
                          const good = blowingBatch.shrink_wrap_good || 0;
                          setBlowingBatch({ ...blowingBatch, shrink_wrap_damaged: waste, shrink_wrap_used_kg: good + waste, shrink_wrap_left: (blowingBatch.shrink_wrap_taken || 0) - (good + waste) });
                        }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Used (Auto)</Label><Input value={blowingBatch.shrink_wrap_used_kg || 0} readOnly className="bg-gray-100 font-semibold" /></div>
                    <div><Label>Left (Auto)</Label><Input value={blowingBatch.shrink_wrap_left || 0} readOnly className="bg-gray-100" /></div>
                  </div>
                  <div className="p-2 bg-pink-100 rounded text-sm">
                    <div className="flex justify-between"><span>Available:</span><span>{getShrinkAvailable(blowingBatch.shrink_wrap_type).toLocaleString()} KG</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* FINISHED GOODS + PRODUCTION SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Finished Goods */}
              <div className="space-y-2">
                <Label className="text-orange-600 font-semibold">FINISHED GOODS</Label>
                <div className="p-3 bg-orange-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Product Type</Label>
                      <Select value={blowingBatch.finished_product}
                        onValueChange={(val: any) => setBlowingBatch({ ...blowingBatch, finished_product: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="75cl">75cl (12-pack)</SelectItem>
                          <SelectItem value="50cl">50cl (12-pack)</SelectItem>
                          <SelectItem value="33cl">33cl (20-pack)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pallets (100 packs)</Label>
                      <Input type="number" min="0" value={blowingBatch.finished_pallets}
                        onChange={e => handleNumberChange(setBlowingBatch, 'finished_pallets', e.target.value)} />
                    </div>
                    <div>
                      <Label>Packs</Label>
                      <Input type="number" min="0" value={blowingBatch.finished_packs}
                        onChange={e => handleNumberChange(setBlowingBatch, 'finished_packs', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Loose Pieces</Label>
                      <Input type="number" min="0" value={blowingBatch.finished_pieces}
                        onChange={e => handleNumberChange(setBlowingBatch, 'finished_pieces', e.target.value)} />
                    </div>
                    <div>
                      <Label>Damaged Pieces</Label>
                      <Input type="number" min="0" value={blowingBatch.damaged_pieces}
                        onChange={e => handleNumberChange(setBlowingBatch, 'damaged_pieces', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Production Summary */}
              <div className="space-y-2">
                <Label className="text-teal-600 font-semibold">PRODUCTION SUMMARY</Label>
                <div className="p-3 bg-teal-50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>Preforms Taken:</span><span className="font-semibold">{blowingBatch.preforms_taken.toLocaleString()} pcs</span></div>
                  <div className="flex justify-between"><span>Bottles Blown:</span><span className="font-semibold">{(blowingBatch.bottles_good || 0).toLocaleString()} pcs</span></div>
                  <div className="flex justify-between"><span>Bottles Filled:</span><span className="font-semibold text-green-600">{(blowingBatch.bottles_filled || 0).toLocaleString()} pcs</span></div>
                  <div className="flex justify-between"><span>Waste Bottles:</span><span className="font-semibold text-red-500">{(blowingBatch.bottles_damaged || 0).toLocaleString()} pcs</span></div>
                  <div className="flex justify-between"><span>Total Preforms Used:</span><span className="font-semibold">{totalPreformsUsed.toLocaleString()} pcs</span></div>
                  <div className={`flex justify-between font-semibold ${preformsRemaining > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                    <span>Remaining:</span><span>{preformsRemaining.toLocaleString()} pcs</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span>Total Finished Packs:</span>
                    <span className="font-bold text-green-600">
                      {((blowingBatch.finished_pallets * PALLET_PACKS) + blowingBatch.finished_packs).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Pieces:</span>
                    <span className="font-bold text-green-600">{calculateTotalFinishedPieces().toLocaleString()} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Yield:</span>
                    <span className="font-bold text-green-600">{blowingYield}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Waste Units:</span>
                    <span className="font-bold text-red-500">
                      {(
                        (blowingBatch.bottles_damaged || 0) +
                        (blowingBatch.caps_damaged || 0) +
                        (blowingBatch.labels_damaged || 0) +
                        (blowingBatch.gum_damaged || 0) +
                        (blowingBatch.damaged_pieces || 0)
                      ).toLocaleString()} units
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>REMARKS</Label>
              <Textarea placeholder="Any issues or notes..."
                value={blowingBatch.notes}
                onChange={e => setBlowingBatch({ ...blowingBatch, notes: e.target.value })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlowingModalOpen(false)}>Cancel</Button>
            <Button onClick={processBlowingStage} disabled={isSubmitting} className="bg-green-600">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Complete Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionModule;
