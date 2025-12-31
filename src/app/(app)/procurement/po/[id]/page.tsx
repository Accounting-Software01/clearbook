
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, Download, CheckCircle, XCircle, Truck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { PurchaseOrderPDF } from '@/components/procurement/PurchaseOrderPDF';
import Link from 'next/link';

// --- TYPES ---
interface PurchaseOrderItem {
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    line_amount: number;
    vat_applicable: number; 
    vat_rate: number;
    vat_amount: number;
    line_total: number;
}

interface PurchaseOrderDetails {
    id: number;
    po_number: string;
    supplier_name: string;
    po_date: string;
    expected_delivery_date: string | null;
    currency: string;
    payment_terms: string;
    subtotal: number;
    vat_total: number;
    total_amount: number;
    status: string;
    remarks: string | null;
    items: PurchaseOrderItem[];
}

// --- HELPERS ---
const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('en-GB') : 'N/A';

// --- MAIN COMPONENT ---
export default function PurchaseOrderDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [order, setOrder] = useState<PurchaseOrderDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOrderDetails = useCallback(async () => {
        if (!user?.company_id || !id) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await api<PurchaseOrderDetails>(`purchase-orders.php?company_id=${user.company_id}&id=${id}`);
            setOrder(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [user, id]);

    useEffect(() => {
        fetchOrderDetails();
    }, [fetchOrderDetails]);

    const handleDownloadPDF = () => {
        if (order) PurchaseOrderPDF(order);
    };

    const handleUpdateStatus = async (newStatus: 'Approved' | 'Rejected') => {
        if (!order || !user?.uid) return;
        setIsUpdating(true);
        try {
            await api(`update_purchase_order_status.php`, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'update_status', 
                    po_id: order.id, 
                    status: newStatus, 
                    user_id: user.uid // Pass user ID for backend role check
                }),
            });
            toast({ title: 'Success', description: `Order has been ${newStatus.toLowerCase()}.` });
            fetchOrderDetails(); // Refresh data
        } catch (e: any) {
            toast({ title: 'Error', description: e.message || 'Failed to update order status.', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleGenerateGrn = () => {
        // You can navigate to a new GRN page, passing the PO details
        toast({ title: "Action Required", description: "Implement navigation to GRN creation page." });
        // Example: router.push(`/procurement/grn/new?po_id=${order?.id}`);
    };
    
    const getStatusVariant = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'secondary';
            case 'submitted': return 'default';
            case 'approved': return 'success';
            case 'rejected': case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    // --- RENDER LOGIC ---
    if (isLoading) return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    if (error) return <div className="flex flex-col items-center justify-center h-[60vh] text-destructive"><AlertCircle className="h-12 w-12 mb-4" /><h2 className="text-2xl font-semibold mb-2">Error Loading Order</h2><p className="mb-4">{error}</p><Button onClick={fetchOrderDetails}>Try Again</Button></div>;
    if (!order) return <div className="text-center py-10">No order found.</div>;

    const isAdmin = user?.role === 'admin';
    const canApprove = isAdmin && order.status.toLowerCase() === 'submitted';
    const canGenerateGrn = isAdmin && order.status.toLowerCase() === 'approved';

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
             <div className="flex items-center justify-between">
                <Button asChild variant="outline"><Link href="/procurement"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders</Link></Button>
                <Button onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
            </div>
            
            <Card>
                <CardHeader className="bg-muted/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold">Purchase Order</h1>
                            <p className="text-muted-foreground font-mono">{order.po_number}</p>
                        </div>
                         <Badge variant={getStatusVariant(order.status)} className="text-base capitalize">{order.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6 text-sm">
                         <DetailItem label="Supplier" value={order.supplier_name} />
                         <DetailItem label="PO Date" value={formatDate(order.po_date)} />
                         <DetailItem label="Expected Delivery" value={formatDate(order.expected_delivery_date)} />
                         <DetailItem label="Payment Terms" value={order.payment_terms || 'N/A'} />
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Items</h3>
                        <div className="border rounded-md">
                        <Table>
                           <TableHeader><TableRow>
                               <TableHead className="w-2/5">Description</TableHead>
                               <TableHead className="text-center">Qty</TableHead>
                               <TableHead className="text-right">Unit Price</TableHead>
                               <TableHead className="text-right">Amount</TableHead>
                               <TableHead className="text-right">VAT</TableHead>
                               <TableHead className="text-right">Total</TableHead>
                           </TableRow></TableHeader>
                           <TableBody>{order.items.map(item => (
                               <TableRow key={item.id}>
                                   <TableCell className="font-medium">{item.description}</TableCell>
                                   <TableCell className="text-center">{item.quantity}</TableCell>
                                   <TableCell className="text-right">{formatCurrency(item.unit_price, order.currency)}</TableCell>
                                   <TableCell className="text-right">{formatCurrency(item.line_amount, order.currency)}</TableCell>
                                   <TableCell className="text-right">{formatCurrency(item.vat_amount, order.currency)}</TableCell>
                                   <TableCell className="text-right font-semibold">{formatCurrency(item.line_total, order.currency)}</TableCell>
                               </TableRow>
                           ))}</TableBody>
                           <TableFooter>
                               <TableRow><SummaryRow label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} /></TableRow>
                               <TableRow><SummaryRow label="VAT" value={formatCurrency(order.vat_total, order.currency)} /></TableRow>
                               <TableRow className="text-base font-bold"><SummaryRow label="Total" value={formatCurrency(order.total_amount, order.currency)} /></TableRow>
                           </TableFooter>
                        </Table>
                        </div>
                    </div>

                    {order.remarks && (
                        <div>
                             <h3 className="font-semibold mb-2">Remarks</h3>
                             <p className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50">{order.remarks}</p>
                        </div>
                    )}
                </CardContent>

                {(canApprove || canGenerateGrn) && (
                    <CardFooter className="flex justify-end gap-2 bg-muted/50 p-4">
                        {canApprove && (
                             <>
                                <Button variant="outline" onClick={() => handleUpdateStatus('Rejected')} disabled={isUpdating}>
                                    <XCircle className="mr-2 h-4 w-4"/> Reject
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus('Approved')} disabled={isUpdating}>
                                     {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4"/>}
                                     Approve
                                </Button>
                             </>
                        )}
                        {canGenerateGrn && (
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGenerateGrn}>
                                <Truck className="mr-2 h-4 w-4"/>
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}

// --- SUB-COMPONENTS ---
const DetailItem = ({ label, value }: { label: string, value: string }) => (
    <div>
        <p className="font-semibold text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
    </div>
);

const SummaryRow = ({ label, value }: { label: string, value: string }) => (
    <>
        <TableCell colSpan={5} className="text-right font-semibold">{label}</TableCell>
        <TableCell className="text-right font-semibold">{value}</TableCell>
    </>
);
