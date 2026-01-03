'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface RecordOpeningBalanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: { id: string; name: string; } | null;
}

export const RecordOpeningBalanceDialog: React.FC<RecordOpeningBalanceDialogProps> = ({ isOpen, onClose, customer }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceDate, setOpeningBalanceDate] = useState<Date | undefined>(new Date());

  const handlePostOpeningBalance = async () => {
    if (!customer) return;
    
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Opening balance must be a number greater than zero.' });
      return;
    }
    
    setIsSaving(true);
    try {
        const payload = {
            customerId: customer.id,
            balance: balance,
            date: openingBalanceDate ? format(openingBalanceDate, 'yyyy-MM-dd') : '',
            company_id: user?.company_id,
            user_id: user?.uid
        };

        const response = await fetch('https://hariindustries.net/api/clearbook/customer-opening-balance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to post opening balance');
        }

        toast({ title: 'Success', description: 'Opening balance has been posted.' });
        onClose();
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
          <>
            <DialogHeader>
              <DialogTitle>Record Opening Balance</DialogTitle>
              <DialogDescription>
                Enter the outstanding balance for <strong>{customer?.name}</strong> as of the specified date.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="opening-balance-amount">Opening Balance Amount</Label>
                <Input
                  id="opening-balance-amount"
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="e.g., 50000"
                />
              </div>
              <div className="space-y-2">
                <Label>Balance Date</Label>
                <DatePicker date={openingBalanceDate} onDateChange={setOpeningBalanceDate} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Skip & Finish</Button>
              <Button onClick={handlePostOpeningBalance} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Balance & Finish
              </Button>
            </DialogFooter>
          </>
      </DialogContent>
    </Dialog>
  );
};
