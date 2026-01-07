'use client';
import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, PlusCircle, Trash2, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
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
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RecordOpeningBalanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    itemType: 'raw_material' | 'finished_good';
}

// Represents an item that exists in the DB
interface InventoryItem {
    id: number;
    name: string;
    category: string;
    sku: string;
    unit_of_measure: string;
    // quantity and unit_cost may not be relevant for selection
}

// Represents an item added to the staging table in the UI
interface StagedItem {
    id: number; // DB id if existing, temporary id (Date.now()) if new
    name: string;
    category: string;
    sku: string;
    unit_of_measure: string;
    quantity: string;
    unit_cost: string;
    is_new: boolean; // Flag to know if it's a new item
}

// --- Inventory Categories ---
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

const initialNewItemState = { id: 0, name: '', category: '', sku: '', unit_of_measure: '', quantity: '', unit_cost: '', is_new: true };

export const RecordOpeningBalanceDialog: React.FC<RecordOpeningBalanceDialogProps> = ({ open, onOpenChange, onSuccess, itemType }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
    const [newItem, setNewItem] = useState<Omit<StagedItem, 'is_new'> & { is_new?: boolean }> (initialNewItemState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingItems, setExistingItems] = useState<InventoryItem[]>([]);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

    // --- Data Fetching Effect ---
    useEffect(() => {
        if (open && user?.company_id) {
            setLoadingExisting(true);
            fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}&user_role=admin`)
                .then(res => res.json())
                .then(data => {
                    const items = itemType === 'raw_material' ? data.raw_materials : data.products;
                    setExistingItems(Array.isArray(items) ? items : []);
                })
                .catch(error => {
                    toast({ variant: 'destructive', title: 'Failed to fetch items', description: error.message });
                    setExistingItems([]);
                })
                .finally(() => setLoadingExisting(false));
        }
    }, [open, user?.company_id, itemType, toast]);

    // --- State Reset Effect ---
    useEffect(() => {
        if (!open) {
            setStagedItems([]);
            setNewItem(initialNewItemState);
            setIsSubmitting(false);
            setExistingItems([]);
        }
    }, [open]);

    const handleSelectItem = (item: InventoryItem) => {
        setNewItem({
            id: item.id,
            name: item.name,
            category: item.category || '',
            sku: item.sku || '',
            unit_of_measure: item.unit_of_measure || '',
            quantity: '', // User must enter these
            unit_cost: '', // User must enter these
            is_new: false,
        });
        setPopoverOpen(false);
    };

    const handleAddItem = () => {
        if (!newItem.name || !newItem.quantity || !newItem.unit_cost || !newItem.category) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill out Name, Category, Quantity, and Unit Cost.' });
            return;
        }

        const finalItem: StagedItem = {
            ...newItem,
            id: newItem.is_new ? Date.now() : newItem.id, // Temp ID for new items, real ID for existing
            is_new: newItem.is_new ?? true,
        };

        setStagedItems([...stagedItems, finalItem]);
        setNewItem(initialNewItemState); // Reset form completely
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
            items: stagedItems.map(item => ({
                id: item.is_new ? null : item.id, // Send null ID for new items
                name: item.name,
                sku: item.sku,
                category: item.category,
                unit_of_measure: item.unit_of_measure,
                item_type: itemType,
                quantity: parseFloat(item.quantity) || 0,
                unit_cost: parseFloat(item.unit_cost) || 0,
            })),
        };

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/record-inventory-opening-balance.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                toast({ title: 'Success', description: result.message || 'Opening balances recorded successfully.' });
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
                        Select an existing {title.toLowerCase()} to update, or enter a new name to create one.
                    </DialogDescription>
                </DialogHeader>

                {/* --- Form Section --- */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 py-4 items-end">
                    <div className="md:col-span-2">
                        <Label htmlFor="itemName">Name*</Label>
                         <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={popoverOpen}
                                    className="w-full justify-between font-normal"
                                    disabled={loadingExisting}
                                >
                                    {newItem.name ? newItem.name : `Select or type new ${title}...`}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                     <CommandInput 
                                        placeholder={`Search ${title}...`} 
                                        value={newItem.name}
                                        onValueChange={(search) => setNewItem({ ...initialNewItemState, name: search })}
                                     />
                                    <CommandList>
                                        <CommandEmpty>{loadingExisting ? 'Loading...' : 'No item found. Create new.'}</CommandEmpty>
                                        <CommandGroup>
                                            {existingItems.map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={item.name}
                                                    onSelect={() => handleSelectItem(item)}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", newItem.id === item.id ? "opacity-100" : "opacity-0")} />
                                                    {item.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div>
                        <Label htmlFor="itemCategory">Category*</Label>
                        <Select value={newItem.category} onValueChange={value => setNewItem({ ...newItem, category: value })} disabled={!newItem.is_new}>
                            <SelectTrigger id="itemCategory"><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="itemUnit">Unit</Label>
                        <Input id="itemUnit" placeholder="e.g., pcs, kg" value={newItem.unit_of_measure} onChange={e => setNewItem({ ...newItem, unit_of_measure: e.target.value })} disabled={!newItem.is_new} />
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

                {/* --- Staging Table --- */}
                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
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
                                        <TableCell className="font-medium">{item.name} {item.is_new && <span className='text-xs text-green-500'>(New)</span>}</TableCell>
                                        <TableCell>{item.category}</TableCell>
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
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No items added yet.</TableCell>
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