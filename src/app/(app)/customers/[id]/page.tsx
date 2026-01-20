'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Shadcn/UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from 'lucide-react';

// Define interfaces for our data structures
interface CustomerProfile {
  customer_id: string;
  customer_name: string;
  email_address: string;
  primary_phone_number: string;
  customer_type: string;
  preferred_payment_method: string;
  credit_limit: number;
  payment_terms: string;
  status: string;
  balance: number;
  [key: string]: any;
}

interface Transaction {
  voucher_number: string;
  voucher_date: string;
  debit: number;
  credit: number;
  balance?: number;
  status?: string;
  voucher_type: 'sales_invoice' | 'receipt' | 'payment' | 'credit_note';
  [key: string]: any;
}

interface FinancialSummaryData {
  totalSales: number;
  totalPayments: number;
  outstandingBalance: number;
  creditLimit: number;
}

// --- Reusable Components ---
const Breadcrumbs = ({ customerCode }: { customerCode?: string }) => (
  <nav className="text-sm font-medium text-gray-500 dark:text-gray-400" aria-label="breadcrumb">
    <ol className="flex items-center space-x-2">
      <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
      <li>/</li>
      <li className="hover:text-primary">Business Operations</li>
      <li>/</li>
      <li><Link href="/customers" className="hover:text-primary">Customers</Link></li>
      <li>/</li>
      <li className="text-primary">{customerCode || 'Loading...'}</li>
    </ol>
  </nav>
);

const CustomerInformation = ({ customer }: { customer: CustomerProfile }) => (
  <Card>
    <CardHeader><CardTitle>Customer Information</CardTitle></CardHeader>
    <CardContent className="grid grid-cols-2 gap-4">
      <div><span className="font-semibold">Customer Code:</span> {customer.customer_id}</div>
      <div><span className="font-semibold">Name:</span> {customer.customer_name}</div>
      <div><span className="font-semibold">Email:</span> {customer.email_address || 'N/A'}</div>
      <div><span className="font-semibold">Phone:</span> {customer.primary_phone_number || 'N/A'}</div>
      <div><span className="font-semibold">Type:</span> {customer.customer_type}</div>
      <div><span className="font-semibold">Payment Method:</span> {customer.preferred_payment_method || 'N/A'}</div>
      <div><span className="font-semibold">Credit Limit:</span> {Number(customer.credit_limit).toLocaleString()}</div>
      <div><span className="font-semibold">Payment Terms:</span> {customer.payment_terms || 'N/A'}</div>
      <div><span className="font-semibold">Status:</span> {customer.status}</div>
    </CardContent>
  </Card>
);

const FinancialSummary = ({ summary }: { summary: FinancialSummaryData }) => (
  <Card>
    <CardHeader><CardTitle>Financial Summary</CardTitle></CardHeader>
    <CardContent className="grid grid-cols-2 gap-4">
      <div><span className="font-semibold">Total Sales:</span> {summary.totalSales.toLocaleString()}</div>
      <div><span className="font-semibold">Total Payments:</span> {summary.totalPayments.toLocaleString()}</div>
      <div><span className="font-semibold">Outstanding Balance:</span> <span className={summary.outstandingBalance < 0 ? 'text-green-600' : 'text-red-600'}>{Math.abs(summary.outstandingBalance).toLocaleString()}</span></div>
      <div><span className="font-semibold">Credit Limit:</span> {summary.creditLimit.toLocaleString()}</div>
    </CardContent>
  </Card>
);

