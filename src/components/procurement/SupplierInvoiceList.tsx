
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SupplierInvoice {
    id: number;
    invoice_number: string;
    supplier_name: string;
    invoice_date: string;
    due_date: string;
    total_amount: string; // The API is returning a string
    status: 'Unpaid' | 'Paid' | 'Void' | 'Awaiting Approval';
}

interface SupplierInvoiceListProps {
    onViewDetails: (invoiceId: number) => void;
}

export function SupplierInvoiceList({ onViewDetails }: SupplierInvoiceListProps) {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<number | null>(null);

    const fetchInvoices = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await api<SupplierInvoice[]>(`get-supplier-invoices.php?company_id=${user.company_id}`);
            setInvoices(response);
        } catch (e: any) {
            setError(e.message || "Failed to load supplier invoices.");
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleUpdateStatus = async (invoiceId: number, status: 'Unpaid' | 'Void') => {
        if (!user?.company_id) return;
        setIsUpdating(invoiceId);
        try {
            await api('approve-supplier-invoice.php', {
                method: 'POST',
                body: JSON.stringify({ invoice_id: invoiceId, status, company_id: user.company_id }),
            });
            fetchInvoices(); 
        } catch (e: any) {
            setError(e.message || `Failed to update invoice status.`);
        } finally {
            setIsUpdating(null);
        }
    };

    const formatAmount = (amount: string) => {
        const num = parseFloat(amount);
        if (isNaN(num)) {
            return "₦0.00"; // Default to Naira
        }
        // Use Intl.NumberFormat for proper currency formatting for Naira
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
    };

    if (isLoading) return <div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.supplier_name}</TableCell>
                        <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{formatAmount(invoice.total_amount)}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={invoice.status === 'Paid' ? 'success' : (invoice.status === 'Unpaid' ? 'warning' : (invoice.status === 'Awaiting Approval' ? 'info' : 'destructive'))}>
                                {invoice.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {invoice.status === 'Awaiting Approval' && (
                                <div className="flex space-x-2 justify-end">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleUpdateStatus(invoice.id, 'Unpaid')}
                                        disabled={isUpdating === invoice.id}
                                    >
                                        {isUpdating === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Approve
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleUpdateStatus(invoice.id, 'Void')}
                                        disabled={isUpdating === invoice.id}
                                    >
                                        {isUpdating === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        Reject
                                    </Button>
                                </div>
                            )}
                            <Button variant="outline" size="sm" onClick={() => onViewDetails(invoice.id)}>
                                View Details
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
