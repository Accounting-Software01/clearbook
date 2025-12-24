'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, BadgeCheck, ArrowLeft, Printer, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PurchaseOrderItem {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

interface PurchaseOrderDetails {
    id: string;
    po_number: string;
    supplier_name: string;
    po_date: string;
    expected_delivery_date: string;
    total_amount: number;
    status: string;
    items: PurchaseOrderItem[];
}

// This interface represents the raw data from the API before parsing
interface ApiPurchaseOrder {
    id: string;
    po_number: string;
    supplier_name: string;
    po_date: string;
    expected_delivery_date: string;
    total_amount: string | number;
    status: string;
    items: any[];
}

export default function PurchaseOrderDetailsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const poId = params.id as string;

    const [order, setOrder] = useState<PurchaseOrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrderDetails = useCallback(async () => {
        if (!user?.company_id || !poId) return;
        setIsLoading(true);
        setError(null);
        try {
            const url = `get-purchase-orders.php?company_id=${user.company_id}&id=${poId}`;
            const response = await api<{ purchase_orders: ApiPurchaseOrder[] }>(url);
            const apiOrder = response.purchase_orders[0];

            if (!apiOrder) {
                throw new Error("Purchase Order not found.");
            }
            
            // Defensive data parsing to prevent type errors
            const formattedOrder: PurchaseOrderDetails = {
                ...apiOrder,
                total_amount: Number(apiOrder.total_amount),
                items: apiOrder.items.map(item => ({
                    ...item,
                    quantity: Number(item.quantity),
                    unit_price: Number(item.unit_price),
                    total_price: Number(item.total_price),
                }))
            };

            setOrder(formattedOrder);
        } catch (e: any) {
            console.error("API Error:", e);
            setError(e.message || "An error occurred while fetching the purchase order.");
        } finally {
            setIsLoading(false);
        }
    }, [user, poId]);

    useEffect(() => {
        if (user) {
            fetchOrderDetails();
        }
    }, [fetchOrderDetails, user]);

    const handleAction = async (action: 'approve' | 'cancel') => {
        if (!user?.company_id || !poId || !user.id) return;
        setIsActionLoading(true);

        try {
            await api('purchase-order-actions.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: action,
                    po_id: poId,
                    company_id: user.company_id,
                    user_id: user.id
                }),
            });

            toast({ title: "Success", description: `Purchase Order ${action === 'approve' ? 'approved' : 'cancelled'}.` });
            fetchOrderDetails();

        } catch (e: any) {
            toast({ variant: "destructive", title: "Action Failed", description: e.message });
        } finally {
            setIsActionLoading(false);
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'Draft': return 'outline';
            case 'Submitted': return 'secondary';
            case 'Approved': return 'default';
            case 'Partially Received': return 'outline';
            case 'Completed': return 'success';
            case 'Cancelled': return 'destructive';
            default: return 'secondary';
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;
    if (!order) return <div className="text-center text-muted-foreground py-10">No purchase order found.</div>;

    const canTakeAction = user?.role === 'admin' && order.status === 'Submitted';

    return (
        <div className="container mx-auto p-4">
            <Card className="max-w-4xl mx-auto">
                <CardHeader className="flex flex-row items-start justify-between bg-muted/50 p-4">
                    <div>
                        <CardTitle className="text-2xl mb-1">Purchase Order: {order.po_number}</CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                            <span className="text-sm text-muted-foreground"> | PO Date: {new Date(order.po_date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                </CardHeader>
                <CardContent className="p-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="font-semibold mb-2">Supplier</h3>
                            <p>{order.supplier_name}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <h3 className="font-semibold mb-2">Delivery Information</h3>
                            <p>Expected By: {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>

                    <h3 className="font-semibold mb-2 text-lg">Order Items</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {order.items && order.items.length > 0 ? (
                                order.items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">₦{item.unit_price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">₦{item.total_price.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center">No items found for this order.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4 pr-4 font-bold">
                        <div className="text-xl">Grand Total: ₦{order.total_amount.toFixed(2)}</div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center p-4 bg-muted/50">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print PO</Button>
                    <div className="flex items-center gap-2">
                        {canTakeAction && (
                            <>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={isActionLoading}>
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Cancel
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will cancel the purchase order. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Back</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleAction('cancel')} disabled={isActionLoading}>
                                                {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <Button onClick={() => handleAction('approve')} disabled={isActionLoading} className="bg-green-600 hover:bg-green-700">
                                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
                                    Approve Order
                                </Button>
                            </>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
