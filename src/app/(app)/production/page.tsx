'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// On line 11
import { PlusCircle, Factory, Loader2, RefreshCw, CheckCircle, Package, ListChecks, PackageCheck, PlayCircle, DollarSign, Notebook, GanttChartSquare, Workflow, Eye, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem } from '@/types/inventory';
// --- NEW COMPREHENSIVE INTERFACES ---
interface Bom {
    id: number;
    bom_code: string;
    finished_good_id: number;
    bom_version: string;
}

interface BomComponent {
    id: number;
    item_name: string;
    quantity: number;
    uom: string;
    item_id: number;
    average_unit_cost: number;
}

interface BomOperation {
    sequence: number;
    operation_name: string;
    notes: string;
}

interface BomOverhead {
    overhead_name: string;
    cost_category: string;
    cost_method: 'per_unit' | 'per_batch' | 'percentage_of_material';
    cost: number;
    gl_account: string;
}

interface BomDetails {
    identity: {
        bom_code: string;
        finished_good_name: string;
        scrap_percentage: number;
    };
    components: BomComponent[];
    operations: BomOperation[];
    overheads: BomOverhead[];
}

interface ProductionOrder {
    id: number;
    product_name: string;
    quantity_to_produce: number;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    creation_date: string;
    notes?: string;
}

// --- Add these new interfaces below the ProductionOrder interface (around line 65) ---

interface ProductionOrderHeader extends ProductionOrder {
    total_material_cost: string | null;
    total_overhead_cost: string | null;
    total_production_cost: string | null;
}

interface OrderConsumption {
    material_name: string;
    quantity_consumed: string;
    unit_cost_at_consumption: string;
}

interface OrderCost {
    cost_type: string;
    description: string;
    amount: string;
}

interface OrderJournal {
    voucher_number: string;
    narration: string;
    total_debits: string;
    entry_date: string;
}

interface ProductionOrderDetails {
    header: ProductionOrderHeader;
    consumption: OrderConsumption[];
    costs: OrderCost[];
    journals: OrderJournal[];
}

// --- HELPER COMPONENTS ---

// Helper to format amounts safely into Naira (₦)
const formatNaira = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) {
        return '₦0.00'; // Return a default value for invalid numbers
    }
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

const OrderList = ({ orders, onStart, onComplete, onView }: { orders: ProductionOrder[], onStart: (id: number) => void, onComplete: (id: number) => void, onView: (id: number) => void }) => {
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
                    </div>
                    <div className='flex items-center gap-2'>
                        <p className={`text-sm font-bold capitalize px-2 py-1 rounded-full ${order.status === 'Pending' ? 'bg-yellow-400/20 text-yellow-500' : order.status === 'In Progress' ? 'bg-blue-400/20 text-blue-500' : 'bg-green-400/20 text-green-500'}`}>{order.status}</p>
                        <Button size='sm' variant='outline' onClick={() => onView(order.id)}><Eye className='h-4 w-4 mr-2'/>View</Button>
                        {order.status === 'Pending' && <Button size='sm' variant='secondary' onClick={() => onStart(order.id)}><PlayCircle className='h-4 w-4 mr-2'/>Start</Button>}
                        {order.status === 'In Progress' && <Button size='sm' variant='secondary' onClick={() => onComplete(order.id)}><CheckCircle className='h-4 w-4 mr-2'/>Complete</Button>}
                    </div>
                </div>
            ))}
        </div>
    );
};
const CostingSummary = ({ costs }: { costs: any }) => (
    <Card className="bg-green-50 border-green-200">
        <CardHeader><CardTitle className="text-lg text-green-900">Estimated Production Cost</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total Material Cost:</span><span className="font-medium">{formatNaira(costs.material)}</span></div>
            <div className="flex justify-between"><span>Total Overhead Cost:</span><span className="font-medium">{formatNaira(costs.overhead)}</span></div>
            <div className="flex justify-between"><span>Projected Scrap Cost:</span><span className="font-medium">{formatNaira(costs.scrap)}</span></div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-base"><span>Total Estimated Batch Cost:</span><span>{formatNaira(costs.total)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Est. Cost Per Unit:</span><span>{formatNaira(costs.perUnit)}</span></div>
        </CardContent>
    </Card>
);

