'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardFooter 
} from "@/components/ui/card";
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from "@/components/ui/tabs";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow,
    TableFooter
} from "@/components/ui/table";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    PlusCircle, 
    List, 
    FilePlus, 
    Building, 
    Truck, 
    Loader2, 
    Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

// --- CONFIG & TYPES ---
const API_BASE_URL = 'https://hariindustries.net/clearbook';

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier: { id: string; name: string; };
  order_date: string;
  expected_delivery_date?: string | null;
  total_amount: number;
  status: 'draft' | 'ordered' | 'partially_received' | 'fully_received' | 'invoiced' | 'closed';
  lines: PurchaseOrderLine[];
};

type PurchaseOrderLine = {
  id: string;
  item_description: string;
  quantity: number;
  rate: number;
  total: number;
};

type Supplier = {
  id: string;
  name: string;
  email: string;
};

const initialPoState = {
    supplierId: '',
    orderDate: new Date(),
    expectedDate: undefined as Date | undefined,
    lines: [{ item_description: '', quantity: 1, rate: 0 }],
    notes: ''
};

// --- HELPER COMPONENTS ---

const PoStatusBadge = ({ status }: { status: PurchaseOrder['status'] }) => {
    const statusConfig: Record<PurchaseOrder['status'], { label: string; className: string; }> = {
        draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-800' },
        ordered: { label: 'Ordered', className: 'bg-blue-100 text-blue-800' },
        partially_received: { label: 'Partially Received', className: 'bg-purple-100 text-purple-800' },
        fully_received: { label: 'Fully Received', className: 'bg-green-100 text-green-800' },
        invoiced: { label: 'Invoiced', className: 'bg-indigo-100 text-indigo-800' },
        closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800' },
    };
    const config = statusConfig[status] || { label: 'Unknown', className: 'bg-gray-100 text-gray-800' };
    return <span className={cn("px-2 py-1 text-xs font-medium rounded-full", config.className)}>{config.label}</span>;
};

// --- MAIN COMPONENT ---

