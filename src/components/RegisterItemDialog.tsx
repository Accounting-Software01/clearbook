
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RegisterItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'finished' | 'raw';
  onSuccess: () => void;
}

interface ItemDetails {
    name: string;
    description: string;
    price: string;
    sku: string;
    unitOfMeasure: string;
    productCategory: string;
}

export function RegisterItemDialog({ open, onOpenChange, mode, onSuccess }: RegisterItemDialogProps) {
    const { toast } = useToast();
    const [details, setDetails] = useState<ItemDetails>({
        name: '',
        description: '',
        price: '',
        sku: '',
        unitOfMeasure: '',
        productCategory: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const title = mode === 'finished' ? 'Register New Finished Product' : 'Register New Raw Material';
    const description = `Add a new item to your master list. This does not record stock, only the item's details.`;
    
    // In a real app, the endpoint might differ for products vs materials.
    const endpoint = 'https://hariindustries.net/busa-api/database/register-product.php';

    const handleInputChange = (field: keyof ItemDetails, value: string) => {
        setDetails(prev => ({ ...prev, [field]: value }));
    };

    const resetForm = () => {
        setDetails({ name: '', description: '', price: '', sku: '', unitOfMeasure: '', productCategory: '' });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Basic validation
        if (Object.values(details).some(val => val.trim() === '')) {
            toast({
                variant: 'destructive',
                title: 'Missing Information',
                description: 'Please fill out all fields to register the new item.',
            });
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...details,
                    price: parseFloat(details.price) || 0,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to register the item.');
            }

            toast({
                title: 'Success!',
                description: `${details.name} has been successfully registered. You can now add stock for this item.`,
            });
            
            resetForm();
            onSuccess(); // Callback for any parent component refresh logic
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>{description}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={details.name} onChange={(e) => handleInputChange('name', e.target.value)} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="description" className="text-right pt-2">Description</Label>
                            <Textarea id="description" value={details.description} onChange={(e) => handleInputChange('description', e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Selling Price</Label>
                            <Input id="price" type="number" value={details.price} onChange={(e) => handleInputChange('price', e.target.value)} className="col-span-3" placeholder="0.00" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sku" className="text-right">SKU</Label>
                            <Input id="sku" value={details.sku} onChange={(e) => handleInputChange('sku', e.target.value)} className="col-span-3" placeholder="e.g., BW-500ML" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="unitOfMeasure" className="text-right">Unit of Measure</Label>
                            <Input id="unitOfMeasure" value={details.unitOfMeasure} onChange={(e) => handleInputChange('unitOfMeasure', e.target.value)} className="col-span-3" placeholder="e.g., Bottle, Kg, Pack" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="productCategory" className="text-right">Category</Label>
                            <Input id="productCategory" value={details.productCategory} onChange={(e) => handleInputChange('productCategory', e.target.value)} className="col-span-3" placeholder="e.g., Beverages" />
                        </div>
                    </div>
                    <DialogFooter>
                         <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Register Item
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
