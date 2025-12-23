
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, FilePlus, Eye, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PurchaseOrder } from '@/types/purchase-order';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export function PurchaseOrderList() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const response = await api<{ success: boolean; purchase_orders: PurchaseOrder[] }>('get-purchase-orders.php', {
                params: { company_id: user.company_id }
            });
            if (response.success) {
                setOrders(response.purchase_orders);
            } else {
                setError("Failed to load purchase orders.");
            }
        } catch (e: any) {
            setError("An error occurred while fetching orders.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleApprove = async (poId: string) => {
        try {
            await api('purchase-order-actions.php', {
                method: 'POST',
                body: { action: 'approve', po_id: poId },
            });
            toast({ title: "Success", description: "Purchase order approved." });
            fetchOrders(); // Refresh the list
        } catch (e: any) {
            toast({ variant: "destructive", title: "Approval Failed", description: e.message });
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-destructive text-center"><AlertCircle className="mx-auto mb-2" />{error}</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
                <CardDescription>A list of all purchase orders in your company.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>PO Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10">No purchase orders found.</TableCell></TableRow>
                        ) : orders.map(po => (
                            <TableRow key={po.id}>
                                <TableCell className="font-mono">{po.po_number}</TableCell>
                                <TableCell>{po.supplier.name}</TableCell>
                                <TableCell>{po.order_date}</TableCell>
                                <TableCell><Badge>{po.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    {user?.role === 'admin' && po.status === 'Pending' && (
                                        <Button variant="outline" size="sm" onClick={() => handleApprove(po.id)}>
                                            <CheckCircle className="mr-2 h-4 w-4"/> Approve
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="ml-2">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