export default function ProcurementPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const companyId = user?.company_id;

    // --- STATE MANAGEMENT ---
    const [activeTab, setActiveTab] = useState('orders');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Data stores
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    
    // New PO Form State
    const [newPoState, setNewPoState] = useState(initialPoState);

    // --- DATA FETCHING ---
    const fetchData = useCallback(async (endpoint: string, setter: Function, entityName: string) => {
        if (!companyId) return;
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}?company_id=${companyId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.success) {
                setter(result.data || result.purchase_orders || []);
            } else {
                throw new Error(result.error || `Failed to fetch ${entityName}`);
            }
        } catch (error: any) {
            toast({ title: `Error Loading ${entityName}`, description: error.message, variant: 'destructive' });
            setter([]); // Clear data on error
        }
    }, [companyId, toast]);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([
            fetchData('get-purchase-orders.php', setPurchaseOrders, 'Purchase Orders'),
            fetchData('suppliers.php', setSuppliers, 'Suppliers')
        ]);
        setIsLoading(false);
    }, [fetchData]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    // --- PO FORM LOGIC ---
    const resetNewPoForm = useCallback(() => setNewPoState(initialPoState), []);

    const handleAddPoLine = () => {
        setNewPoState(prev => ({ ...prev, lines: [...prev.lines, { item_description: '', quantity: 1, rate: 0 }] }));
    };

    const handleRemovePoLine = (index: number) => {
        if (newPoState.lines.length > 1) {
            setNewPoState(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
        }
    };

    const handlePoLineChange = (index: number, field: 'item_description' | 'quantity' | 'rate', value: string) => {
        const updatedLines = [...newPoState.lines];
        const line = updatedLines[index];
        line[field] = (field === 'item_description') ? value : (parseFloat(value) || 0);
        setNewPoState(prev => ({ ...prev, lines: updatedLines }));
    };
    
    const { poSubtotal, poTotal } = useMemo(() => {
        const subtotal = newPoState.lines.reduce((acc, line) => acc + (line.quantity * line.rate), 0);
        return { poSubtotal: subtotal, poTotal: subtotal };
    }, [newPoState.lines]);

    const handleCreatePurchaseOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        const { supplierId, lines, orderDate } = newPoState;

        if (!supplierId || poTotal <= 0 || !user || !companyId) {
            toast({ title: "Validation Error", description: "Please select a supplier and ensure all lines have a description, quantity, and rate.", variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                company_id: companyId,
                supplier_id: supplierId,
                order_date: format(orderDate, 'yyyy-MM-dd'),
                expected_delivery_date: newPoState.expectedDate ? format(newPoState.expectedDate, 'yyyy-MM-dd') : null,
                lines: lines.filter(l => l.quantity > 0 && l.rate >= 0 && l.item_description),
                created_by_user_id: user.id,
                notes: newPoState.notes
            };

            const response = await fetch(`${API_BASE_URL}/create-purchase-order.php`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to create Purchase Order');
            }
            
            toast({ title: "Success!", description: `Purchase Order ${result.purchase_order.po_number} created.` });
            resetNewPoForm();
            await loadInitialData();
            setActiveTab('orders');
        } catch (error: any) {
            toast({ title: "Submission Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- RENDER ---
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Procurement</h1>
                    <p className="text-muted-foreground">Manage your company’s purchasing lifecycle.</p>
                </div>
                 <Button onClick={() => setActiveTab('new_po')}><FilePlus className="mr-2 h-4 w-4"/> Create PO</Button>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="orders"><List className="mr-2 h-4 w-4"/>Purchase Orders</TabsTrigger>
                    <TabsTrigger value="new_po"><FilePlus className="mr-2 h-4 w-4"/>New PO</TabsTrigger>
                    <TabsTrigger value="grn" disabled><Truck className="mr-2 h-4 w-4"/>Goods Received</TabsTrigger>
                    <TabsTrigger value="suppliers" disabled><Building className="mr-2 h-4 w-4"/>Suppliers</TabsTrigger>
                </TabsList>
                
                <TabsContent value="orders" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Purchase Order History</CardTitle>
                            <CardDescription>A log of all purchase orders for this company.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin mr-3"/>Loading Data...</div>
                            ) : purchaseOrders.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>PO Number</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead>Order Date</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {purchaseOrders.map(po => (
                                            <TableRow key={po.id}>
                                                <TableCell className="font-medium">{po.po_number}</TableCell>
                                                <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                                                <TableCell>{format(parseISO(po.order_date), 'dd MMM yyyy')}</TableCell>
                                                <TableCell className="text-right font-mono">{po.total_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</TableCell>
                                                <TableCell className="text-center"><PoStatusBadge status={po.status}/></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">No purchase orders found.</div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="new_po" className="mt-4">
                    <form onSubmit={handleCreatePurchaseOrder}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Create New Purchase Order</CardTitle>
                                <CardDescription>Fill in the details to generate a new PO.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                               <div className="grid md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                                        <Select value={newPoState.supplierId} onValueChange={(value) => setNewPoState(p => ({...p, supplierId: value}))}>
                                            <SelectTrigger><SelectValue placeholder="Select a supplier..." /></SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                                        <DatePicker date={newPoState.orderDate} onDateChange={(date) => setNewPoState(p => ({...p, orderDate: date || new Date()}))}/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                                        <DatePicker date={newPoState.expectedDate} onDateChange={(date) => setNewPoState(p => ({...p, expectedDate: date}))} placeholder="Optional"/>
                                    </div>
                               </div>
                                
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Line Items</h3>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="w-[120px]">Quantity</TableHead>
                                                <TableHead className="w-[120px]">Rate</TableHead>
                                                <TableHead className="w-[150px] text-right">Total</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {newPoState.lines.map((line, index) => (
                                                <TableRow key={index}>
                                                    <TableCell><Input placeholder="Item description" value={line.item_description} onChange={e => handlePoLineChange(index, 'item_description', e.target.value)} /></TableCell>
                                                    <TableCell><Input type="number" placeholder="1" value={line.quantity} onChange={e => handlePoLineChange(index, 'quantity', e.target.value)} /></TableCell>
                                                    <TableCell><Input type="number" placeholder="0.00" value={line.rate} onChange={e => handlePoLineChange(index, 'rate', e.target.value)} /></TableCell>
                                                    <TableCell className="text-right font-mono">{(line.quantity * line.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                    <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemovePoLine(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell colSpan={2}><Button type="button" variant="outline" size="sm" onClick={handleAddPoLine}><PlusCircle className="mr-2 h-4 w-4"/>Add Another Line</Button></TableCell>
                                                <TableCell colSpan={1} className="text-right font-bold">Subtotal</TableCell>
                                                <TableCell className="text-right font-mono font-bold">{poSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                             <TableRow>
                                                <TableCell colSpan={3} className="text-right font-bold text-lg">Total</TableCell>
                                                <TableCell className="text-right font-mono font-bold text-lg">{poTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end bg-slate-50 py-4 px-6 border-t">
                                <Button size="lg" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FilePlus className="mr-2 h-4 w-4"/>}
                                    Create Purchase Order
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </TabsContent>
                
                {/* Placeholder tabs for future functionality */}
                <TabsContent value="grn"></TabsContent>
                <TabsContent value="suppliers"></TabsContent>
            </Tabs>
        </div>
    );
}
