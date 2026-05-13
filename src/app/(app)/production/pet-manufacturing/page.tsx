'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Factory, Droplets, PackagePlus, AlertTriangle, X, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";
import { RegisterItemDialog } from '@/components/RegisterItemDialog';

//============== TYPES ==============
interface InventoryItem {
    id: string;
    name: string;
    category: string;
    item_type: 'raw_material' | 'semi_finished' | 'product';
    quantity_on_hand: number;
    unit_cost: number;
}

interface PetBomComponent {
    component_item_id: string;
    quantity_required: number;
    unit_of_measure: 'kg' | 'pcs';
    component_item_name?: string;
}

interface PetBom {
    id: string;
    bom_name: string;
    output_item_id: string;
    output_item_name?: string;
    production_stage: 'injection' | 'blowing';
    production_hours?: number;
    components: PetBomComponent[];
}

interface PetProductionOrder {
    id: string;
    pet_bom_id: string;
    bom_name?: string;
    order_date: string;
    quantity_to_produce: number;
    quantity_produced?: number;
    quantity_defective?: number;
    status: 'Planned' | 'In Progress' | 'Completed';
    cost_per_unit_produced?: number;
}

//============== COMPONENT ==============
const PETProductionPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data states
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [petBoms, setPetBoms] = useState<PetBom[]>([]);
    const [petOrders, setPetOrders] = useState<PetProductionOrder[]>([]);
    
    // Dialog states
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const [isBomDialogOpen, setIsBomDialogOpen] = useState(false);
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
    const [isRegisterItemDialogOpen, setIsRegisterItemDialogOpen] = useState(false);
    const [isViewBomDialogOpen, setIsViewBomDialogOpen] = useState(false);
    const [isEditBomDialogOpen, setIsEditBomDialogOpen] = useState(false);
    const [isDeleteBomDialogOpen, setIsDeleteBomDialogOpen] = useState(false);

    // Form states
    const [completingOrder, setCompletingOrder] = useState<PetProductionOrder | null>(null);
    const [actualQuantity, setActualQuantity] = useState<number>(0);
    const [defectiveQuantity, setDefectiveQuantity] = useState<number>(0);
    
    const [newBomName, setNewBomName] = useState('');
    const [newBomStage, setNewBomStage] = useState<'injection' | 'blowing'>('injection');
    const [newBomOutputItem, setNewBomOutputItem] = useState('');
    const [newBomComponents, setNewBomComponents] = useState<Partial<PetBomComponent>[]>([{ component_item_id: '', quantity_required: 0, unit_of_measure: 'kg' }]);
    
    // For editing BOM
    const [editingBom, setEditingBom] = useState<PetBom | null>(null);
    const [deletingBom, setDeletingBom] = useState<PetBom | null>(null);
    const [viewingBom, setViewingBom] = useState<PetBom | null>(null);

    const [newOrderStage, setNewOrderStage] = useState<'injection' | 'blowing'>('injection');
    const [newOrderBomId, setNewOrderBomId] = useState('');
    const [newOrderQuantity, setNewOrderQuantity] = useState<number>(0);
    const [newOrderDate, setNewOrderDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Form states for bag-based OUTPUT production (Injection)
    const [newOrderBagsCount, setNewOrderBagsCount] = useState<number>(0);
    const [newOrderBagWeight, setNewOrderBagWeight] = useState<string>("30");
    const [newOrderPreformWeight, setNewOrderPreformWeight] = useState<string>("18");
    const [newOrderDefectiveQty, setNewOrderDefectiveQty] = useState<number>(0);

    // Form states for blowing production
    const [newOrderBottleType, setNewOrderBottleType] = useState<string>("75cl");
    const [newOrderPreformType, setNewOrderPreformType] = useState<string>("18");
    const [newOrderBottlesCount, setNewOrderBottlesCount] = useState<number>(0);
    const [newOrderBlowingDefectiveQty, setNewOrderBlowingDefectiveQty] = useState<number>(0);

    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-pet-production-data.php?company_id=${user.company_id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch data.");
            }

            setInventoryItems(data.items || []);
            setPetBoms(data.boms || []);
            setPetOrders(data.orders || []);

        } catch (error: any) {
            toast({ title: "Error Loading Data", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCompleteOrder = async () => {
        if (!completingOrder || actualQuantity <= 0 || !user?.company_id) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/pet-production-complete.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    production_order_id: completingOrder.id, 
                    quantity_produced: actualQuantity, 
                    quantity_defective: defectiveQuantity,
                    company_id: user.company_id 
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "Production Completed", description: `Order completed. Cost updated. ${result.message || ''}` });
            fetchData();
            setIsCompleteDialogOpen(false);
        } catch (error: any) {
             toast({ title: "Completion Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveBom = async () => {
        if (!newBomName || !newBomOutputItem || newBomComponents.some(c => !c.component_item_id || !c.quantity_required || c.quantity_required <= 0)) {
            toast({ title: "Validation Error", description: "Please fill all BOM fields and ensure component quantities are greater than zero.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
             const response = await fetch(`https://hariindustries.net/api/clearbook/create-pet-bom.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    company_id: user.company_id,
                    bom_name: newBomName,
                    output_item_id: newBomOutputItem,
                    production_stage: newBomStage,
                    components: newBomComponents
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "BOM Saved", description: "New Bill of Materials has been created successfully." });
            fetchData();
            setIsBomDialogOpen(false);
            resetBomForm();
        } catch (error: any) {
             toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateBom = async () => {
        if (!editingBom || !newBomName || !newBomOutputItem || newBomComponents.some(c => !c.component_item_id || !c.quantity_required || c.quantity_required <= 0)) {
            toast({ title: "Validation Error", description: "Please fill all BOM fields.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/update-pet-bom.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user.company_id,
                    bom_id: editingBom.id,
                    bom_name: newBomName,
                    output_item_id: newBomOutputItem,
                    production_stage: newBomStage,
                    components: newBomComponents
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "BOM Updated", description: "Bill of Materials has been updated successfully." });
            fetchData();
            setIsEditBomDialogOpen(false);
            resetBomForm();
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBom = async () => {
        if (!deletingBom) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/delete-pet-bom.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user.company_id,
                    bom_id: deletingBom.id
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "BOM Deleted", description: "Bill of Materials has been deleted successfully." });
            fetchData();
            setIsDeleteBomDialogOpen(false);
            setDeletingBom(null);
        } catch (error: any) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetBomForm = () => {
        setNewBomName('');
        setNewBomOutputItem('');
        setNewBomComponents([{ component_item_id: '', quantity_required: 0, unit_of_measure: 'kg' }]);
        setEditingBom(null);
    };

    const handleEditBom = (bom: PetBom) => {
        setEditingBom(bom);
        setNewBomName(bom.bom_name);
        setNewBomStage(bom.production_stage);
        setNewBomOutputItem(bom.output_item_id);
        setNewBomComponents(bom.components.map(c => ({ ...c })));
        setIsEditBomDialogOpen(true);
    };

    const handleSaveOrder = async () => {
        if (!newOrderBomId || !newOrderDate) {
            toast({ title: "Validation Error", description: "Please select a BOM and a date.", variant: "destructive" });
            return;
        }

        if (newOrderStage === 'injection') {
            if (newOrderBagsCount <= 0 || !newOrderBagWeight || !newOrderPreformWeight) {
                toast({ title: "Validation Error", description: "Please enter number of bags produced, bag weight, and preform weight.", variant: "destructive" });
                return;
            }
        } else {
            if (newOrderBottlesCount <= 0 || !newOrderBottleType || !newOrderPreformType) {
                toast({ title: "Validation Error", description: "Please enter number of bottles, bottle size, and preform type.", variant: "destructive" });
                return;
            }
        }

        setIsSubmitting(true);

        let productionQuantities;
        let totalMaterialCost = 0;
        const selectedBom = petBoms.find(b => b.id === newOrderBomId);

        if (newOrderStage === 'injection') {
            // Calculate total preforms from bags produced
            const totalPreformsOutput = (newOrderBagsCount * parseFloat(newOrderBagWeight) * 1000) / parseFloat(newOrderPreformWeight);
            const defectiveQty = newOrderDefectiveQty;
            const goodQty = totalPreformsOutput - defectiveQty;
            
            if (defectiveQty > totalPreformsOutput) {
                toast({ title: "Validation Error", description: `Defective quantity cannot exceed total preforms produced.`, variant: "destructive" });
                setIsSubmitting(false);
                return;
            }
            
            productionQuantities = { gross: totalPreformsOutput, good: goodQty, defective: defectiveQty };

            if (selectedBom) {
                const totalOutputKg = newOrderBagsCount * parseFloat(newOrderBagWeight);
                totalMaterialCost = selectedBom.components.reduce((costAcc, bomComp) => {
                    const itemDetail = inventoryItems.find(item => item.id == bomComp.component_item_id);
                    const totalConsumption = newOrderBagsCount * bomComp.quantity_required;
                    const cost = itemDetail ? totalConsumption * itemDetail.unit_cost : 0;
                    return costAcc + cost;
                }, 0);
            }
        } else {
            // BLOWING PRODUCTION CALCULATION
            // Different bottle sizes require different number of preforms
            let preformsNeededPerBottle = 1; // Default: 1 preform per bottle
            
            // Some large bottles might need 2 preforms? Adjust as needed
            if (newOrderBottleType === "150cl" || newOrderBottleType === "200cl") {
                preformsNeededPerBottle = 2;
            }
            
            const totalPreformsUsed = newOrderBottlesCount * preformsNeededPerBottle;
            const defectiveQty = newOrderBlowingDefectiveQty;
            const goodQty = newOrderBottlesCount - defectiveQty;
            
            productionQuantities = { 
                gross: newOrderBottlesCount, 
                good: goodQty, 
                defective: defectiveQty 
            };

            if (selectedBom) {
                totalMaterialCost = selectedBom.components.reduce((costAcc, bomComp) => {
                    const itemDetail = inventoryItems.find(item => item.id == bomComp.component_item_id);
                    // For blowing, components are preforms (in pieces)
                    const totalConsumption = totalPreformsUsed * bomComp.quantity_required;
                    const cost = itemDetail ? totalConsumption * itemDetail.unit_cost : 0;
                    return costAcc + cost;
                }, 0);
            }
        }

        const totalQuantityToProduce = productionQuantities.good;

        if (totalQuantityToProduce <= 0) {
            toast({ title: "Validation Error", description: "Total quantity to produce must be greater than zero.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        
        const costPerUnitProduced = totalQuantityToProduce > 0 ? totalMaterialCost / totalQuantityToProduce : 0;

        try {
            const payload: any = {
                company_id: user.company_id,
                pet_bom_id: newOrderBomId,
                order_date: newOrderDate,
                planned_to_produced: productionQuantities.gross,
                quantity_to_produce: totalQuantityToProduce,
                quantity_defective: productionQuantities.defective,
                total_material_cost: totalMaterialCost,
                cost_per_unit_produced: costPerUnitProduced
            };

            if (newOrderStage === 'injection') {
                payload.bags_produced = newOrderBagsCount;
                payload.bag_weight_kg = parseFloat(newOrderBagWeight);
                payload.preform_weight_grams = parseFloat(newOrderPreformWeight);
            } else {
                payload.bottle_size = newOrderBottleType;
                payload.preform_type_grams = parseFloat(newOrderPreformType);
                payload.bottles_produced = newOrderBottlesCount;
            }

            const response = await fetch(`https://hariindustries.net/api/clearbook/create-pet-production-order.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "Production Order Created", description: `New order for ${Math.floor(totalQuantityToProduce).toLocaleString()} units added.` });
            fetchData();
            setIsOrderDialogOpen(false);
            resetOrderForm();
        } catch (error: any) {
            toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const resetOrderForm = () => {
        setNewOrderBomId('');
        setNewOrderQuantity(0);
        setNewOrderDate(new Date().toISOString().split('T')[0]);
        setNewOrderBagsCount(0);
        setNewOrderBagWeight("30");
        setNewOrderPreformWeight("18");
        setNewOrderDefectiveQty(0);
        setNewOrderBottleType("75cl");
        setNewOrderPreformType("18");
        setNewOrderBottlesCount(0);
        setNewOrderBlowingDefectiveQty(0);
    };
    
    const addBomComponent = () => setNewBomComponents([...newBomComponents, { component_item_id: '', quantity_required: 0, unit_of_measure: 'kg' }]);
    const removeBomComponent = (index: number) => setNewBomComponents(newBomComponents.filter((_, i) => i !== index));
    const handleComponentChange = (index: number, field: keyof PetBomComponent, value: string | number) => {
        const updated = [...newBomComponents];
        const component = { ...updated[index], [field]: value };
        updated[index] = component as Partial<PetBomComponent>;
        setNewBomComponents(updated);
    };

    useEffect(() => {
        if (!isBomDialogOpen && !isEditBomDialogOpen) {
            resetBomForm();
        }
    }, [isBomDialogOpen, isEditBomDialogOpen]);

    useEffect(() => {
        if (!isCompleteDialogOpen) {
            setCompletingOrder(null);
            setActualQuantity(0);
            setDefectiveQuantity(0);
        }
    }, [isCompleteDialogOpen]);

    useEffect(() => {
        if (!isOrderDialogOpen) {
            resetOrderForm();
        }
    }, [isOrderDialogOpen]);
    
    useEffect(() => {
        if (newBomOutputItem) {
            const selectedItem = inventoryItems.find(item => item.id === newBomOutputItem);
            if (selectedItem && !editingBom) {
                setNewBomName(`${selectedItem.name} BOM`);
            }
        }
    }, [newBomOutputItem, inventoryItems, editingBom]);
    
    const injectionBoms = petBoms.filter(b => b.production_stage === 'injection');
    const blowingBoms = petBoms.filter(b => b.production_stage === 'blowing');
    const injectionOrders = petOrders.filter(o => injectionBoms.some(b => b.id === o.pet_bom_id));
    const blowingOrders = petOrders.filter(o => blowingBoms.some(b => b.id === o.pet_bom_id));

    const rawMaterials = inventoryItems.filter(i => i.item_type === 'raw_material');
    const preformBags = inventoryItems.filter(i => i.category === 'Semi_finished'); 
    const preforms = inventoryItems.filter(i => i.name?.toLowerCase().includes('preform'));
    const emptyBottles = inventoryItems.filter(i => i.category === 'product');

    const renderBomTable = (boms: PetBom[], stage: string) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>BOM Name</TableHead>
                    <TableHead>Output Item</TableHead>
                    <TableHead>Components</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {boms.map(bom => (
                    <TableRow key={bom.id}>
                        <TableCell className="font-medium">{bom.bom_name}</TableCell>
                        <TableCell>{bom.output_item_name || inventoryItems.find(i => i.id === bom.output_item_id)?.name || 'Unknown'}</TableCell>
                        <TableCell>
                            <div className="space-y-1">
                                {bom.components.map((comp, idx) => {
                                    const compName = inventoryItems.find(i => i.id === comp.component_item_id)?.name || 'Unknown';
                                    return (
                                        <div key={idx} className="text-xs">
                                            {compName}: {comp.quantity_required} {comp.unit_of_measure}
                                        </div>
                                    );
                                })}
                            </div>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => { setViewingBom(bom); setIsViewBomDialogOpen(true); }}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditBom(bom)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setDeletingBom(bom); setIsDeleteBomDialogOpen(true); }}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                {boms.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">No BOMs found. Create one to get started.</TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const renderOrderTable = (orders: PetProductionOrder[], bomsForStage: PetBom[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>BOM Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Planned</TableHead>
                    <TableHead>Produced</TableHead>
                    <TableHead>Defects</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {orders.map(order => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{bomsForStage.find(b=>b.id === order.pet_bom_id)?.bom_name || 'Unknown BOM'}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>{Number(order.quantity_to_produce).toLocaleString()}</TableCell>
                        <TableCell>{order.quantity_produced ? Number(order.quantity_produced).toLocaleString() : '-'}</TableCell>
                        <TableCell>{order.quantity_defective ? Number(order.quantity_defective).toLocaleString() : '-'}</TableCell>
                        <TableCell><Badge variant={order.status === 'Completed' ? 'success' : 'secondary'}>{order.status}</Badge></TableCell>
                        <TableCell className="text-right">
                            {order.status !== 'Completed' && 
                                <Button size="sm" onClick={() => { 
                                    setCompletingOrder(order); 
                                    setActualQuantity(order.quantity_to_produce); 
                                    setDefectiveQuantity(0); 
                                    setIsCompleteDialogOpen(true); 
                                }}>
                                    Complete
                                </Button>
                            }
                        </TableCell>
                    </TableRow>
                ))}
                {orders.length === 0 && 
                    <TableRow>
                        <TableCell colSpan={7} className="text-center h-24">No production orders found.</TableCell>
                    </TableRow>
                }
            </TableBody>
        </Table>
    );

    if (isLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            {/* PAGE HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">PET Production Module</h1>
                    <p className="text-muted-foreground">Manage preform injection and bottle blowing production.</p>
                </div>
            </div>
            
            {/* BOM MANAGEMENT TABS */}
            <Tabs defaultValue="boms" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="boms">Bill of Materials</TabsTrigger>
                    <TabsTrigger value="injection-production">Injection Production</TabsTrigger>
                    <TabsTrigger value="blowing-production">Blowing Production</TabsTrigger>
                </TabsList>

                {/* BOM MANAGEMENT TAB */}
                <TabsContent value="boms" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold">Bill of Materials</h2>
                            <p className="text-muted-foreground">Manage BOMs for preform injection and bottle blowing.</p>
                        </div>
                        <Dialog open={isBomDialogOpen} onOpenChange={setIsBomDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Create New BOM
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>Create New Bill of Materials</DialogTitle>
                                    <DialogDescription>Set up material requirements for production.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">BOM Name</Label>
                                        <Input 
                                            value={newBomName} 
                                            onChange={(e) => setNewBomName(e.target.value)}
                                            placeholder="e.g., 18g Preform - 30kg Bag BOM"
                                            className="col-span-3" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Stage</Label>
                                        <Select value={newBomStage} onValueChange={(v: any) => setNewBomStage(v)}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select stage" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="injection">
                                                    <div className='flex items-center'>
                                                        <Droplets className="mr-2 h-4 w-4"/>
                                                        Injection (Raw Material → Preform Bags)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="blowing">
                                                    <div className='flex items-center'>
                                                        <Factory className="mr-2 h-4 w-4"/>
                                                        Blowing (Preform → Bottles)
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label className="text-right">Output Item</Label>
                                        <div className="col-span-3 flex items-center gap-2">
                                            <Select value={newBomOutputItem} onValueChange={setNewBomOutputItem}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select output item" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(newBomStage === 'injection' ? preformBags : emptyBottles).map(item => (
                                                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="outline" size="icon" onClick={() => setIsRegisterItemDialogOpen(true)}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="font-semibold">Components</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {newBomStage === 'injection' 
                                                ? "Raw materials needed per bag of finished preforms" 
                                                : "Preforms needed per bottle produced"}
                                        </p>
                                    </div>
                                    {newBomComponents.map((comp, index) => (
                                        <div key={index} className="grid grid-cols-12 items-center gap-2 pl-4 border-l-2">
                                            <div className="col-span-5">
                                                <Select value={comp.component_item_id} onValueChange={v => handleComponentChange(index, 'component_item_id', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select component" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(newBomStage === 'injection' ? rawMaterials : preforms).map(item => 
                                                            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-3">
                                                <Input 
                                                    type="number" 
                                                    step="0.01"
                                                    placeholder="Quantity" 
                                                    value={comp.quantity_required} 
                                                    onChange={e => handleComponentChange(index, 'quantity_required', parseFloat(e.target.value))} 
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Select value={comp.unit_of_measure} onValueChange={(v: any) => handleComponentChange(index, 'unit_of_measure', v)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="kg">kg</SelectItem>
                                                        <SelectItem value="pcs">pcs</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-1">
                                                <Button variant="outline" size="icon" onClick={() => removeBomComponent(index)}>
                                                    <X className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="outline" onClick={addBomComponent} className="mt-2">
                                        <PlusCircle className="mr-2 h-4 w-4"/>
                                        Add Component
                                    </Button>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={handleSaveBom} disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Save BOM
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preform Injection BOMs</CardTitle>
                            <CardDescription>BOMs for producing preforms from raw materials.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderBomTable(injectionBoms, 'injection')}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Bottle Blowing BOMs</CardTitle>
                            <CardDescription>BOMs for producing bottles from preforms.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderBomTable(blowingBoms, 'blowing')}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* INJECTION PRODUCTION TAB */}
                <TabsContent value="injection-production" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Preform Injection Production</CardTitle>
                                <CardDescription>Record preform production based on finished bag output.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => { setNewOrderStage('injection'); setIsOrderDialogOpen(true); }}>
                                <PackagePlus className="mr-2 h-4 w-4"/>
                                Record Production
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {renderOrderTable(injectionOrders, injectionBoms)}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BLOWING PRODUCTION TAB */}
                <TabsContent value="blowing-production" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Bottle Blowing Production</CardTitle>
                                <CardDescription>Record bottle production from preforms.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => { setNewOrderStage('blowing'); setIsOrderDialogOpen(true); }}>
                                <PackagePlus className="mr-2 h-4 w-4"/>
                                Record Production
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {renderOrderTable(blowingOrders, blowingBoms)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* CREATE/EDIT PRODUCTION ORDER DIALOG */}
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Record {newOrderStage === 'injection' ? 'Injection' : 'Blowing'} Production</DialogTitle>
                        <DialogDescription>
                            {newOrderStage === 'injection' 
                                ? 'Enter the number of bags produced to calculate total preforms made.' 
                                : 'Enter bottle production details to calculate preform consumption.'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 px-1 max-h-[65vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
                            <Label className="text-right pt-2 md:col-span-1">BOM</Label>
                            <Select value={newOrderBomId} onValueChange={setNewOrderBomId}>
                                <SelectTrigger className="md:col-span-3">
                                    <SelectValue placeholder="Select a BOM" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(newOrderStage === 'injection' ? injectionBoms : blowingBoms).map(bom => 
                                        <SelectItem key={bom.id} value={bom.id}>{bom.bom_name}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            
                            <Label className="text-right pt-2 md:col-span-1">Date</Label>
                            <Input 
                                type="date" 
                                value={newOrderDate} 
                                onChange={e => setNewOrderDate(e.target.value)} 
                                className="md:col-span-3" 
                            />
                        </div>

                        {newOrderStage === 'injection' ? (
                            <div className="px-4">
                                <Card className="mt-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Bag Production Details</CardTitle>
                                        <CardDescription>Enter the number of finished bags produced from your injection run.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Number of Bags Produced</Label>
                                                    <Input 
                                                        type="number" 
                                                        placeholder="Enter number of bags"
                                                        value={newOrderBagsCount}
                                                        onChange={e => {
                                                            setNewOrderBagsCount(Number(e.target.value));
                                                            setNewOrderDefectiveQty(0);
                                                        }}
                                                        className="text-lg"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Bag Weight (kg)</Label>
                                                    <Select value={newOrderBagWeight} onValueChange={setNewOrderBagWeight}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select bag weight" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="25">25 kg bag</SelectItem>
                                                            <SelectItem value="30">30 kg bag</SelectItem>
                                                            <SelectItem value="50">50 kg bag</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Preform Weight (grams)</Label>
                                                    <Select value={newOrderPreformWeight} onValueChange={setNewOrderPreformWeight}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select preform weight" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="14">14 gram preform</SelectItem>
                                                            <SelectItem value="18">18 gram preform</SelectItem>
                                                            <SelectItem value="20">20 gram preform</SelectItem>
                                                            <SelectItem value="24">24 gram preform</SelectItem>
                                                            <SelectItem value="28">28 gram preform</SelectItem>
                                                            <SelectItem value="32">32 gram preform</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {newOrderBagsCount > 0 && (
                                                <div className="bg-primary/5 rounded-lg p-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-muted-foreground">Total Preforms Produced:</p>
                                                            <p className="font-bold text-2xl text-blue-600">
                                                                {Math.floor((newOrderBagsCount * parseFloat(newOrderBagWeight) * 1000) / parseFloat(newOrderPreformWeight)).toLocaleString()} units
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Total Output Weight:</p>
                                                            <p className="font-bold text-lg">
                                                                {(newOrderBagsCount * parseFloat(newOrderBagWeight)).toLocaleString()} kg
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                                                        <div className="space-y-2">
                                                            <Label>Defective Preforms</Label>
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Enter defective units"
                                                                value={newOrderDefectiveQty}
                                                                onChange={e => setNewOrderDefectiveQty(Number(e.target.value))}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Defect Percentage</Label>
                                                            <div className="bg-slate-100 p-2 rounded-md text-center">
                                                                <p className="text-xl font-bold text-red-600">
                                                                    {((newOrderDefectiveQty / ((newOrderBagsCount * parseFloat(newOrderBagWeight) * 1000) / parseFloat(newOrderPreformWeight))) * 100).toFixed(2)}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            // BLOWING PRODUCTION FORM
                            <div className="px-4">
                                <Card className="mt-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Bottle Production Details</CardTitle>
                                        <CardDescription>Enter bottle production details to calculate preform consumption.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Number of Bottles Produced</Label>
                                                    <Input 
                                                        type="number" 
                                                        placeholder="Enter number of bottles"
                                                        value={newOrderBottlesCount}
                                                        onChange={e => setNewOrderBottlesCount(Number(e.target.value))}
                                                        className="text-lg"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Bottle Size</Label>
                                                    <Select value={newOrderBottleType} onValueChange={setNewOrderBottleType}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select bottle size" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="33cl">33cl (0.33L)</SelectItem>
                                                            <SelectItem value="50cl">50cl (0.5L)</SelectItem>
                                                            <SelectItem value="75cl">75cl (0.75L)</SelectItem>
                                                            <SelectItem value="100cl">100cl (1L)</SelectItem>
                                                            <SelectItem value="150cl">150cl (1.5L)</SelectItem>
                                                            <SelectItem value="200cl">200cl (2L)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Preform Type (grams)</Label>
                                                    <Select value={newOrderPreformType} onValueChange={setNewOrderPreformType}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select preform type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="14">14 gram preform</SelectItem>
                                                            <SelectItem value="18">18 gram preform</SelectItem>
                                                            <SelectItem value="20">20 gram preform</SelectItem>
                                                            <SelectItem value="24">24 gram preform</SelectItem>
                                                            <SelectItem value="28">28 gram preform</SelectItem>
                                                            <SelectItem value="32">32 gram preform</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {newOrderBottlesCount > 0 && (
                                                <div className="bg-primary/5 rounded-lg p-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-muted-foreground">Preforms Used:</p>
                                                            <p className="font-bold text-2xl text-blue-600">
                                                                {newOrderBottlesCount.toLocaleString()} units
                                                                {newOrderBottleType === "150cl" || newOrderBottleType === "200cl" ? 
                                                                    ` (${newOrderBottlesCount * 2} preforms needed for large bottles)` : ""}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Preform Weight Used:</p>
                                                            <p className="font-bold text-lg">
                                                                {((newOrderBottlesCount * parseFloat(newOrderPreformType)) / 1000).toLocaleString()} kg
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                                                        <div className="space-y-2">
                                                            <Label>Defective Bottles</Label>
                                                            <Input 
                                                                type="number" 
                                                                placeholder="Enter defective units"
                                                                value={newOrderBlowingDefectiveQty}
                                                                onChange={e => setNewOrderBlowingDefectiveQty(Number(e.target.value))}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Defect Percentage</Label>
                                                            <div className="bg-slate-100 p-2 rounded-md text-center">
                                                                <p className="text-xl font-bold text-red-600">
                                                                    {((newOrderBlowingDefectiveQty / newOrderBottlesCount) * 100).toFixed(2)}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSaveOrder} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Record Production
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* VIEW BOM DIALOG */}
            <Dialog open={isViewBomDialogOpen} onOpenChange={setIsViewBomDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{viewingBom?.bom_name}</DialogTitle>
                        <DialogDescription>
                            {viewingBom?.production_stage === 'injection' ? 'Preform Injection BOM' : 'Bottle Blowing BOM'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Output Item</Label>
                                <p className="font-medium">{inventoryItems.find(i => i.id === viewingBom?.output_item_id)?.name || 'Unknown'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Stage</Label>
                                <p className="font-medium capitalize">{viewingBom?.production_stage}</p>
                            </div>
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Components</Label>
                            <div className="mt-2 space-y-2">
                                {viewingBom?.components.map((comp, idx) => {
                                    const compName = inventoryItems.find(i => i.id === comp.component_item_id)?.name || 'Unknown';
                                    return (
                                        <div key={idx} className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span>{compName}</span>
                                            <span className="font-semibold">{comp.quantity_required} {comp.unit_of_measure}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button>Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* EDIT BOM DIALOG */}
            <Dialog open={isEditBomDialogOpen} onOpenChange={setIsEditBomDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Edit Bill of Materials</DialogTitle>
                        <DialogDescription>Update your BOM details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">BOM Name</Label>
                            <Input 
                                value={newBomName} 
                                onChange={(e) => setNewBomName(e.target.value)}
                                className="col-span-3" 
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Stage</Label>
                            <Select value={newBomStage} onValueChange={(v: any) => setNewBomStage(v)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="injection">Injection</SelectItem>
                                    <SelectItem value="blowing">Blowing</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Output Item</Label>
                            <Select value={newBomOutputItem} onValueChange={setNewBomOutputItem}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(newBomStage === 'injection' ? preformBags : emptyBottles).map(item => (
                                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="font-semibold">Components</Label>
                        </div>
                        {newBomComponents.map((comp, index) => (
                            <div key={index} className="grid grid-cols-12 items-center gap-2 pl-4 border-l-2">
                                <div className="col-span-5">
                                    <Select value={comp.component_item_id} onValueChange={v => handleComponentChange(index, 'component_item_id', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select component" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(newBomStage === 'injection' ? rawMaterials : preforms).map(item => 
                                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="Quantity" 
                                        value={comp.quantity_required} 
                                        onChange={e => handleComponentChange(index, 'quantity_required', parseFloat(e.target.value))} 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Select value={comp.unit_of_measure} onValueChange={(v: any) => handleComponentChange(index, 'unit_of_measure', v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kg">kg</SelectItem>
                                            <SelectItem value="pcs">pcs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-1">
                                    <Button variant="outline" size="icon" onClick={() => removeBomComponent(index)}>
                                        <X className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" onClick={addBomComponent} className="mt-2">
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Add Component
                        </Button>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleUpdateBom} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Update BOM
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE BOM DIALOG */}
            <Dialog open={isDeleteBomDialogOpen} onOpenChange={setIsDeleteBomDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Bill of Materials</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{deletingBom?.bom_name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteBomDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteBom} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* COMPLETE ORDER DIALOG */}
            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Production Order</DialogTitle>
                        <DialogDescription>Enter actual quantities produced. This will update inventory.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Good Quantity</Label>
                            <Input 
                                type="number" 
                                value={actualQuantity} 
                                onChange={(e) => setActualQuantity(Number(e.target.value))} 
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Defective Qty</Label>
                            <Input 
                                type="number" 
                                value={defectiveQuantity} 
                                onChange={(e) => setDefectiveQuantity(Number(e.target.value))} 
                                className="col-span-3"
                            />
                        </div>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>This action is irreversible and will adjust inventory levels.</AlertDescription>
                        </Alert>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCompleteOrder} disabled={isSubmitting || actualQuantity <= 0}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Complete Production
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <RegisterItemDialog
                open={isRegisterItemDialogOpen}
                onOpenChange={setIsRegisterItemDialogOpen}
                onSuccess={() => {
                    toast({ title: "Item List Updated", description: "The inventory items list has been refreshed." });
                    fetchData();
                }}
            />
        </div>
    );
}

export default PETProductionPage;
