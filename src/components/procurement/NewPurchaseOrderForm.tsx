
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Loader2, PlusCircle, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Supplier } from '@/types/supplier';
import { Item } from '@/types/item';

// --- TYPE DEFINITIONS ---
interface PoLine {
    id: string; // temporary client-side id
    item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    vat_applicable: boolean;
    vat_rate: number;
    // Calculated fields
    line_amount: number;
    vat_amount: number;
    line_total: number;
}

export function NewPurchaseOrderForm() {
    const { user } = useAuth();
    const { toast } = useToast();

    // --- STATE MANAGEMENT ---
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [poDate, setPoDate] = useState<Date | undefined>(new Date());
    const [expectedDate, setExpectedDate] = useState<Date | undefined>();
    const [supplierId, setSupplierId] = useState<string>('');
    const [currency, setCurrency] = useState<string>('USD');
    const [paymentTerms, setPaymentTerms] = useState<string>('');
    const [remarks, setRemarks] = useState<string>('');

    const [lines, setLines] = useState<PoLine[]>([]);

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const [suppliersData, itemsData] = await Promise.all([
                api<Supplier[]>('supplier.php', { params: { company_id: user.company_id } }),
                api<Item[]>('items.php', { params: { company_id: user.company_id } }) // Assuming an items endpoint
            ]);
            setSuppliers(suppliersData);
            setItems(itemsData);
        } catch (e: any) {
            setError("Failed to load essential data. " + e.message);
            toast({ variant: "destructive", title: "Error", description: "Could not load suppliers and items." });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- LINE ITEM MANAGEMENT ---
    const addNewLine = () => {
        const newLine: PoLine = {
            id: `temp-${Date.now()}`,
            item_id: '',
            description: '',
            quantity: 1,
            unit_price: 0,
            vat_applicable: false,
            vat_rate: 0,
            line_amount: 0,
            vat_amount: 0,
            line_total: 0,
        };
        setLines([...lines, newLine]);
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(line => line.id !== id));
    };

    const handleLineChange = (id: string, field: keyof PoLine, value: any) => {
        setLines(lines.map(line => {
            if (line.id === id) {
                const updatedLine = { ...line, [field]: value };

                if (field === 'item_id') {
                    const selectedItem = items.find(i => i.id === value);
                    if (selectedItem) {
                        updatedLine.description = selectedItem.description;
                        updatedLine.unit_price = selectedItem.unit_price;
                        updatedLine.vat_rate = selectedItem.vat_rate || 0;
                    }
                }

                const qty = Number(updatedLine.quantity) || 0;
                const price = Number(updatedLine.unit_price) || 0;
                updatedLine.line_amount = qty * price;

                const vatRate = updatedLine.vat_applicable ? (Number(updatedLine.vat_rate) || 0) : 0;
                updatedLine.vat_amount = updatedLine.line_amount * (vatRate / 100);

                updatedLine.line_total = updatedLine.line_amount + updatedLine.vat_amount;
                
                return updatedLine;
            }
            return line;
        }));
    };
    
    // --- CALCULATIONS ---
    const summary = useMemo(() => {
        const subtotal = lines.reduce((acc, line) => acc + line.line_amount, 0);
        const totalVat = lines.reduce((acc, line) => acc + line.vat_amount, 0);
        const totalAmount = subtotal + totalVat;
        return { subtotal, totalVat, totalAmount };
    }, [lines]);

    // --- FORM SUBMISSION ---
    const handleSubmit = async () => {
        setIsSubmitting(true);
        if (!supplierId || !poDate || lines.length === 0) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select a supplier, PO date, and add at least one item." });
            setIsSubmitting(false);
            return;
        }

        const poData = {
            company_id: user.company_id,
            supplier_id: parseInt(supplierId),
            po_date: format(poDate, 'yyyy-MM-dd'),
            expected_delivery_date: expectedDate ? format(expectedDate, 'yyyy-MM-dd') : null,
            currency,
            payment_terms: paymentTerms,
            remarks,
            created_by: user.id,
            lines: lines.map(l => ({
                item_id: parseInt(l.item_id),
                description: l.description,
                quantity: l.quantity,
                unit_price: l.unit_price,
                vat_applicable: l.vat_applicable,
                vat_rate: l.vat_rate,
            })),
        };

        try {
            const result = await api('create-purchase-order.php', { method: 'POST', body: poData });
            toast({ title: "Success", description: `Purchase Order ${result.po_number} created successfully.` });
            // Reset form or redirect
            setLines([]);
            setSupplierId('');
            //Potentially redirect: router.push(`/procurement/purchase-orders/${result.po_id}`);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Submission Failed", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER LOGIC ---
    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-destructive text-center"><AlertCircle className="mx-auto mb-2" />{error}</div>;

    return (
        <div className="space-y-6">
            {/* PO Header */}
            <Card>
                <CardHeader><CardTitle>Purchase Order Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="supplier">Supplier</Label>
                        <Select value={supplierId} onValueChange={setSupplierId}>
                            <SelectTrigger><SelectValue placeholder="Select a supplier" /></SelectTrigger>
                            <SelectContent>
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="po-date">PO Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-full justify-start font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {poDate ? format(poDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={poDate} onSelect={setPoDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="expected-date">Expected Delivery</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-full justify-start font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expectedDate ? format(expectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expectedDate} onSelect={setExpectedDate} /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="USD">USD</SelectItem>
                                 <SelectItem value="EUR">EUR</SelectItem>
                                 <SelectItem value="GBP">GBP</SelectItem>
                             </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="payment-terms">Payment Terms</Label>
                        <Input id="payment-terms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g., Net 30"/>
                    </div>
                    <div className="space-y-2 md:col-span-3">
                        <Label htmlFor="remarks">Remarks / Notes</Label>
                        <Input id="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes for the supplier"/>
                    </div>
                </CardContent>
            </Card>

            {/* PO Lines */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Items</CardTitle>
                        <Button variant="outline" size="sm" onClick={addNewLine}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-2/5">Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>VAT</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lines.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10">No items added yet.</TableCell></TableRow>
                            ) : lines.map(line => (
                                <TableRow key={line.id}>
                                    <TableCell>
                                        <Select value={line.item_id} onValueChange={value => handleLineChange(line.id, 'item_id', value)}>
                                            <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
                                            <SelectContent>
                                                {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            value={line.description}
                                            onChange={e => handleLineChange(line.id, 'description', e.target.value)}
                                            placeholder="Item description"
                                            className="mt-1 text-xs text-muted-foreground"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={line.quantity} onChange={e => handleLineChange(line.id, 'quantity', e.target.valueAsNumber)} className="w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={line.unit_price} onChange={e => handleLineChange(line.id, 'unit_price', e.target.valueAsNumber)} className="w-28" />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id={`vat-${line.id}`} checked={line.vat_applicable} onCheckedChange={checked => handleLineChange(line.id, 'vat_applicable', checked)} />
                                            <Input type="number" value={line.vat_rate} onChange={e => handleLineChange(line.id, 'vat_rate', e.target.valueAsNumber)} className="w-20" disabled={!line.vat_applicable} placeholder="Rate %"/>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{line.line_total.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Summary & Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <Card>
                    <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>Subtotal:</span> <span>{summary.subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Total VAT:</span> <span>{summary.totalVat.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-base"><span>Total PO Amount:</span> <span>{summary.totalAmount.toFixed(2)}</span></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">Submit the purchase order for approval. Once submitted, it cannot be edited.</p>
                        <Button size="lg" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Submit for Approval
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