const TransactionsTable = ({ title, transactions, columns }: { title: string; transactions: Transaction[]; columns: { key: keyof Transaction; label: string }[] }) => (
  <Card>
    <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => <TableHead key={col.key}>{col.label}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length > 0 ? (
            transactions.map((item, index) => (
              <TableRow key={index}>
                {columns.map(col => (
                  <TableCell key={col.key}>
                    {typeof item[col.key] === 'number' ? (item[col.key] as number).toLocaleString() : (item[col.key] as string || 'N/A')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={columns.length} className="text-center">No transactions found.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

// --- Main Page Component ---

export default function CustomerDetailsPage() {
  const { id: customerId } = useParams() as { id: string };
  const { user } = useAuth();
  const { toast } = useToast();

  const [customerData, setCustomerData] = useState<{ profile: CustomerProfile; transactions: Transaction[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // CORRECTED: The check now uses 'user.uid' which is the correct property from the user object.
    if (!user?.company_id || !customerId || !user?.uid) {
      if (user && (!user.company_id || !user.uid)) {
         setError("User information is incomplete. Cannot fetch customer details.");
      }
      // Do not proceed with fetch if essential data is missing.
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      // CORRECTED: The API call now uses 'user.uid' to pass the user's ID.
      const apiUrl = `https://hariindustries.net/api/clearbook/get_customer_details.php?company_id=${user.company_id}&customer_id=${customerId}&user_id=${user.uid}`;
      
      console.log("Attempting to fetch from:", apiUrl);

      try {
        const res = await fetch(apiUrl);

        console.log("API Response Status:", res.status);
        
        const responseText = await res.text();
        console.log("API Raw Response Body:", responseText);

        const result = JSON.parse(responseText);

        if (result.success) {
          setCustomerData(result.data);
        } else {
          const errorMessage = result.error || 'Failed to fetch details: API returned success:false.';
          setError(errorMessage);
          toast({ variant: 'destructive', title: 'API Error', description: errorMessage });
        }
      } catch (e: any) {
        console.error("Fetch or JSON Parsing Error:", e);
        const errorMessage = e.message || 'An unexpected error occurred during fetch.';
        setError(errorMessage);
        toast({ variant: 'destructive', title: 'Fetch Error', description: errorMessage });
      } finally {
        console.log("Fetch process finished. Setting isLoading to false.");
        setIsLoading(false);
      }
    };

    fetchDetails();
    // CORRECTED: The dependency array should react to changes in user.uid
  }, [user, customerId, toast]);

  const { financialSummary, recentInvoices, recentReceipts, recentPayments, recentCreditNotes } = useMemo(() => {
    if (!customerData) {
      const emptySummary = { totalSales: 0, totalPayments: 0, outstandingBalance: 0, creditLimit: 0 };
      return { financialSummary: emptySummary, recentInvoices: [], recentReceipts: [], recentPayments: [], recentCreditNotes: [] };
    }
    const { profile, transactions } = customerData;
    const totalSales = transactions.filter(t => t.voucher_type === 'sales_invoice').reduce((sum, t) => sum + Number(t.debit), 0);
    const totalPayments = transactions.filter(t => ['receipt', 'payment', 'credit_note'].includes(t.voucher_type)).reduce((sum, t) => sum + Number(t.credit), 0);
    const summary: FinancialSummaryData = { totalSales, totalPayments, outstandingBalance: profile.balance, creditLimit: Number(profile.credit_limit) };
    const filterTransactions = (type: Transaction['voucher_type']) => transactions.filter(t => t.voucher_type === type);
    return { financialSummary: summary, recentInvoices: filterTransactions('sales_invoice'), recentReceipts: filterTransactions('receipt'), recentPayments: filterTransactions('payment'), recentCreditNotes: filterTransactions('credit_note') };
  }, [customerData]);

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Breadcrumbs />
          <div className="flex justify-center items-center h-96">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Breadcrumbs />
            <Card className="text-center py-12 bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive">An Error Occurred</CardTitle></CardHeader>
                <CardContent className="text-destructive/80">
                  <p>{error}</p>
                  <p className="text-xs mt-4">Please check the browser console (F12) for more technical details.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!customerData) {
    return null;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumbs customerCode={customerData.profile.customer_id} />
      <div className="space-y-4">
        <CustomerInformation customer={customerData.profile} />
        <FinancialSummary summary={financialSummary} />
        <TransactionsTable title="Recent Invoices" transactions={recentInvoices} columns={[{ key: 'voucher_number', label: 'Reference' }, { key: 'voucher_date', label: 'Date' }, { key: 'debit', label: 'Amount' }, { key: 'narration', label: 'Narration' }]} />
        <TransactionsTable title="Recent Receipts" transactions={recentReceipts} columns={[{ key: 'voucher_number', label: 'Reference' }, { key: 'voucher_date', label: 'Date' }, { key: 'credit', label: 'Amount' }, { key: 'narration', label: 'Narration' }]} />
        <TransactionsTable title="Recent Payments" transactions={recentPayments} columns={[{ key: 'voucher_number', label: 'Reference' }, { key: 'voucher_date', label: 'Date' }, { key: 'credit', label: 'Amount' }, { key: 'narration', label: 'Narration' }]} />
        <TransactionsTable title="Recent Credit Notes" transactions={recentCreditNotes} columns={[{ key: 'voucher_number', label: 'Reference' }, { key: 'voucher_date', label: 'Date' }, { key: 'credit', label: 'Amount' }, { key: 'narration', label: 'Narration' }]} />
      </div>
    </div>
  );
}
