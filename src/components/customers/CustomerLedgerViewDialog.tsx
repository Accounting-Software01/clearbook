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
import jsPDF from 'jspdf'; // Import jsPDF
import 'jspdf-autotable'; // Import jspdf-autotable

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // Renamed from isPrinting

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

  // New function to generate PDF and open in new tab
  const generateLedgerPDF = (customerData: Customer, ledgerData: LedgerEntry[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Customer Ledger: ${customerData.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Balance: ${customerData.balance.toFixed(2)}`, 14, 30);

    const tableColumn = ["Date", "Narration", "Debit", "Credit", "Balance"];
    const tableRows = ledgerData.map(entry => [
      entry.date,
      entry.narration,
      entry.debit > 0 ? entry.debit.toFixed(2) : '-',
      entry.credit > 0 ? entry.credit.toFixed(2) : '-',
      entry.balance.toFixed(2)
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
    });

    doc.output('dataurlnewwindow', { filename: `Ledger-${customerData.name}.pdf` });
  };

  const handleGenerateAndOpenPdf = async () => {
    if (!customer?.id) {
      toast({
        variant: 'destructive',
        title: 'Print Error',
        description: 'No customer selected to print ledger.',
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      // Re-fetch data if needed, or use already fetched `ledgerEntries`
      // For simplicity, we'll use the already fetched `ledgerEntries` if available and not loading.
      // If `ledgerEntries` could be stale or this button should always trigger a fresh fetch,
      // you would re-call `fetchLedger()` here and wait for it.
      
      // If you want to ensure the latest data is used, you'd add:
      // await fetchLedger(); // This would update ledgerEntries state
      // Then use the state: generateLedgerPDF(customer, ledgerEntries);

      // Using current state:
      generateLedgerPDF(customer, ledgerEntries);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Printing Ledger',
        description: error.message || 'Could not generate PDF for ledger.',
      });
    } finally {
      setIsGeneratingPdf(false);
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
            onClick={handleGenerateAndOpenPdf} // Call the new PDF generation function
            disabled={!customer || ledgerEntries.length === 0 || isGeneratingPdf || isLoading} // Disable button while loading or generating PDF
          >
            {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4" />}
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