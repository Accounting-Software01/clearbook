'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Factory, PackageCheck, Package, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductionOrder {
    id: string;
    productName: string;
    quantity: number;
    status: 'pending' | 'in_progress' | 'completed';
}

export default function ProductionPage() {
    const { toast } = useToast();
    const [orders, setOrders] = useState<ProductionOrder[]>([
        { id: 'PO-001', productName: 'Finished Good X', quantity: 50, status: 'in_progress' },
        { id: 'PO-002', productName: 'Finished Good Y', quantity: 120, status: 'pending' },
        { id: 'PO-003', productName: 'Custom Part Z', quantity: 10, status: 'completed' },
    ]);
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState(0);

    const handleCreateOrder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productName || quantity <= 0) {
            toast({ title: "Invalid Input", description: "Please provide a valid product name and quantity.", variant: 'destructive' });
            return;
        }
        const newOrder: ProductionOrder = {
            id: `PO-00${orders.length + 1}`,
            productName,
            quantity,
            status: 'pending',
        };
        setOrders([...orders, newOrder]);
        toast({ title: "Success", description: `Production order ${newOrder.id} created.` });
        setProductName('');
        setQuantity(0);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Factory className="mr-2" /> Production Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="orders">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="orders">Production Orders</TabsTrigger>
                        <TabsTrigger value="wip">Work In Progress</TabsTrigger>
                        <TabsTrigger value="finished">Finished Goods</TabsTrigger>
                        <TabsTrigger value="new">Create New</TabsTrigger>
                    </TabsList>
                    <TabsContent value="orders">
                        <div className="mt-4 space-y-4">
                            {orders.map(order => (
                                <div key={order.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div>
                                        <p className="font-bold">{order.id} - {order.productName}</p>
                                        <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
                                    </div>
                                    <p className={`text-sm font-bold capitalize px-2 py-1 rounded-full ${order.status === 'pending' ? 'bg-yellow-400/20 text-yellow-500' : order.status === 'in_progress' ? 'bg-blue-400/20 text-blue-500' : 'bg-green-400/20 text-green-500'}`}>{order.status.replace('_', ' ')}</p>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="new">
                        <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
                            <input type="text" placeholder="Product Name" value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-2 border rounded" />
                            <input type="number" placeholder="Quantity" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="w-full p-2 border rounded" />
                            <Button type="submit"><PlusCircle className="mr-2 h-4 w-4"/>Create Order</Button>
                        </form>
                    </TabsContent>
                    <TabsContent value="wip" className="text-center mt-10 text-muted-foreground">
                        <ListChecks className="h-12 w-12 mx-auto mb-4"/>
                        <h3 class="text-lg font-semibold">No active work in progress.</h3>
                        <p class="text-sm">Start a production order to see its progress here.</p>
                    </TabsContent>
                    <TabsContent value="finished" className="text-center mt-10 text-muted-foreground">
                        <PackageCheck className="h-12 w-12 mx-auto mb-4"/>
                        <h3 class="text-lg font-semibold">No finished goods to display.</h3>
                        <p class="text-sm">Completed production orders will appear here.</p>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
