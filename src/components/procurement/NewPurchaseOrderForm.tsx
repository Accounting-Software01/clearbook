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
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle, Loader2, ChevronsUpDown, Check, Truck } from 'lucide-react';
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
    // TOTAL cost of materials for this line, entered directly — an
    // independent aggregate figure, NOT a per-unit price to be
    // multiplied by quantity. E.g. "supplier billed ₦40,000 for this
    // whole batch" — you type 40000, regardless of how many units that
    // batch contains.
    material_cost: string;
    vat_applicable: boolean;
    vat_rate: string;
    line_amount: number;   // = material_cost as entered, no × quantity
    vat_amount: number;
    line_total: number;
    // Landed cost — freight allocated to this line, and the resulting
    // weighted-average unit cost:
    //   (material_cost + allocated_freight) ÷ quantity
    // VAT is intentionally excluded from both: VAT applies only to
    // goods cost, never to freight, and is not part of landed cost.
    allocated_freight: number;
    weighted_unit_cost: number;
}

// --- HELPERS ---
const formatCurrency = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
const newId = () => `temp_${Date.now()}_${Math.random()}`;

const createNewLineItem = (vat_rate: string): LineItem => ({
    id: newId(),
    item_id: null,
    description: '',
    quantity: '1',
    material_cost: '0',
    vat_applicable: true,
    vat_rate: vat_rate,
    line_amount: 0,
    vat_amount: 0,
    line_total: 0,
    allocated_freight: 0,
    weighted_unit_cost: 0,
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
        // Freight / shipping — a header-level charge, not tied to any
        // specific line item on its own. VAT NEVER applies to freight
        // (per accounting rule: VAT is only applicable to actual goods
        // cost, not freight and not the combined total) — so there is no
        // VAT field for it at all. Freight IS allocated across line items
        // for landed-cost purposes; see the totals useEffect below.
        freight_amount: '0',
    });
    const [totals, setTotals] = useState({
        subtotal: 0,
        freight_amount: 0,
        vat_total: 0,
        total_amount: 0,
    });
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
            const newVatRate = details.vat_rate.toString();
            setPoHeader(h => ({
                ...h,
                payment_terms: details.payment_terms || '',
            }));
            setGlobalVatRate(newVatRate);
            setLineItems(items => items.map(item => ({ ...item, vat_rate: newVatRate })));
        } catch (error) {
            toast({ title: "Warning", description: "Could not fetch supplier details. Using defaults.", variant: "default" });
        }
    }, [user, toast]);

    // --- CALCULATIONS ---
    // Two passes, per the accountant's rule:
    //   1. Each line's own goods amount and VAT — VAT applies ONLY to
    //      actual goods cost, never to freight, never to the combined total.
    //   2. Freight is allocated across lines proportional to each line's
    //      share of the goods subtotal, then the weighted-average LANDED
    //      unit cost is computed per line as:
    //        (line's actual cost + its allocated freight) ÷ quantity bought
    //      This landed cost is what should be used for inventory
    //      valuation — it deliberately excludes VAT entirely.
    useEffect(() => {
        const freight_amount = parseFloat(poHeader.freight_amount) || 0;

        // Pass 1 — goods cost & VAT. material_cost is entered as the TOTAL
        // for the line already (not per-unit), so line_amount = material_cost
        // directly. VAT applies only to this actual goods cost, never to
        // freight, never to the combined total.
        let subtotal = 0;
        let vat_total = 0;
        lineItems.forEach(item => {
            const material_cost = parseFloat(item.material_cost) || 0;
            const vat_rate = parseFloat(item.vat_rate) || 0;
            const line_amount = material_cost;
            const vat_amount = item.vat_applicable ? line_amount * (vat_rate / 100) : 0;

            item.line_amount = line_amount;
            item.vat_amount = vat_amount;
            item.line_total = line_amount + vat_amount;

            subtotal += line_amount;
            vat_total += vat_amount;
        });

        // Pass 2 — allocate freight by each line's share of goods value,
        // then compute the final Unit Price as:
        //   (material_cost + allocated_freight) ÷ quantity
        lineItems.forEach(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const share = subtotal > 0 ? item.line_amount / subtotal : 0;
            const allocated_freight = freight_amount * share;

            item.allocated_freight = allocated_freight;
            item.weighted_unit_cost = quantity > 0
                ? (item.line_amount + allocated_freight) / quantity
                : 0;
        });

        setTotals({
            subtotal,
            freight_amount,
            vat_total, // goods VAT only — freight is never VATable
            total_amount: subtotal + freight_amount + vat_total,
        });
    }, [lineItems, poHeader.freight_amount]);

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
        setLineItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const quantity = parseFloat(item.quantity) || 1;
            // Suggested TOTAL based on this material's stored average cost —
            // a starting point only. Overwrite with the real total the
            // supplier actually charged for this batch.
            const suggested_total = (material.standard_cost * quantity).toString();
            return {
                ...item,
                item_id: material.id,
                description: `${material.name} (${material.item_code})`,
                material_cost: suggested_total,
            };
        }));
    };

    const resetForm = useCallback(() => {
        setLineItems([]);
        setPoHeader(h => ({
            ...h,
            supplier_id: '',
            remarks: '',
            payment_terms: '',
            expected_delivery_date: undefined,
            freight_amount: '0',
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
                freight_amount: parseFloat(poHeader.freight_amount) || 0,
                ...totals
            },
            items: lineItems.map(i => {
                const quantity = parseFloat(i.quantity) || 0;
                const material_cost_total = parseFloat(i.material_cost) || 0;
                // purchase_order_items.unit_price is an existing per-unit
                // column on the backend — derive it here as a reference
                // figure (pre-freight, materials only) since the actual
                // entry point (material_cost) is now a line total, not a
                // per-unit price. line_amount remains the authoritative
                // total and is what VAT/freight allocation are based on.
                const derived_unit_price = quantity > 0 ? material_cost_total / quantity : 0;
                return {
                    ...i,
                    quantity,
                    unit_price: derived_unit_price,
                    material_cost: material_cost_total,
                    // Landed cost — the accountant's weighted-average formula:
                    // (material_cost total + allocated freight) ÷ quantity.
                    // This is what should be used for inventory valuation
                    // when goods are received, NOT unit_price above.
                    allocated_freight: i.allocated_freight,
                    weighted_unit_cost: i.weighted_unit_cost,
                };
            })
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
                                <TableHead>Material Cost (Total)</TableHead>
                                <TableHead>VAT?</TableHead>
                                <TableHead>VAT Rate %</TableHead>
                                <TableHead className="text-right">Line Total</TableHead>
                                <TableHead className="text-right">Unit Price (after freight)</TableHead>
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
                            <TableRow><SummaryCell label="Goods Subtotal" value={formatCurrency(totals.subtotal)} /></TableRow>
                            <TableRow><SummaryCell label="Freight (no VAT)" value={formatCurrency(totals.freight_amount)} /></TableRow>
                            <TableRow><SummaryCell label="VAT (on goods only)" value={formatCurrency(totals.vat_total)} /></TableRow>
                             <TableRow className="font-bold text-base"><SummaryCell label="Total" value={formatCurrency(totals.total_amount)} /></TableRow>
                        </TableFooter>
                    </Table>
                    <div className="p-2 border-t"><Button variant="link" size="sm" onClick={addLineItem}><PlusCircle className="mr-2 h-4 w-4" />Add Item</Button></div>
                </div>

                {/* ── Freight / Shipping ─────────────────────────────────────
                 *  A single header-level charge, allocated across line items
                 *  to compute each item's weighted-average LANDED unit cost:
                 *    (actual cost + allocated freight) ÷ quantity bought
                 *  VAT is NEVER applied to freight, per accounting rule —
                 *  there is deliberately no VAT control here at all.
                 * ─────────────────────────────────────────────────────────── */}
                <div className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        Freight / Shipping
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="freight_amount">Freight Amount</Label>
                            <Input
                                id="freight_amount"
                                type="number"
                                min="0"
                                step="0.01"
                                value={poHeader.freight_amount}
                                onChange={e => handleHeaderChange('freight_amount', e.target.value)}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground pb-2 md:col-span-2">
                            VAT is not applicable to freight — it's added to the total payable and allocated
                            across line items below. Each item's <strong>Unit Price</strong> is calculated
                            after freight is added to its material cost.
                        </div>
                    </div>
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
        <TableCell colSpan={7} className="text-right font-semibold">{label}</TableCell>
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
            <TableCell><Input type="number" value={item.material_cost} onChange={e => onItemChange(item.id, 'material_cost', e.target.value)} min="0" step="0.01" className="text-right w-28" placeholder="Total for this batch" /></TableCell>
            <TableCell className="text-center"><Checkbox checked={item.vat_applicable} onCheckedChange={(c) => onItemChange(item.id, 'vat_applicable', !!c)} /></TableCell>
            <TableCell><Input type="number" value={item.vat_rate} onChange={e => onItemChange(item.id, 'vat_rate', e.target.value)} disabled={!item.vat_applicable} min="0" max="100" className="w-20"/></TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(item.line_total)}</TableCell>
            <TableCell className="text-right font-bold">
                {formatCurrency(item.weighted_unit_cost)}
                {item.allocated_freight > 0 && (
                    <div className="text-xs font-normal text-muted-foreground">
                        ({formatCurrency(item.line_amount)} material + {formatCurrency(item.allocated_freight)} freight) ÷ {parseFloat(item.quantity) || 0}
                    </div>
                )}
            </TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
        </TableRow>
    );
}