const OrderDetailView = ({ details, onClose }: { details: ProductionOrderDetails, onClose: () => void }) => {
    const { header, consumption, costs, journals } = details;

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={onClose}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Dashboard</Button>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Production Order #{header.id}</CardTitle>
                            <CardDescription>Details for <strong>{header.product_name}</strong></CardDescription>
                        </div>
                        <p className={`text-lg font-bold capitalize px-3 py-1 rounded-full ${header.status === 'Pending' ? 'bg-yellow-400/20 text-yellow-500' : header.status === 'In Progress' ? 'bg-blue-400/20 text-blue-500' : 'bg-green-400/20 text-green-500'}`}>{header.status}</p>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div><strong>Quantity Produced:</strong> {header.quantity_to_produce}</div>
                    <div><strong>Creation Date:</strong> {new Date(header.creation_date).toLocaleDateString()}</div>
                    <div className="font-semibold"><strong>Total Material Cost:</strong> {formatNaira(header.total_material_cost || 0)}</div>
                    <div className="font-semibold"><strong>Total Overhead Cost:</strong> {formatNaira(header.total_overhead_cost || 0)}</div>
                    <div className="font-bold text-base text-primary"><strong>Total Production Cost:</strong> {formatNaira(header.total_production_cost || 0)}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Material Consumption</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Quantity Consumed</TableHead><TableHead className="text-right">Cost at Consumption</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {consumption.map((item, i) => (
                                <TableRow key={i}>
                                    <TableCell>{item.material_name}</TableCell>
                                    <TableCell className="text-right">{parseFloat(item.quantity_consumed).toFixed(4)}</TableCell>
                                    <TableCell className="text-right">{formatNaira(item.unit_cost_at_consumption)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader><CardTitle>Applied Costs</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {costs.map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{item.cost_type}</TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{formatNaira(item.amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Accounting Journals</CardTitle></CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader><TableRow><TableHead>Voucher</TableHead><TableHead>Narration</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {journals.map((item, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{item.voucher_number}</TableCell>
                                        <TableCell>{item.narration}</TableCell>
                                        <TableCell className="text-right">{formatNaira(item.total_debits)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function ProductionPage() {
    const { toast } = useToast();
    const { user } = useAuth();

    // State

    const [orders, setOrders] = useState<ProductionOrder[]>([]);
    const [boms, setBoms] = useState<Bom[]>([]);
    const [products, setProducts] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBomLoading, setIsBomLoading] = useState(false);

    // --- Add these new state variables around line 128 ---
    const [viewingOrderDetails, setViewingOrderDetails] = useState<ProductionOrderDetails | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    // Form State
    const [selectedBomId, setSelectedBomId] = useState<string>("");
    const [selectedBomDetails, setSelectedBomDetails] = useState<BomDetails | null>(null);
    const [quantityToProduce, setQuantityToProduce] = useState<string>("1");
    const [notes, setNotes] = useState("");

    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const [ordersRes, itemsRes, bomsRes] = await Promise.all([
                fetch(`https://hariindustries.net/api/clearbook/manage-production.php?company_id=${user.company_id}`),
                fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}`),
                fetch(`https://hariindustries.net/api/clearbook/get-boms.php?company_id=${user.company_id}`)
            ]);

            const ordersData = await ordersRes.json();
            if(!ordersRes.ok) throw new Error(ordersData.message || 'Failed to fetch orders');
            setOrders(ordersData.data.sort((a: ProductionOrder, b: ProductionOrder) => b.id - a.id));
            
            const itemsData = await itemsRes.json();
            if(!itemsRes.ok) throw new Error(itemsData.message || 'Failed to fetch items');
            setProducts((itemsData.products || []).map((p: any) => ({ ...p, id: parseInt(p.id, 10) })));
            
            const bomsData = await bomsRes.json();
            if(!bomsRes.ok) throw new Error(bomsData.message || 'Failed to fetch BOMs');
            if(bomsData.success) setBoms(bomsData.boms);

        } catch (error: any) {
            toast({ title: "Error Loading Data", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => { if (user?.company_id) { fetchData(); } }, [user?.company_id, fetchData]);

    useEffect(() => {
        const fetchBomDetails = async () => {
            if (!selectedBomId) {
                setSelectedBomDetails(null);
                return;
            }
            setIsBomLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-bom-details.php?bom_id=${selectedBomId}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Failed to fetch BOM details');
                if (data.success) {
                     const bomWithCosts = {
                        ...data.bom_details,
                        components: data.bom_details.components.map((c:any) => ({ ...c, average_unit_cost: parseFloat(c.average_unit_cost) || 0 })),
                        overheads: data.bom_details.overheads.map((o:any) => ({ ...o, cost: parseFloat(o.cost) || 0 }))
                    };
                    setSelectedBomDetails(bomWithCosts);
                    toast({ title: "BOM Loaded", description: `Loaded details for ${data.bom_details.identity.bom_code}` });
                } else {
                    throw new Error(data.message);
                }
            } catch (error: any) {
                toast({ title: "BOM Fetch Failed", description: error.message, variant: "destructive" });
                setSelectedBomDetails(null);
            } finally {
                setIsBomLoading(false);
            }
        };
        fetchBomDetails();
    }, [selectedBomId, toast]);

    const bomOptions = useMemo(() => {
        const productMap = new Map(products.map(p => [p.id, p.name]));
        return boms.map(bom => ({ ...bom, finished_good_name: productMap.get(bom.finished_good_id) || 'Unknown Product' }));
    }, [boms, products]);

    const calculatedCosts = useMemo(() => {
        if (!selectedBomDetails) return null;

        const batchQty = parseFloat(quantityToProduce) || 0;
        let totalMaterialCost = 0;
        selectedBomDetails.components.forEach(c => {
            totalMaterialCost += (c.quantity * (c.average_unit_cost || 0));
        });

        let totalOverheadCost = 0;
        selectedBomDetails.overheads.forEach(o => {
            if (o.cost_method === 'per_unit') totalOverheadCost += o.cost;
            else if (o.cost_method === 'per_batch') totalOverheadCost += (o.cost / batchQty);
            else if (o.cost_method === 'percentage_of_material') totalOverheadCost += (totalMaterialCost * (o.cost / 100));
        });

        const preScrapCostPerUnit = totalMaterialCost + totalOverheadCost;
        const scrapCostPerUnit = preScrapCostPerUnit * ((selectedBomDetails.identity.scrap_percentage || 0) / 100);
        const finalCostPerUnit = preScrapCostPerUnit + scrapCostPerUnit;
        const totalBatchCost = finalCostPerUnit * batchQty;

        return {
            material: totalMaterialCost * batchQty,
            overhead: totalOverheadCost * batchQty,
            scrap: scrapCostPerUnit * batchQty,
            total: totalBatchCost,
            perUnit: finalCostPerUnit
        };
    }, [selectedBomDetails, quantityToProduce]);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedBomId) {
            toast({ title: "Missing Information", description: "Please select a Bill of Materials.", variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                company_id: user.company_id,
                user_id: user.uid,
                bom_id: parseInt(selectedBomId),
                quantity_to_produce: parseFloat(quantityToProduce),
                notes: notes,
            };
            const response = await fetch('https://hariindustries.net/api/clearbook/manage-production.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            toast({ title: "Success", description: "Production order created successfully." });
            fetchData();
            // Reset form
            setSelectedBomId("");
            setSelectedBomDetails(null);
            setQuantityToProduce("1");
            setNotes("");
        } catch (error: any) {
            toast({ title: "Order Creation Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
// --- Add this new function inside ProductionPage, after handleCreateOrder (around line 285) ---
const handleViewOrder = useCallback(async (orderId: number) => {
    if (!user?.company_id) return;
    setIsDetailLoading(true);
    setViewingOrderDetails(null);
    try {
        const response = await fetch(`https://hariindustries.net/api/clearbook/manage-production.php?company_id=${user.company_id}&production_order_id=${orderId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch order details');
        
        if (data.success) {
            setViewingOrderDetails(data.data);
        } else {
            throw new Error(data.message);
        }
    } catch (error: any) {
        toast({ title: "Error Fetching Details", description: error.message, variant: 'destructive' });
    } finally {
        setIsDetailLoading(false);
    }
}, [user?.company_id, toast]);

 
const updateOrderStatus = async (orderId: number, status: 'In Progress' | 'Completed') => {
    if (!user) return;
    try {
        const response = await fetch('https://hariindustries.net/api/clearbook/manage-production.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ production_order_id: orderId, company_id: user.company_id, user_id: user.uid, status: status }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        toast({ title: 'Success', description: result.message || `Order #${orderId} status updated.` });
        fetchData();
    } catch (error: any) {
         toast({ title: "Operation Failed", description: error.message, variant: 'destructive' });
    }
}

// --- Replace the main return statement (lines 290-405) with this ---
return (
    <Card>
        <CardHeader className="flex flex-row justify-between items-center">
             <div className='flex items-center'><Factory className="mr-2" /><CardTitle>Production Dashboard</CardTitle></div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}/>Refresh</Button>
        </CardHeader>
        <CardContent>
            {isDetailLoading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin" /></div>
            ) : viewingOrderDetails ? (
                <OrderDetailView details={viewingOrderDetails} onClose={() => setViewingOrderDetails(null)} />
            ) : (
                <Tabs defaultValue="orders" className='w-full'>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="orders"><Package className="mr-2 h-4 w-4"/>Pending ({orders.filter(o=>o.status === 'Pending').length})</TabsTrigger>
                        <TabsTrigger value="wip"><ListChecks className="mr-2 h-4 w-4"/>WIP ({orders.filter(o=>o.status === 'In Progress').length})</TabsTrigger>
                        <TabsTrigger value="finished"><PackageCheck className="mr-2 h-4 w-4"/>Finished ({orders.filter(o=>o.status === 'Completed').length})</TabsTrigger>
                        <TabsTrigger value="new"><PlusCircle className="mr-2 h-4 w-4"/>Create New</TabsTrigger>
                    </TabsList>

                    <TabsContent value="orders" className="mt-4"><OrderList orders={orders.filter(o=>o.status === 'Pending')} onStart={(id) => updateOrderStatus(id, 'In Progress')} onComplete={(id) => updateOrderStatus(id, 'Completed')} onView={handleViewOrder} /></TabsContent>
                    <TabsContent value="wip" className="mt-4"><OrderList orders={orders.filter(o=>o.status === 'In Progress')} onStart={(id) => {}} onComplete={(id) => updateOrderStatus(id, 'Completed')} onView={handleViewOrder} /></TabsContent>
                    <TabsContent value="finished" className="mt-4"><OrderList orders={orders.filter(o=>o.status === 'Completed')} onStart={(id) => {}} onComplete={(id) => {}} onView={handleViewOrder} /></TabsContent>

                    <TabsContent value="new" className="mt-4">
                        <form onSubmit={handleCreateOrder} className="space-y-6 max-w-5xl mx-auto">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center"><Notebook className="h-5 w-5 mr-2" />1. Define Production Goal</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="font-medium">Bill of Materials (BOM)</label>
                                        <Select value={selectedBomId} onValueChange={setSelectedBomId} required><SelectTrigger><SelectValue placeholder="Select a BOM..." /></SelectTrigger><SelectContent>{bomOptions.map(bom => <SelectItem key={bom.id} value={bom.id.toString()}>{bom.bom_code} (v{bom.bom_version}) - {bom.finished_good_name}</SelectItem>)}</SelectContent></Select>
                                    </div>
                                    <div>
                                        <label className="font-medium">Quantity to Produce</label>
                                        <Input type="number" min="1" value={quantityToProduce} onChange={e => setQuantityToProduce(e.target.value)} required disabled={!selectedBomId} />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="font-medium">Production Notes (Optional)</label>
                                        <Textarea placeholder="e.g., Special batch for a client..." value={notes} onChange={e => setNotes(e.target.value)} disabled={!selectedBomId} />
                                    </div>
                                </CardContent>
                            </Card>

                            {isBomLoading && <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/> Loading BOM Details...</div>}

                            {selectedBomDetails && (
                                <div className='space-y-6'>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 space-y-6">
                                            <Card>
                                                <CardHeader><CardTitle className="text-lg flex items-center"><GanttChartSquare className="h-5 w-5 mr-2" />2. Material Requirements</CardTitle></CardHeader>
                                                <CardContent>
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Required Qty</TableHead><TableHead>Unit</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {selectedBomDetails.components.map(c => (
                                                                <TableRow key={c.id}>
                                                                    <TableCell>{c.item_name}</TableCell>
                                                                    <TableCell className="text-right">{(c.quantity * (parseFloat(quantityToProduce) || 0)).toFixed(4)}</TableCell>
                                                                    <TableCell>{c.uom}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                            
                                            <Card>
                                                <CardHeader><CardTitle className="text-lg flex items-center"><Workflow className="h-5 w-5 mr-2" />3. Manufacturing Route</CardTitle></CardHeader>
                                                <CardContent>
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Step</TableHead><TableHead>Operation</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {selectedBomDetails.operations.map(o => (
                                                                <TableRow key={o.sequence}>
                                                                    <TableCell>{o.sequence}</TableCell>
                                                                    <TableCell className="font-medium">{o.operation_name}</TableCell>
                                                                    <TableCell className="text-muted-foreground">{o.notes}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader><CardTitle className="text-lg flex items-center"><DollarSign className="h-5 w-5 mr-2" />4. Planned Overheads</CardTitle></CardHeader>
                                                <CardContent>
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Overhead</TableHead><TableHead>Category</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Cost</TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {selectedBomDetails.overheads.map((o, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell>{o.overhead_name}</TableCell>
                                                                    <TableCell>{o.cost_category}</TableCell>
                                                                    <TableCell>{o.cost_method.replace('_', ' ')}</TableCell>
                                                                    <TableCell className="text-right">{o.cost_method === 'percentage_of_material' ? `${o.cost}%` : formatNaira(o.cost)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </CardContent>
                                            </Card>
                                        </div>
                                        <div className="lg:col-span-1">
                                            {calculatedCosts && <CostingSummary costs={calculatedCosts} />}
                                        </div>
                                    </div>
                                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || isBomLoading || !selectedBomId || (parseFloat(quantityToProduce) || 0) <= 0}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Order...</> : <>Create Production Order</>}</Button>
                                </div>
                            )}
                        </form>
                    </TabsContent>
                </Tabs>
            )}
        </CardContent>
    </Card>
);
}