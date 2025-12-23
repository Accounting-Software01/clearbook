
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, PlusCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PurchaseOrder } from '@/types/purchase-order';
import { Button } from '@/components/ui/button';
import { GrnCreator } from './GrnCreator';

export function GrnTabContent() {
    const { user } = useAuth();
    const [selectableOrders, setSelectableOrders] = useState<PurchaseOrder[]>([]);
    const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSelectableOrders = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await api<{ success: boolean; purchase_orders: PurchaseOrder[] }>('get-purchase-orders.php', {
                params: { company_id: user.company_id }
            });
            if (response.success) {
                // Filter for orders that can be received against
                const openOrders = response.purchase_orders.filter(
                    po => po.status === 'Approved' || po.status === 'Partially Received'
                );
                setSelectableOrders(openOrders);
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
        // Fetch orders only if no PO is selected
        if (!selectedPoId) {
            fetchSelectableOrders();
        }
    }, [fetchSelectableOrders, selectedPoId]);

    const handleGrnCreated = () => {
        // After GRN is created, reset to the selection list
        setSelectedPoId(null);
    };
    
    const handleCancel = () => {
        setSelectedPoId(null);
    }

    if (selectedPoId) {
        return <GrnCreator poId={selectedPoId} onGrnCreated={handleGrnCreated} onCancel={handleCancel} />;
    }

    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-destructive text-center"><AlertCircle className="mx-auto mb-2" />{error}</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Goods Received Note</CardTitle>
                <CardDescription>Select a Purchase Order to receive items against.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>PO Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectableOrders.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10">No open purchase orders available to receive against.</TableCell></TableRow>
                        ) : selectableOrders.map(po => (
                            <TableRow key={po.id}>
                                <TableCell className="font-mono">{po.po_number}</TableCell>
                                <TableCell>{po.supplier.name}</TableCell>
                                <TableCell>{po.order_date}</TableCell>
                                <TableCell>{po.status}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => setSelectedPoId(po.id)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Receive Items
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
