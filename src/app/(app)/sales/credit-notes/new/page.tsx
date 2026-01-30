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

interface GLAccount {
    account_code: string;
    account_name: string;
}

interface Invoice {
    id: string;
    invoice_number: string;
}

// UPDATED: Interface to hold original values for calculation
interface ReturnItem {
    id: string;
    item_name: string;
    uom: string;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_amount: number; // This is now the dynamically calculated tax for the current quantity
    line_total: number;
    // New properties to make calculations work
    original_quantity: number;
    tax_per_unit: number;
}

const returnTypes = ['Quality Issue', 'Wrong Item', 'Damaged', 'Excess Quantity', 'Other'];

export default function CreateCreditNotePage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // Data states
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);

    // Loading and error states
    const [isCustomersLoading, setIsCustomersLoading] = useState(true);
    const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
    const [isItemsLoading, setIsItemsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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

    // GL Account State
    const [salesReturnAccount, setSalesReturnAccount] = useState<string | null>(null);
    const [accountsReceivableAccount, setAccountsReceivableAccount] = useState<string | null>(null);
    
    // NEW: Handler to dynamically update quantity and recalculate tax
    const handleQuantityChange = (itemId: string, newQuantityStr: string) => {
        const newQuantity = parseFloat(newQuantityStr);

        setItems(currentItems =>
            currentItems.map(item => {
                if (item.id === itemId) {
                    // Rule: Quantity cannot be negative
                    if (newQuantity < 0) {
                        return item; 
                    }
                    // Rule: Quantity cannot be more than the original amount
                    if (newQuantity > item.original_quantity) {
                        toast({
                            variant: 'destructive',
                            title: 'Invalid Quantity',
                            description: `Quantity cannot exceed the original amount of ${item.original_quantity}.`,
                        });
                        // Revert to original quantity
                        return { ...item, quantity: item.original_quantity };
                    }

                    const newTaxAmount = newQuantity * item.tax_per_unit;
                    const newLineTotal = (newQuantity * item.unit_price) - item.discount + newTaxAmount;

                    return {
                        ...item,
                        quantity: newQuantity,
                        tax_amount: newTaxAmount,
                        line_total: newLineTotal,
                    };
                }
                return item;
            })
        );
    };


    const handleSaveCreditNote = async () => {
        if (!user || !user.company_id || !user.uid) {
            setError("User information is missing. Please log in again.");
            return;
        }
        if (!selectedCustomerId || !creditNoteDate || !returnType || items.length === 0 || !salesReturnAccount || !accountsReceivableAccount) {
            toast({variant: 'destructive', title: "Validation Error", description: "Please fill all required fields, including customer, date, return type, items, and both GL accounts."});
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
            salesReturnAccount,
            accountsReceivableAccount,
        };

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/credit-notes/create-credit-note.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creditNoteData),
            });
            const result = await response.json();
            if (result.success) {
                toast({ title: "Success", description: result.message || "Credit Note created and posted to journal." });
                router.push('/sales/credit-notes');
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!user?.company_id) return;
        setIsCustomersLoading(true);
        fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-customers.php?company_id=${user.company_id}`)
            .then(res => res.json()).then(setCustomers).catch(() => setError("Failed to load customers."))
            .finally(() => setIsCustomersLoading(false));
    }, [user?.company_id]);

    useEffect(() => {
        if (!user?.company_id) return;
        fetch(`https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${user.company_id}`)
            .then(res => res.json()).then(data => { if (Array.isArray(data)) setGlAccounts(data); })
            .catch(() => setError("Failed to load GL accounts."))
    }, [user?.company_id]);

    useEffect(() => {
        if (!selectedCustomerId || !user?.company_id) {
            setInvoices([]); return;
        }
        setIsInvoicesLoading(true);
        fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-invoices-by-customer.php?company_id=${user.company_id}&customer_id=${selectedCustomerId}`)
            .then(res => res.json()).then(data => { setInvoices(data); setSelectedInvoiceId(null); setItems([]); })
            .catch(() => setError("Failed to load invoices.")).finally(() => setIsInvoicesLoading(false));
    }, [selectedCustomerId, user?.company_id]);

    // UPDATED: This now correctly processes fetched items to prepare for dynamic calculations
    useEffect(() => {
        if (!selectedInvoiceId || !user?.company_id) {
            setItems([]);
            return;
        }
        setIsItemsLoading(true);
        fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-invoice-items.php?company_id=${user.company_id}&invoice_id=${selectedInvoiceId}`)
            .then(res => res.json())
            .then((data: any[]) => {
                const processedItems: ReturnItem[] = data.map(item => {
                    const quantity = Number(item.quantity || 0);
                    const unit_price = Number(item.unit_price || 0);
                    const discount = Number(item.discount || 0);
                    // IMPORTANT: We treat the 'tax_rate' field from the API as the total tax amount for the original quantity.
                    const fetched_tax_amount = Number(item.tax_rate || 0);
                    const tax_per_unit = quantity > 0 ? fetched_tax_amount / quantity : 0;
                    const line_total = (quantity * unit_price) - discount + fetched_tax_amount;

                    return {
                        id: item.id,
                        item_name: item.item_name,
                        uom: item.uom,
                        quantity,
                        unit_price,
                        discount,
                        tax_amount: fetched_tax_amount,
                        line_total,
                        original_quantity: quantity,
                        tax_per_unit,
                    };
                });
                setItems(processedItems);
                setError(null);
            })
            .catch(() => setError("Failed to load items for the selected invoice."))
            .finally(() => setIsItemsLoading(false));
    }, [selectedInvoiceId, user?.company_id, toast]);


    // UPDATED: This calculation is now much simpler and more accurate.
    const { subtotal, totalTax, totalDiscount, totalAmount } = useMemo(() => {
        let sub = 0, tax = 0, discount = 0;
        items.forEach(item => {
            sub += item.quantity * item.unit_price;
            tax += item.tax_amount;
            discount += item.discount;
        });
        const total = sub - discount + tax;
        return { subtotal: sub, totalTax: tax, totalDiscount: discount, totalAmount: total };
    }, [items]);

    const isSaveDisabled = useMemo(() => {
        return isSaving || !selectedCustomerId || !creditNoteDate || !returnType || items.length === 0 || !salesReturnAccount || !accountsReceivableAccount;
    }, [isSaving, selectedCustomerId, creditNoteDate, returnType, items, salesReturnAccount, accountsReceivableAccount]);

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!user) return <div className="text-center py-20">Please log in to create a credit note.</div>;
    
    return (
        <div className="container mx-auto py-10 space-y-6">
             {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Create Credit Note</h1>
                <Button onClick={handleSaveCreditNote} disabled={isSaveDisabled}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Credit Note'}
                </Button>
            </div>

            {/* --- Main Details Card --- */}
            <Card>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2"><label>Customer *</label><Select onValueChange={setSelectedCustomerId} value={selectedCustomerId ?? ''} disabled={isCustomersLoading}><SelectTrigger><SelectValue placeholder={isCustomersLoading ? "Loading..." : "Select Customer"} /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.customer_id} value={c.customer_id}>{c.customer_name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label>Related Invoice (Optional)</label><Select onValueChange={setSelectedInvoiceId} value={selectedInvoiceId ?? ''} disabled={!selectedCustomerId || isInvoicesLoading}><SelectTrigger><SelectValue placeholder={isInvoicesLoading ? "Loading..." : "Select Invoice"} /></SelectTrigger><SelectContent>{invoices.map(i => <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label>Credit Note Date *</label><Input type="date" value={creditNoteDate?.toISOString().split('T')[0]} onChange={e => setCreditNoteDate(new Date(e.target.value))} /></div>
                    <div className="space-y-2"><label>Return Type *</label><Select onValueChange={setReturnType} value={returnType ?? ''}><SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger><SelectContent>{returnTypes.map(rt => <SelectItem key={rt} value={rt}>{rt}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2 md:col-span-4"><label>Reason for Return *</label><Input placeholder="Enter reason for return..." value={reason} onChange={e => setReason(e.target.value)} /></div>
                </CardContent>
            </Card>

            {/* --- Accounting Card --- */}
            <Card>
                <CardHeader><CardTitle>Accounting</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label>Sales Returns & Allowances Account *</label><Select onValueChange={setSalesReturnAccount} value={salesReturnAccount ?? ''}><SelectTrigger><SelectValue placeholder="Select a debit account" /></SelectTrigger><SelectContent>{glAccounts.filter(acc => acc.account_code.startsWith('4')).map(acc => <SelectItem key={acc.account_code} value={acc.account_code}>{`${acc.account_name} (${acc.account_code})`}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label>Accounts Receivable Account *</label><Select onValueChange={setAccountsReceivableAccount} value={accountsReceivableAccount ?? ''}><SelectTrigger><SelectValue placeholder="Select a credit account" /></SelectTrigger><SelectContent>{glAccounts.filter(acc => acc.account_code.startsWith('1')).map(acc => <SelectItem key={acc.account_code} value={acc.account_code}>{`${acc.account_name} (${acc.account_code})`}</SelectItem>)}</SelectContent></Select></div>
                </CardContent>
            </Card>

            {/* --- Return Items Card --- */}
            <Card>
                <CardHeader><CardTitle>Return Items</CardTitle></CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader><TableRow><TableHead className="w-[25%]">Product</TableHead><TableHead>UOM</TableHead><TableHead>Quantity</TableHead><TableHead>Unit Price</TableHead><TableHead>Discount</TableHead><TableHead>Tax</TableHead><TableHead className="text-right">Line Total</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isItemsLoading ? <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell></TableRow>
                                 : items.length > 0 ? items.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.item_name}</TableCell>
                                        <TableCell>{item.uom || 'N/A'}</TableCell>
                                        {/* UPDATED: Quantity input now uses the new handler */}
                                        <TableCell><Input type="number" value={item.quantity} onChange={(e) => handleQuantityChange(item.id, e.target.value)} className="w-24" /></TableCell>
                                        <TableCell><Input type="number" value={item.unit_price} readOnly className="w-28 bg-gray-100" /></TableCell>
                                        <TableCell><Input type="number" value={item.discount} readOnly className="w-24 bg-gray-100" /></TableCell>
                                        {/* UPDATED: Tax column is now a read-only display of the calculated tax amount */}
                                        <TableCell>{item.tax_amount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{item.line_total.toFixed(2)}</TableCell>
                                        <TableCell><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={8} className="h-24 text-center">{selectedInvoiceId ? 'No items found.' : 'Select an invoice to see items.'}</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <div className="w-full max-w-sm space-y-4">
    
                       
                       <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Discount</span><span>{totalDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Tax</span><span>{totalTax.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-lg"><span>Total Amount</span><span>{totalAmount.toFixed(2)}</span></div>
                    </div>
                </CardFooter>
            </Card>

            {/* --- Notes and Terms & Conditions Cards --- */}
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
