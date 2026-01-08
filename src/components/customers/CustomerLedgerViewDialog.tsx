'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoints } from '@/lib/apiEndpoints';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Printer } from 'lucide-react'; // Import Printer

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  balance: number;
}

interface LedgerEntry {
  reference_id: number;
  date: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

interface CustomerLedgerViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerLedgerViewDialog: React.FC<CustomerLedgerViewDialogProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!user?.company_id || !customer?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setLedgerEntries([]); // Clear previous entries

    try {
      const url = `${apiEndpoints.getCustomersLedger(user.company_id)}&customer_id=${customer.id}`;
      const res = await fetch(url);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(errorData.error || res.statusText);
      }

      const jsonResponse = await res.json();
      if (jsonResponse.success && Array.isArray(jsonResponse.data)) {
        setLedgerEntries(jsonResponse.data);
      } else {
        setError('Failed to fetch ledger data: Invalid response format.');
        setLedgerEntries([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch customer ledger:', err);
      setError(err.message || 'Failed to fetch customer ledger.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not fetch customer ledger.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, customer?.id, toast]);

  useEffect(() => {
    if (isOpen && customer?.id) {
      fetchLedger();
    } else if (!isOpen) {
      // Reset state when dialog closes
      setLedgerEntries([]);
      setError(null);
    }
  }, [isOpen, customer?.id, fetchLedger]);

  const handlePrint = () => {
    if (!customer?.id) {
      toast({
        variant: 'destructive',
        title: 'Print Error',
        description: 'No customer selected to print ledger.',
      });
      return;
    }

    // Construct the URL to the new print-friendly page
    const printUrl = `/public/customer-ledger/${customer.id}`;
    
    // Open a new window
    const newWindow = window.open(printUrl, '_blank', 'width=900,height=600,left=100,top=100,noopener,noreferrer');
    
    if (newWindow) {
      // Wait for the new window to load before printing
      newWindow.onload = () => {
        newWindow.print();
        // Optionally close the window after printing (user might cancel print)
        // setTimeout(() => {
        //   newWindow.close();
        // }, 1000); 
      };
    } else {
      toast({
        variant: 'destructive',
        title: 'Print Error',
        description: 'Failed to open new window for printing. Please check your browser settings (e.g., pop-up blockers).',
      });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{customer ? `Ledger for ${customer.name}` : 'Customer Ledger'}</DialogTitle>
          <DialogDescription>
            {customer ? `Viewing detailed transactions for customer ID: ${customer.id}` : 'Select a customer to view their ledger.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-auto py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full min-h-[100px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-destructive text-center p-4">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerEntries.length > 0 ? (
                  ledgerEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.narration}</TableCell>
                      <TableCell className="text-right">{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-right">{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{entry.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No ledger entries found for this customer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!customer || ledgerEntries.length === 0} // Disable print if no customer or no entries
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Ledger
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};