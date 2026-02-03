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
import { Loader2, PlusCircle, Factory, Droplets, PackagePlus, AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";

//============== TYPES ==============
interface InventoryItem {
    id: string;
    name: string;
    item_type: 'raw_material' | 'semi_finished' | 'product';
    quantity_on_hand: number;
    unit_cost: number;
}

interface PetBomComponent {
    component_item_id: string;
    quantity_required: number;
    component_item_name?: string;
}

interface PetBom {
    id: string;
    bom_name: string;
    output_item_id: string;
    output_item_name?: string;
    production_stage: 'injection' | 'blowing';
    components: PetBomComponent[];
}

interface PetProductionOrder {
    id: string;
    pet_bom_id: string;
    bom_name?: string;
    order_date: string;
    quantity_to_produce: number;
    quantity_produced?: number;
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

    // Form states
    const [completingOrder, setCompletingOrder] = useState<PetProductionOrder | null>(null);
    const [actualQuantity, setActualQuantity] = useState<number>(0);
    
    const [newBomName, setNewBomName] = useState('');
    const [newBomStage, setNewBomStage] = useState<'injection' | 'blowing'>('injection');
    const [newBomOutputItem, setNewBomOutputItem] = useState('');
    const [newBomComponents, setNewBomComponents] = useState<Partial<PetBomComponent>[]>([{ component_item_id: '', quantity_required: 0 }]);

    const [newOrderStage, setNewOrderStage] = useState<'injection' | 'blowing'>('injection');
    const [newOrderBomId, setNewOrderBomId] = useState('');
    const [newOrderQuantity, setNewOrderQuantity] = useState<number>(0);
    const [newOrderDate, setNewOrderDate] = useState(new Date().toISOString().split('T')[0]);

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
                body: JSON.stringify({ production_order_id: completingOrder.id, quantity_produced: actualQuantity, company_id: user.company_id })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "Production Completed", description: `Order completed. New avg cost: ${result.new_average_cost?.toFixed(5)}` });
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
        if (!newOrderBomId || newOrderQuantity <= 0 || !newOrderDate) {
             toast({ title: "Validation Error", description: "Please select a BOM, and enter a valid quantity and date.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
         try {
             const response = await fetch(`https://hariindustries.net/api/clearbook/create-pet-production-order.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    company_id: user.company_id, 
                    pet_bom_id: newOrderBomId, 
                    quantity_to_produce: newOrderQuantity, 
                    order_date: newOrderDate 
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "Production Order Created", description: "New order has been added to the plan." });
            fetchData();
            setIsOrderDialogOpen(false);
        } catch (error: any) {
             toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    // BOM Component Form Handlers
    const addBomComponent = () => setNewBomComponents([...newBomComponents, { component_item_id: '', quantity_required: 0 }]);
    const removeBomComponent = (index: number) => setNewBomComponents(newBomComponents.filter((_, i) => i !== index));
    const handleComponentChange = (index: number, field: 'component_item_id' | 'quantity_required', value: string) => {
        const updated = [...newBomComponents];
        updated[index] = { ...updated[index], [field]: value };
        setNewBomComponents(updated);
    };

    // Reset functions for dialogs
    useEffect(() => {
        if (!isBomDialogOpen) {
            setNewBomName('');
            setNewBomOutputItem('');
            setNewBomComponents([{ component_item_id: '', quantity_required: 0 }]);
        }
    }, [isBomDialogOpen]);

     useEffect(() => {
        if (!isOrderDialogOpen) {
            setNewOrderBomId('');
            setNewOrderQuantity(0);
            setNewOrderDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOrderDialogOpen]);

    // Filtered data for UI
    const injectionBoms = petBoms.filter(b => b.production_stage === 'injection');
    const blowingBoms = petBoms.filter(b => b.production_stage === 'blowing');
    const injectionOrders = petOrders.filter(o => injectionBoms.some(b => b.id === o.pet_bom_id));
    const blowingOrders = petOrders.filter(o => blowingBoms.some(b => b.id === o.pet_bom_id));

    const rawMaterials = inventoryItems.filter(i => i.item_type === 'raw_material');
    const semiFinishedGoods = inventoryItems.filter(i => i.item_type === 'semi_finished');
    const finishedGoods = inventoryItems.filter(i => i.item_type === 'product');

    const renderOrderTable = (orders: PetProductionOrder[], bomsForStage: PetBom[]) => (
        <Table>
            <TableHeader><TableRow><TableHead>BOM Name</TableHead><TableHead>Date</TableHead><TableHead>Planned</TableHead><TableHead>Produced</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
                {orders.map(order => (
                    <TableRow key={order.id}>
                        <TableCell className="font-medium">{bomsForStage.find(b=>b.id === order.pet_bom_id)?.bom_name || 'Unknown BOM'}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                        <TableCell>{Number(order.quantity_to_produce).toLocaleString()}</TableCell>
                        <TableCell>{order.quantity_produced ? Number(order.quantity_produced).toLocaleString() : '-'}</TableCell>
                        <TableCell><Badge variant={order.status === 'Completed' ? 'success' : 'secondary'}>{order.status}</Badge></TableCell>
                        <TableCell className="text-right">{order.status !== 'Completed' && <Button size="sm" onClick={() => { setCompletingOrder(order); setActualQuantity(order.quantity_to_produce); setIsCompleteDialogOpen(true); }}>Complete</Button>}</TableCell>
                    </TableRow>
                ))}
                {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No production orders found.</TableCell></TableRow>}
            </TableBody>
        </Table>
    );

    if (isLoading) return <div className="flex justify-center items-center h-96"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h1 className="text-3xl font-bold tracking-tight">PET Production Module</h1><p className="text-muted-foreground">Manage multi-stage production for preforms and bottles.</p></div>
                <Dialog open={isBomDialogOpen} onOpenChange={setIsBomDialogOpen}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>Create New BOM</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl"> 
                        <DialogHeader><DialogTitle>Create New Bill of Materials</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="bom-name" className="text-right">BOM Name</Label><Input id="bom-name" value={newBomName} onChange={e => setNewBomName(e.target.value)} className="col-span-3" /></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Stage</Label><Select value={newBomStage} onValueChange={(v: any) => setNewBomStage(v)}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select stage" /></SelectTrigger><SelectContent><SelectItem value="injection">Injection (Raw Material Preform)</SelectItem><SelectItem value="blowing">Blowing (Preform Bottle)</SelectItem></SelectContent></Select></div>
                            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Output Item</Label><Select value={newBomOutputItem} onValueChange={setNewBomOutputItem}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select an output item" /></SelectTrigger><SelectContent>{(newBomStage === 'injection' ? semiFinishedGoods : finishedGoods).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>
                            <div><Label>Components</Label></div>
                            {newBomComponents.map((comp, index) => (
                                <div key={index} className="grid grid-cols-12 items-center gap-2">
                                    <Select value={comp.component_item_id} onValueChange={v => handleComponentChange(index, 'component_item_id', v)}><SelectTrigger className="col-span-7"><SelectValue placeholder="Select component" /></SelectTrigger><SelectContent>{(newBomStage === 'injection' ? rawMaterials : semiFinishedGoods).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
                                    <Input type="number" placeholder="Qty" value={comp.quantity_required} onChange={e => handleComponentChange(index, 'quantity_required', e.target.value)} className="col-span-4" />
                                    <Button variant="outline" size="icon" onClick={() => removeBomComponent(index)} className="col-span-1"><X className="h-4 w-4"/></Button>
                                </div>
                            ))}
                            <Button variant="outline" onClick={addBomComponent}><PlusCircle className="mr-2 h-4 w-4"/>Add Component</Button>
                        </div>
                        <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSaveBom} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save BOM</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Create New {newOrderStage === 'injection' ? 'Injection' : 'Blowing'} Order</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">BOM</Label><Select value={newOrderBomId} onValueChange={setNewOrderBomId}><SelectTrigger className="col-span-3"><SelectValue placeholder="Select a BOM" /></SelectTrigger><SelectContent>{(newOrderStage === 'injection' ? injectionBoms : blowingBoms).map(bom => <SelectItem key={bom.id} value={bom.id}>{bom.bom_name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Quantity</Label><Input type="number" value={newOrderQuantity} onChange={e => setNewOrderQuantity(Number(e.target.value))} className="col-span-3" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Date</Label><Input type="date" value={newOrderDate} onChange={e => setNewOrderDate(e.target.value)} className="col-span-3" /></div>
                    </div>
                    <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleSaveOrder} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Create Order</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="injection">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="injection"><Droplets className="mr-2 h-4 w-4"/> Preform Injection</TabsTrigger><TabsTrigger value="blowing"><Factory className="mr-2 h-4 w-4"/> Bottle Blowing</TabsTrigger></TabsList>
                <TabsContent value="injection" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Preform Injection Orders</CardTitle><CardDescription>Track the production of preforms from raw materials.</CardDescription></div><Button variant="outline" onClick={() => { setNewOrderStage('injection'); setIsOrderDialogOpen(true); }}><PackagePlus className="mr-2 h-4 w-4"/>New Injection Order</Button></CardHeader>
                        <CardContent>{renderOrderTable(injectionOrders, injectionBoms)}</CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="blowing" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Bottle Blowing Orders</CardTitle><CardDescription>Track the production of bottles from preforms.</CardDescription></div><Button variant="outline" onClick={() => { setNewOrderStage('blowing'); setIsOrderDialogOpen(true); }}><PackagePlus className="mr-2 h-4 w-4"/>New Blowing Order</Button></CardHeader>
                        <CardContent>{renderOrderTable(blowingOrders, blowingBoms)}</CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Complete Production Order</DialogTitle><DialogDescription>Enter the actual quantity produced. This action will consume input materials and add the output to your inventory.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="actual-qty" className="text-right">Actual Quantity</Label><Input id="actual-qty" type="number" value={actualQuantity} onChange={(e) => setActualQuantity(Number(e.target.value))} className="col-span-3"/></div>
                        <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>This action is irreversible and will permanently adjust your inventory levels and costs.</AlertDescription></Alert>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>Cancel</Button><Button onClick={handleCompleteOrder} disabled={isSubmitting || !actualQuantity || actualQuantity <= 0}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Complete Production</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PETProductionPage;