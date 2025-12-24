'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface CreateRawMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Supplier {
    id: string;
    name: string;
}

export function CreateRawMaterialDialog({ open, onOpenChange, onSuccess }: CreateRawMaterialDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [itemCode, setItemCode] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [unitOfMeasure, setUnitOfMeasure] = useState('');
    const [standardCost, setStandardCost] = useState('');
    const [preferredSupplierId, setPreferredSupplierId] = useState<string | undefined>(undefined);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(false);

    useEffect(() => {
        const fetchSuppliers = async () => {
            if (open && user?.company_id) {
                setIsFetchingSuppliers(true);
                try {
                    const response = await api<Supplier[]>(`supplier.php?company_id=${user.company_id}`);
                    setSuppliers(response);
                } catch (error) {
                    toast({
                        title: 'Error fetching suppliers',
                        description: 'Could not load the list of suppliers.',
                        variant: 'destructive'
                    });
                }
                setIsFetchingSuppliers(false);
            }
        };
        fetchSuppliers();
    }, [open, user, toast]);

    const resetForm = () => {
        setItemCode('');
        setName('');
        setDescription('');
        setUnitOfMeasure('');
        setStandardCost('');
        setPreferredSupplierId(undefined);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!user) {
            toast({ title: "Authentication Error", description: "User not found.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const newRawMaterial = {
            company_id: user.company_id,
            item_code: itemCode,
            name,
            description,
            unit_of_measure: unitOfMeasure,
            standard_cost: parseFloat(standardCost) || 0,
            preferred_supplier_id: preferredSupplierId ? parseInt(preferredSupplierId) : null
        };

        try {
            await api('raw-materials.php', {
                method: 'POST',
                body: JSON.stringify(newRawMaterial)
            });
            toast({ title: "Success", description: "Raw material created successfully." });
            resetForm();
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Create New Raw Material</DialogTitle>
                    <DialogDescription>Add a new raw material to your inventory master list.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="item-code" className="text-right">Item Code</Label>
                            <Input id="item-code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} className="col-span-3" required />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="uom" className="text-right">Unit of Measure</Label>
                            <Input id="uom" value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} placeholder="e.g., KG, PCS, BOX" className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="cost" className="text-right">Standard Cost</Label>
                            <Input id="cost" type="number" value={standardCost} onChange={(e) => setStandardCost(e.target.value)} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="supplier" className="text-right">Preferred Supplier</Label>
                             <Select value={preferredSupplierId} onValueChange={setPreferredSupplierId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {isFetchingSuppliers ? (
                                        <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin"/></div>
                                    ) : (
                                        suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                            Create Material
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}