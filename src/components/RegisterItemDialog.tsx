'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RegisterItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
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

export const RegisterItemDialog: React.FC<RegisterItemDialogProps> = ({ open, onOpenChange, onSuccess }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        unit_of_measure: '',
        category: '', 
    });
    const [itemType, setItemType] = useState(''); // 'raw_material' or 'finished_good'
    const [isLoading, setIsLoading] = useState(false);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setFormData({ name: '', sku: '', unit_of_measure: '', category: '' });
            setItemType('');
            setIsLoading(false);
        }
    }, [open]);

    const handleRegister = async () => {
        if (!itemType || !formData.name || !formData.category) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please select an item type, a category, and enter a name.' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/clearbook/register-item', { // Corrected API endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    company_id: user?.company_id,
                    item_type: itemType,
                }),
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                toast({ title: 'Success', description: 'Item registered successfully.' });
                onSuccess();
                onOpenChange(false);
            } else {
                throw new Error(data.details || data.message || 'An unknown error occurred.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({ ...prev, [id]: value }));
    };
    
    const categories = itemType ? inventoryCategories[itemType as keyof typeof inventoryCategories] || [] : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register New Inventory Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemType" className="text-right">Item Type</Label>
                        <Select onValueChange={value => { setItemType(value); setFormData(prev => ({ ...prev, category: '' })); }} value={itemType}>
                            <SelectTrigger id="itemType" className="col-span-3">
                                <SelectValue placeholder="Select item type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="raw_material">Raw Material</SelectItem>
                                <SelectItem value="finished_good">Finished Good</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {itemType && (
                        <>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                <Select onValueChange={value => setFormData(prev => ({ ...prev, category: value }))} value={formData.category}>
                                    <SelectTrigger id="category" className="col-span-3">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={formData.name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 'HDPE Pellets'"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sku" className="text-right">SKU</Label>
                                <Input id="sku" value={formData.sku} onChange={handleInputChange} className="col-span-3" placeholder="Stock Keeping Unit (optional)"/>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit_of_measure" className="text-right">Unit of Measure</Label>
                                <Input id="unit_of_measure" value={formData.unit_of_measure} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 'kg', 'pcs', 'litres'"/>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="outline" disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleRegister} disabled={isLoading || !itemType || !formData.category || !formData.name}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Registering...</> : 'Register Item'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
