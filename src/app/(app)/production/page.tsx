'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Factory, Trash2, Loader2, RefreshCw, CheckCircle, Package, ListChecks, PackageCheck, PlayCircle, DollarSign, Notebook } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem } from '@/types/inventory';

// Main data structures
interface ProductionOrder {
    id: number;
    product_name: string;
    quantity_to_produce: number;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    creation_date: string;
    notes?: string;
}

interface MaterialConsumption {
    id: number;
    name: string;
    quantity: string;
}

interface AdditionalCost {
    description: string;
    amount: string;
}

// Reusable components
const OrderList = ({ orders, onStart, onComplete }: { orders: ProductionOrder[], onStart: (id: number) => void, onComplete: (id: number) => void }) => {
    if (orders.length === 0) {
        return <p className='text-center text-muted-foreground py-8'>No production orders in this category.</p>;
    }
    return (
        <div className="space-y-4">
            {orders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                        <p className="font-bold">#{order.id} - {order.product_name}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {order.quantity_to_produce} units | Created: {new Date(order.creation_date).toLocaleDateString()}</p>
                        {order.notes && <p className='text-xs italic text-muted-foreground mt-1'>Note: {order.notes}</p>}
                    </div>
                    <div className='flex items-center gap-2'>
                        <p className={`text-sm font-bold capitalize px-2 py-1 rounded-full ${order.status === 'Pending' ? 'bg-yellow-400/20 text-yellow-500' : order.status === 'In Progress' ? 'bg-blue-400/20 text-blue-500' : 'bg-green-400/20 text-green-500'}`}>{order.status.replace('_', ' ')}</p>
                        {order.status === 'Pending' && <Button size='sm' variant='secondary' onClick={() => onStart(order.id)}><PlayCircle className='h-4 w-4 mr-2'/>Start</Button>}
                        {order.status === 'In Progress' && <Button size='sm' variant='secondary' onClick={() => onComplete(order.id)}><CheckCircle className='h-4 w-4 mr-2'/>Complete</Button>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function ProductionPage() {
    const { toast } = useToast();
    const { user } = useAuth();

    // Main data state
    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [inventoryItems, setInventoryItems] = useState<{ products: InventoryItem[], raw_materials: InventoryItem[] }>({ products: [], raw_materials: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [selectedProduct, setSelectedProduct] = useState<string>("");
    const [quantityToProduce, setQuantityToProduce] = useState<string>("1");
    const [notes, setNotes] = useState("");
    const [materialsToConsume, setMaterialsToConsume] = useState<MaterialConsumption[]>([]);
    const [plannedLaborCost, setPlannedLaborCost] = useState("0");
    const [directExpenses, setDirectExpenses] = useState<AdditionalCost[]>([]);
    const [miscCosts, setMiscCosts] = useState<AdditionalCost[]>([]);

    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const [ordersResponse, itemsResponse] = await Promise.all([
                fetch(`https://hariindustries.net/api/clearbook/manage-production.php?company_id=${user.company_id}`),
                fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}`)
            ]);
            const ordersData = await ordersResponse.json();
            if(!ordersResponse.ok) throw new Error(ordersData.message || 'Failed to fetch orders');
            setOrders(ordersData.sort((a: ProductionOrder, b: ProductionOrder) => b.id - a.id));
            
            const itemsData = await itemsResponse.json();
            if(!itemsResponse.ok) throw new Error(itemsData.message || 'Failed to fetch items');
            
            const processItem = (item: any): InventoryItem => ({
                ...item,
                id: parseInt(item.id, 10),
                average_unit_cost: parseFloat(item.average_unit_cost) || 0,
                quantity_on_hand: parseFloat(item.quantity_on_hand) || 0,
            });

            setInventoryItems({
                products: (itemsData.products || []).map(processItem),
                raw_materials: (itemsData.raw_materials || []).map(processItem),
            });

        } catch (error: any) {
            toast({ title: "Error Loading Data", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        if (user?.company_id) {
            fetchData();
        }
    }, [user?.company_id, fetchData]);

    useEffect(() => {
        const fetchBom = async () => {
            if (!selectedProduct || !user?.company_id) {
                setMaterialsToConsume([]);
                return;
            }

            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-bom.php?company_id=${user.company_id}&product_id=${selectedProduct}`);
                
                if (response.status === 404) {
                    toast({
                        title: "No Bill of Materials Found",
                        description: "You can add materials manually for this product.",
                        variant: "default"
                    });
                    setMaterialsToConsume([]);
                    return;
                }
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch BOM');
                }

                const bomData: { id: number; name: string; quantity: number }[] = await response.json();
                
                const materials = bomData.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity.toString()
                }));
                
                setMaterialsToConsume(materials);
                toast({
                    title: "BOM Loaded",
                    description: `Successfully loaded ${materials.length} material(s) for the selected product.`,
                });

            } catch (error: any) {
                toast({
                    title: "BOM Fetch Failed",
                    description: error.message,
                    variant: "destructive",
                });
                setMaterialsToConsume([]);
            }
        };

        fetchBom();
    }, [selectedProduct, user?.company_id, toast]);


    const handleAddMaterial = () => setMaterialsToConsume([...materialsToConsume, { id: 0, name: '', quantity: '1' }]);
    const handleRemoveMaterial = (index: number) => setMaterialsToConsume(materialsToConsume.filter((_, i) => i !== index));

    const handleMaterialChange = (index: number, newMaterialId: string) => {
        const material = inventoryItems.raw_materials.find(m => m.id.toString() === newMaterialId);
        if (!material) return;
        const updatedMaterials = [...materialsToConsume];
        updatedMaterials[index] = { ...updatedMaterials[index], id: material.id, name: material.name };
        setMaterialsToConsume(updatedMaterials);
    };

    const handleMaterialQuantityChange = (index: number, newQuantity: string) => {
        const updatedMaterials = [...materialsToConsume];
        updatedMaterials[index].quantity = newQuantity;
        setMaterialsToConsume(updatedMaterials);
    };

    const handleAddDirectExpense = () => setDirectExpenses([...directExpenses, { description: '', amount: '' }]);
    const handleRemoveDirectExpense = (index: number) => setDirectExpenses(directExpenses.filter((_, i) => i !== index));
    
    const handleDirectExpenseChange = (index: number, field: 'description' | 'amount', value: string) => {
        const updatedExpenses = [...directExpenses];
        updatedExpenses[index][field] = value;
        setDirectExpenses(updatedExpenses);
    };

    const handleAddMiscCost = () => setMiscCosts([...miscCosts, { description: '', amount: '' }]);
    const handleRemoveMiscCost = (index: number) => setMiscCosts(miscCosts.filter((_, i) => i !== index));

    const handleMiscCostChange = (index: number, field: 'description' | 'amount', value: string) => {
        const updatedCosts = [...miscCosts];
        updatedCosts[index][field] = value;
        setMiscCosts(updatedCosts);
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedProduct) {
            toast({ title: "Missing Information", description: "Please select a product to manufacture.", variant: 'destructive' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const payload = {
                company_id: user.company_id,
                user_id: user.uid,
                product_id: parseInt(selectedProduct),
                quantity_to_produce: parseInt(quantityToProduce),
                notes: notes,
                materials: materialsToConsume.map(m => ({ id: m.id, quantity: parseFloat(m.quantity) })),
                planned_labor_cost: parseFloat(plannedLaborCost),
                direct_expenses: directExpenses.filter(d => d.amount && d.description).map(d => ({ ...d, amount: parseFloat(d.amount) })),
                misc_costs: miscCosts.filter(m => m.amount && m.description).map(m => ({ ...m, amount: parseFloat(m.amount) })),
            };

            const response = await fetch('https://hariindustries.net/api/clearbook/manage-production.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "Success", description: "Production order created successfully." });
            fetchData(); // Refresh data
            // Reset form fields
            setSelectedProduct("");
            setQuantityToProduce("1");
            setNotes("");
            setMaterialsToConsume([]);
            setPlannedLaborCost("0");
            setDirectExpenses([]);
            setMiscCosts([]);
        } catch (error: any) {
            toast({ title: "Order Creation Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateOrderStatus = async (orderId: number, status: 'In Progress' | 'Completed') => {
        if (!user) return;
        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/manage-production.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    production_order_id: orderId,
                    company_id: user.company_id, 
                    user_id: user.uid,
                    status: status
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: 'Success', description: `Order #${orderId} status updated.` });
            fetchData();
        } catch (error: any) {
             toast({ title: "Operation Failed", description: error.message, variant: 'destructive' });
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const wipOrders = orders.filter(o => o.status === 'In Progress');
    const finishedOrders = orders.filter(o => o.status === 'Completed');

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div className='flex items-center'><Factory className="mr-2" /><CardTitle>Production Dashboard</CardTitle></div>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}/>Refresh</Button>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="orders" className='w-full'>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="orders"><Package className="mr-2 h-4 w-4"/>Pending ({pendingOrders.length})</TabsTrigger>
                        <TabsTrigger value="wip"><ListChecks className="mr-2 h-4 w-4"/>Work In Progress ({wipOrders.length})</TabsTrigger>
                        <TabsTrigger value="finished"><PackageCheck className="mr-2 h-4 w-4"/>Finished Goods ({finishedOrders.length})</TabsTrigger>
                        <TabsTrigger value="new"><PlusCircle className="mr-2 h-4 w-4"/>Create New</TabsTrigger>
                    </TabsList>

                    <TabsContent value="orders" className="mt-4"><OrderList orders={pendingOrders} onStart={(id) => updateOrderStatus(id, 'In Progress')} onComplete={(id) => updateOrderStatus(id, 'Completed')} /></TabsContent>
                    <TabsContent value="wip" className="mt-4"><OrderList orders={wipOrders} onStart={(id) => updateOrderStatus(id, 'In Progress')} onComplete={(id) => updateOrderStatus(id, 'Completed')} /></TabsContent>
                    <TabsContent value="finished" className="mt-4"><OrderList orders={finishedOrders} onStart={(id) => {}} onComplete={(id) => {}} /></TabsContent>

                    <TabsContent value="new" className="mt-4">
                        <form onSubmit={handleCreateOrder} className="space-y-6 max-w-4xl mx-auto">
                             <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center"><Notebook className="h-5 w-5 mr-2" />1. Define Production Goal</CardTitle>
                                    <CardDescription>Select the product to manufacture, the quantity, and any relevant notes for this production run.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="font-medium">Product to Manufacture</label>
                                            <Select value={selectedProduct} onValueChange={setSelectedProduct} required><SelectTrigger><SelectValue placeholder="Select a finished good..." /></SelectTrigger><SelectContent>{inventoryItems.products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div>
                                            <label className="font-medium">Quantity to Produce</label>
                                            <Input type="number" min="1" value={quantityToProduce} onChange={e => setQuantityToProduce(e.target.value)} required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-medium">Production Notes (Optional)</label>
                                        <Textarea placeholder="e.g., Special batch for a client, use specific packaging..." value={notes} onChange={e => setNotes(e.target.value)} />
                                    </div>
                                </CardContent>
                            </Card>

                             <Card>
                                <CardHeader className="flex flex-row justify-between items-center">
                                    <div className='space-y-1'><CardTitle className="text-lg">2. Define Material Consumption</CardTitle><CardDescription>List all raw materials that will be consumed from inventory for this order.</CardDescription></div>
                                    <Button type="button" size="sm" variant="outline" onClick={handleAddMaterial}><PlusCircle className="h-4 w-4 mr-2"/>Add Material</Button>
                                </CardHeader>
                                <CardContent className="p-6 space-y-3">
                                    {materialsToConsume.map((material, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Select onValueChange={(value) => handleMaterialChange(index, value)} value={material.id ? material.id.toString() : ''} required>
                                                <SelectTrigger><SelectValue placeholder="Select a raw material..." /></SelectTrigger>
                                                <SelectContent>{inventoryItems.raw_materials.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Input className="w-48" type="number" min="0.01" step="0.01" placeholder="Quantity" value={material.quantity} onChange={e => handleMaterialQuantityChange(index, e.target.value)} required />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMaterial(index)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                        </div>
                                    ))}
                                    {materialsToConsume.length === 0 && <p className='text-center text-muted-foreground py-4'>No materials added.</p>}
                                </CardContent>
                            </Card>
                            
                             <Card>
                                <CardHeader>
                                     <CardTitle className="text-lg">3. Planned Additional Costs</CardTitle>
                                     <CardDescription>Account for any costs beyond raw materials, such as labor or other direct expenses.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <label className='font-medium flex items-center mb-1'><DollarSign className="h-4 w-4 mr-2"/>Planned Direct Labor Cost</label>
                                        <Input type="number" min="0" step="0.01" value={plannedLaborCost} onChange={e => setPlannedLaborCost(e.target.value)} />
                                    </div>
                                    <hr/>
                                    <div className="space-y-3">
                                        <div className='flex justify-between items-center'><label className='font-medium'>Direct Expenses</label><Button type="button" size="sm" variant="outline" onClick={handleAddDirectExpense}><PlusCircle className="h-4 w-4 mr-2"/>Add</Button></div>
                                        {directExpenses.map((exp, index) => <div key={index} className="flex items-center gap-2"><Input placeholder="e.g., Special Tool Rental" value={exp.description} onChange={e => handleDirectExpenseChange(index, 'description', e.target.value)}/><Input className="w-48" type="number" min="0.01" step="0.01" placeholder="Amount" value={exp.amount} onChange={e => handleDirectExpenseChange(index, 'amount', e.target.value)}/><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDirectExpense(index)}><Trash2 className="h-4 w-4 text-red-500"/></Button></div>)}
                                        {directExpenses.length === 0 && <p className='text-xs text-center text-muted-foreground py-2'>No direct expenses added.</p>}
                                    </div>
                                     <hr/>
                                    <div className="space-y-3">
                                        <div className='flex justify-between items-center'><label className='font-medium'>Other Miscellaneous Costs</label><Button type="button" size="sm" variant="outline" onClick={handleAddMiscCost}><PlusCircle className="h-4 w-4 mr-2"/>Add</Button></div>
                                        {miscCosts.map((cost, index) => <div key={index} className="flex items-center gap-2"><Input placeholder="e.g., Factory Overheads" value={cost.description} onChange={e => handleMiscCostChange(index, 'description', e.target.value)}/><Input className="w-48" type="number" min="0.01" step="0.01" placeholder="Amount" value={cost.amount} onChange={e => handleMiscCostChange(index, 'amount', e.target.value)}/><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMiscCost(index)}><Trash2 className="h-4 w-4 text-red-500"/></Button></div>)}
                                        {miscCosts.length === 0 && <p className='text-xs text-center text-muted-foreground py-2'>No miscellaneous costs added.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting Production Order...</> : <>Create Production Order</>}</Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
