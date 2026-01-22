'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


// Define types for our data
interface Customer {
    customer_id: string;
    customer_name: string;
}

interface Invoice {
    id: string;
    invoice_number: string;
}

interface Warehouse {
    id: string;
    name: string;
}

interface ReturnItem {
    id: string;
    item_name: string;
    uom: string;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_rate: number;
    tax_amount: number;
    line_total: number; 
}

const returnTypes = ['Quality Issue', 'Wrong Item', 'Damaged', 'Excess Quantity', 'Other'];

export default function CreateCreditNotePage() {
    const { user, isLoading } = useAuth();

    const router = useRouter(); // Add this line
    const { toast } = useToast();

    
    // Data states
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]); // Assuming warehouses will be fetched

    // Loading and error states
    const [isCustomersLoading, setIsCustomersLoading] = useState(true);
    const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
    const [isItemsLoading, setIsItemsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false); // Add this line
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [creditNoteDate, setCreditNoteDate] = useState<Date | undefined>(new Date());
    const [returnType, setReturnType] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [items, setItems] = useState<ReturnItem[]>([]);

    const handleSaveCreditNote = async () => {
        // Frontend Validation
        if (!user || !user.company_id || !user.uid) {
            setError("User information is missing. Please log in again.");
            return;
        }
        if (!selectedCustomerId) {
            setError("A customer must be selected.");
            return;
        }
        if (!creditNoteDate) {
            setError("Credit Note date is required.");
            return;
        }
        if (!returnType) {
            setError("Return type is required.");
            return;
        }
        if (items.length === 0) {
            setError("At least one return item must be added.");
            return;
        }

        setIsSaving(true);
        setError(null);

        const creditNoteData = {
            company_id: user.company_id,
            user_id: user.uid,
            customerId: selectedCustomerId,
            invoiceId: selectedInvoiceId,
            creditNoteDate: creditNoteDate.toISOString().split('T')[0],
            returnType,
            reason,
            notes,
            terms,
            items,
        };

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/credit-notes/create-credit-note.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creditNoteData),
            });

            const result = await response.json();

            if (result.success) {
                toast({ title: "Success", description: "Credit Note created as a draft." });
                router.push('/sales/credit-notes'); // Redirect to the list page
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Fetch Customers
    useEffect(() => {
        if (!user?.company_id) return;
        setIsCustomersLoading(true);
        fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-customers.php?company_id=${user.company_id}`)
            .then(res => res.json())
            .then(data => {
                setCustomers(data);
                setError(null);
            })
            .catch(() => setError("Failed to load customers."))
            .finally(() => setIsCustomersLoading(false));
    }, [user?.company_id]);

    // Fetch Invoices when Customer changes
    useEffect(() => {
        if (!selectedCustomerId || !user?.company_id) {
            setInvoices([]);
            return;
        }
        setIsInvoicesLoading(true);
        fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-invoices-by-customer.php?company_id=${user.company_id}&customer_id=${selectedCustomerId}`)
            .then(res => res.json())
            .then(data => {
                setInvoices(data);
                setSelectedInvoiceId(null); // Reset invoice selection
                setItems([]); // Clear items
                setError(null);
            })
            .catch(() => setError("Failed to load invoices for the selected customer."))
            .finally(() => setIsInvoicesLoading(false));
    }, [selectedCustomerId, user?.company_id]);

    // Fetch Invoice Items when Invoice changes
    useEffect(() => {
        if (!selectedInvoiceId || !user?.company_id) {
            setItems([]);
            return;
        }
        setIsItemsLoading(true);
        fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-invoice-items.php?company_id=${user.company_id}&invoice_id=${selectedInvoiceId}`)
            .then(res => res.json())
            .then((data: Omit<ReturnItem, 'line_total'>[]) => {
                // Calculate line_total for each item
                const itemsWithTotals = data.map(item => ({
                    ...item,
                    line_total: (item.quantity * item.unit_price) - item.discount // Basic calculation
                }));
                setItems(itemsWithTotals);
                setError(null);
            })
            .catch(() => setError("Failed to load items for the selected invoice."))
            .finally(() => setIsItemsLoading(false));
    }, [selectedInvoiceId, user?.company_id]);

    const { subtotal, totalTax, totalDiscount, totalAmount } = useMemo(() => {
        const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)), 0);
        const totalTax = items.reduce((acc, item) => acc + parseFloat(item.tax_amount || 0), 0);
        const totalDiscount = items.reduce((acc, item) => acc + parseFloat(item.discount || 0), 0);
        const totalAmount = subtotal + totalTax - totalDiscount;
        return { subtotal, totalTax, totalDiscount, totalAmount };
    }, [items]);
    
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user || !user.uid || !user.company_id) {
        // You can also redirect here using router.push('/login')
        return <div className="text-center py-20">Please log in to create a credit note.</div>;
    }
    
    return (
        <div className="container mx-auto py-10 space-y-6">
             {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Create Credit Note</h1>
                <Button onClick={handleSaveCreditNote} disabled={isSaving}>
    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    {isSaving ? 'Saving...' : 'Save Credit Note'}
</Button>

            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label>Customer *</label>
                            <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId ?? ''} disabled={isCustomersLoading}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isCustomersLoading ? "Loading customers..." : "Select Customer"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => <SelectItem key={c.customer_id} value={c.customer_id}>{c.customer_name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label>Related Invoice (Optional)</label>
                            <Select onValueChange={setSelectedInvoiceId} value={selectedInvoiceId ?? ''} disabled={!selectedCustomerId || isInvoicesLoading}>
                                <SelectTrigger>
                                     <SelectValue placeholder={isInvoicesLoading ? "Loading invoices..." : "Select Invoice"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Add Warehouse and other fields here */}
                        <div className="space-y-2">
                            <label>Credit Note Date *</label>
                            <Input type="date" value={creditNoteDate?.toISOString().split('T')[0]} onChange={e => setCreditNoteDate(new Date(e.target.value))} />
                        </div>

                        <div className="space-y-2">
                            <label>Return Type *</label>
                            <Select onValueChange={setReturnType} value={returnType ?? ''}>
                                <SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger>
                                <SelectContent>
                                    {returnTypes.map(rt => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-4">
                            <label>Reason for Return *</label>
                            <Input placeholder="Enter reason for return..." value={reason} onChange={e => setReason(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Return Items</CardTitle></CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[25%]">Product</TableHead>
                                    <TableHead>UOM</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Unit Price</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Tax</TableHead>
                                    <TableHead className="text-right">Line Total</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isItemsLoading ? (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                ) : items.length > 0 ? (
                                    items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.item_name}</TableCell>
                                            <TableCell>{item.uom || 'N/A'}</TableCell>
                                            <TableCell><Input type="number" value={item.quantity} className="w-24" /></TableCell>
                                            <TableCell><Input type="number" value={item.unit_price} className="w-28" /></TableCell>
                                            <TableCell><Input type="number" value={item.discount} className="w-24" /></TableCell>
                                            <TableCell><Input type="number" value={item.tax_rate} className="w-24" /></TableCell>
                                            <TableCell className="text-right">{item.line_total.toFixed(2)}</TableCell>
                                            <TableCell><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            {selectedInvoiceId ? 'No items found for this invoice.' : 'Select an invoice to see items or add them manually.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <Button variant="outline" className="mt-4">Add Item</Button>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <div className="w-full max-w-sm space-y-4">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Tax</span><span>{totalTax.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Discount</span><span>{totalDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-lg"><span>Total Amount</span><span>{totalAmount.toFixed(2)}</span></div>
                    </div>
                </CardFooter>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                     <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                     <CardContent><Textarea placeholder="Enter credit note notes" value={notes} onChange={e => setNotes(e.target.value)} /></CardContent>
                 </Card>
                 <Card>
                     <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
                     <CardContent><Textarea placeholder="Enter terms and conditions" value={terms} onChange={e => setTerms(e.target.value)} /></CardContent>
                 </Card>
            </div>
        </div>
    );
}
