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
  Package, 
  Factory, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Eye,
  FileEdit,
  PlayCircle,
  RefreshCw
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RawMaterial {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  average_unit_cost: number;
}

interface FinishedGood {
  id: number;
  sku: string;
  name: string;
  unit_of_measure: string;
  quantity_on_hand: number;
  average_unit_cost: number;
}

interface ProductionBatch {
  id?: number;
  batch_number: string;
  production_date: string;
  shift: string;
  operator_name: string;
  status: 'draft' | 'wip' | 'completed' | 'cancelled';
  stage: 'injection' | 'blowing' | 'packaging' | 'completed';
  notes: string;
  preform_type?: '18g' | '14g';
  finished_product?: '75cl' | '50cl' | '33cl';
}

interface InjectionData {
  resin_used_kg: number;
  masterbatch_used_kg: number;
  preform_type: string;
  preform_weight_grams: number;
  good_preforms_qty: number;
  bad_preforms_qty: number;
  purge_weight_kg: number;
  bags_produced: number;
}

interface BlowingData {
  preforms_taken: number;
  preforms_type: string;
  bottles_produced: number;
  bottles_damaged: number;
  bottles_filled: number;
  bottles_filled_damaged: number;
  caps_taken_cartons: number;
  caps_taken_pieces: number;
  caps_good: number;
  caps_damaged: number;
  labels_taken: number;
  labels_good: number;
  labels_damaged: number;
  finished_packs: number;
  finished_pieces: number;
  damaged_pieces: number;
}

const ProductionModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Stock error dialog states
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [isStockErrorDialogOpen, setIsStockErrorDialogOpen] = useState(false);
  
  // Data states
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [recentBatches, setRecentBatches] = useState<ProductionBatch[]>([]);
  const [draftBatches, setDraftBatches] = useState<ProductionBatch[]>([]);
  const [wipBatches, setWipBatches] = useState<ProductionBatch[]>([]);
  const [completedBatches, setCompletedBatches] = useState<ProductionBatch[]>([]);
  const [scrapItems, setScrapItems] = useState<any[]>([]);
  
  // View states
  const [selectedViewBatch, setSelectedViewBatch] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewStage, setViewStage] = useState<'injection' | 'blowing' | 'packaging'>('injection');
  
  // Form states
  const [activeTab, setActiveTab] = useState('injection');
  const [isNewBatchDialogOpen, setIsNewBatchDialogOpen] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  
  // Batch form
  const [batch, setBatch] = useState<ProductionBatch>({
    batch_number: '',
    production_date: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    operator_name: '',
    status: 'draft',
    stage: 'injection',
    notes: '',
    preform_type: '18g',
    finished_product: '75cl'
  });
  
  // Injection form
  const [injection, setInjection] = useState<InjectionData>({
    resin_used_kg: 0,
    masterbatch_used_kg: 0,
    preform_type: '',
    preform_weight_grams: 18,
    good_preforms_qty: 0,
    bad_preforms_qty: 0,
    purge_weight_kg: 0,
    bags_produced: 0
  });
  
  // Blowing form
  const [blowing, setBlowing] = useState<BlowingData>({
    preforms_taken: 0,
    preforms_type: '',
    bottles_produced: 0,
    bottles_damaged: 0,
    bottles_filled: 0,
    bottles_filled_damaged: 0,
    caps_taken_cartons: 0,
    caps_taken_pieces: 0,
    caps_good: 0,
    caps_damaged: 0,
    labels_taken: 0,
    labels_good: 0,
    labels_damaged: 0,
    finished_packs: 0,
    finished_pieces: 0,
    damaged_pieces: 0
  });
  
  // Auto-calculate good preforms from bags
  const calculateGoodPreforms = () => {
    if (injection.bags_produced > 0 && injection.preform_weight_grams > 0) {
      const kgPerBag = injection.preform_weight_grams === 18 ? 30 : 25;
      const totalKg = injection.bags_produced * kgPerBag;
      const pieces = (totalKg * 1000) / injection.preform_weight_grams;
      setInjection(prev => ({ ...prev, good_preforms_qty: Math.round(pieces) }));
    }
  };
  
  // Auto-calculate preforms taken from good preforms
  useEffect(() => {
    if (injection.good_preforms_qty > 0 && blowing.preforms_taken === 0) {
      setBlowing(prev => ({ ...prev, preforms_taken: injection.good_preforms_qty }));
    }
  }, [injection.good_preforms_qty]);
  
  // Calculations
  const totalInputKg = injection.resin_used_kg + injection.masterbatch_used_kg;
  const totalOutputKg = (injection.good_preforms_qty * injection.preform_weight_grams) / 1000;
  const badPreformsKg = (injection.bad_preforms_qty * injection.preform_weight_grams) / 1000;
  const efficiency = totalInputKg > 0 ? ((totalOutputKg / totalInputKg) * 100).toFixed(1) : 0;
  
  const blowingYield = blowing.preforms_taken > 0 
    ? ((blowing.bottles_produced / blowing.preforms_taken) * 100).toFixed(1) 
    : 0;
  
  const totalScrap = {
    preform_scrap_kg: badPreformsKg,
    preform_scrap_pcs: injection.bad_preforms_qty,
    blowing_scrap: blowing.bottles_damaged,
    filling_scrap: blowing.bottles_filled_damaged,
    capping_scrap: blowing.caps_damaged,
    labeling_scrap: blowing.labels_damaged,
    total: badPreformsKg + injection.purge_weight_kg + blowing.bottles_damaged + blowing.bottles_filled_damaged + 
           blowing.caps_damaged + blowing.labels_damaged + blowing.damaged_pieces
  };
  
  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user?.company_id) return;
    setIsLoading(true);
    try {
      const rmRes = await fetch(`https://hariindustries.net/api/clearbook/get-raw-materials.php?company_id=${user.company_id}`);
      const rmData = await rmRes.json();
      if (rmData.success) setRawMaterials(rmData.data || []);
      
      const fgRes = await fetch(`https://hariindustries.net/api/clearbook/get-products.php?company_id=${user.company_id}`);
      const fgData = await fgRes.json();
      if (fgData.success) setFinishedGoods(fgData.data || []);
      
      const batchRes = await fetch(`https://hariindustries.net/api/clearbook/get-production-batches.php?company_id=${user.company_id}`);
      const batchData = await batchRes.json();
      if (batchData.success && Array.isArray(batchData.data)) {
        const uniqueBatches = Array.from(
          new Map(batchData.data.map((batch: any) => [batch.id, batch])).values()
        );
        
        const mappedBatches = uniqueBatches.map((batch: any) => ({
          id: batch.id,
          batch_number: batch.batch_number,
          production_date: batch.production_date,
          shift: batch.shift,
          operator_name: batch.operator_name || '',
          status: batch.status,
          stage: batch.stage,
          notes: batch.notes || '',
          preform_type: batch.preform_type || '18g',
          finished_product: batch.finished_product || '75cl',
          resin_used_kg: batch.resin_used_kg || 0,
          masterbatch_used_kg: batch.masterbatch_used_kg || 0,
          good_preforms_qty: batch.good_preforms_qty || 0,
          bad_preforms_qty: batch.bad_preforms_qty || 0,
          purge_weight_kg: batch.purge_weight_kg || 0,
          bags_produced: batch.bags_produced || 0,
          preform_weight_grams: batch.preform_weight_grams || 18,
          finished_packs: batch.finished_packs || 0,
          finished_pieces: batch.finished_pieces || 0,
          bottles_produced: batch.bottles_produced || 0,
          bottles_damaged: batch.bottles_damaged || 0,
          preforms_taken: batch.preforms_taken || 0
        }));
        
        setRecentBatches(mappedBatches);
        setDraftBatches(mappedBatches.filter((b: any) => b.status === 'draft'));
        setWipBatches(mappedBatches.filter((b: any) => b.status === 'wip'));
        setCompletedBatches(mappedBatches.filter((b: any) => b.status === 'completed'));
      }
      
      const scrapRes = await fetch(`https://hariindustries.net/api/clearbook/get-scrap-items.php?company_id=${user.company_id}`);
      const scrapData = await scrapRes.json();
      if (scrapData.success) setScrapItems(scrapData.data || []);
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    calculateGoodPreforms();
  }, [injection.bags_produced, injection.preform_weight_grams]);
  
  const generateBatchNumber = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BATCH-${date}-${random}`;
  };
  
  // View batch details
  const viewBatchDetails = async (batchId: number, stage: 'injection' | 'blowing' | 'packaging') => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://hariindustries.net/api/clearbook/get-production-batches.php?company_id=${user?.company_id}&batch_id=${batchId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setSelectedViewBatch(result.data);
        setViewStage(stage);
        setIsViewDialogOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load batch for editing/continuation
  const loadBatchForEditing = async (batchId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`https://hariindustries.net/api/clearbook/get-production-batches.php?company_id=${user?.company_id}&batch_id=${batchId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const batchData = result.data;
        
        setEditingBatch({
          id: batchData.id,
          batch_number: batchData.batch_number,
          production_date: batchData.production_date,
          shift: batchData.shift,
          operator_name: batchData.operator_name || '',
          status: batchData.status,
          stage: batchData.stage,
          notes: batchData.notes || '',
          preform_type: batchData.preform_type || '18g',
          finished_product: batchData.finished_product || '75cl'
        });
        
        setInjection({
          resin_used_kg: parseFloat(batchData.resin_used_kg) || 0,
          masterbatch_used_kg: parseFloat(batchData.masterbatch_used_kg) || 0,
          preform_type: batchData.preform_type || '',
          preform_weight_grams: parseInt(batchData.preform_weight_grams) || 18,
          good_preforms_qty: parseInt(batchData.good_preforms_qty) || 0,
          bad_preforms_qty: parseInt(batchData.bad_preforms_qty) || 0,
          purge_weight_kg: parseFloat(batchData.purge_weight_kg) || 0,
          bags_produced: parseInt(batchData.bags_produced) || 0
        });
        
        setBlowing({
          preforms_taken: parseInt(batchData.preforms_taken) || 0,
          preforms_type: batchData.preforms_type || '',
          bottles_produced: parseInt(batchData.bottles_produced) || 0,
          bottles_damaged: parseInt(batchData.bottles_damaged) || 0,
          bottles_filled: parseInt(batchData.bottles_filled) || 0,
          bottles_filled_damaged: parseInt(batchData.bottles_filled_damaged) || 0,
          caps_taken_cartons: parseInt(batchData.caps_taken_cartons) || 0,
          caps_taken_pieces: parseInt(batchData.caps_taken_pieces) || 0,
          caps_good: parseInt(batchData.caps_good) || 0,
          caps_damaged: parseInt(batchData.caps_damaged) || 0,
          labels_taken: parseInt(batchData.labels_taken) || 0,
          labels_good: parseInt(batchData.labels_good) || 0,
          labels_damaged: parseInt(batchData.labels_damaged) || 0,
          finished_packs: parseInt(batchData.finished_packs) || 0,
          finished_pieces: parseInt(batchData.finished_pieces) || 0,
          damaged_pieces: parseInt(batchData.damaged_pieces) || 0
        });
        
        setCurrentBatchId(batchData.id);
        
        // Set the active tab based on the current stage
        if (batchData.stage === 'injection') {
          setActiveTab('injection');
        } else if (batchData.stage === 'blowing') {
          setActiveTab('blowing');
        } else if (batchData.stage === 'packaging') {
          setActiveTab('packaging');
        }
        
        setBatch({
          batch_number: batchData.batch_number,
          production_date: batchData.production_date,
          shift: batchData.shift,
          operator_name: batchData.operator_name || '',
          status: batchData.status,
          stage: batchData.stage,
          notes: batchData.notes || '',
          preform_type: batchData.preform_type || '18g',
          finished_product: batchData.finished_product || '75cl'
        });
        
        setIsNewBatchDialogOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start new batch
  const startNewBatch = () => {
    setCurrentBatchId(null);
    setEditingBatch(null);
    setBatch({
      batch_number: generateBatchNumber(),
      production_date: new Date().toISOString().split('T')[0],
      shift: 'Morning',
      operator_name: user?.full_name || '',
      status: 'draft',
      stage: 'injection',
      notes: '',
      preform_type: '18g',
      finished_product: '75cl'
    });
    setInjection({
      resin_used_kg: 0,
      masterbatch_used_kg: 0,
      preform_type: '',
      preform_weight_grams: 18,
      good_preforms_qty: 0,
      bad_preforms_qty: 0,
      purge_weight_kg: 0,
      bags_produced: 0
    });
    setBlowing({
      preforms_taken: 0,
      preforms_type: '',
      bottles_produced: 0,
      bottles_damaged: 0,
      bottles_filled: 0,
      bottles_filled_damaged: 0,
      caps_taken_cartons: 0,
      caps_taken_pieces: 0,
      caps_good: 0,
      caps_damaged: 0,
      labels_taken: 0,
      labels_good: 0,
      labels_damaged: 0,
      finished_packs: 0,
      finished_pieces: 0,
      damaged_pieces: 0
    });
    setActiveTab('injection');
    setIsNewBatchDialogOpen(true);
  };
  
  // Process current stage and move to next
  const processStage = async () => {
    if (!user?.company_id) return;
    setIsSubmitting(true);
    
    // Validation based on stage
    if (activeTab === 'injection') {
      if (injection.resin_used_kg === 0 && injection.masterbatch_used_kg === 0) {
        toast({ title: "Validation Error", description: "Please enter resin or masterbatch amount", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      if (injection.bags_produced === 0) {
        toast({ title: "Validation Error", description: "Please enter bags produced", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }
    
    if (activeTab === 'blowing') {
      if (blowing.bottles_produced === 0) {
        toast({ title: "Validation Error", description: "Please enter bottles produced", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }
    
    if (activeTab === 'packaging') {
      if (blowing.finished_packs === 0) {
        toast({ title: "Validation Error", description: "Please enter finished packs", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }
    
    try {
      const currentStage = activeTab === 'injection' ? 'injection' : activeTab === 'blowing' ? 'blowing' : 'packaging';
      
      const response = await fetch(`https://hariindustries.net/api/clearbook/process-production-stage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: user.company_id,
          user_id: user.id,
          current_stage: currentStage,
          batch_id: currentBatchId,
          batch: batch,
          injection: injection,
          blowing: blowing
        })
      });
      
      const result = await response.json();
      
      // Handle stock validation errors
      if (!result.success && result.stock_issue) {
        setStockErrors(result.errors || [result.message]);
        setIsStockErrorDialogOpen(true);
        setIsSubmitting(false);
        return;
      }
      
      if (result.success) {
        toast({ title: "Success", description: result.message });
        
        if (result.next_stage === 'blowing') {
          setActiveTab('blowing');
          setBatch(prev => ({ ...prev, status: 'wip', stage: 'blowing', id: result.batch_id }));
          setCurrentBatchId(result.batch_id);
          await fetchData();
        } else if (result.next_stage === 'packaging') {
          setActiveTab('packaging');
          setBatch(prev => ({ ...prev, stage: 'packaging', id: result.batch_id }));
          setCurrentBatchId(result.batch_id);
          await fetchData();
        } else if (result.next_stage === 'completed') {
          toast({ title: "Production Complete", description: "Finished goods added to inventory!" });
          setIsNewBatchDialogOpen(false);
          setCurrentBatchId(null);
          setEditingBatch(null);
          await fetchData();
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: "Process Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Approve and complete production from table
  const approveAndComplete = async (batchId: number) => {
    if (!confirm('Complete this production batch? This will add finished goods to inventory and post to journal.')) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`https://hariindustries.net/api/clearbook/process-production-stage.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: user?.company_id,
          user_id: user?.id,
          current_stage: 'complete',
          batch_id: batchId,
          batch: {},
          injection: {},
          blowing: {}
        })
      });
      
      const result = await response.json();
      
      // Handle stock validation errors
      if (!result.success && result.stock_issue) {
        setStockErrors(result.errors || [result.message]);
        setIsStockErrorDialogOpen(true);
        return;
      }
      
      if (result.success) {
        toast({ title: "Success", description: "Production completed and posted to journal!" });
        await fetchData();
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
  
  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'injection': return <Badge variant="outline">Injection</Badge>;
      case 'blowing': return <Badge variant="outline">Blowing</Badge>;
      case 'packaging': return <Badge variant="outline">Packaging</Badge>;
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      default: return <Badge>{stage}</Badge>;
    }
  };
  
  const getStockStatus = (quantity: number, category: string) => {
    if (category === 'Obsolete, Expired & Scrap Inventory') return null;
    if (quantity < 0) return <Badge className="bg-red-500">Negative Stock!</Badge>;
    if (quantity === 0) return <Badge variant="outline">Out of Stock</Badge>;
    if (quantity < 100) return <Badge className="bg-yellow-500">Low Stock</Badge>;
    return <Badge className="bg-green-500">In Stock</Badge>;
  };
  
  const formatCurrency = (value: number) => {
    return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Management</h1>
          <p className="text-muted-foreground">Injection Molding → Blowing → Filling → Packaging</p>
        </div>
        <Button onClick={startNewBatch}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Production Batch
        </Button>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Today's Production</p>
                <p className="text-2xl font-bold">{completedBatches.filter(b => b.production_date === new Date().toISOString().split('T')[0]).length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <Factory className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">WIP Batches</p>
                <p className="text-2xl font-bold">{wipBatches.length}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Draft Batches</p>
                <p className="text-2xl font-bold">{draftBatches.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <FileEdit className="h-8 w-8 text-gray-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Scrap</p>
                <p className="text-2xl font-bold">{scrapItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}</p>
                <p className="text-xs text-muted-foreground">Units</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Inventory Tabs */}
      <Tabs defaultValue="raw-materials">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
          <TabsTrigger value="wip">WIP Batches</TabsTrigger>
          <TabsTrigger value="drafts">Draft Batches</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="obsolete">Obsolete/Scrap</TabsTrigger>
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
                      <th className="text-right p-2">Stock</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.filter(item => item.category !== 'Obsolete, Expired & Scrap Inventory').map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className={`p-2 text-right font-mono ${item.quantity_on_hand < 0 ? 'text-red-600 font-bold' : ''}`}>
                          {item.quantity_on_hand.toLocaleString()}
                        </td>
                        <td className="p-2">{getStockStatus(item.quantity_on_hand, item.category)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Finished Goods Tab */}
        <TabsContent value="finished-goods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Finished Goods Inventory</CardTitle>
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
                      <th className="text-right p-2">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finishedGoods.map((item) => (
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
        
        {/* WIP Batches Tab */}
        <TabsContent value="wip" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work in Progress (WIP)</CardTitle>
              <CardDescription>Production batches currently in process.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Batch #</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Stage</th>
                      <th className="text-left p-2">Operator</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wipBatches.map((batchItem) => (
                      <tr key={batchItem.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{batchItem.batch_number}</td>
                        <td className="p-2">{batchItem.production_date}</td>
                        <td className="p-2">{getStageBadge(batchItem.stage)}</td>
                        <td className="p-2">{batchItem.operator_name}</td>
                        <td className="p-2">{getStatusBadge(batchItem.status)}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(batchItem.id!, batchItem.stage)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => loadBatchForEditing(batchItem.id!)}>
                              <PlayCircle className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => approveAndComplete(batchItem.id!)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {wipBatches.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-4 text-muted-foreground">No WIP batches found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Draft Batches Tab */}
        <TabsContent value="drafts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Draft Batches</CardTitle>
              <CardDescription>Saved drafts waiting for approval to start production.</CardDescription>
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
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftBatches.map((batchItem) => (
                      <tr key={batchItem.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{batchItem.batch_number}</td>
                        <td className="p-2">{batchItem.production_date}</td>
                        <td className="p-2">{batchItem.preform_type || '-'}</td>
                        <td className="p-2 text-right">{batchItem.resin_used_kg?.toLocaleString() || '0'}</td>
                        <td className="p-2 text-right">{batchItem.bags_produced?.toLocaleString() || '0'}</td>
                        <td className="p-2">{getStatusBadge(batchItem.status)}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(batchItem.id!, 'injection')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => loadBatchForEditing(batchItem.id!)}>
                              <FileEdit className="h-4 w-4 text-blue-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {draftBatches.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-4 text-muted-foreground">No draft batches found. Click "New Production Batch" to create one.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Completed Batches Tab */}
        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Production Batches</CardTitle>
              <CardDescription>Production runs that have been finished.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Batch #</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Product</th>
                      <th className="text-right p-2">Packs</th>
                      <th className="text-right p-2">Efficiency</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedBatches.map((batchItem) => (
                      <tr key={batchItem.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{batchItem.batch_number}</td>
                        <td className="p-2">{batchItem.production_date}</td>
                        <td className="p-2">{batchItem.finished_product || '-'}</td>
                        <td className="p-2 text-right">{batchItem.finished_packs?.toLocaleString() || '0'}</td>
                        <td className="p-2 text-right">-</td>
                        <td className="p-2">{getStatusBadge(batchItem.status)}</td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(batchItem.id!, 'completed')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {completedBatches.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-4 text-muted-foreground">No completed batches found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Obsolete/Scrap Tab */}
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
                      <th className="text-left p-2">Item</th>
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">UOM</th>
                      <th className="text-right p-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.filter(item => item.category === 'Obsolete, Expired & Scrap Inventory').map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className="p-2 text-right font-mono">{item.quantity_on_hand.toLocaleString()}</td>
                       </tr>
                    ))}
                    {scrapItems.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-medium">{item.name || item.scrap_type}</td>
                        <td className="p-2 font-mono text-xs">{item.sku || 'SCRAP'}</td>
                        <td className="p-2">{item.uom || 'pcs'}</td>
                        <td className="p-2 text-right font-mono">{item.quantity?.toLocaleString() || 0}</td>
                         </tr>
                    ))}
                    {rawMaterials.filter(item => item.category === 'Obsolete, Expired & Scrap Inventory').length === 0 && scrapItems.length === 0 && (
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
              Batch Details - {viewStage === 'injection' ? 'Injection Stage' : viewStage === 'blowing' ? 'Blowing Stage' : viewStage === 'packaging' ? 'Packaging Stage' : 'Production Summary'}
            </DialogTitle>
            <DialogDescription>Batch #{selectedViewBatch?.batch_number}</DialogDescription>
          </DialogHeader>
          
          {selectedViewBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div><Label>Batch Number</Label><p className="font-mono text-sm">{selectedViewBatch.batch_number}</p></div>
                <div><Label>Production Date</Label><p>{selectedViewBatch.production_date}</p></div>
                <div><Label>Shift</Label><p>{selectedViewBatch.shift}</p></div>
                <div><Label>Operator</Label><p>{selectedViewBatch.operator_name || '-'}</p></div>
              </div>
              
              {/* Injection Stage View */}
              {(viewStage === 'injection' || viewStage === 'completed') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">INPUT</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Resin Used:</span><span className="font-semibold">{parseFloat(selectedViewBatch.resin_used_kg || 0).toLocaleString()} KG</span></div>
                      <div className="flex justify-between"><span>Masterbatch Used:</span><span className="font-semibold">{parseFloat(selectedViewBatch.masterbatch_used_kg || 0).toLocaleString()} KG</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Total Input:</span><span className="font-bold">{(parseFloat(selectedViewBatch.resin_used_kg || 0) + parseFloat(selectedViewBatch.masterbatch_used_kg || 0)).toLocaleString()} KG</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">OUTPUT</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Preform Type:</span><span className="font-semibold">{selectedViewBatch.preform_type || '-'}</span></div>
                      <div className="flex justify-between"><span>Bags Produced:</span><span className="font-semibold">{parseInt(selectedViewBatch.bags_produced || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Good Preforms:</span><span className="font-semibold">{parseInt(selectedViewBatch.good_preforms_qty || 0).toLocaleString()} pcs</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Total Output:</span><span className="font-bold">{((parseInt(selectedViewBatch.good_preforms_qty || 0) * (selectedViewBatch.preform_weight_grams || 18)) / 1000).toLocaleString()} KG</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">WASTE</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Bad Preforms:</span><span className="font-semibold">{((parseInt(selectedViewBatch.bad_preforms_qty || 0) * (selectedViewBatch.preform_weight_grams || 18)) / 1000).toLocaleString()} KG</span></div>
                      <div className="flex justify-between"><span>Purge Weight:</span><span className="font-semibold">{parseFloat(selectedViewBatch.purge_weight_kg || 0).toLocaleString()} KG</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Total Waste:</span><span className="font-bold text-red-600">{(((parseInt(selectedViewBatch.bad_preforms_qty || 0) * (selectedViewBatch.preform_weight_grams || 18)) / 1000 + parseFloat(selectedViewBatch.purge_weight_kg || 0)).toLocaleString())} KG</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-purple-600">EFFICIENCY</CardTitle></CardHeader>
                    <CardContent><div className="text-center"><p className="text-3xl font-bold text-purple-600">{((((parseInt(selectedViewBatch.good_preforms_qty || 0) * (selectedViewBatch.preform_weight_grams || 18)) / 1000) / (parseFloat(selectedViewBatch.resin_used_kg || 0) + parseFloat(selectedViewBatch.masterbatch_used_kg || 0)) * 100) || 0).toFixed(1)}%</p><p className="text-sm text-muted-foreground">Material Yield</p></div></CardContent>
                  </Card>
                </div>
              )}
              
              {/* Blowing Stage View */}
              {(viewStage === 'blowing' || viewStage === 'completed') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">PREFORMS → BLOWING</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Preforms Taken:</span><span className="font-semibold">{parseInt(selectedViewBatch.preforms_taken || 0).toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Bottles Produced:</span><span className="font-semibold">{parseInt(selectedViewBatch.bottles_produced || 0).toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Damaged:</span><span className="font-semibold text-red-600">{parseInt(selectedViewBatch.bottles_damaged || 0).toLocaleString()} pcs</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Yield:</span><span className="font-bold">{((parseInt(selectedViewBatch.bottles_produced || 0) / (parseInt(selectedViewBatch.preforms_taken || 0) || 1)) * 100).toFixed(1)}%</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">FILLING</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Bottles Filled:</span><span className="font-semibold">{parseInt(selectedViewBatch.bottles_filled || 0).toLocaleString()} pcs</span></div><div className="flex justify-between"><span>Damaged:</span><span className="font-semibold text-red-600">{parseInt(selectedViewBatch.bottles_filled_damaged || 0).toLocaleString()} pcs</span></div></div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">CAPS & LABELS</CardTitle></CardHeader>
                    <CardContent><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Caps Used:</span><span className="font-semibold">{parseInt(selectedViewBatch.caps_taken_pieces || 0).toLocaleString()} pcs</span></div><div className="flex justify-between"><span>Good Capping:</span><span className="font-semibold">{parseInt(selectedViewBatch.caps_good || 0).toLocaleString()} pcs</span></div><div className="flex justify-between"><span>Labels Used:</span><span className="font-semibold">{parseInt(selectedViewBatch.labels_taken || 0).toLocaleString()} pcs</span></div><div className="flex justify-between"><span>Good Labels:</span><span className="font-semibold">{parseInt(selectedViewBatch.labels_good || 0).toLocaleString()} pcs</span></div></div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600">FINISHED GOODS</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Finished Packs:</span><span className="font-semibold">{parseInt(selectedViewBatch.finished_packs || 0).toLocaleString()}</span></div><div className="flex justify-between"><span>Finished Pieces:</span><span className="font-semibold">{parseInt(selectedViewBatch.finished_pieces || 0).toLocaleString()} pcs</span></div><div className="flex justify-between"><span>Damaged Pieces:</span><span className="font-semibold text-red-600">{parseInt(selectedViewBatch.damaged_pieces || 0).toLocaleString()} pcs</span></div></div></CardContent>
                  </Card>
                </div>
              )}
              
              {selectedViewBatch.notes && (<div><Label>Notes</Label><p className="text-sm p-3 bg-muted/30 rounded-lg">{selectedViewBatch.notes}</p></div>)}
            </div>
          )}
          
          <DialogFooter><Button onClick={() => setIsViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New/Edit Production Batch Dialog */}
      <Dialog open={isNewBatchDialogOpen} onOpenChange={setIsNewBatchDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeTab === 'injection' && 'Production Batch - Injection Stage'}
              {activeTab === 'blowing' && 'Production Batch - Blowing Stage'}
              {activeTab === 'packaging' && 'Production Batch - Packaging Stage'}
            </DialogTitle>
            <DialogDescription>
              {activeTab === 'injection' && "Record injection molding data. Click 'Save & Move to Blowing' to continue."}
              {activeTab === 'blowing' && "Record blowing, filling, and capping data. Click 'Save & Move to Packaging' to continue."}
              {activeTab === 'packaging' && "Record packaging data. Click 'Complete Production' to finish."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Workflow Progress Indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className={`flex-1 text-center ${activeTab === 'injection' ? 'text-blue-600 font-bold' : activeTab !== 'injection' ? 'text-green-600' : ''}`}>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${activeTab === 'injection' ? 'bg-blue-600 text-white' : activeTab !== 'injection' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {activeTab !== 'injection' ? <CheckCircle className="h-5 w-5" /> : "1"}
              </div>
              <span className="text-xs">Injection</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200"></div>
            <div className={`flex-1 text-center ${activeTab === 'blowing' ? 'text-blue-600 font-bold' : activeTab === 'packaging' ? 'text-green-600' : ''}`}>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${activeTab === 'blowing' ? 'bg-blue-600 text-white' : activeTab === 'packaging' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {activeTab === 'packaging' ? <CheckCircle className="h-5 w-5" /> : "2"}
              </div>
              <span className="text-xs">Blowing</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-200"></div>
            <div className={`flex-1 text-center ${activeTab === 'packaging' ? 'text-blue-600 font-bold' : ''}`}>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${activeTab === 'packaging' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span className="text-xs">Packaging</span>
            </div>
          </div>
          
          {/* Batch Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label>Batch Number</Label>
              <Input value={batch.batch_number} readOnly className="font-mono text-sm" />
            </div>
            <div>
              <Label>Production Date</Label>
              <Input 
                type="date" 
                value={batch.production_date}
                onChange={e => setBatch({...batch, production_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={batch.shift} onValueChange={val => setBatch({...batch, shift: val})}>
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
                value={batch.operator_name}
                onChange={e => setBatch({...batch, operator_name: e.target.value})}
              />
            </div>
          </div>
          
          {/* Injection Stage - Bad Preforms in KG */}
          {activeTab === 'injection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-600 font-semibold">INPUT</Label>
                  <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                    <div><Label>Resin (PET Material) - KG</Label><Input type="number" step="0.001" placeholder="KG" value={injection.resin_used_kg} onChange={e => setInjection({...injection, resin_used_kg: parseFloat(e.target.value) || 0})} /></div>
                    <div><Label>Masterbatch - KG</Label><Input type="number" step="0.001" placeholder="KG" value={injection.masterbatch_used_kg} onChange={e => setInjection({...injection, masterbatch_used_kg: parseFloat(e.target.value) || 0})} /></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600 font-semibold">OUTPUT</Label>
                  <div className="p-3 bg-green-50 rounded-lg space-y-2">
                    <div><Label>Preform Type</Label>
                      <Select value={injection.preform_weight_grams.toString()} onValueChange={val => {const weight = parseInt(val); setInjection({...injection, preform_weight_grams: weight}); setBatch({...batch, preform_type: weight === 18 ? '18g' : '14g'});}}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="18">18g Preform (for 75CL/50CL bottles)</SelectItem><SelectItem value="14">14g Preform (for 33CL bottles)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Bags Produced</Label><Input type="number" value={injection.bags_produced} onChange={e => setInjection({...injection, bags_produced: parseInt(e.target.value) || 0})} /><p className="text-xs text-muted-foreground mt-1">{injection.preform_weight_grams === 18 ? '1 bag = 30kg' : '1 bag = 25kg'}</p></div>
                      <div><Label>Total Output (KG)</Label><Input type="number" step="0.001" value={totalOutputKg} readOnly className="bg-gray-100" /></div>
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
                          value={badPreformsKg}
                          onChange={e => {
                            const kgValue = parseFloat(e.target.value) || 0;
                            // Convert KG back to pieces for storage
                            const pieces = Math.round((kgValue * 1000) / injection.preform_weight_grams);
                            setInjection({...injection, bad_preforms_qty: pieces});
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Enter waste in KG</p>
                      </div>
                      <div>
                        <Label>Purge Weight (KG)</Label>
                        <Input type="number" step="0.001" placeholder="KG" value={injection.purge_weight_kg} onChange={e => setInjection({...injection, purge_weight_kg: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-purple-600 font-semibold">PRODUCTION SUMMARY</Label>
                  <div className="p-3 bg-purple-50 rounded-lg space-y-2">
                    <div><Label>Good Preforms (calculated)</Label><Input type="number" value={injection.good_preforms_qty} readOnly className="bg-gray-100" /></div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between"><span>Material Efficiency:</span><span className="font-semibold">{efficiency}%</span></div>
                      <div className="flex justify-between"><span>Bad Preforms (KG):</span><span className="font-semibold text-red-600">{badPreformsKg.toFixed(3)} KG</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Blowing Stage */}
          {activeTab === 'blowing' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-600 font-semibold">PREFORMS → BLOWING</Label>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Preforms Available</Label><Input type="number" value={blowing.preforms_taken} readOnly className="bg-gray-100" /><p className="text-xs text-muted-foreground">From injection stage</p></div>
                      <div><Label>Bottles Produced</Label><Input type="number" value={blowing.bottles_produced} onChange={e => setBlowing({...blowing, bottles_produced: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Damaged</Label><Input type="number" value={blowing.bottles_damaged} onChange={e => setBlowing({...blowing, bottles_damaged: parseInt(e.target.value) || 0})} /></div>
                    </div>
                    <div className="mt-2 text-sm"><span className="text-muted-foreground">Yield: </span><span className="font-semibold">{blowingYield}%</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-green-600 font-semibold">FILLING</Label>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Bottles Filled</Label><Input type="number" value={blowing.bottles_filled} onChange={e => setBlowing({...blowing, bottles_filled: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Damaged</Label><Input type="number" value={blowing.bottles_filled_damaged} onChange={e => setBlowing({...blowing, bottles_filled_damaged: parseInt(e.target.value) || 0})} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-yellow-600 font-semibold">CAPS</Label>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Cartons Taken</Label><Input type="number" value={blowing.caps_taken_cartons} onChange={e => setBlowing({...blowing, caps_taken_cartons: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Pieces (Total)</Label><Input type="number" value={blowing.caps_taken_pieces} onChange={e => setBlowing({...blowing, caps_taken_pieces: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Damaged</Label><Input type="number" value={blowing.caps_damaged} onChange={e => setBlowing({...blowing, caps_damaged: parseInt(e.target.value) || 0})} /></div>
                    </div>
                    <div className="mt-2 text-sm"><span>Good Capping: {blowing.caps_good}</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-purple-600 font-semibold">LABELS</Label>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Pieces Taken</Label><Input type="number" value={blowing.labels_taken} onChange={e => setBlowing({...blowing, labels_taken: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Good</Label><Input type="number" value={blowing.labels_good} onChange={e => setBlowing({...blowing, labels_good: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Bad/Damaged</Label><Input type="number" value={blowing.labels_damaged} onChange={e => setBlowing({...blowing, labels_damaged: parseInt(e.target.value) || 0})} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Packaging Stage */}
          {activeTab === 'packaging' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-orange-600 font-semibold">FINISHED GOODS</Label>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Packs (12 bottles)</Label><Input type="number" value={blowing.finished_packs} onChange={e => setBlowing({...blowing, finished_packs: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Pieces</Label><Input type="number" value={blowing.finished_pieces} onChange={e => setBlowing({...blowing, finished_pieces: parseInt(e.target.value) || 0})} /></div>
                      <div><Label>Damaged(pcs)</Label><Input type="number" value={blowing.damaged_pieces} onChange={e => setBlowing({...blowing, damaged_pieces: parseInt(e.target.value) || 0})} /></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Finished Product Type</Label>
                  <Select value={batch.finished_product} onValueChange={val => setBatch({...batch, finished_product: val as any})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="75cl">75cl x12 Pack (from 18g preform)</SelectItem>
                      <SelectItem value="50cl">50cl x12 Pack (from 18g preform)</SelectItem>
                      <SelectItem value="33cl">33cl x20 Pack (from 14g preform)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>REMARKS</Label>
                <Textarea placeholder="Any issues or notes about this production run..." value={batch.notes} onChange={e => setBatch({...batch, notes: e.target.value})} />
              </div>
              
              {/* Scrap Summary */}
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <strong>Scrap Summary (will be moved to Obsolete/Scrap):</strong>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-sm">
                    <span>Bad Preforms: {badPreformsKg.toFixed(3)} KG</span>
                    <span>Blowing Scrap: {totalScrap.blowing_scrap} pcs</span>
                    <span>Filling Scrap: {totalScrap.filling_scrap} pcs</span>
                    <span>Capping Scrap: {totalScrap.capping_scrap} pcs</span>
                    <span>Labeling Scrap: {totalScrap.labeling_scrap} pcs</span>
                    <span className="font-bold">Total Scrap: {totalScrap.total} units</span>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <DialogFooter className="flex justify-between items-center">
            <div>
              {activeTab === 'injection' && <p className="text-sm text-muted-foreground">⚠️ This will create journal entries for raw materials to WIP</p>}
              {activeTab === 'packaging' && <p className="text-sm text-muted-foreground">✅ This will complete production and add finished goods to inventory</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsNewBatchDialogOpen(false); setCurrentBatchId(null); setEditingBatch(null); }}>Cancel</Button>
              <Button onClick={processStage} disabled={isSubmitting} className="bg-blue-600">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {activeTab === 'injection' && 'Save & Move to Blowing'}
                {activeTab === 'blowing' && 'Save & Move to Packaging'}
                {activeTab === 'packaging' && 'Complete Production'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductionModule;
