
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PurchaseOrder } from '@/types/purchase-order';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GrnCreator } from './GrnCreator'; // Import the new component

export function GoodsReceivedNoteList() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

    const fetchApprovedOrders = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setSelectedPoId(null); // Reset selection on refresh
        try {
            const response = await api<{ success: boolean; purchase_orders: PurchaseOrder[] }>('get-purchase-orders.php', {
                params: {
                    company_id: user.company_id,
                    status: 'Approved'
                }
            });
            if (response.success) {
                setOrders(response.purchase_orders);
            } else {
                setError("Failed to load approved purchase orders.");
            }
        } catch (e: any) {
            setError("An error occurred while fetching orders.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchApprovedOrders();
    }, [fetchApprovedOrders]);

    const handleGrnCreated = () => {
        setSelectedPoId(null);
        fetchApprovedOrders(); // Refresh the list after a GRN is created
    }

    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-destructive text-center"><AlertCircle className="mx-auto mb-2" />{error}</div>;

    if (selectedPoId) {
        return <GrnCreator poId={selectedPoId} onGrnCreated={handleGrnCreated} />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Goods Received Note (GRN)</CardTitle>
                <CardDescription>Select an approved Purchase Order to receive items from.</CardDescription>
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
                            <TableRow><TableCell colSpan={5} className="text-center py-10">No approved orders awaiting goods receipt.</TableCell></TableRow>
                        ) : orders.map(po => (
                            <TableRow key={po.id}>
                                <TableCell className="font-mono">{po.po_number}</TableCell>
                                <TableCell>{po.supplier.name}</TableCell>
                                <TableCell>{po.order_date}</TableCell>
                                <TableCell><Badge>{po.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedPoId(po.id)}>
                                        <Truck className="mr-2 h-4 w-4"/> Create GRN
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
