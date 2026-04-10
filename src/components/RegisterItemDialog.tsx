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
import { apiEndpoints } from '@/lib/apiEndpoints';

interface RegisterItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

// All items will be saved with this exact category.
const FORCED_CATEGORY = 'Raw Materials Inventory';

export const RegisterItemDialog: React.FC<RegisterItemDialogProps> = ({ open, onOpenChange, onSuccess }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        unit_of_measure: '',
        cost: '0',
    });
    const [itemType, setItemType] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!open) {
            setFormData({ name: '', sku: '', unit_of_measure: '', cost: '0' });
            setItemType('');
            setIsLoading(false);
        }
    }, [open]);

    const handleRegister = async () => {
        if (!itemType || !formData.name) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please select an item type and enter a name.' });
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                name: formData.name,
                sku: formData.sku,
                unit_of_measure: formData.unit_of_measure,
                category: FORCED_CATEGORY,   // always forced
                cost: parseFloat(formData.cost) || 0,
                company_id: user?.company_id,
                item_type: itemType,
                opening_balance: 0,
            };

            const response = await fetch(apiEndpoints.registerItem, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                toast({ title: 'Success', description: data.message || 'Item registered successfully.' });
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Register New Inventory Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="itemType" className="text-right">Item Type</Label>
                        <Select onValueChange={setItemType} value={itemType}>
                            <SelectTrigger id="itemType" className="col-span-3">
                                <SelectValue placeholder="Select item type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="raw_material">Raw Material</SelectItem>
                                <SelectItem value="finished_good">Finished Good</SelectItem>
                                <SelectItem value="semi_finished">Semi-Finished Good</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {itemType && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" value={formData.name} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 'HDPE Pellets'" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sku" className="text-right">SKU</Label>
                                <Input id="sku" value={formData.sku} onChange={handleInputChange} className="col-span-3" placeholder="Stock Keeping Unit (optional)" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit_of_measure" className="text-right">Unit of Measure</Label>
                                <Input id="unit_of_measure" value={formData.unit_of_measure} onChange={handleInputChange} className="col-span-3" placeholder="e.g., 'kg', 'pcs', 'litres'" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="cost" className="text-right">Unit Cost</Label>
                                <Input id="cost" type="number" value={formData.cost} onChange={handleInputChange} className="col-span-3" placeholder="Cost per unit" />
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="outline" disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleRegister} disabled={isLoading || !itemType || !formData.name}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...</> : 'Register Item'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};