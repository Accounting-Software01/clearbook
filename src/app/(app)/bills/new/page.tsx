'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DatePicker } from '@/components/ui/date-picker';


type Supplier = {
    id: string;
    name: string;
};

type BillItem = {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
};

const CreateNewBillPage = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>();
    const [billDate, setBillDate] = useState<Date | undefined>(new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(() => {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        return date;
    });
    const [notes, setNotes] = useState('');
    const [terms, setTerms] = useState('');
    const [items, setItems] = useState<BillItem[]>([{ description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchSuppliers = async () => {
            if (!user) return;
            try {
                // CORRECTED: Using the full API URL you provided.
                const res = await fetch(`https://hariindustries.net/api/clearbook/get_suppliers.php?company_id=${user.company_id}`);
                const data = await res.json();
                if (res.ok && data.success) {
                    setSuppliers(data.suppliers);
                } else {
                     toast({
                        variant: "destructive",
                        title: "Error fetching suppliers",
                        description: data.message || "An unknown error occurred.",
                    });
                }
            } catch (error) {
                console.error('Failed to fetch suppliers', error);
                toast({
                    variant: "destructive",
                    title: "Network Error",
                    description: "Failed to connect to the server to fetch suppliers.",
                });
            }
        };

        if (user) {
            fetchSuppliers();
        }
    }, [user, toast]);

    // CORRECTED: This function now allows typing text in the description field.
    const handleItemChange = (index: number, field: keyof BillItem, value: string) => {
        const newItems = [...items];
        if (field === 'description') {
            newItems[index][field] = value;
        } else {
            const numericValue = parseFloat(value);
            (newItems[index] as any)[field] = isNaN(numericValue) ? 0 : numericValue;
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 }]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
        const totalTax = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
        const totalDiscount = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice * item.discount / 100), 0);
        const totalAmount = subtotal + totalTax - totalDiscount;
        return { subtotal, totalTax, totalDiscount, totalAmount };
    };

    const totals = calculateTotals();

    const handleCreateBill = async () => {
        if (!selectedSupplier) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select a supplier." });
            return;
        }
        if (!billDate || !dueDate) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select a bill date and due date." });
            return;
        }
        if (items.some(item => !item.description || item.quantity <= 0 || item.unitPrice < 0)) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please fill all item fields correctly. Quantity must be > 0 and Unit Price cannot be negative." });
            return;
        }
        
        setIsSubmitting(true);

        const payload = {
            user_id: user.uid,
            company_id: user.company_id,
        

            supplier_id: selectedSupplier,
            bill_date: billDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            notes,
            terms,
            items
        };

        try {
            // CORRECTED: The bill creation API endpoint is also updated.
            const res = await fetch('https://hariindustries.net/api/clearbook/bills.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast({
                    title: "Success",
                    description: `Bill #${data.bill_id} created successfully.`,
                });
                router.push('/bills');
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to create bill",
                    description: data.message || "An unknown error occurred.",
                });
            }
        } catch (error) {
             console.error('Failed to create bill', error);
             toast({
                variant: "destructive",
                title: "Network Error",
                description: "Failed to connect to the server.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Create New Bill</h1>
                <Button variant="outline" onClick={() => router.push('/bills')}>Back to List</Button>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <Label htmlFor="supplier">Supplier *</Label>
                            <Select onValueChange={setSelectedSupplier} value={selectedSupplier}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(supplier => (
                                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="billDate">Bill Date *</Label>
                             <DatePicker date={billDate} setDate={setBillDate} />
                        </div>
                        <div>
                            <Label htmlFor="dueDate">Due Date *</Label>
                            <DatePicker date={dueDate} setDate={setDueDate} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea id="notes" placeholder="Enter bill notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="terms">Terms & Conditions</Label>
                            <Textarea id="terms" placeholder="Enter terms and conditions" value={terms} onChange={(e) => setTerms(e.target.value)} />
                        </div>
                    </div>

                    <h2 className="text-xl font-bold mb-2">Bill Items</h2>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Description *</TableHead>
                                    <TableHead>Quantity *</TableHead>
                                    <TableHead>Unit Price *</TableHead>
                                    <TableHead>Tax Rate (%)</TableHead>
                                    <TableHead>Tax Amount</TableHead>
                                    <TableHead>Discount (%)</TableHead>
                                    <TableHead>Line Total</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => {
                                    const lineTotal = item.quantity * item.unitPrice * (1 + item.taxRate / 100) * (1 - item.discount / 100);
                                    const taxAmount = item.quantity * item.unitPrice * item.taxRate / 100;
                                    return (
                                        <TableRow key={index}>
                                            <TableCell><Input placeholder="Item description" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} /></TableCell>
                                            <TableCell><Input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} /></TableCell>
                                            <TableCell><Input type="number" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} /></TableCell>
                                            <TableCell><Input type="number" value={item.taxRate} onChange={e => handleItemChange(index, 'taxRate', e.target.value)} /></TableCell>
                                            <TableCell>{taxAmount.toFixed(2)}</TableCell>
                                            <TableCell><Input type="number" value={item.discount} onChange={e => handleItemChange(index, 'discount', e.target.value)} /></TableCell>
                                            <TableCell>{lineTotal.toFixed(2)}</TableCell>
                                            <TableCell><Button variant="destructive" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <Button variant="outline" size="sm" onClick={addItem} className="mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                    </Button>

                    <div className="flex justify-end mt-6">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between">
                                <span className="font-semibold">Subtotal:</span>
                                <span>{totals.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Total Tax:</span>
                                <span>{totals.totalTax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Total Discount:</span>
                                <span className="text-red-500">-{totals.totalDiscount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total Amount:</span>
                                <span>{totals.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end mt-6 space-x-2">
                        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={handleCreateBill} disabled={isSubmitting}>
                            {isSubmitting ? 'Creating Bill...' : 'Create Bill'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CreateNewBillPage;
