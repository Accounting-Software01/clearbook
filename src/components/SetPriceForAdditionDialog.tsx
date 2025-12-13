'use client';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { chartOfAccounts } from '@/lib/chart-of-accounts';

interface SetPriceForAdditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
  itemName: string;
  itemType: 'product' | 'raw_material';
  quantityAdded: number;
  onSuccess: () => void;
  notificationId: string | number;
}

// Statically find the required accounts once
const DEBIT_ACCOUNT_RAW_MATERIAL = chartOfAccounts.find(acc => acc.name === 'Inventory Control - Raw Materials (AUTO)');
const DEBIT_ACCOUNT_PRODUCT = chartOfAccounts.find(acc => acc.name === 'Inventory Control - Finished Goods (AUTO)');
const CREDIT_ACCOUNT = chartOfAccounts.find(acc => acc.name === 'Accounts Payable Control (AUTO)');

export function SetPriceForAdditionDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
  itemType,
  quantityAdded,
  onSuccess,
  notificationId
}: SetPriceForAdditionDialogProps) {
  const [unitCost, setUnitCost] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const totalAmount = (parseFloat(unitCost) || 0) * quantityAdded;

  const debitAccount = itemType === 'raw_material' ? DEBIT_ACCOUNT_RAW_MATERIAL : DEBIT_ACCOUNT_PRODUCT;
  const creditAccount = CREDIT_ACCOUNT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(unitCost);

    if (isNaN(cost) || cost <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a unit cost greater than zero.', variant: 'destructive' });
      return;
    }
    if (!debitAccount || !creditAccount) {
        toast({ title: 'Configuration Error', description: 'Default accounts are not configured correctly.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.company_id) {
      toast({ title: 'Authentication Error', description: 'User not authenticated.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('companyId', currentUser.company_id);
    formData.append('itemId', String(itemId));
    formData.append('itemType', itemType); // <-- This was missing
    formData.append('quantityAdded', String(quantityAdded));
    formData.append('unitCost', String(cost));
    formData.append('debitAccountId', debitAccount.code);
    formData.append('creditAccountId', creditAccount.code);
    formData.append('notificationId', String(notificationId));
    formData.append('itemName', itemName);

    try {
      const response = await fetch('https://hariindustries.net/busa-api/database/approve_stock_submission.php', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        toast({ title: 'Success', description: `Price set & Journal Voucher #${result.journalVoucherId} created.` });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ title: 'Post Failed', description: result.error || 'An error occurred on the server.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Network Error', description: 'Could not connect to the server.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Price & Create Journal Entry</DialogTitle>
          <DialogDescription>
            Enter the unit cost for {itemName}. The accounting entry will be created automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 pt-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Item</Label>
            <Input value={`${itemName} (Qty: ${quantityAdded})`} readOnly className="col-span-3 bg-muted" />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unitCost" className="text-right">Unit Cost (NGN)</Label>
            <Input id="unitCost" type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="e.g., 100.50" className="col-span-3" required/>
          </div>

          <div className="border-t mt-4 pt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between items-center">
                  <span>Debit Account:</span>
                  <span className="font-medium text-foreground">{debitAccount?.name || 'Not Found'}</span>
              </div>
              <div className="flex justify-between items-center">
                  <span>Credit Account:</span>
                  <span className="font-medium text-foreground">{creditAccount?.name || 'Not Found'}</span>
              </div>
          </div>

          <div className="flex justify-end pt-4">
              <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total Value:</span>
                      <span className="font-mono">{formatCurrency(totalAmount)}</span>
                  </div>
              </div>
          </div>

          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button" disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !debitAccount || !creditAccount}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Journal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
