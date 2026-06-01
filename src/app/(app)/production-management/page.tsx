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
  Layers,
  Droplets,
  Box
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock Data
const MOCK_RAW_MATERIALS = [
  { id: 1, sku: "001", name: "PET Resin", category: "Raw Material", unit_of_measure: "KG", quantity_on_hand: 5000, average_unit_cost: 1.20 },
  { id: 2, sku: "002", name: "Masterbatch", category: "Raw Material", unit_of_measure: "KG", quantity_on_hand: 1000, average_unit_cost: 2.50 },
];

const MOCK_PREFORM_INVENTORY = [
  { id: 1, sku: "PREFORM-18G", name: "18g Preforms", unit_of_measure: "PCS", quantity_on_hand: 50000, average_unit_cost: 0.05 },
  { id: 2, sku: "PREFORM-14G", name: "14g Preforms", unit_of_measure: "PCS", quantity_on_hand: 30000, average_unit_cost: 0.04 },
];

const MOCK_CAPS_INVENTORY = [
  { id: 1, sku: "CAPS", name: "Bottle Caps", unit_of_measure: "CARTON", quantity_on_hand: 150, average_unit_cost: 45.00, pieces_per_carton: 9000 },
];

const MOCK_FINISHED_GOODS = [
  { id: 1, sku: "FG001", name: "75cl Water Bottle (12-pack)", unit_of_measure: "PACK", quantity_on_hand: 1200, average_unit_cost: 4.50 },
  { id: 2, sku: "FG002", name: "50cl Water Bottle (12-pack)", unit_of_measure: "PACK", quantity_on_hand: 800, average_unit_cost: 3.80 },
  { id: 3, sku: "FG003", name: "33cl Water Bottle (20-pack)", unit_of_measure: "PACK", quantity_on_hand: 1500, average_unit_cost: 3.20 },
];

const MOCK_INJECTION_BATCHES = [
  {
    id: 1,
    batch_number: "INJ-20231201-0001",
    production_date: "2023-12-01",
    shift: "Morning",
    operator_name: "John Doe",
    status: "completed",
    notes: "Production completed successfully",
    preform_type: "18g",
    resin_used_kg: 500,
    masterbatch_used_kg: 25,
    good_preforms_qty: 27500,
    bad_preforms_qty: 500,
    purge_weight_kg: 10,
    bags_produced: 20,
    preform_weight_grams: 18
  }
];

