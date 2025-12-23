'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

// --- TYPES ---
interface Supplier {
  id: string;
  code: string;
  name: string;
  type: 'Individual' | 'Company';
  status: 'Active' | 'Inactive' | 'Blacklisted';
  country?: string;
  currency?: string;
  ap_account_id: string;

  contact_person?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;

  billing_address?: string;
  city?: string;
  state?: string;

  default_bank_account?: boolean;
  bank_name?: string;
  account_name?: string;
  account_number?: string;

  payment_terms: 'Net 7' | 'Net 14' | 'Net 30' | 'Cash';
  preferred_payment_method?: 'Bank' | 'Cash' | 'Cheque';

  tin_number?: string;
  vat_registered: 'Yes' | 'No';
  vat_number?: string;
  default_vat_tax_category?: 'Goods' | 'Services' | 'Exempt';
  wht_applicable: 'Yes' | 'No';
  withholding_tax_rate?: number;
  
  company_id: string;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  order_date: string;
  total_amount: number;
  status: string;
}

const API_BASE_URL = 'https://hariindustries.net/api/clearbooks';

export default function SupplierProfilePage() {
    const params = useParams();
    const supplierId = params.id as string;
    const { user } = useAuth();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSupplierData = useCallback(async () => {
        if (!supplierId || !user) return;

        setIsLoading(true);
        setError(null);

        try {
            const supplierRes = await fetch(`${API_BASE_URL}/supplier.php?id=${supplierId}`);
            if (!supplierRes.ok) throw new Error('Failed to fetch supplier details.');
            const supplierData = await supplierRes.json();
            if (supplierData.length === 0) {
                 throw new Error('Supplier not found.');
            }
            setSupplier(supplierData[0]);

            const poRes = await fetch(`${API_BASE_URL}/get-purchase-orders.php?supplier_id=${supplierId}`);
            if (!poRes.ok) throw new Error('Failed to fetch purchase orders.');
            const poData = await poRes.json();
            setPurchaseOrders(poData.success ? poData.purchase_orders : []);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }, [supplierId, user]);

    useEffect(() => {
        fetchSupplierData();
    }, [fetchSupplierData]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="flex flex-col justify-center items-center h-64 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>;
    }

    if (!supplier) {
        return <div className="text-center p-8">Supplier not found.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
                <p className="text-muted-foreground">Supplier Profile & History</p>
            </header>

            <Card>
                <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="font-semibold">Code</p><p>{supplier.code}</p></div>
                        <div><p className="font-semibold">Status</p><p><Badge variant={supplier.status === 'Active' ? 'default' : 'destructive'}>{supplier.status}</Badge></p></div>
                        <div><p className="font-semibold">Type</p><p>{supplier.type}</p></div>
                        <div><p className="font-semibold">Country</p><p>{supplier.country || 'N/A'}</p></div>
                        <div><p className="font-semibold">Currency</p><p>{supplier.currency || 'N/A'}</p></div>
                        <div><p className="font-semibold">A/P Account</p><p>{supplier.ap_account_id}</p></div>
                        <div><p className="font-semibold">Payment Terms</p><p>{supplier.payment_terms}</p></div>
                        <div><p className="font-semibold">Preferred Payment</p><p>{supplier.preferred_payment_method || 'N/A'}</p></div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><p className="font-semibold">Contact Person</p><p>{supplier.contact_person || 'N/A'}</p></div>
                        <div><p className="font-semibold">Email</p><p>{supplier.email || 'N/A'}</p></div>
                        <div><p className="font-semibold">Phone</p><p>{supplier.phone || 'N/A'}</p></div>
                        <div><p className="font-semibold">Alternate Phone</p><p>{supplier.alternate_phone || 'N/A'}</p></div>
                        <div className="md:col-span-2"><p className="font-semibold">Billing Address</p><p>{`${supplier.billing_address || ''}, ${supplier.city || ''}, ${supplier.state || ''}`.replace(/^, |, $/g, '') || 'N/A'}</p></div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Banking Details</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="font-semibold">Bank Name</p><p>{supplier.bank_name || 'N/A'}</p></div>
                        <div><p className="font-semibold">Account Name</p><p>{supplier.account_name || 'N/A'}</p></div>
                        <div><p className="font-semibold">Account Number</p><p>{supplier.account_number || 'N/A'}</p></div>
                        <div><p className="font-semibold">Default Account</p><p>{supplier.default_bank_account ? 'Yes' : 'No'}</p></div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Tax & Compliance</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="font-semibold">TIN Number</p><p>{supplier.tin_number || 'N/A'}</p></div>
                        <div><p className="font-semibold">VAT Registered?</p><p><Badge variant={supplier.vat_registered === 'Yes' ? 'default' : 'secondary'}>{supplier.vat_registered}</Badge></p></div>
                        {supplier.vat_registered === 'Yes' && (
                            <>
                                <div><p className="font-semibold">VAT Number</p><p>{supplier.vat_number || 'N/A'}</p></div>
                                <div><p className="font-semibold">Default VAT Category</p><p>{supplier.default_vat_tax_category || 'N/A'}</p></div>
                            </>
                        )}
                        <div><p className="font-semibold">WHT Applicable?</p><p><Badge variant={supplier.wht_applicable === 'Yes' ? 'default' : 'secondary'}>{supplier.wht_applicable}</Badge></p></div>
                        {supplier.wht_applicable === 'Yes' && (
                            <div><p className="font-semibold">WHT Rate (%)</p><p>{supplier.withholding_tax_rate !== undefined ? `${supplier.withholding_tax_rate}%` : 'N/A'}</p></div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>A log of all purchase orders for this supplier.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Order Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.length > 0 ? (
                                purchaseOrders.map(po => (
                                    <TableRow key={po.id}>
                                        <TableCell className="font-medium">{po.po_number}</TableCell>
                                        <TableCell>{format(new Date(po.order_date), 'PPP')}</TableCell>
                                        <TableCell><Badge>{po.status}</Badge></TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(po.total_amount)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No purchase orders found for this supplier.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
