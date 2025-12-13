'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, ShoppingCart, Users, FileText, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PurchaseRequest {
    id: string;
    itemName: string;
    quantity: number;
    status: 'pending' | 'approved' | 'ordered';
}

export default function ProcurementPage() {
    const { toast } = useToast();
    const [requests, setRequests] = useState<PurchaseRequest[]>([
        { id: 'PR-001', itemName: 'Raw Material A', quantity: 100, status: 'approved' },
        { id: 'PR-002', itemName: 'Spare Part B', quantity: 20, status: 'pending' },
        { id: 'PR-003', itemName: 'Office Supplies', quantity: 5, status: 'ordered' },
    ]);
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(0);

    const handleCreateRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || quantity <= 0) {
            toast({ title: "Invalid Input", description: "Please provide a valid item name and quantity.", variant: 'destructive' });
            return;
        }
        const newRequest: PurchaseRequest = {
            id: `PR-00${requests.length + 1}`,
            itemName,
            quantity,
            status: 'pending',
        };
        setRequests([...requests, newRequest]);
        toast({ title: "Success", description: `Purchase request ${newRequest.id} created.` });
        setItemName('');
        setQuantity(0);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><ShoppingCart className="mr-2" /> Procurement Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="requests">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="requests">Purchase Requests</TabsTrigger>
                        <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
                        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                        <TabsTrigger value="new">Create New</TabsTrigger>
                    </TabsList>
                    <TabsContent value="requests">
                        <div className="mt-4 space-y-4">
                            {requests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-bold">{req.id} - {req.itemName}</p>
                                        <p className="text-sm text-muted-foreground">Quantity: {req.quantity}</p>
                                    </div>
                                    <p className={`text-sm font-bold capitalize px-2 py-1 rounded-full ${req.status === 'pending' ? 'bg-yellow-400/20 text-yellow-500' : req.status === 'approved' ? 'bg-green-400/20 text-green-500' : 'bg-blue-400/20 text-blue-500'}`}>{req.status}</p>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="new">
                        <form onSubmit={handleCreateRequest} className="mt-4 space-y-4">
                            <input type="text" placeholder="Item Name" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-2 border rounded" />
                            <input type="number" placeholder="Quantity" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full p-2 border rounded" />
                            <Button type="submit"><PlusCircle className="mr-2 h-4 w-4"/>Create Request</Button>
                        </form>
                    </TabsContent>
                     <TabsContent value="orders" className="text-center mt-10 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4"/>
                        <h3 class="text-lg font-semibold">No purchase orders to display.</h3>
                        <p class="text-sm">Purchase orders will appear here once they are created from approved requests.</p>
                    </TabsContent>
                    <TabsContent value="suppliers" className="text-center mt-10 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4"/>
                        <h3 class="text-lg font-semibold">Supplier management is not yet available.</h3>
                        <p class="text-sm">This section will allow you to manage your suppliers and their performance.</p>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
