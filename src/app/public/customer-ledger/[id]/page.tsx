'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoints } from '@/lib/apiEndpoints';
import { Loader2, Printer } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';

interface CustomerLedgerPrintPageProps {
  params: {
    id: string; // This will be the customer_id
  };
}

interface LedgerEntry {
  date: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
}

interface CustomerInfo {
  id: string;
  name: string;
  balance: number;
}

const CustomerLedgerPrintPage: React.FC<CustomerLedgerPrintPageProps> = ({ params }) => {
  const { toast } = useToast();
  const customerId = params.id;
  const companyId = 'SAJ123'; // Hardcoded company_id

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLedgerData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch customer ledger
        const ledgerRes = await fetch(`${apiEndpoints.getCustomersLedger(companyId)}&customer_id=${customerId}`);
        if (!ledgerRes.ok) {
          const errorData = await ledgerRes.json().catch(() => ({ error: 'An unknown error occurred' }));
          throw new Error(errorData.error || ledgerRes.statusText);
        }
        const jsonLedgerResponse = await ledgerRes.json();
        const fetchedLedgerEntries: LedgerEntry[] = Array.isArray(jsonLedgerResponse.data)
          ? jsonLedgerResponse.data
          : [];

        if (jsonLedgerResponse.success) {
          setLedgerEntries(fetchedLedgerEntries);

          // Attempt to derive customer name and balance from the first entry or fetch separately if needed
          // For now, we'll try to infer from the data if available or set defaults
          // A more robust solution might involve another API call to get full customer details.
          const currentBalance = fetchedLedgerEntries.length > 0
            ? fetchedLedgerEntries[fetchedLedgerEntries.length - 1].balance
            : 0;

          // For the customer name, we might need a dedicated API or rely on the parent component
          // Since this is a print page, assuming minimal info from ledger itself or placeholder.
          // In a real app, you might pass customer name as a query param or fetch it.
          // For this exercise, we'll use a placeholder.
          setCustomerInfo({
            id: customerId,
            name: `Customer ${customerId}`, // Placeholder
            balance: currentBalance,
          });
        } else {
          setError(jsonLedgerResponse.error || 'Failed to fetch ledger data.');
          toast({
            variant: 'destructive',
            title: 'Error fetching ledger',
            description: jsonLedgerResponse.error || 'Could not fetch customer ledger data.',
          });
        }
      } catch (e: any) {
        setError(e.message);
        toast({
          variant: 'destructive',
          title: 'Error fetching ledger',
          description: e.message || 'Could not fetch customer ledger data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchLedgerData();
    }
  }, [customerId, toast]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 printable-area">
      <div className="flex justify-between items-center mb-6 non-printable">
        <h1 className="text-2xl font-bold">Customer Ledger</h1>
        <Button onClick={handlePrint} className="flex items-center">
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-10">
          <p>Error: {error}</p>
          <p>Could not load ledger for customer ID: {customerId}</p>
        </div>
      ) : (
        <>
          {customerInfo && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Customer: {customerInfo.name} ({customerInfo.id})</h2>
              <p className="text-lg">Current Balance: <span className="font-bold">{customerInfo.balance.toFixed(2)}</span></p>
            </div>
          )}

          {ledgerEntries.length === 0 ? (
            <div className="text-muted-foreground text-center py-10">
              <p>No ledger entries found for this customer.</p>
            </div>
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
                {ledgerEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.narration}</TableCell>
                    <TableCell className="text-right">{entry.debit ? entry.debit.toFixed(2) : '-'}</TableCell>
                    <TableCell className="text-right">{entry.credit ? entry.credit.toFixed(2) : '-'}</TableCell>
                    <TableCell className="text-right">{entry.balance.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerLedgerPrintPage;