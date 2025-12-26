
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Types updated to expect string or number for amounts to be safe
interface InvoiceItem {
    id: number;
    raw_material_name: string;
    description: string;
    quantity: number;
    unit_price: string | number;
    total_amount: string | number;
}

interface InvoiceDetailsData {
    id: number;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    supplier_name: string;
    total_amount: string | number;
    status: string;
    items: InvoiceItem[];
}

interface SupplierInvoiceDetailsProps {
    invoiceId: number;
    onBack: () => void;
    onInvoiceApproved: () => void;
}

// Helper to format amounts safely into Naira (₦)
const formatNaira = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) {
        return '₦0.00'; // Return a default value for invalid numbers
    }
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

export function SupplierInvoiceDetails({ invoiceId, onBack, onInvoiceApproved }: SupplierInvoiceDetailsProps) {
    const { user } = useAuth();
    const [invoice, setInvoice] = useState<InvoiceDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAdmin = user?.role === 'admin';

    const fetchInvoiceDetails = useCallback(async () => {
        if (!user?.company_id || !invoiceId) return;
        setIsLoading(true);
        try {
            const response = await api<{ invoice: InvoiceDetailsData }>(`get-supplier-invoice-details.php?company_id=${user.company_id}&id=${invoiceId}`);
            if (response.invoice) {
                setInvoice(response.invoice);
            } else {
                throw new Error("Invoice details not found.");
            }
        } catch (e: any) {
            setError("Failed to load invoice details.");
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, invoiceId]);

    useEffect(() => {
        fetchInvoiceDetails();
    }, [fetchInvoiceDetails]);

    const handleApproveInvoice = async () => {
        if (!invoice || !user?.company_id || !user.id) return;
        setIsApproving(true);
        setError(null);
        try {
            await api('approve-supplier-invoice.php', {
                method: 'POST',
                body: JSON.stringify({ company_id: user.company_id, invoice_id: invoice.id, user_id: user.id })
            });
            alert('Invoice approved successfully!');
            onInvoiceApproved();
        } catch (e: any) {
            setError(e.message || 'Failed to approve invoice.');
        } finally {
            setIsApproving(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;
    if (!invoice) return null;

    return (
        <Card className="border-t-4 border-amber-500 shadow-lg">
            <CardHeader className="bg-muted/50 p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">Invoice Details: {invoice.invoice_number}</CardTitle>
                        <CardDescription>Supplier: {invoice.supplier_name}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                        {isAdmin && invoice.status === 'Awaiting Approval' && (
                            <Button size="sm" onClick={handleApproveInvoice} disabled={isApproving}>
                                {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Approve Invoice
                            </Button>
                        )}
                        {invoice.status !== 'Awaiting Approval' && (
                            <span className="px-3 py-1 text-sm font-semibold text-green-800 bg-green-200 rounded-full">{invoice.status}</span>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm p-4 bg-muted/30 rounded-lg">
                    <div><p className="font-semibold">Invoice Date:</p> <p>{new Date(invoice.invoice_date).toLocaleDateString()}</p></div>
                    <div><p className="font-semibold">Due Date:</p> <p>{new Date(invoice.due_date).toLocaleDateString()}</p></div>
                    <div><p className="font-semibold">Total Amount:</p> <p className="font-bold text-lg">{formatNaira(invoice.total_amount)}</p></div>
                </div>

                <h3 className="font-bold text-lg mb-2">Invoice Items</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.raw_material_name}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatNaira(item.unit_price)}</TableCell>
                                <TableCell className="text-right font-medium">{formatNaira(item.total_amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="p-4 bg-muted/50 text-xs text-muted-foreground">
                Invoice ID: {invoice.id}
            </CardFooter>
        </Card>
    );
}
