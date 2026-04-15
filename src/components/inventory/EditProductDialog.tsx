'use client';
import React, { useState, useEffect } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const CATEGORY_OPTIONS = [
    "Sachet Water",
    "Bottle Water",
    "Bottle Water (PET)",
    "Dispenser Water",
    "Other"
];

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_of_measure: string;
}

interface EditProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: InventoryItem | null;
    onSuccess: () => void;
}

export const EditProductDialog: React.FC<EditProductDialogProps> = ({ open, onOpenChange, item, onSuccess }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [formData, setFormData] = useState<Partial<InventoryItem>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (item) {
            setFormData(item);
        }
    }, [item]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.company_id || !item) return;
        
        setIsSubmitting(true);
        const { id } = toast({ title: 'Saving Changes...', description: 'Please wait.' });

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/update-finished-good.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, company_id: user.company_id })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'An unknown error occurred.');
            }

            toast.update(id, { title: 'Success!', description: 'Product has been updated.' });
            onSuccess();
            onOpenChange(false);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast.update(id, { title: 'Save Failed', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Finished Good</DialogTitle>
                </DialogHeader>
                {item && (
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Name</Label>
                                <Input id="name" name="name" value={formData.name || ''} onChange={handleInputChange} className="col-span-3" />
                            </div>
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="sku" className="text-right">SKU</Label>
                                <Input id="sku" name="sku" value={formData.sku || ''} onChange={handleInputChange} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category" className="text-right">Category</Label>
                                <Select name="category" value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                           <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="unit_of_measure" className="text-right">Unit</Label>
                                <Input id="unit_of_measure" name="unit_of_measure" value={formData.unit_of_measure || ''} onChange={handleInputChange} className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
