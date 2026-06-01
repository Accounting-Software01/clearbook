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
  Send,
  Eye,
  FileEdit,
  PlayCircle,
  Package,
  Layers
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock Data
const MOCK_RAW_MATERIALS = [
  { id: 1, sku: "001", name: "PET Resin", category: "Raw Material", unit_of_measure: "KG", quantity_on_hand: 5000, average_unit_cost: 1.20 },
  { id: 2, sku: "002", name: "Masterbatch", category: "Raw Material", unit_of_measure: "KG", quantity_on_hand: 1000, average_unit_cost: 2.50 },
  { id: 3, sku: "003", name: "18g Preforms", category: "Raw Material", unit_of_measure: "PCS", quantity_on_hand: 50000, average_unit_cost: 0.05 },
  { id: 4, sku: "004", name: "14g Preforms", category: "Raw Material", unit_of_measure: "PCS", quantity_on_hand: 30000, average_unit_cost: 0.04 },
  { id: 5, sku: "005", name: "Caps", category: "Raw Material", unit_of_measure: "CARTON", quantity_on_hand: 150, average_unit_cost: 45.00 }, // 9000 pieces per carton
  { id: 6, sku: "006", name: "Gum/Glue", category: "Raw Material", unit_of_measure: "KG", quantity_on_hand: 200, average_unit_cost: 3.00 },
];

const MOCK_FINISHED_GOODS = [
  { id: 1, sku: "FG001", name: "75cl Water Bottle (12-pack)", unit_of_measure: "PACK", quantity_on_hand: 1200, average_unit_cost: 4.50 },
  { id: 2, sku: "FG002", name: "50cl Water Bottle (12-pack)", unit_of_measure: "PACK", quantity_on_hand: 800, average_unit_cost: 3.80 },
  { id: 3, sku: "FG003", name: "33cl Water Bottle (20-pack)", unit_of_measure: "PACK", quantity_on_hand: 1500, average_unit_cost: 3.20 },
];

const MOCK_PRODUCTION_BATCHES = [
  {
    id: 1,
    batch_number: "BATCH-20231201-0001",
    production_date: "2023-12-01",
    shift: "Morning",
    operator_name: "John Doe",
    status: "completed",
    stage: "completed",
    notes: "Production completed successfully",
    preform_type: "18g",
    finished_product: "75cl",
    resin_used_kg: 500,
    masterbatch_used_kg: 25,
    good_preforms_qty: 27500,
    bad_preforms_qty: 500,
    purge_weight_kg: 10,
    bags_produced: 20,
    preform_weight_grams: 18,
    finished_packs: 2200,
    finished_pieces: 26400,
    bottles_produced: 27000,
    bottles_damaged: 500,
    preforms_taken: 27500,
    bottles_filled: 26500,
    bottles_filled_damaged: 500,
    caps_taken_cartons: 3,
    caps_taken_pieces: 27000,
    caps_good: 26800,
    caps_damaged: 200,
    labels_taken: 26500,
    labels_good: 26300,
    labels_damaged: 200,
    damaged_pieces: 500,
    gum_used_kg: 15,
    shrink_wrap_type: "60",
    shrink_wrap_used_kg: 25,
    cartons_used: 184
  }
];

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
  caps_cartons_used: number;
  caps_pieces_used: number;
  caps_good: number;
  caps_damaged: number;
  labels_taken: number;
  labels_good: number;
  labels_damaged: number;
  finished_packs: number;
  finished_pieces: number;
  damaged_pieces: number;
  gum_used_kg: number;
  shrink_wrap_type: '60' | '70';
  shrink_wrap_used_kg: number;
  cartons_used: number;
}

const ProductionModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [isStockErrorDialogOpen, setIsStockErrorDialogOpen] = useState(false);
  
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(MOCK_RAW_MATERIALS);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>(MOCK_FINISHED_GOODS);
  const [draftBatches, setDraftBatches] = useState<ProductionBatch[]>([]);
  const [wipBatches, setWipBatches] = useState<ProductionBatch[]>([]);
  const [completedBatches, setCompletedBatches] = useState<ProductionBatch[]>(MOCK_PRODUCTION_BATCHES);
  const [scrapItems, setScrapItems] = useState<any[]>([]);
  
  const [selectedViewBatch, setSelectedViewBatch] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewStage, setViewStage] = useState<'injection' | 'blowing' | 'packaging'>('injection');
  
  const [activeTab, setActiveTab] = useState('injection');
  const [isNewBatchDialogOpen, setIsNewBatchDialogOpen] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<number | null>(null);
  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  
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
  
  const [blowing, setBlowing] = useState<BlowingData>({
    preforms_taken: 0,
    preforms_type: '',
    bottles_produced: 0,
    bottles_damaged: 0,
    bottles_filled: 0,
    bottles_filled_damaged: 0,
    caps_cartons_used: 0,
    caps_pieces_used: 0,
    caps_good: 0,
    caps_damaged: 0,
    labels_taken: 0,
    labels_good: 0,
    labels_damaged: 0,
    finished_packs: 0,
    finished_pieces: 0,
    damaged_pieces: 0,
    gum_used_kg: 0,
    shrink_wrap_type: '60',
    shrink_wrap_used_kg: 0,
    cartons_used: 0
  });
  
  const CAPS_PER_CARTON = 9000;
  
  const generateBatchNumber = (productionDate: string) => {
    const date = productionDate.replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BATCH-${date}-${random}`;
  };
  
  const calculateGoodPreforms = () => {
    if (injection.bags_produced > 0 && injection.preform_weight_grams > 0) {
      const kgPerBag = injection.preform_weight_grams === 18 ? 30 : 25;
      const totalKg = injection.bags_produced * kgPerBag;
      const pieces = (totalKg * 1000) / injection.preform_weight_grams;
      setInjection(prev => ({ ...prev, good_preforms_qty: Math.round(pieces) }));
    }
  };
  
  // Automatically set preforms_taken from good preforms from injection stage
  useEffect(() => {
    if (injection.good_preforms_qty > 0 && blowing.preforms_taken === 0) {
      setBlowing(prev => ({ 
        ...prev, 
        preforms_taken: injection.good_preforms_qty,
        preforms_type: batch.preform_type || '18g'
      }));
      toast({
        title: "Preforms Loaded",
        description: `${injection.good_preforms_qty.toLocaleString()} good preforms from injection stage are now available for blowing.`,
      });
    }
  }, [injection.good_preforms_qty, batch.preform_type]);
  
  // Auto-calculate caps based on bottles filled
  useEffect(() => {
    if (blowing.bottles_filled > 0) {
      const capsNeeded = blowing.bottles_filled;
      const capsCartonsNeeded = Math.ceil(capsNeeded / CAPS_PER_CARTON);
      const capsPiecesNeeded = capsNeeded;
      
      setBlowing(prev => ({
        ...prev,
        caps_cartons_used: capsCartonsNeeded,
        caps_pieces_used: capsPiecesNeeded
      }));
    }
  }, [blowing.bottles_filled]);
  
  // Calculate good caps (caps used minus damaged)
  useEffect(() => {
    const calculatedCapsGood = blowing.caps_pieces_used - blowing.caps_damaged;
    if (calculatedCapsGood !== blowing.caps_good && blowing.caps_pieces_used > 0) {
      setBlowing(prev => ({ ...prev, caps_good: Math.max(0, calculatedCapsGood) }));
    }
  }, [blowing.caps_pieces_used, blowing.caps_damaged]);
  
  useEffect(() => {
    if (!editingBatch && batch.production_date && batch.status === 'draft') {
      setBatch(prev => ({
        ...prev,
        batch_number: generateBatchNumber(prev.production_date)
      }));
    }
  }, [batch.production_date, editingBatch, batch.status]);
  
  const totalInputKg = injection.resin_used_kg + injection.masterbatch_used_kg;
  const totalOutputKg = (injection.good_preforms_qty * injection.preform_weight_grams) / 1000;
  const badPreformsKg = (injection.bad_preforms_qty * injection.preform_weight_grams) / 1000;
  const efficiency = totalInputKg > 0 ? ((totalOutputKg / totalInputKg) * 100).toFixed(1) : 0;
  
  const blowingYield = blowing.preforms_taken > 0 
    ? ((blowing.bottles_produced / blowing.preforms_taken) * 100).toFixed(1) 
    : 0;
  
  const totalScrap = {
    preform_scrap_kg: badPreformsKg,
    blowing_scrap: blowing.bottles_damaged,
    filling_scrap: blowing.bottles_filled_damaged,
    capping_scrap: blowing.caps_damaged,
    labeling_scrap: blowing.labels_damaged,
    total: badPreformsKg + injection.purge_weight_kg + blowing.bottles_damaged + blowing.bottles_filled_damaged + 
           blowing.caps_damaged + blowing.labels_damaged + blowing.damaged_pieces
  };
  
  // Mock fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Using mock data
      setRawMaterials(MOCK_RAW_MATERIALS);
      setFinishedGoods(MOCK_FINISHED_GOODS);
      setCompletedBatches(MOCK_PRODUCTION_BATCHES);
      setDraftBatches([]);
      setWipBatches([]);
      setScrapItems([]);
      
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    calculateGoodPreforms();
  }, [injection.bags_produced, injection.preform_weight_grams]);
  
  const viewBatchDetails = async (batchId: number, stage: 'injection' | 'blowing' | 'packaging') => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const batch = MOCK_PRODUCTION_BATCHES.find(b => b.id === batchId);
      if (batch) {
        setSelectedViewBatch(batch);
        setViewStage(stage);
        setIsViewDialogOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadBatchForEditing = async (batchId: number) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const batchData = MOCK_PRODUCTION_BATCHES.find(b => b.id === batchId);
      
      if (batchData) {
        setEditingBatch({
          id: batchData.id,
          batch_number: batchData.batch_number,
          production_date: batchData.production_date,
          shift: batchData.shift,
          operator_name: batchData.operator_name,
          status: batchData.status as any,
          stage: batchData.stage as any,
          notes: batchData.notes,
          preform_type: batchData.preform_type as any,
          finished_product: batchData.finished_product as any
        });
        
        setInjection({
          resin_used_kg: batchData.resin_used_kg,
          masterbatch_used_kg: batchData.masterbatch_used_kg,
          preform_type: batchData.preform_type,
          preform_weight_grams: batchData.preform_weight_grams,
          good_preforms_qty: batchData.good_preforms_qty,
          bad_preforms_qty: batchData.bad_preforms_qty,
          purge_weight_kg: batchData.purge_weight_kg,
          bags_produced: batchData.bags_produced
        });
        
        setBlowing({
          preforms_taken: batchData.preforms_taken,
          preforms_type: batchData.preform_type,
          bottles_produced: batchData.bottles_produced,
          bottles_damaged: batchData.bottles_damaged,
          bottles_filled: batchData.bottles_filled,
          bottles_filled_damaged: batchData.bottles_filled_damaged,
          caps_cartons_used: batchData.caps_taken_cartons,
          caps_pieces_used: batchData.caps_taken_pieces,
          caps_good: batchData.caps_good,
          caps_damaged: batchData.caps_damaged,
          labels_taken: batchData.labels_taken,
          labels_good: batchData.labels_good,
          labels_damaged: batchData.labels_damaged,
          finished_packs: batchData.finished_packs,
          finished_pieces: batchData.finished_pieces,
          damaged_pieces: batchData.damaged_pieces,
          gum_used_kg: batchData.gum_used_kg,
          shrink_wrap_type: batchData.shrink_wrap_type as any,
          shrink_wrap_used_kg: batchData.shrink_wrap_used_kg,
          cartons_used: batchData.cartons_used
        });
        
        setCurrentBatchId(batchData.id);
        
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
          operator_name: batchData.operator_name,
          status: batchData.status as any,
          stage: batchData.stage as any,
          notes: batchData.notes,
          preform_type: batchData.preform_type as any,
          finished_product: batchData.finished_product as any
        });
        
        setIsNewBatchDialogOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const startNewBatch = () => {
    const selectedDate = new Date().toISOString().split('T')[0];
    setCurrentBatchId(null);
    setEditingBatch(null);
    setBatch({
      batch_number: generateBatchNumber(selectedDate),
      production_date: selectedDate,
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
      caps_cartons_used: 0,
      caps_pieces_used: 0,
      caps_good: 0,
      caps_damaged: 0,
      labels_taken: 0,
      labels_good: 0,
      labels_damaged: 0,
      finished_packs: 0,
      finished_pieces: 0,
      damaged_pieces: 0,
      gum_used_kg: 0,
      shrink_wrap_type: '60',
      shrink_wrap_used_kg: 0,
      cartons_used: 0
    });
    setActiveTab('injection');
    setIsNewBatchDialogOpen(true);
  };
  
  const processStage = async () => {
    setIsSubmitting(true);
    
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
      
      // Check if we have enough resin stock
      const resinStock = MOCK_RAW_MATERIALS.find(r => r.sku === "001");
      if (resinStock && resinStock.quantity_on_hand < injection.resin_used_kg) {
        setStockErrors([`Insufficient PET Resin stock. Available: ${resinStock.quantity_on_hand} KG, Required: ${injection.resin_used_kg} KG`]);
        setIsStockErrorDialogOpen(true);
        setIsSubmitting(false);
        return;
      }
      
      toast({ title: "Success", description: "Injection stage completed! Moving to blowing stage." });
      setActiveTab('blowing');
      setBatch(prev => ({ ...prev, status: 'wip', stage: 'blowing' }));
      
    } else if (activeTab === 'blowing') {
      if (blowing.bottles_produced === 0) {
        toast({ title: "Validation Error", description: "Please enter bottles produced", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      
      // Check caps stock
      const capsStock = MOCK_RAW_MATERIALS.find(r => r.sku === "005");
      const capsNeededCartons = blowing.caps_cartons_used;
      if (capsStock && capsStock.quantity_on_hand < capsNeededCartons) {
        setStockErrors([`Insufficient Caps stock. Available: ${capsStock.quantity_on_hand} cartons (${capsStock.quantity_on_hand * CAPS_PER_CARTON} pieces), Required: ${capsNeededCartons} cartons (${capsNeededCartons * CAPS_PER_CARTON} pieces)`]);
        setIsStockErrorDialogOpen(true);
        setIsSubmitting(false);
        return;
      }
      
      toast({ title: "Success", description: "Blowing stage completed! Moving to packaging stage." });
      setActiveTab('packaging');
      setBatch(prev => ({ ...prev, stage: 'packaging' }));
      
    } else if (activeTab === 'packaging') {
      if (blowing.finished_packs === 0) {
        toast({ title: "Validation Error", description: "Please enter finished packs", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      
      toast({ title: "Success", description: "Production completed successfully! Finished goods added to inventory." });
      setIsNewBatchDialogOpen(false);
      setCurrentBatchId(null);
      setEditingBatch(null);
      await fetchData();
    }
    
    setIsSubmitting(false);
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
          <p className="text-muted-foreground">Injection Molding → Blowing → Filling → Packaging</p>
        </div>
        <Button onClick={startNewBatch}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Production Batch
        </Button>
      </div>
      
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
      
      <Tabs defaultValue="raw-materials">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6">
          <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
          <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
          <TabsTrigger value="wip">WIP Batches</TabsTrigger>
          <TabsTrigger value="drafts">Draft Batches</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="obsolete">Obsolete/Scrap</TabsTrigger>
        </TabsList>
        
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
                          {item.unit_of_measure === 'CARTON' 
                            ? `${item.quantity_on_hand.toLocaleString()} cartons (${(item.quantity_on_hand * CAPS_PER_CARTON).toLocaleString()} pcs)`
                            : item.quantity_on_hand.toLocaleString()
                          }
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
                      <th className="text-right p-2">Quantity</th>
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
                        <td colSpan={6} className="text-center p-4 text-muted-foreground">No completed batches found</td>
                      </tr>
                    )}
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
      
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Batch Details - {viewStage === 'injection' ? 'Injection Stage' : viewStage === 'blowing' ? 'Blowing Stage' : 'Production Summary'}
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
              
              {(viewStage === 'injection' || viewStage === 'completed') && (
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
                      <div className="flex justify-between"><span>Preform Type:</span><span className="font-semibold">{selectedViewBatch.preform_type || '-'}</span></div>
                      <div className="flex justify-between"><span>Bags Produced:</span><span className="font-semibold">{selectedViewBatch.bags_produced?.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Good Preforms:</span><span className="font-semibold">{selectedViewBatch.good_preforms_qty?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Total Output:</span><span className="font-bold">{((selectedViewBatch.good_preforms_qty * selectedViewBatch.preform_weight_grams) / 1000).toLocaleString()} KG</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">WASTE</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Bad Preforms:</span><span className="font-semibold">{((selectedViewBatch.bad_preforms_qty * selectedViewBatch.preform_weight_grams) / 1000).toLocaleString()} KG</span></div>
                      <div className="flex justify-between"><span>Purge Weight:</span><span className="font-semibold">{selectedViewBatch.purge_weight_kg?.toLocaleString()} KG</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Total Waste:</span><span className="font-bold text-red-600">{(((selectedViewBatch.bad_preforms_qty * selectedViewBatch.preform_weight_grams) / 1000 + selectedViewBatch.purge_weight_kg).toLocaleString())} KG</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-purple-600">EFFICIENCY</CardTitle></CardHeader>
                    <CardContent><div className="text-center"><p className="text-3xl font-bold text-purple-600">{((((selectedViewBatch.good_preforms_qty * selectedViewBatch.preform_weight_grams) / 1000) / (selectedViewBatch.resin_used_kg + selectedViewBatch.masterbatch_used_kg) * 100) || 0).toFixed(1)}%</p><p className="text-sm text-muted-foreground">Material Yield</p></div></CardContent>
                  </Card>
                </div>
              )}
              
              {(viewStage === 'blowing' || viewStage === 'completed') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">PREFORMS → BLOWING</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span>Preforms Taken:</span><span className="font-semibold">{selectedViewBatch.preforms_taken?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Bottles Produced:</span><span className="font-semibold">{selectedViewBatch.bottles_produced?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Damaged:</span><span className="font-semibold text-red-600">{selectedViewBatch.bottles_damaged?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between border-t pt-2 mt-2"><span>Yield:</span><span className="font-bold">{((selectedViewBatch.bottles_produced / selectedViewBatch.preforms_taken) * 100).toFixed(1)}%</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-green-600">FILLING</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Bottles Filled:</span><span className="font-semibold">{selectedViewBatch.bottles_filled?.toLocaleString()} pcs</span></div><div className="flex justify-between"><span>Damaged:</span><span className="font-semibold text-red-600">{selectedViewBatch.bottles_filled_damaged?.toLocaleString()} pcs</span></div></div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">CAPS & LABELS</CardTitle></CardHeader>
                    <CardContent><div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Caps Cartons Used:</span><span className="font-semibold">{selectedViewBatch.caps_taken_cartons?.toLocaleString()} cartons</span></div>
                      <div className="flex justify-between"><span>Caps Pieces Used:</span><span className="font-semibold">{selectedViewBatch.caps_taken_pieces?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Good Capping:</span><span className="font-semibold">{selectedViewBatch.caps_good?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Damaged Caps:</span><span className="font-semibold text-red-600">{selectedViewBatch.caps_damaged?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Labels Used:</span><span className="font-semibold">{selectedViewBatch.labels_taken?.toLocaleString()} pcs</span></div>
                      <div className="flex justify-between"><span>Good Labels:</span><span className="font-semibold">{selectedViewBatch.labels_good?.toLocaleString()} pcs</span></div>
                    </div></CardContent>
                  </Card>
                  <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600">FINISHED GOODS</CardTitle></CardHeader>
                    <CardContent><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Finished Packs:</span><span className="font-semibold">{selectedViewBatch.finished_packs?.toLocaleString()}</span></div><div className="flex justify-between"><span>Finished Pieces:</span><span className="font-semibold">{selectedViewBatch.finished_pieces?.toLocaleString()} pcs</span></div><div className="flex justify-between"><span>Damaged Pieces:</span><span className="font-semibold text-red-600">{selectedViewBatch.damaged_pieces?.toLocaleString()} pcs</span></div></div></CardContent>
                  </Card>
                </div>
              )}
              
              {selectedViewBatch.notes && (<div><Label>Notes</Label><p className="text-sm p-3 bg-muted/30 rounded-lg">{selectedViewBatch.notes}</p></div>)}
            </div>
          )}
          
          <DialogFooter><Button onClick={() => setIsViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
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
              {activeTab === 'blowing' && "Record blowing, filling, capping, and packaging materials. Click 'Save & Move to Packaging' to continue."}
              {activeTab === 'packaging' && "Record packaging data. Click 'Complete Production' to finish."}
            </DialogDescription>
          </DialogHeader>
          
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label>Batch Number</Label>
              <Input value={batch.batch_number} readOnly className="font-mono text-sm bg-gray-100" />
              <p className="text-xs text-muted-foreground mt-1">Auto-generated based on production date</p>
            </div>
            <div>
              <Label>Production Date</Label>
              <Input 
                type="date" 
                value={batch.production_date}
                onChange={e => setBatch({...batch, production_date: e.target.value})}
                disabled={!!editingBatch && editingBatch.status !== 'draft'}
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
          
          {activeTab === 'injection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-600 font-semibold">INPUT</Label>
                  <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                    <div><Label>Resin (PET Material) - KG (SKU: 001)</Label><Input type="number" step="0.001" placeholder="KG" value={injection.resin_used_kg} onChange={e => setInjection({...injection, resin_used_kg: parseFloat(e.target.value) || 0})} /></div>
                    <div><Label>Masterbatch - KG (SKU: 002)</Label><Input type="number" step="0.001" placeholder="KG" value={injection.masterbatch_used_kg} onChange={e => setInjection({...injection, masterbatch_used_kg: parseFloat(e.target.value) || 0})} /></div>
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
          
          {activeTab === 'blowing' && (
            <div className="space-y-4">
              {/* Alert showing preforms loaded from injection */}
              <Alert className="bg-green-50 border-green-200">
                <Package className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>Preforms Available:</strong> {blowing.preforms_taken.toLocaleString()} good {blowing.preforms_type} preforms from injection stage are ready for blowing.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-600 font-semibold">PREFORMS → BLOWING</Label>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Preforms Taken</Label><Input type="number" value={blowing.preforms_taken} readOnly className="bg-gray-100" /><p className="text-xs text-muted-foreground">Auto-loaded from injection</p></div>
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
                  <Label className="text-yellow-600 font-semibold">CAPS (SKU: 005)</Label>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="space-y-3">
                      <div className="p-2 bg-yellow-100 rounded">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Caps Required:</span>
                          <span className="font-bold text-lg">{blowing.caps_pieces_used.toLocaleString()} pieces</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-sm">Cartons Required:</span>
                          <span className="font-semibold">{blowing.caps_cartons_used} cartons (x{CAPS_PER_CARTON.toLocaleString()} pcs)</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Automatically calculated based on bottles filled</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Damaged Caps</Label>
                          <Input 
                            type="number" 
                            value={blowing.caps_damaged} 
                            onChange={e => setBlowing({...blowing, caps_damaged: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <Label>Good Caps</Label>
                          <Input 
                            type="number" 
                            value={blowing.caps_good} 
                            readOnly 
                            className="bg-gray-100 font-semibold text-green-600"
                          />
                          <p className="text-xs text-muted-foreground">Auto-calculated: Caps Used - Damaged</p>
                        </div>
                      </div>
                    </div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-indigo-600 font-semibold">GUM/GLUE (SKU: 006)</Label>
                  <div className="p-3 bg-indigo-50 rounded-lg">
                    <div><Label>Gum Used (KG)</Label><Input type="number" step="0.1" value={blowing.gum_used_kg} onChange={e => setBlowing({...blowing, gum_used_kg: parseFloat(e.target.value) || 0})} /></div>
                    <p className="text-xs text-muted-foreground mt-1">Adhesive used for labeling (KG)</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-pink-600 font-semibold">SHRINK WRAP</Label>
                  <div className="p-3 bg-pink-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Type</Label>
                        <Select value={blowing.shrink_wrap_type} onValueChange={(val: any) => setBlowing({...blowing, shrink_wrap_type: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="60">60kg Roll</SelectItem>
                            <SelectItem value="70">70kg Roll</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity (KG)</Label>
                        <Input type="number" step="0.1" value={blowing.shrink_wrap_used_kg} onChange={e => setBlowing({...blowing, shrink_wrap_used_kg: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-cyan-600 font-semibold">PACKAGING MATERIALS</Label>
                  <div className="p-3 bg-cyan-50 rounded-lg">
                    <div><Label>Cartons/Packaging Used (PCS)</Label><Input type="number" value={blowing.cartons_used} onChange={e => setBlowing({...blowing, cartons_used: parseInt(e.target.value) || 0})} /></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-teal-600 font-semibold">FINISHED PRODUCT</Label>
                  <div className="p-3 bg-teal-50 rounded-lg">
                    <div><Label>Current Setting</Label>
                      <div className="mt-2 p-2 bg-white rounded">
                        <p className="text-sm font-medium">{batch.finished_product} x{batch.finished_product === '33cl' ? '20' : '12'} Pack</p>
                        <p className="text-xs text-muted-foreground">Final product configuration</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'packaging' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-orange-600 font-semibold">FINISHED GOODS</Label>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label>Packs</Label><Input type="number" value={blowing.finished_packs} onChange={e => setBlowing({...blowing, finished_packs: parseInt(e.target.value) || 0})} /><p className="text-xs text-muted-foreground">{batch.finished_product === '33cl' ? '20 pieces per pack' : '12 pieces per pack'}</p></div>
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
                      <SelectItem value="75cl">75cl x12 Pack</SelectItem>
                      <SelectItem value="50cl">50cl x12 Pack</SelectItem>
                      <SelectItem value="33cl">33cl x20 Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>REMARKS</Label>
                <Textarea placeholder="Any issues or notes about this production run..." value={batch.notes} onChange={e => setBatch({...batch, notes: e.target.value})} />
              </div>
              
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
              {activeTab === 'injection' && <p className="text-sm text-muted-foreground">⚠️ This will consume raw materials and create preforms</p>}
              {activeTab === 'blowing' && <p className="text-sm text-muted-foreground">✅ Preforms will be consumed automatically</p>}
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