const MOCK_BLOWING_BATCHES = [
  {
    id: 1,
    batch_number: "BP-20231201-0001",
    production_date: "2023-12-01",
    shift: "Morning",
    operator_name: "Jane Smith",
    status: "completed",
    notes: "Production completed successfully",
    preform_type: "18g",
    finished_product: "75cl",
    preforms_taken: 27500,
    bottles_produced: 27000,
    bottles_damaged: 500,
    bottles_filled: 26500,
    bottles_filled_damaged: 500,
    caps_cartons_used: 3,
    caps_pieces_used: 27000,
    caps_good: 26800,
    caps_damaged: 200,
    labels_taken: 26500,
    labels_good: 26300,
    labels_damaged: 200,
    finished_packs: 2200,
    finished_pieces: 26400,
    damaged_pieces: 500,
    gum_used_kg: 15,
    shrink_wrap_type: "60",
    shrink_wrap_used_kg: 25
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

interface PreformInventory {
  id: number;
  sku: string;
  name: string;
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
  finished_product: '75cl' | '50cl' | '33cl';
  preforms_taken: number;
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
}

const ProductionModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [isStockErrorDialogOpen, setIsStockErrorDialogOpen] = useState(false);
  
  // State for data
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(MOCK_RAW_MATERIALS);
  const [preformInventory, setPreformInventory] = useState<PreformInventory[]>(MOCK_PREFORM_INVENTORY);
  const [capsInventory, setCapsInventory] = useState(MOCK_CAPS_INVENTORY);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>(MOCK_FINISHED_GOODS);
  const [injectionBatches, setInjectionBatches] = useState<InjectionBatch[]>(MOCK_INJECTION_BATCHES);
  const [blowingBatches, setBlowingBatches] = useState<BlowingBatch[]>(MOCK_BLOWING_BATCHES);
  
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
    finished_product: '75cl',
    preforms_taken: 0,
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
    shrink_wrap_used_kg: 0
  });
  
  const CAPS_PER_CARTON = 9000;
  
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
  
  // Auto-calculate caps based on bottles filled
  useEffect(() => {
    if (blowingBatch.bottles_filled > 0) {
      const capsNeeded = blowingBatch.bottles_filled;
      const capsCartonsNeeded = Math.ceil(capsNeeded / CAPS_PER_CARTON);
      const capsPiecesNeeded = capsNeeded;
      
      setBlowingBatch(prev => ({
        ...prev,
        caps_cartons_used: capsCartonsNeeded,
        caps_pieces_used: capsPiecesNeeded
      }));
    }
  }, [blowingBatch.bottles_filled]);
  
  // Calculate good caps (caps used minus damaged)
  useEffect(() => {
    const calculatedCapsGood = blowingBatch.caps_pieces_used - blowingBatch.caps_damaged;
    if (calculatedCapsGood !== blowingBatch.caps_good && blowingBatch.caps_pieces_used > 0) {
      setBlowingBatch(prev => ({ ...prev, caps_good: Math.max(0, calculatedCapsGood) }));
    }
  }, [blowingBatch.caps_pieces_used, blowingBatch.caps_damaged]);
  
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
  
  // Fetch mock data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setRawMaterials(MOCK_RAW_MATERIALS);
      setPreformInventory(MOCK_PREFORM_INVENTORY);
      setCapsInventory(MOCK_CAPS_INVENTORY);
      setFinishedGoods(MOCK_FINISHED_GOODS);
      setInjectionBatches(MOCK_INJECTION_BATCHES);
      setBlowingBatches(MOCK_BLOWING_BATCHES);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // View batch details
  const viewBatchDetails = async (batchId: number, type: 'injection' | 'blowing') => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (type === 'injection') {
        const batch = MOCK_INJECTION_BATCHES.find(b => b.id === batchId);
        if (batch) {
          setSelectedViewBatch(batch);
          setViewType('injection');
          setIsViewDialogOpen(true);
        }
      } else {
        const batch = MOCK_BLOWING_BATCHES.find(b => b.id === batchId);
        if (batch) {
          setSelectedViewBatch(batch);
          setViewType('blowing');
          setIsViewDialogOpen(true);
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load batch for editing
  const loadInjectionBatchForEditing = async (batchId: number) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const batchData = MOCK_INJECTION_BATCHES.find(b => b.id === batchId);
      if (batchData) {
        setEditingBatch(batchData);
        setInjectionBatch(batchData);
        setCurrentBatchId(batchData.id);
        setIsInjectionModalOpen(true);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadBlowingBatchForEditing = async (batchId: number) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const batchData = MOCK_BLOWING_BATCHES.find(b => b.id === batchId);
      if (batchData) {
        setEditingBatch(batchData);
        setBlowingBatch(batchData as BlowingBatch);
        setCurrentBatchId(batchData.id);
        setIsBlowingModalOpen(true);
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
      finished_product: '75cl',
      preforms_taken: 0,
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
    
    // Check if we have enough resin stock
    const resinStock = MOCK_RAW_MATERIALS.find(r => r.sku === "001");
    if (resinStock && resinStock.quantity_on_hand < injectionBatch.resin_used_kg) {
      setStockErrors([`Insufficient PET Resin stock. Available: ${resinStock.quantity_on_hand} KG, Required: ${injectionBatch.resin_used_kg} KG`]);
      setIsStockErrorDialogOpen(true);
      setIsSubmitting(false);
      return;
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add preforms to inventory
      const preformSKU = injectionBatch.preform_type === '18g' ? 'PREFORM-18G' : 'PREFORM-14G';
      const preformItem = preformInventory.find(p => p.sku === preformSKU);
      if (preformItem) {
        preformItem.quantity_on_hand += injectionBatch.good_preforms_qty;
        setPreformInventory([...preformInventory]);
      }
      
      toast({ 
        title: "Success", 
        description: `${injectionBatch.good_preforms_qty.toLocaleString()} ${injectionBatch.preform_type} preforms added to inventory!` 
      });
      
      setIsInjectionModalOpen(false);
      setCurrentBatchId(null);
      setEditingBatch(null);
      await fetchData();
    } catch (error: any) {
      toast({ title: "Process Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Process blowing stage
  const processBlowingStage = async () => {
    if (blowingBatch.preforms_taken === 0) {
      toast({ title: "Validation Error", description: "Please select preforms to use", variant: "destructive" });
      return;
    }
    if (blowingBatch.bottles_produced === 0) {
      toast({ title: "Validation Error", description: "Please enter bottles produced", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    // Check preform stock
    const preformItem = preformInventory.find(p => p.sku === `PREFORM-${blowingBatch.preform_type}`);
    if (preformItem && preformItem.quantity_on_hand < blowingBatch.preforms_taken) {
      setStockErrors([`Insufficient ${blowingBatch.preform_type} preforms. Available: ${preformItem.quantity_on_hand.toLocaleString()}, Required: ${blowingBatch.preforms_taken.toLocaleString()}`]);
      setIsStockErrorDialogOpen(true);
      setIsSubmitting(false);
      return;
    }
    
    // Check caps stock
    const capsItem = capsInventory[0];
    if (capsItem && capsItem.quantity_on_hand < blowingBatch.caps_cartons_used) {
      setStockErrors([`Insufficient Caps stock. Available: ${capsItem.quantity_on_hand} cartons (${capsItem.quantity_on_hand * CAPS_PER_CARTON} pieces), Required: ${blowingBatch.caps_cartons_used} cartons (${blowingBatch.caps_cartons_used * CAPS_PER_CARTON} pieces)`]);
      setIsStockErrorDialogOpen(true);
      setIsSubmitting(false);
      return;
    }
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Deduct preforms from inventory
      if (preformItem) {
        preformItem.quantity_on_hand -= blowingBatch.preforms_taken;
        setPreformInventory([...preformInventory]);
      }
      
      // Deduct caps from inventory
      if (capsItem) {
        capsItem.quantity_on_hand -= blowingBatch.caps_cartons_used;
        setCapsInventory([...capsItem]);
      }
      
      // Add finished goods to inventory
      const finishedGoodSKU = 
        blowingBatch.finished_product === '75cl' ? 'FG001' : 
        blowingBatch.finished_product === '50cl' ? 'FG002' : 'FG003';
      const finishedGoodItem = finishedGoods.find(f => f.sku === finishedGoodSKU);
      if (finishedGoodItem) {
        finishedGoodItem.quantity_on_hand += blowingBatch.finished_packs;
        setFinishedGoods([...finishedGoods]);
      }
      
      toast({ 
        title: "Success", 
        description: `Production completed! ${blowingBatch.finished_packs.toLocaleString()} packs of ${blowingBatch.finished_product} added to inventory.` 
      });
      
      setIsBlowingModalOpen(false);
      setCurrentBatchId(null);
      setEditingBatch(null);
      await fetchData();
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
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Preforms</p>
                <p className="text-2xl font-bold">{preformInventory.reduce((sum, p) => sum + p.quantity_on_hand, 0).toLocaleString()}</p>
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
                <p className="text-sm text-muted-foreground">Caps Available</p>
                <p className="text-2xl font-bold">{capsInventory[0]?.quantity_on_hand || 0} cartons</p>
                <p className="text-xs text-muted-foreground">{(capsInventory[0]?.quantity_on_hand || 0) * CAPS_PER_CARTON} pieces</p>
              </div>
              <Layers className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Finished Goods</p>
                <p className="text-2xl font-bold">{finishedGoods.reduce((sum, f) => sum + f.quantity_on_hand, 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Packs</p>
              </div>
              <Factory className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Production</p>
                <p className="text-2xl font-bold">{injectionBatches.length + blowingBatches.length}</p>
                <p className="text-xs text-muted-foreground">Completed Batches</p>
              </div>
              <TrendingDown className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="preform-inventory">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-5">
          <TabsTrigger value="preform-inventory">Preform Inventory</TabsTrigger>
          <TabsTrigger value="caps-inventory">Caps Inventory</TabsTrigger>
          <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
          <TabsTrigger value="injection-batches">Injection Batches</TabsTrigger>
          <TabsTrigger value="blowing-batches">Blowing Batches</TabsTrigger>
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
                    {preformInventory.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className="p-2 text-right font-bold">{item.quantity_on_hand.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="caps-inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Caps Inventory</CardTitle>
              <CardDescription>Caps for bottling (9,000 pieces per carton).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">UOM</th>
                      <th className="text-right p-2">Cartons</th>
                      <th className="text-right p-2">Pieces</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capsInventory.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{item.sku}</td>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2">{item.unit_of_measure}</td>
                        <td className="p-2 text-right font-bold">{item.quantity_on_hand.toLocaleString()}</td>
                        <td className="p-2 text-right">{(item.quantity_on_hand * CAPS_PER_CARTON).toLocaleString()}</td>
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
                      <th className="text-right p-2">Preforms</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {injectionBatches.map((batchItem) => (
                      <tr key={batchItem.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{batchItem.batch_number}</td>
                        <td className="p-2">{batchItem.production_date}</td>
                        <td className="p-2">{batchItem.preform_type}</td>
                        <td className="p-2 text-right">{batchItem.resin_used_kg.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold text-green-600">{batchItem.good_preforms_qty.toLocaleString()}</td>
                        <td className="p-2">{getStatusBadge(batchItem.status)}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(batchItem.id!, 'injection')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => loadInjectionBatchForEditing(batchItem.id!)}>
                              <FileEdit className="h-4 w-4 text-blue-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {injectionBatches.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-4 text-muted-foreground">No injection batches found. Click "New Injection Batch" to create one.</td>
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
                      <th className="text-right p-2">Packs</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blowingBatches.map((batchItem) => (
                      <tr key={batchItem.id} className="border-b">
                        <td className="p-2 font-mono text-xs">{batchItem.batch_number}</td>
                        <td className="p-2">{batchItem.production_date}</td>
                        <td className="p-2">{batchItem.finished_product}</td>
                        <td className="p-2 text-right">{batchItem.preforms_taken.toLocaleString()}</td>
                        <td className="p-2 text-right font-semibold text-green-600">{batchItem.finished_packs.toLocaleString()}</td>
                        <td className="p-2">{getStatusBadge(batchItem.status)}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewBatchDetails(batchItem.id!, 'blowing')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => loadBlowingBatchForEditing(batchItem.id!)}>
                              <FileEdit className="h-4 w-4 text-blue-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {blowingBatches.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center p-4 text-muted-foreground">No blowing batches found. Click "New Blowing Batch" to create one.</td>
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
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-blue-600">PREFORMS → BLOWING</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1 text-sm">
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
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-600">CAPS & LABELS</CardTitle></CardHeader>
                  <CardContent><div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Caps Cartons Used:</span><span className="font-semibold">{selectedViewBatch.caps_cartons_used?.toLocaleString()} cartons</span></div>
                    <div className="flex justify-between"><span>Caps Pieces Used:</span><span className="font-semibold">{selectedViewBatch.caps_pieces_used?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Good Capping:</span><span className="font-semibold">{selectedViewBatch.caps_good?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Damaged Caps:</span><span className="font-semibold text-red-600">{selectedViewBatch.caps_damaged?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Labels Used:</span><span className="font-semibold">{selectedViewBatch.labels_taken?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Good Labels:</span><span className="font-semibold">{selectedViewBatch.labels_good?.toLocaleString()} pcs</span></div>
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-600">FINISHED GOODS</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Finished Packs:</span><span className="font-semibold">{selectedViewBatch.finished_packs?.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Finished Pieces:</span><span className="font-semibold">{selectedViewBatch.finished_pieces?.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Damaged Pieces:</span><span className="font-semibold text-red-600">{selectedViewBatch.damaged_pieces?.toLocaleString()} pcs</span></div>
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
                  <div><Label>Resin (PET Material) - KG (SKU: 001)</Label><Input type="number" step="0.001" placeholder="KG" value={injectionBatch.resin_used_kg} onChange={e => setInjectionBatch({...injectionBatch, resin_used_kg: parseFloat(e.target.value) || 0})} /></div>
                  <div><Label>Masterbatch - KG (SKU: 002)</Label><Input type="number" step="0.001" placeholder="KG" value={injectionBatch.masterbatch_used_kg} onChange={e => setInjectionBatch({...injectionBatch, masterbatch_used_kg: parseFloat(e.target.value) || 0})} /></div>
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
                    <div><Label>Bags Produced</Label><Input type="number" value={injectionBatch.bags_produced} onChange={e => setInjectionBatch({...injectionBatch, bags_produced: parseInt(e.target.value) || 0})} /><p className="text-xs text-muted-foreground mt-1">{injectionBatch.preform_weight_grams === 18 ? '1 bag = 30kg' : '1 bag = 25kg'}</p></div>
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
                      <Select value={blowingBatch.preform_type} onValueChange={(val: any) => setBlowingBatch({...blowingBatch, preform_type: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18g">18g Preforms</SelectItem>
                          <SelectItem value="14g">14g Preforms</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Preforms to Use</Label>
                      <Input 
                        type="number" 
                        value={blowingBatch.preforms_taken} 
                        onChange={e => setBlowingBatch({...blowingBatch, preforms_taken: parseInt(e.target.value) || 0})}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Available: {preformInventory.find(p => p.sku === `PREFORM-${blowingBatch.preform_type}`)?.quantity_on_hand.toLocaleString() || 0} pcs</p>
                    </div>
                  </div>
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
                <Label className="text-yellow-600 font-semibold">CAPS (SKU: CAPS)</Label>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="space-y-3">
                    <div className="p-2 bg-yellow-100 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Caps Required:</span>
                        <span className="font-bold text-lg">{blowingBatch.caps_pieces_used.toLocaleString()} pieces</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm">Cartons Required:</span>
                        <span className="font-semibold">{blowingBatch.caps_cartons_used} cartons (x{CAPS_PER_CARTON.toLocaleString()} pcs)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Automatically calculated based on bottles filled</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Damaged Caps</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_damaged} 
                          onChange={e => setBlowingBatch({...blowingBatch, caps_damaged: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label>Good Caps</Label>
                        <Input 
                          type="number" 
                          value={blowingBatch.caps_good} 
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
                    <div><Label>Pieces Taken</Label><Input type="number" value={blowingBatch.labels_taken} onChange={e => setBlowingBatch({...blowingBatch, labels_taken: parseInt(e.target.value) || 0})} /></div>
                    <div><Label>Good</Label><Input type="number" value={blowingBatch.labels_good} onChange={e => setBlowingBatch({...blowingBatch, labels_good: parseInt(e.target.value) || 0})} /></div>
                    <div><Label>Damaged</Label><Input type="number" value={blowingBatch.labels_damaged} onChange={e => setBlowingBatch({...blowingBatch, labels_damaged: parseInt(e.target.value) || 0})} /></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-indigo-600 font-semibold">GUM/GLUE</Label>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <div><Label>Gum Used (KG)</Label><Input type="number" step="0.1" value={blowingBatch.gum_used_kg} onChange={e => setBlowingBatch({...blowingBatch, gum_used_kg: parseFloat(e.target.value) || 0})} /></div>
                  <p className="text-xs text-muted-foreground mt-1">Adhesive used for labeling</p>
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
                      <Select value={blowingBatch.finished_product} onValueChange={(val: any) => setBlowingBatch({...blowingBatch, finished_product: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="75cl">75cl (12-pack)</SelectItem>
                          <SelectItem value="50cl">50cl (12-pack)</SelectItem>
                          <SelectItem value="33cl">33cl (20-pack)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Packs</Label><Input type="number" value={blowingBatch.finished_packs} onChange={e => setBlowingBatch({...blowingBatch, finished_packs: parseInt(e.target.value) || 0})} /></div>
                    <div><Label>Damaged(pcs)</Label><Input type="number" value={blowingBatch.damaged_pieces} onChange={e => setBlowingBatch({...blowingBatch, damaged_pieces: parseInt(e.target.value) || 0})} /></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-teal-600 font-semibold">PRODUCTION SUMMARY</Label>
                <div className="p-3 bg-teal-50 rounded-lg">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Total Bottles:</span><span className="font-semibold">{blowingBatch.bottles_produced.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Total Filled:</span><span className="font-semibold">{blowingBatch.bottles_filled.toLocaleString()} pcs</span></div>
                    <div className="flex justify-between"><span>Total Packs:</span><span className="font-semibold text-green-600">{blowingBatch.finished_packs.toLocaleString()} packs</span></div>
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
