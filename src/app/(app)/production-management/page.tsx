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
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  PlusCircle, 
  Factory, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FileEdit,
  Package,
  Layers,
  Droplets,
  Box,
  RefreshCw
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hariindustries.net/api/clearbook/';

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

const ProductionModule = () => {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [isStockErrorDialogOpen, setIsStockErrorDialogOpen] = useState(false);
  
  // State for data
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [obsoleteItems, setObsoleteItems] = useState<RawMaterial[]>([]);
  const [injectionBatches, setInjectionBatches] = useState<InjectionBatch[]>([]);
  const [blowingBatches, setBlowingBatches] = useState<BlowingBatch[]>([]);
  
  // Modal states
  const [isInjectionModalOpen, setIsInjectionModalOpen] = useState(false);
  const [isBlowingModalOpen, setIsBlowingModalOpen] = useState(false);
  
  // View dialog states
  const [selectedViewBatch, setSelectedViewBatch] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewType, setViewType] = useState<'injection' | 'blowing'>('injection');
  
  // Edit states
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  
  // Constants
  const CAPS_PER_CARTON = 9000;
  const PALLET_PACKS = 100;
  const getPacksPerProduct = (product: string) => product === '33cl' ? 20 : 12;
  
  // Injection form state
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
    preform_weight_grams: 18
  });
  
  // Blowing form state
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
    shrink_wrap_used_kg: 0
  });
  
  // Helper functions
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
  
  // API calls
  const apiCall = async (endpoint: string, method: string = 'GET', data?: any) => {
    const token = await getToken();
    const response = await fetch(`${API_BASE_URL}/production.php?action=${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.json();
  };
  
  // Fetch all data
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
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Injection calculations
  const injectionTotalInputKg = injectionBatch.resin_used_kg + injectionBatch.masterbatch_used_kg;
  const injectionTotalOutputKg = (injectionBatch.good_preforms_qty * injectionBatch.preform_weight_grams) / 1000;
  const injectionBadPreformsKg = (injectionBatch.bad_preforms_qty * injectionBatch.preform_weight_grams) / 1000;
  const injectionEfficiency = injectionTotalInputKg > 0 ? ((injectionTotalOutputKg / injectionTotalInputKg) * 100).toFixed(1) : 0;
  
  const calculateGoodPreforms = () => {
    if (injectionBatch.bags_produced > 0 && injectionBatch.preform_weight_grams > 0) {
      const kgPerBag = injectionBatch.preform_weight_grams === 18 ? 30 : 25;
      const totalKg = injectionBatch.bags_produced * kgPerBag;
      const pieces = (totalKg * 1000) / injectionBatch.preform_weight_grams;
      setInjectionBatch(prev => ({ ...prev, good_preforms_qty: Math.round(pieces) }));
    }
  };
  
  // Blowing calculations
  const blowingYield = blowingBatch.preforms_taken > 0 
    ? ((blowingBatch.bottles_produced / blowingBatch.preforms_taken) * 100).toFixed(1) 
    : 0;
  
  const calculateTotalFinishedPieces = () => {
    const packsPerProduct = getPacksPerProduct(blowingBatch.finished_product);
    const totalPieces = (blowingBatch.finished_pallets * PALLET_PACKS * packsPerProduct) + 
                        (blowingBatch.finished_packs * packsPerProduct) + 
                        blowingBatch.finished_pieces;
    return totalPieces;
  };
  
  // Auto-generate batch numbers
  useEffect(() => {
    if (!editingBatch && injectionBatch.production_date && injectionBatch.status === 'draft') {
      setInjectionBatch(prev => ({
        ...prev,
        batch_number: generateInjectionBatchNumber(prev.production_date)
      }));
    }
  }, [injectionBatch.production_date, editingBatch]);
  
  useEffect(() => {
    if (!editingBatch && blowingBatch.production_date && blowingBatch.status === 'draft') {
      setBlowingBatch(prev => ({
        ...prev,
        batch_number: generateBlowingBatchNumber(prev.production_date)
      }));
    }
  }, [blowingBatch.production_date, editingBatch]);
  
  useEffect(() => {
    calculateGoodPreforms();
  }, [injectionBatch.bags_produced, injectionBatch.preform_weight_grams]);
  
  // Auto-calculate caps based on bottles filled
  useEffect(() => {
    if (blowingBatch.bottles_filled > 0) {
      const capsNeeded = blowingBatch.bottles_filled;
      const capsCartonsNeeded = Math.ceil(capsNeeded / CAPS_PER_CARTON);
      const capsPiecesNeeded = capsNeeded;
      
      setBlowingBatch(prev => ({
        ...prev,
        caps_cartons_taken: capsCartonsNeeded,
        caps_pieces_taken: capsPiecesNeeded
      }));
    }
  }, [blowingBatch.bottles_filled]);
  
  // Auto-calculate labels based on bottles filled
  useEffect(() => {
    if (blowingBatch.bottles_filled > 0 && blowingBatch.labels_taken === 0) {
      setBlowingBatch(prev => ({
        ...prev,
        labels_taken: blowingBatch.bottles_filled,
        labels_used: blowingBatch.bottles_filled
      }));
    }
  }, [blowingBatch.bottles_filled]);
  
  // Calculate good caps
  useEffect(() => {
    const calculatedCapsGood = blowingBatch.caps_used - blowingBatch.caps_damaged;
    if (calculatedCapsGood !== blowingBatch.caps_good && blowingBatch.caps_used > 0) {
      setBlowingBatch(prev => ({ ...prev, caps_good: Math.max(0, calculatedCapsGood) }));
    }
  }, [blowingBatch.caps_used, blowingBatch.caps_damaged]);
  
  // Calculate good labels
  useEffect(() => {
    const calculatedLabelsGood = blowingBatch.labels_used - blowingBatch.labels_damaged;
    if (calculatedLabelsGood !== blowingBatch.labels_good && blowingBatch.labels_used > 0) {
      setBlowingBatch(prev => ({ ...prev, labels_good: Math.max(0, calculatedLabelsGood) }));
    }
  }, [blowingBatch.labels_used, blowingBatch.labels_damaged]);
  
  // View batch details
  const viewBatchDetails = async (batchId: number, type: 'injection' | 'blowing') => {
    setIsLoading(true);
    try {
      const response = await apiCall(`batches&type=${type}&batch_id=${batchId}`);
      if (response.success && response.data.length > 0) {
        setSelectedViewBatch(response.data[0]);
        setViewType(type);
        setIsViewDialogOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start new batches
  const startNewInjectionBatch = () => {
    const selectedDate = new Date().toISOString().split('T')[0];
    setCurrentBatchId(null);
    setEditingBatch(null);
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
      preform_weight_grams: 18
    });
    setIsInjectionModalOpen(true);
  };
  
  const startNewBlowingBatch = () => {
    const selectedDate = new Date().toISOString().split('T')[0];
    setCurrentBatchId(null);
    setEditingBatch(null);
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
      shrink_wrap_used_kg: 0
    });
    setIsBlowingModalOpen(true);
  };
  
  // Complete injection production
  const completeInjectionProduction = async () => {
    if (injectionBatch.resin_used_kg === 0 && injectionBatch.masterbatch_used_kg === 0) {
      toast({ title: "Validation Error", description: "Please enter resin or masterbatch amount", variant: "destructive" });
      return;
    }
    if (injectionBatch.bags_produced === 0) {
      toast({ title: "Validation Error", description: "Please enter bags produced", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiCall('injection', 'POST', injectionBatch);
      
      if (response.success) {
        toast({ 
          title: "Success", 
          description: response.message 
        });
        setIsInjectionModalOpen(false);
        await fetchData();
      } else {
        if (response.stock_issue) {
          setStockErrors(response.errors || [response.message]);
          setIsStockErrorDialogOpen(true);
        } else {
          throw new Error(response.message);
        }
      }
    } catch (error: any) {
      toast({ title: "Process Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Process blowing stage
  const processBlowingStage = async () => {
    if (blowingBatch.preforms_taken === 0) {
      toast({ title: "Validation Error", description: "Please enter preforms to use (in bags)", variant: "destructive" });
      return;
    }
    if (blowingBatch.bottles_produced === 0) {
      toast({ title: "Validation Error", description: "Please enter bottles produced", variant: "destructive" });
      return;
    }
    
    const totalFinishedPieces = calculateTotalFinishedPieces();
    if (totalFinishedPieces === 0) {
      toast({ title: "Validation Error", description: "Please enter finished goods (pallets, packs, or pieces)", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await apiCall('blowing', 'POST', blowingBatch);
      
      if (response.success) {
        toast({ 
          title: "Success", 
          description: response.message 
        });
        setIsBlowingModalOpen(false);
        await fetchData();
      } else {
        if (response.stock_issue) {
          setStockErrors(response.errors || [response.message]);
          setIsStockErrorDialogOpen(true);
        } else {
          throw new Error(response.message);
        }
      }
    } catch (error: any) {
      toast({ title: "Process Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline" className="bg-gray-100 text-gray-600">Draft</Badge>;
      case 'wip': return <Badge className="bg-blue-500">WIP</Badge>;
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'cancelled': return <Badge className="bg-red-500">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };
  
  // Get preform available quantity
  const getPreformAvailable = (type: string) => {
    const preform = products.find(p => p.sku === `PREFORM-${type}`);
    return preform?.quantity_on_hand || 0;
  };
  
  // Get caps available
  const getCapsAvailable = () => {
    const caps = rawMaterials.find(r => r.sku === 'CAPS');
    return caps?.quantity_on_hand || 0;
  };
  
  // Get labels available
  const getLabelsAvailable = () => {
    const labels = rawMaterials.find(r => r.sku === 'LABELS');
    return labels?.quantity_on_hand || 0;
  };
  
  // Get gum available
  const getGumAvailable = () => {
    const gum = rawMaterials.find(r => r.sku === 'GUM');
    return gum?.quantity_on_hand || 0;
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
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
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Preforms</p>
                <p className="text-2xl font-bold">
                  {(getPreformAvailable('18G') + getPreformAvailable('14G')).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">In Stock</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Caps</p>
                <p className="text-2xl font-bold">{getCapsAvailable()} ctns</p>
                <p className="text-xs text-muted-foreground">{getCapsAvailable() * CAPS_PER_CARTON} pcs</p>
              </div>
              <Layers className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Labels</p>
                <p className="text-2xl font-bold">{getLabelsAvailable().toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Pieces</p>
              </div>
              <Package className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Gum</p>
                <p className="text-2xl font-bold">{getGumAvailable()} boxes</p>
                <p className="text-xs text-muted-foreground">1 box = 1 piece</p>
              </div>
              <Box className="h-8 w-8 text-indigo-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Batches</p>
                <p className="text-2xl font-bold">{injectionBatches.length + blowingBatches.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="preform-inventory">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-7">
          <TabsTrigger value="preform-inventory">Preforms</TabsTrigger>
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-products">Finished Products</TabsTrigger>
          <TabsTrigger value="obsolete">Obsolete/Scrap</TabsTrigger>
          <TabsTrigger value="injection-batches">Injection</TabsTrigger>
          <TabsTrigger value="blowing-batches">Blowing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preform-inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preform Inventory</CardTitle>
              <CardDescription>Preforms produced from injection molding.</CardDescription>
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
                    {products.filter(p => p.sku.includes('PREFORM')).map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className="p-2 text-right font-bold">{item.quantity_on_hand.toLocaleString()}</td>
                      </tr>
                    ))}
                    {products.filter(p => p.sku.includes('PREFORM')).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center p-4 text-muted-foreground">No preform items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
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
                            ? `${item.quantity_on_hand.toLocaleString()} (${(item.quantity_on_hand * CAPS_PER_CARTON).toLocaleString()} pcs)`
                            : item.quantity_on_hand.toLocaleString()
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
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
                    {products.filter(p => !p.sku.includes('PREFORM')).map((item) => (
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
        
        <TabsContent value="obsolete" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Obsolete & Scrap Inventory</CardTitle>
              <CardDescription>Damaged items and production waste.</CardDescription>
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
                    {obsoleteItems.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className="p-2 text-right font-mono">{item.quantity_on_hand.toLocaleString()}</td>
                      </tr>
                    ))}
                    {obsoleteItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center p-4 text-muted-foreground">No scrap items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
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
                    {injectionBatches.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center p-4 text-muted-foreground">No injection batches found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
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
                    {blowingBatches.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center p-4 text-muted-foreground">No blowing batches found</td>
                      </tr>
                    )}
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
            <DialogDescription>
              Cannot proceed with production due to insufficient stock:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stockErrors.map((error, index) => (
              <div key={index} className="p-2 bg-red-50 rounded-lg text-sm text-red-700">
                • {error}
              </div>
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
            <DialogTitle>
              {viewType === 'injection' ? 'Injection Batch Details' : 'Blowing Batch Details'}
            </DialogTitle>
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
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">INPUT</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Resin Used:</span><span className="font-semibold">{selectedViewBatch.resin_used_kg?.toLocaleString()} KG</span></div>
                    <div className="flex justify-between"><span>Masterbatch Used:</span><span className="font-semibold">{selectedViewBatch.masterbatch_used_kg?.toLocaleString()} KG</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span>Total Input:</span><span className="font-bold">{(selectedViewBatch.resin_used_kg + selectedViewBatch.masterbatch_used_kg).toLocaleString()} KG</span></div>
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">OUTPUT</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Preform Type:</span><span className="font-semibold">{selectedViewBatch.preform_type}</span></div>
                    <div className="flex justify-between"><span>Bags Produced:</span><span className="font-semibold">{selectedViewBatch.bags_produced?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Good Preforms:</span><span className="font-semibold text-green-600">{selectedViewBatch.good_preforms_qty?.toLocaleString()} pcs</span></div>
                  </div></CardContent>
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
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">PREFORMS</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Bags Used:</span><span className="font-semibold">{selectedViewBatch.preform_bags} bags</span></div>
                    <div className="flex justify-between"><span>Preforms Taken:</span><span className="font-semibold">{selectedViewBatch.preforms_taken?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Bottles Produced:</span><span className="font-semibold">{selectedViewBatch.bottles_produced?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Damaged:</span><span className="font-semibold text-red-600">{selectedViewBatch.bottles_damaged?.toLocaleString()} pcs</span></div>
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">FILLING</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Bottles Filled:</span><span className="font-semibold">{selectedViewBatch.bottles_filled?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Damaged:</span><span className="font-semibold text-red-600">{selectedViewBatch.bottles_filled_damaged?.toLocaleString()} pcs</span></div>
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">CAPS</CardTitle></CardHeader>
                  <CardContent><div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Cartons Taken:</span><span className="font-semibold">{selectedViewBatch.caps_cartons_taken?.toLocaleString()} cartons</span></div>
                    <div className="flex justify-between"><span>Pieces Taken:</span><span className="font-semibold">{selectedViewBatch.caps_pieces_taken?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Caps Used:</span><span className="font-semibold">{selectedViewBatch.caps_used?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Good Capping:</span><span className="font-semibold text-green-600">{selectedViewBatch.caps_good?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Damaged Caps:</span><span className="font-semibold text-red-600">{selectedViewBatch.caps_damaged?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Caps Left:</span><span className="font-semibold">{selectedViewBatch.caps_left?.toLocaleString()} pcs</span></div>
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-purple-600">LABELS</CardTitle></CardHeader>
                  <CardContent><div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Pieces Taken:</span><span className="font-semibold">{selectedViewBatch.labels_taken?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Labels Used:</span><span className="font-semibold">{selectedViewBatch.labels_used?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Good Labels:</span><span className="font-semibold text-green-600">{selectedViewBatch.labels_good?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Damaged Labels:</span><span className="font-semibold text-red-600">{selectedViewBatch.labels_damaged?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Labels Left:</span><span className="font-semibold">{selectedViewBatch.labels_left?.toLocaleString()} pcs</span></div>
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-indigo-600">GUM</CardTitle></CardHeader>
                  <CardContent><div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Boxes Taken:</span><span className="font-semibold">{selectedViewBatch.gum_boxes_taken} boxes</span></div>
                    <div className="flex justify-between"><span>Gum Used:</span><span className="font-semibold">{selectedViewBatch.gum_used} boxes</span></div>
                    <div className="flex justify-between"><span>Gum Left:</span><span className="font-semibold">{selectedViewBatch.gum_left} boxes</span></div>
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600">FINISHED GOODS</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Pallets (100 packs):</span><span className="font-semibold">{selectedViewBatch.finished_pallets}</span></div>
                    <div className="flex justify-between"><span>Packs (12/20 pcs):</span><span className="font-semibold">{selectedViewBatch.finished_packs}</span></div>
                    <div className="flex justify-between"><span>Pieces:</span><span className="font-semibold">{selectedViewBatch.finished_pieces}</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span>Total Packs:</span><span className="font-bold">{(selectedViewBatch.finished_pallets * PALLET_PACKS + selectedViewBatch.finished_packs).toLocaleString()}</span></div>
                  </div></CardContent>
                </Card>
              </div>
            </div>
          )}
          
          <DialogFooter><Button onClick={() => setIsViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Injection Modal */}
      <Dialog open={isInjectionModalOpen} onOpenChange={setIsInjectionModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Injection Molding Production</DialogTitle>
            <DialogDescription>Record injection molding data to produce preforms.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label>Batch Number</Label>
              <Input value={injectionBatch.batch_number} readOnly className="font-mono text-sm bg-gray-100" />
            </div>
            <div>
              <Label>Production Date</Label>
              <Input 
                type="date" 
                value={injectionBatch.production_date}
                onChange={e => setInjectionBatch({...injectionBatch, production_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={injectionBatch.shift} onValueChange={val => setInjectionBatch({...injectionBatch, shift: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning (6AM - 2PM)</SelectItem>
                  <SelectItem value="Afternoon">Afternoon (2PM - 10PM)</SelectItem>
                  <SelectItem value="Night">Night (10PM - 6AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operator Name</Label>
              <Input 
                placeholder="Enter operator name"
                value={injectionBatch.operator_name}
                onChange={e => setInjectionBatch({...injectionBatch, operator_name: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600 font-semibold">INPUT</Label>
                <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                  <div><Label>Resin (PET Material) - KG</Label><Input type="number" step="0.001" placeholder="KG" value={injectionBatch.resin_used_kg} onChange={e => setInjectionBatch({...injectionBatch, resin_used_kg: parseFloat(e.target.value) || 0})} /></div>
                  <div><Label>Masterbatch - KG</Label><Input type="number" step="0.001" placeholder="KG" value={injectionBatch.masterbatch_used_kg} onChange={e => setInjectionBatch({...injectionBatch, masterbatch_used_kg: parseFloat(e.target.value) || 0})} /></div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-green-600 font-semibold">OUTPUT</Label>
                <div className="p-3 bg-green-50 rounded-lg space-y-2">
                  <div><Label>Preform Type</Label>
                    <Select value={injectionBatch.preform_weight_grams.toString()} onValueChange={val => {const weight = parseInt(val); setInjectionBatch({...injectionBatch, preform_weight_grams: weight, preform_type: weight === 18 ? '18g' : '14g'});}}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="18">18g Preform (for 75CL/50CL bottles)</SelectItem><SelectItem value="14">14g Preform (for 33CL bottles)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Bags Produced</Label><Input type="number" value={injectionBatch.bags_produced} onChange={e => setInjectionBatch({...injectionBatch, bags_produced: parseInt(e.target.value) || 0})} /><p className="text-xs text-muted-foreground mt-1">{injectionBatch.preform_weight_grams === 18 ? '1 bag = 30kg ≈ 1,667 pcs' : '1 bag = 25kg ≈ 1,786 pcs'}</p></div>
                    <div><Label>Good Preforms (calculated)</Label><Input type="number" value={injectionBatch.good_preforms_qty} readOnly className="bg-gray-100 font-semibold text-green-600" /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-red-600 font-semibold">WASTE</Label>
                <div className="p-3 bg-red-50 rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Bad Preforms (KG)</Label>
                      <Input 
                        type="number" 
                        step="0.001"
                        placeholder="KG"
                        value={injectionBadPreformsKg}
                        onChange={e => {
                          const kgValue = parseFloat(e.target.value) || 0;
                          const pieces = Math.round((kgValue * 1000) / injectionBatch.preform_weight_grams);
                          setInjectionBatch({...injectionBatch, bad_preforms_qty: pieces});
                        }}
                      />
                    </div>
                    <div>
                      <Label>Purge Weight (KG)</Label>
                      <Input type="number" step="0.001" placeholder="KG" value={injectionBatch.purge_weight_kg} onChange={e => setInjectionBatch({...injectionBatch, purge_weight_kg: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-purple-600 font-semibold">PRODUCTION SUMMARY</Label>
                <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                  <div className="flex justify-between"><span>Total Input:</span><span className="font-semibold">{injectionTotalInputKg} KG</span></div>
                  <div className="flex justify-between"><span>Total Output:</span><span className="font-semibold text-green-600">{injectionTotalOutputKg.toFixed(2)} KG</span></div>
                  <div className="flex justify-between"><span>Material Efficiency:</span><span className="font-semibold">{injectionEfficiency}%</span></div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>REMARKS</Label>
              <Textarea placeholder="Any issues or notes about this production run..." value={injectionBatch.notes} onChange={e => setInjectionBatch({...injectionBatch, notes: e.target.value})} />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsInjectionModalOpen(false); setCurrentBatchId(null); setEditingBatch(null); }}>Cancel</Button>
            <Button onClick={completeInjectionProduction} disabled={isSubmitting} className="bg-green-600">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Complete Production & Add to Inventory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Blowing Modal */}
      <Dialog open={isBlowingModalOpen} onOpenChange={setIsBlowingModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Blowing & Packaging Production</DialogTitle>
            <DialogDescription>Blowing → Filling → Capping → Packaging</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label>Batch Number</Label>
              <Input value={blowingBatch.batch_number} readOnly className="font-mono text-sm bg-gray-100" />
            </div>
            <div>
              <Label>Production Date</Label>
              <Input 
                type="date" 
                value={blowingBatch.production_date}
                onChange={e => setBlowingBatch({...blowingBatch, production_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={blowingBatch.shift} onValueChange={val => setBlowingBatch({...blowingBatch, shift: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning (6AM - 2PM)</SelectItem>
                  <SelectItem value="Afternoon">Afternoon (2PM - 10PM)</SelectItem>
                  <SelectItem value="Night">Night (10PM - 6AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operator Name</Label>
              <Input 
                placeholder="Enter operator name"
                value={blowingBatch.operator_name}
                onChange={e => setBlowingBatch({...blowingBatch, operator_name: e.target.value})}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-600 font-semibold">PREFORMS SELECTION</Label>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Preform Type</Label>
                      <Select value={blowingBatch.preform_type} onValueChange={(val: any) => {
                        setBlowingBatch({...blowingBatch, preform_type: val, preform_bags: 0, preforms_taken: 0});
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18g">18g Preforms (30kg/bag)</SelectItem>
                          <SelectItem value="14g">14g Preforms (25kg/bag)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bags to Use</Label>
                      <Input 
                        type="number" 
                        value={blowingBatch.preform_bags || 0} 
                        onChange={e => {
                          const bags = parseInt(e.target.value) || 0;
                          const kgPerBag = blowingBatch.preform_type === '18g' ? 30 : 25;
                          const totalKg = bags * kgPerBag;
                          const pieces = Math.round((totalKg * 1000) / (blowingBatch.preform_type === '18g' ? 18 : 14));
                          setBlowingBatch({
                            ...blowingBatch, 
                            preform_bags: bags,
                            preforms_taken: pieces
                          });
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {blowingBatch.preform_type === '18g' ? '1 bag = 30kg ≈ 1,667 pieces' : '1 bag = 25kg ≈ 1,786 pieces'}
                      </p>
                    </div>
                  </div>
                  {blowingBatch.preforms_taken > 0 && (
                    <div className="mt-3 p-2 bg-green-100 rounded">
                      <div className="flex justify-between text-sm">
                        <span>Total Preforms:</span>
                        <span className="font-bold">{blowingBatch.preforms_taken.toLocaleString()} pieces</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Available: {getPreformAvailable(blowingBatch.preform_type).toLocaleString()} pcs
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-green-600 font-semibold">BLOWING & FILLING</Label>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Bottles Produced</Label><Input type="number" value={blowingBatch.bottles_produced} onChange={e => setBlowingBatch({...blowingBatch, bottles_produced: parseInt(e.target.value) || 0})} /></div>
                    <div><Label>Damaged</Label><Input type="number" value={blowingBatch.bottles_damaged} onChange={e => setBlowingBatch({...blowingBatch, bottles_damaged: parseInt(e.target.value) || 0})} /></div>
                    <div><Label>Bottles Filled</Label><Input type="number" value={blowingBatch.bottles_filled} onChange={e => setBlowingBatch({...blowingBatch, bottles_filled: parseInt(e.target.value) || 0})} /></div>
                  </div>
                  <div className="mt-2 text-sm"><span className="text-muted-foreground">Yield: </span><span className="font-semibold">{blowingYield}%</span></div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-yellow-600 font-semibold">CAPS MANAGEMENT</Label>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Caps Taken (Cartons)</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_cartons_taken || 0}
                          onChange={e => {
                            const cartons = parseInt(e.target.value) || 0;
                            const pieces = cartons * CAPS_PER_CARTON;
                            setBlowingBatch({
                              ...blowingBatch,
                              caps_cartons_taken: cartons,
                              caps_pieces_taken: pieces,
                              caps_remaining_cartons: getCapsAvailable() - cartons
                            });
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">9,000 pieces per carton</p>
                      </div>
                      <div>
                        <Label>Total Pieces Taken</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_pieces_taken || 0}
                          readOnly 
                          className="bg-gray-100"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Caps Used</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_used || 0}
                          onChange={e => {
                            const used = parseInt(e.target.value) || 0;
                            const good = used - (blowingBatch.caps_damaged || 0);
                            setBlowingBatch({
                              ...blowingBatch,
                              caps_used: used,
                              caps_good: Math.max(0, good),
                              caps_left: (blowingBatch.caps_pieces_taken || 0) - used
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Caps Damaged</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_damaged || 0}
                          onChange={e => {
                            const damaged = parseInt(e.target.value) || 0;
                            const good = (blowingBatch.caps_used || 0) - damaged;
                            setBlowingBatch({
                              ...blowingBatch,
                              caps_damaged: damaged,
                              caps_good: Math.max(0, good)
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Good Capping</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_good || 0}
                          readOnly 
                          className="bg-gray-100 font-semibold text-green-600"
                        />
                        <p className="text-xs text-muted-foreground">Caps Used - Damaged</p>
                      </div>
                      <div>
                        <Label>Caps Left</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_left || 0}
                          readOnly 
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-muted-foreground">From this carton</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-yellow-100 rounded">
                      <div className="flex justify-between text-sm">
                        <span>Available in Inventory:</span>
                        <span className="font-bold">{getCapsAvailable()} cartons</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Remaining after taking:</span>
                        <span className="font-semibold">{blowingBatch.caps_remaining_cartons || getCapsAvailable()} cartons</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-purple-600 font-semibold">LABELS MANAGEMENT</Label>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Total Pieces Taken</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.labels_taken || 0}
                          onChange={e => {
                            const taken = parseInt(e.target.value) || 0;
                            setBlowingBatch({
                              ...blowingBatch,
                              labels_taken: taken
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Labels Used</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.labels_used || 0}
                          onChange={e => {
                            const used = parseInt(e.target.value) || 0;
                            const good = used - (blowingBatch.labels_damaged || 0);
                            setBlowingBatch({
                              ...blowingBatch,
                              labels_used: used,
                              labels_good: Math.max(0, good),
                              labels_left: (blowingBatch.labels_taken || 0) - used
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Labels Damaged</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.labels_damaged || 0}
                          onChange={e => {
                            const damaged = parseInt(e.target.value) || 0;
                            const good = (blowingBatch.labels_used || 0) - damaged;
                            setBlowingBatch({
                              ...blowingBatch,
                              labels_damaged: damaged,
                              labels_good: Math.max(0, good)
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Good Labels</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.labels_good || 0}
                          readOnly 
                          className="bg-gray-100 font-semibold text-green-600"
                        />
                        <p className="text-xs text-muted-foreground">Labels Used - Damaged</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Labels Left</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.labels_left || 0}
                          readOnly 
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-muted-foreground">From pieces taken</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 p-2 bg-purple-100 rounded">
                      <div className="flex justify-between text-sm">
                        <span>Available in Inventory:</span>
                        <span className="font-bold">{getLabelsAvailable().toLocaleString()} pieces</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-indigo-600 font-semibold">GUM/GLUE (1 box = 1 piece)</Label>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Boxes Taken</Label>
                      <Input 
                        type="number" 
                        value={blowingBatch.gum_boxes_taken || 0}
                        onChange={e => {
                          const boxes = parseInt(e.target.value) || 0;
                          setBlowingBatch({
                            ...blowingBatch,
                            gum_boxes_taken: boxes
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Gum Used</Label>
                      <Input 
                        type="number" 
                        value={blowingBatch.gum_used || 0}
                        onChange={e => {
                          const used = parseInt(e.target.value) || 0;
                          setBlowingBatch({
                            ...blowingBatch,
                            gum_used: used,
                            gum_left: (blowingBatch.gum_boxes_taken || 0) - used
                          });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label>Gum Left</Label>
                      <Input 
                        type="number" 
                        value={blowingBatch.gum_left || 0}
                        readOnly 
                        className="bg-gray-100"
                      />
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-indigo-100 rounded">
                    <div className="flex justify-between text-sm">
                      <span>Available in Inventory:</span>
                      <span className="font-bold">{getGumAvailable()} boxes</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-pink-600 font-semibold">SHRINK WRAP</Label>
                <div className="p-3 bg-pink-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Type</Label>
                      <Select value={blowingBatch.shrink_wrap_type} onValueChange={(val: any) => setBlowingBatch({...blowingBatch, shrink_wrap_type: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60kg Roll</SelectItem>
                          <SelectItem value="70">70kg Roll</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity (KG)</Label>
                      <Input type="number" step="0.1" value={blowingBatch.shrink_wrap_used_kg} onChange={e => setBlowingBatch({...blowingBatch, shrink_wrap_used_kg: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-orange-600 font-semibold">FINISHED GOODS</Label>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Product Type</Label>
                      <Select value={blowingBatch.finished_product} onValueChange={(val: any) => {
                        setBlowingBatch({...blowingBatch, finished_product: val});
                      }}>
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
                      <Input 
                        type="number" 
                        value={blowingBatch.finished_pallets} 
                        onChange={e => {
                          const pallets = parseInt(e.target.value) || 0;
                          setBlowingBatch({
                            ...blowingBatch, 
                            finished_pallets: pallets
                          });
                        }} 
                      />
                      <p className="text-xs text-muted-foreground">1 pallet = 100 packs</p>
                    </div>
                    <div>
                      <Label>Packs (12/20 pcs)</Label>
                      <Input 
                        type="number" 
                        value={blowingBatch.finished_packs} 
                        onChange={e => {
                          const packs = parseInt(e.target.value) || 0;
                          setBlowingBatch({
                            ...blowingBatch, 
                            finished_packs: packs
                          });
                        }} 
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label>Pieces</Label>
                      <Input 
                        type="number" 
                        value={blowingBatch.finished_pieces} 
                        onChange={e => {
                          const pieces = parseInt(e.target.value) || 0;
                          setBlowingBatch({
                            ...blowingBatch, 
                            finished_pieces: pieces
                          });
                        }} 
                      />
                    </div>
                    <div>
                      <Label>Damaged Pieces</Label>
                      <Input type="number" value={blowingBatch.damaged_pieces} onChange={e => setBlowingBatch({...blowingBatch, damaged_pieces: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-teal-600 font-semibold">PRODUCTION SUMMARY</Label>
                <div className="p-3 bg-teal-50 rounded-lg">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Preforms Used:</span><span className="font-semibold">{blowingBatch.preforms_taken.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Bottles Produced:</span><span className="font-semibold">{blowingBatch.bottles_produced.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Bottles Filled:</span><span className="font-semibold">{blowingBatch.bottles_filled.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Caps Used:</span><span className="font-semibold">{blowingBatch.caps_used?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Good Capping:</span><span className="font-semibold text-green-600">{blowingBatch.caps_good?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                      <span>Total Finished:</span>
                      <span className="font-bold text-green-600">
                        {((blowingBatch.finished_pallets * PALLET_PACKS) + blowingBatch.finished_packs).toLocaleString()} packs
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Pieces:</span>
                      <span className="font-bold text-green-600">{calculateTotalFinishedPieces().toLocaleString()} pcs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>REMARKS</Label>
              <Textarea placeholder="Any issues or notes about this production run..." value={blowingBatch.notes} onChange={e => setBlowingBatch({...blowingBatch, notes: e.target.value})} />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBlowingModalOpen(false); setCurrentBatchId(null); setEditingBatch(null); }}>Cancel</Button>
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
