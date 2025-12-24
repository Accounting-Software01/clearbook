'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, BadgeCheck, Send, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
// import { api } from '@/lib/api'; // No longer using the api helper for this action
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface PurchaseOrder {
    id: string;
    po_number: string;
    supplier_name: string;
    po_date: string;
    total_amount: number;
    status: string;
}

interface ApiPurchaseOrder {
    id: string;
    po_number: string;
    supplier_name: string;
    po_date: string;
    total_amount: string | number;
    status: string;
}

// We still need the api helper for the initial data fetch
import { api } from '@/lib/api';

export function PurchaseOrderApprovalList() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<{[key: string]: boolean}>({});
    const [error, setError] = useState<string | null>(null);

    const fetchActionableOrders = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const url = `get-purchase-orders.php?company_id=${user.company_id}`;
            const response = await api<{ purchase_orders: ApiPurchaseOrder[] }>(url);
            const allOrders = response.purchase_orders || [];

            const actionableOrders = allOrders
                .filter(order => order.status === 'Draft' || order.status === 'Submitted')
                .map(order => ({
                    ...order,
                    total_amount: Number(order.total_amount)
                }));

            setOrders(actionableOrders);
        } catch (e: any) {
            console.error("API Error:", e);
            setError(e.message || "An error occurred while fetching purchase orders.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchActionableOrders();
        }
    }, [fetchActionableOrders, user]);

    const handleAction = async (poId: string, action: 'submit') => {
        if (!user?.company_id || !user.id) return;
        
        setIsSubmitting(prev => ({...prev, [poId]: true}));

        try {
            const API_ENDPOINT = 'https://hariindustries.net/api/clearbook/purchase-order-actions.php';
            
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: action,
                    po_id: poId,
                    company_id: user.company_id,
                    user_id: user.id
                }),
                credentials: 'include',
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to submit purchase order.');
            }

            toast({ title: "Success", description: `Purchase Order submitted.` });
            fetchActionableOrders();

        } catch (e: any) {
            toast({ variant: "destructive", title: "Action Failed", description: e.message });
        } finally {
            setIsSubmitting(prev => ({...prev, [poId]: false}));
        }
    };

    const viewOrderDetails = (poId: string) => {
        router.push(`/procurement/purchase-orders/${poId}`);
    };

    const getStatusBadgeVariant = (status: string) => {
        if (status === 'Draft') return 'outline';
        if (status === 'Submitted') return 'secondary';
        return 'default';
    };

    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;

    return (
        <div>
            {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No purchase orders requiring action.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.po_number}</TableCell>
                                <TableCell>{order.supplier_name}</TableCell>
                                <TableCell>{new Date(order.po_date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">₦{order.total_amount.toFixed(2)}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    {order.status === 'Draft' && (
                                        <>
                                            <Button variant="ghost" size="sm" onClick={() => viewOrderDetails(order.id)}><Eye className="mr-2 h-4 w-4"/>View</Button>
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleAction(order.id, 'submit')} 
                                                disabled={isSubmitting[order.id]} 
                                            >
                                                {isSubmitting[order.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                                                Submit
                                            </Button>
                                        </>
                                    )}
                                    {order.status === 'Submitted' && (
                                        <Button 
                                            size="sm" 
                                            onClick={() => viewOrderDetails(order.id)} 
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <BadgeCheck className="mr-2 h-4 w-4"/>
                                            Review & Approve
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
