
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
import { Loader2, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ItemMasterListDialog } from './ItemMasterListDialog';
import { getCurrentUser } from '@/lib/auth';

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'product' | 'raw_material';
  onSuccess: () => void;
}

const ACCOUNT_CODES = {
    FINISHED_GOODS_INVENTORY: '101340',
    RAW_MATERIALS_INVENTORY: '101300',
    ACCOUNTS_PAYABLE: '201000',
};

interface User {
    uid: string;
    company_id: string;
    role: string;
}

interface SelectedItem {
    id: number;
    name: string;
}

export function AddStockDialog({ open, onOpenChange, mode, onSuccess }: AddStockDialogProps) {
    const { toast } = useToast();
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const [stockToAdd, setStockToAdd] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isItemSelectionOpen, setIsItemSelectionOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (open) {
                const currentUser = await getCurrentUser();
                setUser(currentUser);
            }
        };
        fetchUser();
    }, [open]);

    const title = mode === 'product' ? 'Add Finished Good Stock' : 'Add Raw Material Stock';
    const description = 'Record a purchase of an existing item. This will update inventory and post a journal entry.';
    
    const endpoint = 'https://hariindustries.net/busa-api/database/add_stock.php';

    const resetForm = () => {
        setSelectedItem(null);
        setStockToAdd('');
        setUnitCost('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !user.company_id || user.company_id === 'none') {
            toast({
                variant: 'destructive',
                title: 'Authentication Error',
                description: 'Valid company information is missing. Please log out and log in again.',
            });
            return;
        }

        const isStoreManager = user?.role === 'store_manager';
        let parsedUnitCost = parseFloat(unitCost);
        if (isStoreManager) {
            parsedUnitCost = 0;
        }

        const parsedStock = parseInt(stockToAdd, 10);

        if (!selectedItem || isNaN(parsedStock) || parsedStock <= 0) {
             toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'Please select an item and enter a valid stock quantity.'
            });
            return;
        }

        if (!isStoreManager && (!unitCost || isNaN(parsedUnitCost) || parsedUnitCost < 0)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Input',
                description: 'Please enter a valid unit cost.'
            });
            return;
        }

        setIsLoading(true);

        const debitAccountId = mode === 'product' 
            ? ACCOUNT_CODES.FINISHED_GOODS_INVENTORY 
            : ACCOUNT_CODES.RAW_MATERIALS_INVENTORY;

        const payload = {
            itemId: selectedItem.id,
            stock: parsedStock,
            unitCost: parsedUnitCost,
            itemType: mode,
            companyId: user.company_id,
            userId: user.uid,
            debitAccountId: debitAccountId,
            creditAccountId: ACCOUNT_CODES.ACCOUNTS_PAYABLE,
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'An unknown error occurred on the server.');
            }

            toast({
                title: 'Success!',
                description: result.voucherNumber 
                    ? `Stock updated. Voucher ${result.voucherNumber} created.`
                    : `Stock for ${selectedItem.name} has been updated.`,
            });
            
            resetForm();
            onSuccess();
            onOpenChange(false);

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
                type={mode}
                onSelectItem={(item: SelectedItem) => {
                    setSelectedItem(item);
                    setIsItemSelectionOpen(false);
                }}
            />
            <Dialog open={open} onOpenChange={(isOpen) => {
                if (!isOpen) resetForm();
                onOpenChange(isOpen);
            }}>
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
                                     <Input id="name" value={selectedItem?.name || ''} readOnly placeholder="Select an item" />
                                    <Button type="button" variant="outline" size="icon" onClick={() => setIsItemSelectionOpen(true)} aria-label="Select item">
                                        <List className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="stockToAdd" className="text-right">Stock to Add</Label>
                                <Input id="stockToAdd" type="number" value={stockToAdd} onChange={(e) => setStockToAdd(e.target.value)} className="col-span-3" placeholder="e.g., 1500" />
                            </div>
                            {user?.role !== 'store_manager' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="unitCost" className="text-right">Unit Cost</Label>
                                    <Input id="unitCost" type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="col-span-3" placeholder="e.g., 50.00" />
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                             <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoading || !selectedItem}>
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
