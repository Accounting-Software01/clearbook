'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { Loader2 } from 'lucide-react';

/* =====================================================
   TYPES
===================================================== */

interface CustomerProfile {
  customer_id: string;
  customer_name: string;
  email_address?: string;
  primary_phone_number?: string;
  customer_type: string;
  preferred_payment_method?: string;
  credit_limit: number;
  payment_terms?: string;
  status: string;
  balance: number;
  [key: string]: any;
}

interface LedgerTransaction {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface ApiResponse {
  customer: any;
  ledger: LedgerTransaction[];
  current_balance: number;
}

/* =====================================================
   COMPONENTS
===================================================== */

const Breadcrumbs = ({ code }: { code?: string }) => (
  <nav className="text-sm text-muted-foreground">
    <ol className="flex space-x-2">
      <li><Link href="/dashboard">Dashboard</Link></li>
      <li>/</li>
      <li><Link href="/customers">Customers</Link></li>
      <li>/</li>
      <li className="text-primary">{code || '...'}</li>
    </ol>
  </nav>
);

const CustomerInfo = ({ customer }: { customer: CustomerProfile }) => (
  <Card>
    <CardHeader>
      <CardTitle>Customer Information</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4 text-sm">
      <div><b>Code:</b> {customer.customer_id}</div>
      <div><b>Name:</b> {customer.customer_name}</div>
      <div><b>Email:</b> {customer.email_address || 'N/A'}</div>
      <div><b>Phone:</b> {customer.primary_phone_number || 'N/A'}</div>
      <div><b>Type:</b> {customer.customer_type}</div>
      <div><b>Status:</b> {customer.status}</div>
      <div><b>Payment Method:</b> {customer.preferred_payment_method || 'N/A'}</div>
      <div><b>Payment Terms:</b> {customer.payment_terms || 'N/A'}</div>
      <div><b>Credit Limit:</b> {Number(customer.credit_limit).toLocaleString()}</div>
    </CardContent>
  </Card>
);

const FinancialSummary = ({
  ledger,
  balance,
  creditLimit,
  companyId,
  customerId,
  userId
}: {
  ledger: LedgerTransaction[];
  balance: number;
  creditLimit: number;
  companyId: string;
  customerId: string;
  userId: number;
}) => {
  const totals = useMemo(() => {
    const totalSales = ledger
      .filter(l => l.type === 'Invoice')
      .reduce((s, l) => s + l.debit, 0);

    const totalReceipts = ledger
      .filter(l => ['Receipt', 'Payment', 'Credit Note'].includes(l.type))
      .reduce((s, l) => s + l.credit, 0);

    return { totalSales, totalReceipts };
  }, [ledger]);

  const outstandingBalance = ledger.reduce((sum, l) => sum + (l.debit - l.credit), 0);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <Button
  variant="outline"
  onClick={() =>
    window.open(
      `https://hariindustries.net/api/clearbook/customer-ledger-pdf.php?company_id=${companyId}&customer_id=${customerId}&user_id=${userId}`,
      '_blank'
    )
  }
>
  Export Ledger (PDF)
</Button>


      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div><b>Total Sales:</b> {totals.totalSales.toLocaleString()}</div>
        <div><b>Total Payments:</b> {totals.totalReceipts.toLocaleString()}</div>
        <div>
          <b>Outstanding Balance:</b>{' '}
          <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
            {balance.toLocaleString()}
          </span>
        </div>
        <div><b>Credit Limit:</b> {creditLimit.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
};

const LedgerTable = ({ ledger }: { ledger: LedgerTransaction[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Customer Ledger</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ledger.length ? ledger.map((row, i) => (
            <TableRow key={i}>
              <TableCell>{row.date}</TableCell>
              <TableCell>{row.reference}</TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell className="text-right">{row.debit ? row.debit.toLocaleString() : '-'}</TableCell>
              <TableCell className="text-right">{row.credit ? row.credit.toLocaleString() : '-'}</TableCell>
              <TableCell className="text-right font-medium">{row.balance.toLocaleString()}</TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                No ledger entries found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

/* =====================================================
   PAGE
===================================================== */

export default function CustomerDetailsPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<{
    customer: CustomerProfile;
    ledger: LedgerTransaction[];
    balance: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.company_id || !id) return;

    const fetchLedger = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://hariindustries.net/api/clearbook/get_customer_details.php?company_id=${user.company_id}&customer_id=${id}`
        );

        const json: ApiResponse = await res.json();

        setData({
          customer: {
            ...json.customer,
            balance: json.current_balance
          },
          ledger: json.ledger,
          balance: json.current_balance
        });
      } catch (e: any) {
        setError(e.message);
        toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [user, id, toast]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-red-600">{error || 'Failed to load'}</div>;
  }

  return (
    
    <div className="p-6 space-y-4">
      
      <Breadcrumbs code={data.customer.customer_id} />
      <CustomerInfo customer={data.customer} />
      <FinancialSummary
  ledger={data.ledger}
  balance={data.balance}
  creditLimit={Number(data.customer.credit_limit)}
  companyId={user.company_id}
  customerId={id}
  userId={user.uid}
/>

      <LedgerTable ledger={data.ledger} />
    </div>
  );
}
