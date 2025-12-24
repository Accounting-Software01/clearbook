'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, PlusCircle, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';

// --- TYPES ---
interface Supplier { id: string; name: string; }
interface RawMaterial { id: number; name: string; item_code: string; unit_of_measure: string; standard_cost: number;}
interface SupplierDetails { vat_rate: number; payment_terms: string; }

interface LineItem {
    id: string; // Temp client-side ID
    item_id: number | null;
    description: string;
    quantity: string;
    unit_price: string;
    vat_applicable: boolean;
    vat_rate: string;
    line_amount: number;
    vat_amount: number;
    line_total: number;
}

// --- HELPERS ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
const newId = () => `temp_${Date.now()}_${Math.random()}`;

const createNewLineItem = (vat_rate: string): LineItem => ({
    id: newId(),
    item_id: null,
    description: '',
    quantity: '1',
    unit_price: '0',
    vat_applicable: true,
    vat_rate: vat_rate,
    line_amount: 0,
    vat_amount: 0,
    line_total: 0,
});


// --- MAIN COMPONENT ---
export function NewPurchaseOrderForm() {
    const { toast } = useToast();
    const { user } = useAuth();

    // --- STATE ---
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [poHeader, setPoHeader] = useState({
        po_number: '',
        supplier_id: '',
        po_date: new Date(),
        expected_delivery_date: undefined as Date | undefined,
        currency: 'NGN',
        payment_terms: '',
        remarks: '',
    });
    const [totals, setTotals] = useState({ subtotal: 0, vat_total: 0, total_amount: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(true);
    const [globalVatRate, setGlobalVatRate] = useState('7.5');

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsFetchingData(true);
        try {
            const [suppliersData, materialsData, poNumberData] = await Promise.all([
                api<Supplier[]>(`supplier.php?company_id=${user.company_id}`),
                api<RawMaterial[]>(`purchase-orders.php?action=search_raw_materials&company_id=${user.company_id}`),
                api<{ next_po_number: string }>(`purchase-orders.php?action=getNextPoNumber&company_id=${user.company_id}`)
            ]);
            setSuppliers(suppliersData);
            setRawMaterials(materialsData);
            setPoHeader(h => ({ ...h, po_number: poNumberData.next_po_number }));
        } catch (error) {
            toast({ title: "Error Loading Form", description: "Failed to load initial data. Please try refreshing.", variant: "destructive" });
        } finally {
            setIsFetchingData(false);
        }
    }, [user, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchSupplierDetails = useCallback(async (supplierId: string) => {
         if (!user?.company_id) return;
        try {
            const details = await api<SupplierDetails>(`purchase-orders.php?action=get_supplier_details&company_id=${user.company_id}&supplier_id=${supplierId}`);
            setPoHeader(h => ({ ...h, payment_terms: details.payment_terms || '' }));
            const newVatRate = details.vat_rate.toString();
            setGlobalVatRate(newVatRate);
            setLineItems(items => items.map(item => ({ ...item, vat_rate: newVatRate })));
        } catch (error) {
            toast({ title: "Warning", description: "Could not fetch supplier details. Using defaults.", variant: "default" });
        }
    }, [user, toast]);

    // --- CALCULATIONS ---
    useEffect(() => {
        const { subtotal, vat_total } = lineItems.reduce((acc, item) => {
            const quantity = parseFloat(item.quantity) || 0;
            const unit_price = parseFloat(item.unit_price) || 0;
            const vat_rate = parseFloat(item.vat_rate) || 0;
            const line_amount = quantity * unit_price;
            const vat_amount = item.vat_applicable ? line_amount * (vat_rate / 100) : 0;

            item.line_amount = line_amount;
            item.vat_amount = vat_amount;
            item.line_total = line_amount + vat_amount;

            acc.subtotal += line_amount;
            acc.vat_total += vat_amount;
            return acc;
        }, { subtotal: 0, vat_total: 0 });

        setTotals({ subtotal, vat_total, total_amount: subtotal + vat_total });
    }, [lineItems]);

    // --- EVENT HANDLERS ---
    const handleHeaderChange = (field: keyof typeof poHeader, value: any) => {
        setPoHeader(h => ({ ...h, [field]: value }));
        if (field === 'supplier_id' && value) {
            fetchSupplierDetails(value);
        }
    };

    const addLineItem = () => setLineItems(prev => [...prev, createNewLineItem(globalVatRate)]);
    const removeLineItem = (id: string) => setLineItems(prev => prev.filter(item => item.id !== id));

    const handleItemChange = (id: string, field: keyof Omit<LineItem, 'id'>, value: any) => {
        setLineItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleMaterialSelect = (id: string, material: RawMaterial) => {
        setLineItems(prev => prev.map(item => item.id === id ? {
            ...item,
            item_id: material.id,
            description: `${material.name} (${material.item_code})`,
            unit_price: material.standard_cost.toString(),
        } : item));
    };

    const resetForm = useCallback(() => {
        setLineItems([]);
        setPoHeader(h => ({ 
            ...h, 
            supplier_id: '', 
            remarks: '', 
            payment_terms: '', 
            expected_delivery_date: undefined 
        }));
        fetchData(); // Refetch all initial data
    }, [fetchData]);

    const handleSubmit = async () => {
         if (!poHeader.supplier_id || lineItems.length === 0 || lineItems.some(i => !i.item_id)) {
            toast({ title: "Validation Error", description: "Please select a supplier and add/select items for all rows.", variant: "destructive" });
            return;
        }
        setIsLoading(true);

        const submissionData = {
            header: {
                ...poHeader,
                company_id: user!.company_id,
                created_by: user!.uid,
                status: 'Draft',
                po_date: poHeader.po_date.toISOString().split('T')[0],
                expected_delivery_date: poHeader.expected_delivery_date?.toISOString().split('T')[0] || null,
                ...totals
            },
            items: lineItems.map(i => ({ 
                ...i, 
                quantity: parseFloat(i.quantity) || 0,
                unit_price: parseFloat(i.unit_price) || 0
            }))
        };

        try {
            const result = await api('purchase-orders.php', { method: 'POST', body: JSON.stringify(submissionData) });
            toast({ title: "Success", description: `Purchase Order ${result.po_number} created successfully.` });
            resetForm();
        } catch (error: any) {
            toast({ title: "Submission Error", description: error.message || "An unknown error occurred", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
             <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>New Purchase Order</CardTitle>
                        <CardDescription>Create a new PO to send to your supplier.</CardDescription>
                    </div>
                    {isFetchingData && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input value={poHeader.po_number} readOnly placeholder="PO Number" />
                    <Select onValueChange={(v) => handleHeaderChange('supplier_id', v)} value={poHeader.supplier_id} disabled={isFetchingData}>
                        <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                        <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <DatePicker date={poHeader.po_date} setDate={(d) => handleHeaderChange('po_date', d)} placeholder="PO Date" />
                    <DatePicker date={poHeader.expected_delivery_date} setDate={(d) => handleHeaderChange('expected_delivery_date', d)} placeholder="Expected Delivery" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="Payment Terms" value={poHeader.payment_terms} onChange={e => handleHeaderChange('payment_terms', e.target.value)} />
                     <Select onValueChange={(v) => handleHeaderChange('currency', v)} value={poHeader.currency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="NGN">NGN</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                    </Select>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[35%]">Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>VAT?</TableHead>
                                <TableHead>VAT Rate %</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lineItems.map(item => (
                                <LineItemRow 
                                    key={item.id} 
                                    item={item} 
                                    onItemChange={handleItemChange} 
                                    onRemove={removeLineItem} 
                                    onMaterialSelect={handleMaterialSelect}
                                    materials={rawMaterials}
                                />
                            ))}
                        </TableBody>
                         <TableFooter>
                            <TableRow><SummaryCell label="Subtotal" value={formatCurrency(totals.subtotal)} /></TableRow>
                             <TableRow><SummaryCell label="VAT" value={formatCurrency(totals.vat_total)} /></TableRow>
                             <TableRow className="font-bold text-base"><SummaryCell label="Total" value={formatCurrency(totals.total_amount)} /></TableRow>
                        </TableFooter>
                    </Table>
                    <div className="p-2 border-t"><Button variant="link" size="sm" onClick={addLineItem}><PlusCircle className="mr-2 h-4 w-4" />Add Item</Button></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Textarea placeholder="Add remarks or notes..." value={poHeader.remarks} onChange={e => handleHeaderChange('remarks', e.target.value)} />
                    <div className="flex justify-end items-end">
                        <Button onClick={handleSubmit} disabled={isLoading || isFetchingData || lineItems.length === 0} size="lg">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Purchase Order
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// --- SUB-COMPONENTS ---

const SummaryCell = ({ label, value }: { label: string, value: string }) => (
    <>
        <TableCell colSpan={6} className="text-right font-semibold">{label}</TableCell>
        <TableCell className="text-right">{value}</TableCell>
        <TableCell></TableCell>
    </>
);

function LineItemRow({ item, onItemChange, onRemove, onMaterialSelect, materials }: {
    item: LineItem, 
    onItemChange: (id: string, field: keyof Omit<LineItem, 'id'>, value: any) => void,
    onRemove: (id: string) => void,
    onMaterialSelect: (id: string, material: RawMaterial) => void,
    materials: RawMaterial[]
}) {
    const [open, setOpen] = useState(false);

    const handleSelect = (material: RawMaterial) => {
        onMaterialSelect(item.id, material);
        setOpen(false);
    }

    return (
        <TableRow>
            <TableCell className="w-[35%]">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
                             <span className="truncate">{item.item_id ? materials.find(m => m.id === item.item_id)?.name : "Select Material..."}</span>
                             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                            <CommandInput placeholder="Search material..." />
                            <CommandList>
                                <CommandEmpty>No material found.</CommandEmpty>
                                <CommandGroup>
                                    {materials.map((material) => (
                                        <CommandItem key={material.id} value={material.name} onSelect={() => handleSelect(material)}>
                                            <Check className={cn("mr-2 h-4 w-4", item.item_id === material.id ? "opacity-100" : "opacity-0")} />
                                            <div>
                                                <div>{material.name}</div>
                                                <div className="text-xs text-muted-foreground">{material.item_code}</div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </TableCell>
            <TableCell><Input type="number" value={item.quantity} onChange={e => onItemChange(item.id, 'quantity', e.target.value)} min="0.01" step="0.01" className="w-20"/></TableCell>
            <TableCell><Input type="number" value={item.unit_price} onChange={e => onItemChange(item.id, 'unit_price', e.target.value)} min="0" step="0.01" className="text-right w-28" /></TableCell>
            <TableCell className="text-center"><Checkbox checked={item.vat_applicable} onCheckedChange={(c) => onItemChange(item.id, 'vat_applicable', !!c)} /></TableCell>
            <TableCell><Input type="number" value={item.vat_rate} onChange={e => onItemChange(item.id, 'vat_rate', e.target.value)} disabled={!item.vat_applicable} min="0" max="100" className="w-20"/></TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(item.line_total)}</TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
        </TableRow>
    );
}
