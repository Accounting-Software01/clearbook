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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Product } from '@/types/inventory';
import { Loader2, Trash2 } from 'lucide-react';

interface PriceTier {
    id: number;
    product_id: number;
    tier_name: string;
    price: number | string; // Allow string to handle API response
}

interface PriceTierManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function PriceTierManagerDialog({ open, onOpenChange, product }: PriceTierManagerDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [tiers, setTiers] = useState<PriceTier[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newTierName, setNewTierName] = useState('');
    const [newTierPrice, setNewTierPrice] = useState('');

    const fetchTiers = async () => {
        if (!product || !user?.company_id) return;
        setIsLoading(true);
        try {
            // CORRECTED: Added the /inventory/ path segment
            const response = await fetch(`https://hariindustries.net/api/clearbook/manage-price-tiers.php?product_id=${product.id}&company_id=${user.company_id}`);
            if (!response.ok) throw new Error('Failed to fetch data.');
            const data = await response.json();
            setTiers(data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch price tiers.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchTiers();
        }
    }, [open, product, user]);

    const handleAddTier = async () => {
        if (!product || !newTierName || !newTierPrice || !user?.company_id) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Tier name and price are required.' });
            return;
        }
        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/manage-price-tiers.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: product.id,
                    tier_name: newTierName,
                    price: parseFloat(newTierPrice),
                    company_id: user.company_id,
                }),
            });
            const result = await response.json();
            if (!response.ok || result.status !== 'success') throw new Error(result.message || 'Failed to add tier.');
            
            toast({ title: 'Success', description: 'Price tier added.' });
            setNewTierName('');
            setNewTierPrice('');
            fetchTiers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
        }
    };

    const handleUpdateTier = async (tier: PriceTier, newPrice: string) => {
        if (!user?.company_id) return;
        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/inventory/manage-price-tiers.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: tier.id, 
                    price: parseFloat(newPrice),
                    company_id: user.company_id
                }),
            });
            const result = await response.json();
            if (!response.ok || result.status !== 'success') throw new Error(result.message || 'Failed to update tier.');

            toast({ title: 'Success', description: 'Price tier updated.' });
            fetchTiers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
        }
    };

    const handleDeleteTier = async (tierId: number) => {
        if (!user?.company_id) return;
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/inventory/manage-price-tiers.php?id=${tierId}&company_id=${user.company_id}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (!response.ok || result.status !== 'success') throw new Error(result.message || 'Failed to delete tier.');

            toast({ title: 'Success', description: 'Price tier deleted.' });
            fetchTiers();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Operation Failed', description: error.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Price Tiers for {product?.name}</DialogTitle>
                    <DialogDescription>Add, edit, or remove pricing tiers for this product.</DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : tiers.map(tier => (
                        <div key={tier.id} className="flex items-center justify-between gap-2">
                            <Label className="flex-1">{tier.tier_name}</Label>
                            <Input 
                                type="number" 
                                defaultValue={parseFloat(tier.price as string).toFixed(2)}
                                onBlur={(e) => handleUpdateTier(tier, e.target.value)}
                                className="w-32"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTier(tier.id)}>
                                <Trash2 className="h-4 w-4 text-red-500"/>
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t">
                    <h4 className="font-medium mb-2">Add New Tier</h4>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Tier Name (e.g., Wholesale)" 
                            value={newTierName}
                            onChange={e => setNewTierName(e.target.value)} 
                        />
                        <Input 
                            type="number"
                            placeholder="Price"
                            value={newTierPrice}
                            onChange={e => setNewTierPrice(e.target.value)} 
                            className="w-32"
                        />
                        <Button onClick={handleAddTier}>Add</Button>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
