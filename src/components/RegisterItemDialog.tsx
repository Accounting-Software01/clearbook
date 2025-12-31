'use client';
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Interfaces
interface RegisterItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ItemDetails {
    name: string;
    sku: string;
    category: string;
    unit_of_measure: string;
    unit_cost: string;
    inventory_account_id: string; 
    item_type: 'product' | 'raw_material';
}

const rawMaterialAccounts = [
    { id: 14, account_code: '101310', account_name: 'Inventory Control - Raw Materials (AUTO)' },
    { id: 15, account_code: '101300', account_name: 'Inventory - Raw Materials' },
    { id: 21, account_code: '101360', account_name: 'Inventory - Packaging Materials' },
    { id: 16, account_code: '101370', account_name: 'Inventory - Spare Parts & Consumables' }
];

const productAccounts = [
    { id: 19, account_code: '101350', account_name: 'Inventory Control - Finished Goods (AUTO)' },
    { id: 20, account_code: '101340', account_name: 'Inventory - Finished Goods' },
    { id: 17, account_code: '101330', account_name: 'Inventory Control - WIP (AUTO)' }
];

export function RegisterItemDialog({ open, onOpenChange, onSuccess }: RegisterItemDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [details, setDetails] = useState<ItemDetails>({
        name: '',
        sku: '',
        category: '',
        unit_of_measure: '',
        unit_cost: '',
        inventory_account_id: String(productAccounts[0].id),
        item_type: 'product',
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (field: keyof Omit<ItemDetails, 'item_type' | 'inventory_account_id'>, value: string) => {
        setDetails(prev => ({ ...prev, [field]: value }));
    };
    
    const handleTypeChange = (value: 'product' | 'raw_material') => {
        const defaultAccountId = value === 'product' 
            ? String(productAccounts[0].id) 
            : String(rawMaterialAccounts[0].id);

        setDetails(prev => ({
            ...prev,
            item_type: value,
            inventory_account_id: defaultAccountId, 
        }));
    };
    
    const handleAccountChange = (value: string) => {
        setDetails(prev => ({ ...prev, inventory_account_id: value }));
    }

    const resetForm = () => {
        setDetails({
            name: '',
            sku: '',
            category: '',
            unit_of_measure: '',
            unit_cost: '',
            inventory_account_id: String(productAccounts[0].id),
            item_type: 'product',
        });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not found.' });
            return;
        }

        setIsLoading(true);

        const payload = {
            ...details,
            unit_cost: parseFloat(details.unit_cost) || 0,
            inventory_account_id: parseInt(details.inventory_account_id, 10),
            company_id: user.company_id,
        };

        if (!payload.name || !payload.sku || !payload.category || !payload.unit_of_measure || !payload.inventory_account_id) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill all fields, including the inventory account.' });
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/register-item.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok || result.status !== 'success') throw new Error(result.message || 'Registration failed.');
            
            toast({ title: 'Success!', description: `${details.name} registered successfully.` });
            resetForm();
            onSuccess();
            onOpenChange(false);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const currentAccountList = details.item_type === 'product' ? productAccounts : rawMaterialAccounts;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Register a New Inventory Item</DialogTitle>
                        <DialogDescription>Add an item to your master list, ensuring it's linked to the correct inventory account.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-5 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Item Type</Label>
                            <RadioGroup value={details.item_type} className="col-span-3 flex items-center gap-4" onValueChange={handleTypeChange}>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="product" id="r-product" /><Label htmlFor="r-product">Finished Product</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="raw_material" id="r-raw_material" /><Label htmlFor="r-raw_material">Raw Material</Label></div>
                            </RadioGroup>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Name</Label><Input id="name" value={details.name} onChange={(e) => handleInputChange('name', e.target.value)} className="col-span-3" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="sku" className="text-right">SKU</Label><Input id="sku" value={details.sku} onChange={(e) => handleInputChange('sku', e.target.value)} className="col-span-3" placeholder="Stock Keeping Unit" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="category" className="text-right">Category</Label><Input id="category" value={details.category} onChange={(e) => handleInputChange('category', e.target.value)} className="col-span-3" placeholder="e.g., Beverages" /></div>
                        {/* CORRECTED THIS LINE */}
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="unit_of_measure" className="text-right">Unit of Measure</Label><Input id="unit_of_measure" value={details.unit_of_measure} onChange={(e) => handleInputChange('unit_of_measure', e.target.value)} className="col-span-3" placeholder="e.g., Bottle, Kg" /></div>
                        <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="unit_cost" className="text-right">Initial Unit Cost</Label><Input id="unit_cost" type="number" value={details.unit_cost} onChange={(e) => handleInputChange('unit_cost', e.target.value)} className="col-span-3" placeholder="0.00" /></div>
                        
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="inventory_account_id" className="text-right">Inventory Account</Label>
                            <Select onValueChange={handleAccountChange} value={details.inventory_account_id}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select an inventory account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {currentAccountList.map(acc => (
                                        <SelectItem key={acc.id} value={String(acc.id)}>
                                            {acc.account_code} - {acc.account_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                         <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isLoading || !details.inventory_account_id}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Register Item
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}