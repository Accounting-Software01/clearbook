
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface PurchaseOrder {
    id: number;
    po_number: string;
    supplier_name: string;
    po_date: string;
    total_amount: number;
    status: string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-GB');

export function PurchaseOrderList() {
    const { user } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await api<PurchaseOrder[]>(`purchase-orders.php?company_id=${user.company_id}`);
            setOrders(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleRowClick = (id: number) => {
        router.push(`/procurement/po/${id}`);
    };

    const getStatusVariant = (status: string) => {
        switch (status.toLowerCase()) {
            case 'draft': return 'secondary';
            case 'submitted':
            case 'approved': return 'default';
            case 'completed': return 'success';
            case 'rejected':
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle>Purchase Orders</CardTitle>
                    <Button variant="ghost" size="icon" onClick={fetchOrders} aria-label="Refresh orders">
                         <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-60 text-destructive">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>Error loading purchase orders.</p>
                        <Button variant="link" onClick={fetchOrders}>Try again</Button>
                    </div>
                ) : orders.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
                        <p>No purchase orders found.</p>
                        <p className="text-sm">Create a new PO to get started.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id} onClick={() => handleRowClick(order.id)} className="cursor-pointer">
                                    <TableCell className="font-medium">{order.po_number}</TableCell>
                                    <TableCell>{order.supplier_name}</TableCell>
                                    <TableCell>{formatDate(order.po_date)}</TableCell>
                                    <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(order.total_amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
