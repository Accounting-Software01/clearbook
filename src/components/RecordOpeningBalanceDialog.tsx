'use client';
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RecordOpeningBalanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    itemType: 'raw_material' | 'finished_good';
}

interface StagedItem {
    id: number;
    name: string;
    category: string;
    sku: string;
    unit_of_measure: string;
    quantity: string;
    unit_cost: string;
}

const inventoryCategories = {
    raw_material: [
        'Raw Materials Inventory',
        'Work-in-Progress (WIP) Inventory',
        'Packaging Materials Inventory',
        'Consumables & Production Supplies',
        'Spare Parts & Maintenance Inventory',
        'Fuel & Energy Inventory',
        'Returned Goods / Reverse Inventory',
        'Obsolete, Expired & Scrap Inventory',
        'Goods-in-Transit Inventory',
        'Promotional & Marketing Inventory',
        'Safety Stock / Buffer Inventory',
        'Rejected / Quality-Hold Inventory',
        'Third-Party / Consignment Inventory',
    ],
    finished_good: [
        'Finished Goods Inventory',
        'Work-in-Progress (WIP) Inventory',
        'Returned Goods / Reverse Inventory',
        'Obsolete, Expired & Scrap Inventory',
        'Goods-in-Transit Inventory',
        'Promotional & Marketing Inventory',
        'Safety Stock / Buffer Inventory',
        'Rejected / Quality-Hold Inventory',
        'Third-Party / Consignment Inventory',
    ],
};

export const RecordOpeningBalanceDialog: React.FC<RecordOpeningBalanceDialogProps> = ({ open, onOpenChange, onSuccess, itemType }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
    const [newItem, setNewItem] = useState({ name: '', category: '', sku: '', unit_of_measure: '', quantity: '', unit_cost: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when the dialog is closed
    useEffect(() => {
        if (!open) {
            setStagedItems([]);
            setNewItem({ name: '', category: '', sku: '', unit_of_measure: '', quantity: '', unit_cost: '' });
            setIsSubmitting(false);
        }
    }, [open]);

    const handleAddItem = () => {
        if (!newItem.name || !newItem.quantity || !newItem.unit_cost || !newItem.category) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out all required fields: Name, Category, Quantity, and Unit Cost.' });
            return;
        }
        setStagedItems([...stagedItems, { ...newItem, id: Date.now() }]);
        // Reset form, keeping category for efficiency
        setNewItem({ ...newItem, name: '', sku: '', unit_of_measure: '', quantity: '', unit_cost: '' });
    };

    const handleRemoveItem = (id: number) => {
        setStagedItems(stagedItems.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        if (stagedItems.length === 0) {
            toast({ variant: 'destructive', title: 'No Items', description: 'Please add at least one item.' });
            return;
        }

        setIsSubmitting(true);

        const payload = {
            company_id: user?.company_id,
            user_id: user?.id,
            items: stagedItems.map(item => ({
                ...item,
                item_type: itemType,
                quantity: parseFloat(item.quantity) || 0,
                unit_cost: parseFloat(item.unit_cost) || 0,
            })),
        };

        try {
            const response = await fetch('/api/clearbook/record-inventory-opening-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                toast({ title: 'Success', description: 'Opening balances recorded successfully.' });
                onSuccess();
                onOpenChange(false);
            } else {
                throw new Error(result.error_details || result.message || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = itemType === 'raw_material' ? 'Raw Material' : 'Finished Good';
    const categories = inventoryCategories[itemType] || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Record Opening Balances for {title}s</DialogTitle>
                    <DialogDescription>
                        Add new {title.toLowerCase()} items and their initial stock levels.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 py-4 items-end">
                    <div className="md:col-span-2">
                        <Label htmlFor="itemName">Name*</Label>
                        <Input id="itemName" placeholder="Item Name" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                    </div>
                    <div>
                        <Label htmlFor="itemCategory">Category*</Label>
                        <Select value={newItem.category} onValueChange={value => setNewItem({ ...newItem, category: value })}> 
                            <SelectTrigger id="itemCategory">
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="itemUnit">Unit</Label>
                        <Input id="itemUnit" placeholder="e.g., pcs, kg" value={newItem.unit_of_measure} onChange={e => setNewItem({ ...newItem, unit_of_measure: e.target.value })} />
                    </div>
                    <div>
                        <Label htmlFor="itemQty">Quantity*</Label>
                        <Input id="itemQty" type="number" placeholder="0" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
                    </div>
                    <div>
                        <Label htmlFor="itemCost">Unit Cost*</Label>
                        <Input id="itemCost" type="number" placeholder="0.00" value={newItem.unit_cost} onChange={e => setNewItem({ ...newItem, unit_cost: e.target.value })} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAddItem} size="sm" className="w-full" disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4" />Add</Button>
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right">Total Value</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stagedItems.length > 0 ? (
                                stagedItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell>{item.unit_of_measure}</TableCell>
                                        <TableCell className="text-right">{(parseFloat(item.quantity) || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{(parseFloat(item.unit_cost) || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-medium">{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No items added yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting || stagedItems.length === 0}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Submit Opening Balances
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
