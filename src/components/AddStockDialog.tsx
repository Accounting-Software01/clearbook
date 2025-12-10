
'use client';
import React, { useState } from 'react';
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
import { Loader2, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ItemMasterListDialog } from './ItemMasterListDialog';

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'finished' | 'raw';
  onSuccess: () => void;
}

export function AddStockDialog({ open, onOpenChange, mode, onSuccess }: AddStockDialogProps) {
    const { toast } = useToast();
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isItemSelectionOpen, setIsItemSelectionOpen] = useState(false);

    const title = mode === 'finished' ? 'Add Finished Good Stock' : 'Add Raw Material Stock';
    const description = 'Record a purchase of an existing item. This will update inventory levels and post a journal entry.';
    
    const endpoint = mode === 'finished' 
        ? 'https://hariindustries.net/busa-api/database/register-product.php'
        : 'https://hariindustries.net/busa-api/database/register-raw-material.php';

    const resetForm = () => {
        setItemName('');
        setQuantity('');
        setUnitCost('');
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const parsedQuantity = parseInt(quantity, 10);
        const parsedUnitCost = parseFloat(unitCost);

        if (!itemName || isNaN(parsedQuantity) || isNaN(parsedUnitCost) || parsedQuantity <= 0 || parsedUnitCost <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'Please select an item and fill out all fields with valid numbers.',
            });
            setIsLoading(false);
            return;
        }
        
        const payload = {
            itemName: itemName,
            quantity: parsedQuantity,
            unitCost: parsedUnitCost
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to add item stock.');
            }

            toast({
                title: 'Success!',
                description: `Stock for ${itemName} has been updated and the journal has been posted.`,
            });
            
            resetForm();
            onSuccess(); // Callback to refresh the table
            onOpenChange(false); // Close the dialog

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Operation Failed',
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <ItemMasterListDialog
                open={isItemSelectionOpen}
                onOpenChange={setIsItemSelectionOpen}
                type={mode === 'finished' ? 'product' : 'material'}
                onSelectItem={(selectedItemName) => {
                    setItemName(selectedItemName);
                    setIsItemSelectionOpen(false);
                }}
            />
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription>{description}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Item Name</Label>
                                <div className="col-span-3 flex gap-2">
                                     <Input id="name" value={itemName} readOnly placeholder="Select an existing item" />
                                    <Button type="button" variant="outline" size="icon" onClick={() => setIsItemSelectionOpen(true)} aria-label="Select item from list">
                                        <List className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="quantity" className="text-right">Quantity</Label>
                                <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="col-span-3" placeholder="e.g., 1500" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unitCost" className="text-right">Unit Cost</Label>
                                <Input id="unitCost" type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="col-span-3" placeholder="e.g., 50.00" />
                            </div>
                        </div>
                        <DialogFooter>
                             <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Stock
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
