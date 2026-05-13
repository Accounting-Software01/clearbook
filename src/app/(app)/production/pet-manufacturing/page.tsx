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
import { Loader2, PlusCircle, Factory, Droplets, PackagePlus, AlertTriangle, X, Bot, TestTube2, Scale, Plus } from 'lucide-react';
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

    // Form states
    const [completingOrder, setCompletingOrder] = useState<PetProductionOrder | null>(null);
    const [actualQuantity, setActualQuantity] = useState<number>(0);
    const [defectiveQuantity, setDefectiveQuantity] = useState<number>(0);
    
    const [newBomName, setNewBomName] = useState('');
    const [newBomStage, setNewBomStage] = useState<'injection' | 'blowing'>('injection');
    const [newBomOutputItem, setNewBomOutputItem] = useState('');
    const [newBomComponents, setNewBomComponents] = useState<Partial<PetBomComponent>[]>([{ component_item_id: '', quantity_required: 0, unit_of_measure: 'pcs' }]);

    const [newOrderStage, setNewOrderStage] = useState<'injection' | 'blowing'>('injection');
    const [newOrderBomId, setNewOrderBomId] = useState('');
    const [newOrderQuantity, setNewOrderQuantity] = useState<number>(0);
    const [newOrderDate, setNewOrderDate] = useState(new Date().toISOString().split('T')[0]);
    
    // New form states for bag-based production
    const [newOrderBagsCount, setNewOrderBagsCount] = useState<number>(0);
    const [newOrderBagWeight, setNewOrderBagWeight] = useState<string>("30");
    const [newOrderPreformWeight, setNewOrderPreformWeight] = useState<string>("18");
    const [newOrderDefectiveQty, setNewOrderDefectiveQty] = useState<number>(0);

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
        } catch (error: any) {
             toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveOrder = async () => {
        // Updated validation for bag-based production
        if (!newOrderBomId || !newOrderDate) {
            toast({ title: "Validation Error", description: "Please select a BOM and a date.", variant: "destructive" });
            return;
        }

        if (newOrderStage === 'injection') {
            if (newOrderBagsCount <= 0 || !newOrderBagWeight || !newOrderPreformWeight) {
                toast({ title: "Validation Error", description: "Please enter number of bags, bag weight, and preform weight.", variant: "destructive" });
                return;
            }
        } else {
            if (newOrderQuantity <= 0) {
                toast({ title: "Validation Error", description: "Please enter quantity to produce.", variant: "destructive" });
                return;
            }
        }

        setIsSubmitting(true);

        let productionQuantities;
        let totalMaterialCost = 0;

        // Find the selected BOM to get component details for cost calculation
        const selectedBom = petBoms.find(b => b.id === newOrderBomId);

        // Step 1: Calculate Gross, Net (Good), and Defective quantities
        if (newOrderStage === 'injection') {
            // Calculate based on bag consumption
            const totalRawMaterialKg = newOrderBagsCount * parseFloat(newOrderBagWeight);
            const preformWeightGrams = parseFloat(newOrderPreformWeight);
            const grossOutput = (totalRawMaterialKg * 1000) / preformWeightGrams;
            const defectiveQty = newOrderDefectiveQty; // Use manual input
            const goodQty = grossOutput - defectiveQty;
            
            // Validate that defective quantity doesn't exceed gross output
            if (defectiveQty > grossOutput) {
                toast({ 
                    title: "Validation Error", 
                    description: `Defective quantity (${defectiveQty}) cannot exceed gross production (${Math.floor(grossOutput)} units).`, 
                    variant: "destructive" 
                });
                setIsSubmitting(false);
                return;
            }
            
            productionQuantities = {
                gross: grossOutput,
                good: goodQty,
                defective: defectiveQty
            };

            // Calculate Total Material Cost
            if (selectedBom) {
                totalMaterialCost = selectedBom.components.reduce((costAcc, bomComp) => {
                    const itemDetail = inventoryItems.find(item => item.id == bomComp.component_item_id);
                    // Cost is based on total *gross* output, as all materials are consumed regardless of defects
                    const totalConsumption = productionQuantities.gross * bomComp.quantity_required;
                    const cost = itemDetail ? totalConsumption * itemDetail.unit_cost : 0;
                    return costAcc + cost;
                }, 0);
            }

        } else { // Simplified logic for 'blowing' stage
            productionQuantities = {
                gross: newOrderQuantity,
                good: newOrderQuantity,
                defective: 0, // Assume no defects are planned for blowing orders
            };
            if (selectedBom) {
                totalMaterialCost = selectedBom.components.reduce((costAcc, bomComp) => {
                    const itemDetail = inventoryItems.find(item => item.id == bomComp.component_item_id);
                    const totalConsumption = productionQuantities.gross * bomComp.quantity_required;
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
        
        // Step 3: Calculate the cost per *good* unit produced
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

            // Add bag-based production details for injection orders
            if (newOrderStage === 'injection') {
                payload.bags_count = newOrderBagsCount;
                payload.bag_weight_kg = parseFloat(newOrderBagWeight);
                payload.preform_weight_grams = parseFloat(newOrderPreformWeight);
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
            // Reset form
            setNewOrderBagsCount(0);
            setNewOrderBagWeight("30");
            setNewOrderPreformWeight("18");
            setNewOrderDefectiveQty(0);
            setNewOrderQuantity(0);
        } catch (error: any) {
            toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    // BOM Component Form Handlers
    const addBomComponent = () => setNewBomComponents([...newBomComponents, { component_item_id: '', quantity_required: 0, unit_of_measure: 'pcs' }]);
    const removeBomComponent = (index: number) => setNewBomComponents(newBomComponents.filter((_, i) => i !== index));
    const handleComponentChange = (index: number, field: keyof PetBomComponent, value: string | number) => {
        const updated = [...newBomComponents];
        const component = { ...updated[index], [field]: value };
        updated[index] = component as Partial<PetBomComponent>;
        setNewBomComponents(updated);
    };

    // Reset functions for dialogs
    useEffect(() => {
        if (!isBomDialogOpen) {
            setNewBomName('');
            setNewBomOutputItem('');
            setNewBomComponents([{ component_item_id: '', quantity_required: 0, unit_of_measure: 'pcs' }]);
        }
    }, [isBomDialogOpen]);

    useEffect(() => {
        if (!isCompleteDialogOpen) {
            setCompletingOrder(null);
            setActualQuantity(0);
            setDefectiveQuantity(0);
        }
    }, [isCompleteDialogOpen]);

    useEffect(() => {
        if (!isOrderDialogOpen) {
            setNewOrderBomId('');
            setNewOrderQuantity(0);
            setNewOrderDate(new Date().toISOString().split('T')[0]);
            setNewOrderBagsCount(0);
            setNewOrderBagWeight("30");
            setNewOrderPreformWeight("18");
            setNewOrderDefectiveQty(0);
        }
    }, [isOrderDialogOpen]);
    
    useEffect(() => {
        if (newBomOutputItem) {
            const selectedItem = inventoryItems.find(item => item.id === newBomOutputItem);
            if (selectedItem) {
                setNewBomName(`${selectedItem.name} BOM`);
            }
        } else {
            setNewBomName('');
        }
    }, [newBomOutputItem, inventoryItems]);
    
    // Filtered data for UI
    const injectionBoms = petBoms.filter(b => b.production_stage === 'injection');
    const blowingBoms = petBoms.filter(b => b.production_stage === 'blowing');
    const injectionOrders = petOrders.filter(o => injectionBoms.some(b => b.id === o.pet_bom_id));
    const blowingOrders = petOrders.filter(o => blowingBoms.some(b => b.id === o.pet_bom_id));

    const rawMaterials = inventoryItems.filter(i => i.item_type === 'raw_material');
    const preforms = inventoryItems.filter(i => i.category === 'Semi_finished'); 
    const emptyBottles = inventoryItems.filter(i => ['Sub-assemblies', 'Intermediate Products'].includes(i.category));
    const finishedGoods = inventoryItems.filter(i => i.item_type === 'product');

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
            {/* ==================== PAGE HEADER ==================== */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">PET Production Module</h1>
                    <p className="text-muted-foreground">Manage multi-stage production for preforms and bottles.</p>
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
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="bom-name" className="text-right">BOM Name</Label>
                                <Input 
                                    id="bom-name" 
                                    value={newBomName} 
                                    readOnly 
                                    placeholder="Auto-generated from Output Item" 
                                    className="col-span-3 bg-muted/50" 
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
                                                Injection (Raw Material → Preform)
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="blowing">
                                            <div className='flex items-center'>
                                                <Factory className="mr-2 h-4 w-4"/>
                                                Blowing (Preform → Bottle)
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
                                            <SelectValue placeholder="Select an output item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(newBomStage === 'injection' ? preforms : emptyBottles).map(item => (
                                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button type="button" variant="outline" size="icon" onClick={() => setIsRegisterItemDialogOpen(true)} title="Add New Item">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="font-semibold">Components (Raw Materials)</Label>
                            </div>
                            {newBomComponents.map((comp, index) => (
                                <div key={index} className="grid grid-cols-12 items-center gap-2 pl-4 border-l-2">
                                    <div className="col-span-6">
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
                                            placeholder="Qty" 
                                            value={comp.quantity_required} 
                                            onChange={e => handleComponentChange(index, 'quantity_required', e.target.value)} 
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Select value={comp.unit_of_measure} onValueChange={(v: any) => handleComponentChange(index, 'unit_of_measure', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pcs">pcs</SelectItem>
                                                <SelectItem value="kg">kg</SelectItem>
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
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={handleSaveBom} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save BOM
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            {/* ==================== CREATE NEW ORDER DIALOG ==================== */}
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Create New {newOrderStage === 'injection' ? 'Injection' : 'Blowing'} Order</DialogTitle>
                        <DialogDescription>
                            {newOrderStage === 'injection' 
                                ? 'Enter bag consumption details to calculate preform production.' 
                                : 'Enter the quantity of bottles to produce from preforms.'}
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
                                {/* ==================== PRODUCTION RUN PARAMETERS (BAG-BASED) ==================== */}
                                <Card className="mt-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Production Run Parameters</CardTitle>
                                        <CardDescription>
                                            Calculate preform output based on raw material bag consumption
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6">
                                            {/* Bag Input Section */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Number of Bags</Label>
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
                                                    <p className="text-xs text-muted-foreground">Each bag contains raw material (18/15 gram pet preform)</p>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Bag Weight (kg)</Label>
                                                    <Select value={newOrderBagWeight} onValueChange={(val) => {
                                                        setNewOrderBagWeight(val);
                                                        setNewOrderDefectiveQty(0);
                                                    }}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select bag weight" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="25">25 kg bag</SelectItem>
                                                            <SelectItem value="30">30 kg bag</SelectItem>
                                                            <SelectItem value="50">50 kg bag</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-muted-foreground">Standard bag weight options</p>
                                                </div>
                                            </div>

                                            {/* Preform Type Selection */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Preform Weight (grams)</Label>
                                                <Select value={newOrderPreformWeight} onValueChange={(val) => {
                                                    setNewOrderPreformWeight(val);
                                                    setNewOrderDefectiveQty(0);
                                                }}>
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
                                                <p className="text-xs text-muted-foreground">Weight of each individual preform</p>
                                            </div>

                                            {/* Calculation Results with Manual Defect Input */}
                                            {newOrderBagsCount > 0 && newOrderBagWeight && newOrderPreformWeight && (
                                                <div className="bg-primary/5 rounded-lg p-4 space-y-3">
                                                    <h4 className="font-semibold text-sm">Production Calculation</h4>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Total Raw Material:</p>
                                                            <p className="font-bold text-lg">
                                                                {((newOrderBagsCount * parseFloat(newOrderBagWeight)) / 1000).toFixed(2)} tons
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                ({newOrderBagsCount} bags × {newOrderBagWeight}kg = {(newOrderBagsCount * parseFloat(newOrderBagWeight)).toLocaleString()} kg)
                                                            </p>
                                                        </div>
                                                        
                                                        <div>
                                                            <p className="text-muted-foreground">Gross Production:</p>
                                                            <p className="font-bold text-xl text-blue-600">
                                                                {Math.floor((newOrderBagsCount * parseFloat(newOrderBagWeight) * 1000) / parseFloat(newOrderPreformWeight)).toLocaleString()} units
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                ({newOrderBagsCount} × {newOrderBagWeight}kg × 1000 ÷ {newOrderPreformWeight}g)
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Manual Defective Quantity Input */}
                                                    <div className="border-t pt-4 mt-2">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium">Defective Quantity (manual input)</Label>
                                                                <Input 
                                                                    type="number" 
                                                                    placeholder="Enter defective units"
                                                                    value={newOrderDefectiveQty}
                                                                    onChange={e => {
                                                                        const defectQty = Number(e.target.value);
                                                                        const grossQty = (newOrderBagsCount * parseFloat(newOrderBagWeight) * 1000) / parseFloat(newOrderPreformWeight);
                                                                        
                                                                        if (defectQty <= grossQty) {
                                                                            setNewOrderDefectiveQty(defectQty);
                                                                        } else {
                                                                            toast({ 
                                                                                title: "Invalid Input", 
                                                                                description: `Defective quantity cannot exceed gross production (${Math.floor(grossQty).toLocaleString()} units)`, 
                                                                                variant: "destructive" 
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="text-lg"
                                                                />
                                                                <p className="text-xs text-muted-foreground">Enter the actual number of defective units</p>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-medium">Defect Percentage</Label>
                                                                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-center">
                                                                    <p className="text-2xl font-bold text-red-600">
                                                                        {(() => {
                                                                            const grossQty = (newOrderBagsCount * parseFloat(newOrderBagWeight) * 1000) / parseFloat(newOrderPreformWeight);
                                                                            if (grossQty > 0 && newOrderDefectiveQty > 0) {
                                                                                return ((newOrderDefectiveQty / grossQty) * 100).toFixed(2);
                                                                            }
                                                                            return "0.00";
                                                                        })()}%
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">Calculated automatically</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-semibold">Net Good Output:</span>
                                                                <span className="text-2xl font-bold text-green-600">
                                                                    {(() => {
                                                                        const grossQty = (newOrderBagsCount * parseFloat(newOrderBagWeight) * 1000) / parseFloat(newOrderPreformWeight);
                                                                        const goodQty = grossQty - newOrderDefectiveQty;
                                                                        return Math.floor(goodQty).toLocaleString();
                                                                    })()} units
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Gross production minus defective quantity
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* ==================== ESTIMATED MATERIAL CONSUMPTION CARD ==================== */}
                                {(() => {
                                    const selectedBom = petBoms.find(b => b.id === newOrderBomId);
                                    if (!selectedBom || !newOrderBagsCount || !newOrderBagWeight || !newOrderPreformWeight) return null;

                                    // Calculate total raw material in kg
                                    const totalRawMaterialKg = newOrderBagsCount * parseFloat(newOrderBagWeight);
                                    const preformWeightGrams = parseFloat(newOrderPreformWeight);
                                    
                                    // Calculate gross output (total preforms possible)
                                    const grossOutput = (totalRawMaterialKg * 1000) / preformWeightGrams;
                                    
                                    // Use manual defective quantity
                                    const defectiveQty = newOrderDefectiveQty;
                                    const goodQty = grossOutput - defectiveQty;

                                    const detailedComponents = selectedBom.components.map(comp => {
                                        const itemDetail = inventoryItems.find(item => item.id == comp.component_item_id);
                                        // Total consumption based on gross output (all raw material is consumed)
                                        const totalConsumption = grossOutput * comp.quantity_required;
                                        const cost = itemDetail ? totalConsumption * itemDetail.unit_cost : 0;
                                        const quantityOnHand = itemDetail ? Number(itemDetail.quantity_on_hand) : 0;

                                        return {
                                            ...comp,
                                            name: itemDetail ? itemDetail.name : `ID: ${comp.component_item_id}`,
                                            totalConsumption: totalConsumption,
                                            cost: cost,
                                            quantity_on_hand: quantityOnHand,
                                            isShortage: quantityOnHand < totalConsumption,
                                            hasNoCost: itemDetail ? itemDetail.unit_cost == 0 : true
                                        };
                                    });

                                    const totalMaterialCost = detailedComponents.reduce((acc, comp) => acc + comp.cost, 0);
                                    const defectPercentage = grossOutput > 0 ? (defectiveQty / grossOutput) * 100 : 0;

                                    return (
                                        <Card className="mt-4 border-dashed">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg">Estimated Material Consumption & Production Output</CardTitle>
                                                <CardDescription>
                                                    Based on {newOrderBagsCount} bag(s) of {newOrderBagWeight}kg each for {newOrderPreformWeight}g preforms
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                {/* Production Summary */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Raw Material</p>
                                                        <p className="font-bold">{totalRawMaterialKg.toLocaleString()} kg</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Gross Output</p>
                                                        <p className="font-bold text-blue-600">{Math.floor(grossOutput).toLocaleString()} units</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Defective</p>
                                                        <p className="font-bold text-red-600">{defectiveQty.toLocaleString()} units ({defectPercentage.toFixed(2)}%)</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Good Output</p>
                                                        <p className="font-bold text-green-600">{Math.floor(goodQty).toLocaleString()} units</p>
                                                    </div>
                                                </div>

                                                {detailedComponents.length > 0 ? (
                                                    <div className="space-y-3">
                                                        <h4 className="font-semibold text-sm">Raw Material Requirements</h4>
                                                        <ul className="space-y-2 text-sm">
                                                            {detailedComponents.map(comp => (
                                                                <li key={comp.component_item_id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-medium text-slate-800 dark:text-slate-100">{comp.name}</span>
                                                                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                                                            {comp.totalConsumption.toLocaleString(undefined, { maximumFractionDigits: 2 })} {comp.unit_of_measure}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                        Available on hand: {(comp.quantity_on_hand || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {comp.unit_of_measure}
                                                                    </div>
                                                                    {comp.isShortage && (
                                                                        <div className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-2 bg-red-100/50 dark:bg-red-900/20 p-2 rounded-md">
                                                                            <AlertTriangle className="h-4 w-4" />
                                                                            <span>Warning: Insufficient stock for this production run.</span>
                                                                        </div>
                                                                    )}
                                                                    {comp.hasNoCost && comp.totalConsumption > 0 && !comp.isShortage && (
                                                                        <div className="mt-2 text-xs font-semibold text-amber-600 flex items-center gap-2 bg-amber-100/50 dark:bg-amber-900/20 p-2 rounded-md">
                                                                            <AlertTriangle className="h-4 w-4" />
                                                                            <span>Notice: Unit cost is NGN 0, affecting total cost accuracy.</span>
                                                                        </div>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
                                                            <span className="text-base font-bold text-gray-700 dark:text-slate-200">Total Estimated Material Cost</span>
                                                            <span className="text-lg font-bold text-gray-900 dark:text-slate-50">
                                                                {totalMaterialCost.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">
                                                        This Bill of Materials has no components defined.
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })()}
                            </div>
                        ) : (
                            // SIMPLE UI FOR BLOWING ORDERS
                            <div className="grid grid-cols-4 items-center gap-4 pt-4 px-4">
                                <Label className="text-right">Quantity to Produce (bottles)</Label>
                                <Input 
                                    type="number" 
                                    value={newOrderQuantity} 
                                    onChange={e => setNewOrderQuantity(Number(e.target.value))} 
                                    className="col-span-3" 
                                    placeholder="Enter number of bottles"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSaveOrder} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Create Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ==================== MAIN CONTENT TABS ==================== */}
            <Tabs defaultValue="injection">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="injection">
                        <Droplets className="mr-2 h-4 w-4"/> Preform Injection
                    </TabsTrigger>
                    <TabsTrigger value="blowing">
                        <Factory className="mr-2 h-4 w-4"/> Bottle Blowing
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="injection" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Preform Injection Orders</CardTitle>
                                <CardDescription>Track the production of preforms from raw materials (bag-based consumption).</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => { setNewOrderStage('injection'); setIsOrderDialogOpen(true); }}>
                                <PackagePlus className="mr-2 h-4 w-4"/>
                                New Injection Order
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {renderOrderTable(injectionOrders, injectionBoms)}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="blowing" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Bottle Blowing Orders</CardTitle>
                                <CardDescription>Track the production of bottles from preforms.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => { setNewOrderStage('blowing'); setIsOrderDialogOpen(true); }}>
                                <PackagePlus className="mr-2 h-4 w-4"/>
                                New Blowing Order
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {renderOrderTable(blowingOrders, blowingBoms)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            {/* ==================== COMPLETE ORDER DIALOG ==================== */}
            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Production Order</DialogTitle>
                        <DialogDescription>Enter quantities produced. This will consume inputs and add output to inventory.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="actual-qty" className="text-right">Good Quantity</Label>
                            <Input 
                                id="actual-qty" 
                                type="number" 
                                value={actualQuantity} 
                                onChange={(e) => setActualQuantity(Number(e.target.value))} 
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="defective-qty" className="text-right">Defective Qty</Label>
                            <Input 
                                id="defective-qty" 
                                type="number" 
                                value={defectiveQuantity} 
                                onChange={(e) => setDefectiveQuantity(Number(e.target.value))} 
                                className="col-span-3"
                            />
                        </div>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                This action is irreversible and will permanently adjust your inventory levels and costs.
                            </AlertDescription>
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
