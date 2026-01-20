'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const customer = {
    id: '1',
    customerCode: 'CUST-000001',
    name: 'Acme Corporation',
    email: 'info@acmecorp.com',
    phone: '+234-801-234-5678',
    type: 'Business',
    paymentMethod: 'Cash',
    creditLimit: 500000,
    paymentTerms: '30 days',
    status: 'Active',
};

const financialSummary = {
    totalSales: 2650000,
    totalPayments: 2064000,
    outstandingBalance: 586000,
    creditLimit: 500000,
};

const recentInvoices = [
    { reference: 'INV-20251230-000002', date: '30 Dec, 2025', amount: 2000000, balance: 0, status: 'Paid' },
    { reference: 'INV-20251230-0006', date: '30 Dec, 2025', amount: 3000, balance: 3000, status: 'Posted' },
    { reference: 'INV-20251230-0007', date: '30 Dec, 2025', amount: 3000, balance: 3000, status: 'Posted' },
    { reference: 'INV-20251222-0001', date: '22 Dec, 2025', amount: 650000, balance: 650000, status: 'Posted' },
];

const recentReceipts = [
    { reference: 'RCT-20260101-000003', date: '01 Jan, 2026', amount: 2000000, status: 'Posted' },
    { reference: 'RCT-20251230-000002', date: '30 Dec, 2025', amount: 67000, status: 'Posted' },
];

const recentPayments = [
    { reference: 'PAY-20260112-0001', date: '12 Jan, 2026', amount: 3000, paymentMethod: 'Cash', status: 'Posted' },
];

const recentCreditNotes = [
    { reference: 'CRN-20260112-0001', date: '12 Jan, 2026', invoice: 'INV-20251230-0007', amount: 3000, status: 'Posted' },
    { reference: 'CN-20251230-0001', date: '30 Dec, 2025', invoice: 'INV-20251230-0006', amount: 3000, status: 'Posted' },
];

const Breadcrumbs = ({ customerCode }) => (
    <nav className="text-sm font-medium text-gray-500 dark:text-gray-400" aria-label="breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link href="/dashboard" className="hover:text-primary">
            Dashboard
          </Link>
        </li>
        <li>/</li>
        <li>
          <Link href="/business-operations" className="hover:text-primary">
            Business Operations
          </Link>
        </li>
        <li>/</li>
        <li>
            <Link href="/customers" className="hover:text-primary">
                Customers
            </Link>
        </li>
        <li>/</li>
        <li className="text-primary">{customerCode}</li>
      </ol>
    </nav>
  );

const CustomerInformation = ({ customer }) => (
    <Card>
        <CardHeader>
            <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            <div><span className="font-semibold">Customer Code:</span> {customer.customerCode}</div>
            <div><span className="font-semibold">Name:</span> {customer.name}</div>
            <div><span className="font-semibold">Email:</span> {customer.email}</div>
            <div><span className="font-semibold">Phone:</span> {customer.phone}</div>
            <div><span className="font-semibold">Type:</span> {customer.type}</div>
            <div><span className="font-semibold">Payment Method:</span> {customer.paymentMethod}</div>
            <div><span className="font-semibold">Credit Limit:</span> {customer.creditLimit.toLocaleString()}</div>
            <div><span className="font-semibold">Payment Terms:</span> {customer.paymentTerms}</div>
            <div><span className="font-semibold">Status:</span> {customer.status}</div>
        </CardContent>
    </Card>
);

const FinancialSummary = ({ summary }) => (
    <Card>
        <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            <div><span className="font-semibold">Total Sales:</span> {summary.totalSales.toLocaleString()}</div>
            <div><span className="font-semibold">Total Payments:</span> {summary.totalPayments.toLocaleString()}</div>
            <div><span className="font-semibold">Outstanding Balance:</span> {summary.outstandingBalance.toLocaleString()}</div>
            <div><span className="font-semibold">Credit Limit:</span> {summary.creditLimit.toLocaleString()}</div>
        </CardContent>
    </Card>
);

const RecentInvoices = ({ invoices }) => (
    <Card>
        <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.map((invoice, index) => (
                        <TableRow key={index}>
                            <TableCell>{invoice.reference}</TableCell>
                            <TableCell>{invoice.date}</TableCell>
                            <TableCell>{invoice.amount.toLocaleString()}</TableCell>
                            <TableCell>{invoice.balance.toLocaleString()}</TableCell>
                            <TableCell>{invoice.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const RecentReceipts = ({ receipts }) => (
    <Card>
        <CardHeader>
            <CardTitle>Recent Receipts</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {receipts.map((receipt, index) => (
                        <TableRow key={index}>
                            <TableCell>{receipt.reference}</TableCell>
                            <TableCell>{receipt.date}</TableCell>
                            <TableCell>{receipt.amount.toLocaleString()}</TableCell>
                            <TableCell>{receipt.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const RecentPayments = ({ payments }) => (
    <Card>
        <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payments.map((payment, index) => (
                        <TableRow key={index}>
                            <TableCell>{payment.reference}</TableCell>
                            <TableCell>{payment.date}</TableCell>
                            <TableCell>{payment.amount.toLocaleString()}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>{payment.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const RecentCreditNotes = ({ creditNotes }) => (
    <Card>
        <CardHeader>
            <CardTitle>Recent Credit Notes</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {creditNotes.map((note, index) => (
                        <TableRow key={index}>
                            <TableCell>{note.reference}</TableCell>
                            <TableCell>{note.date}</TableCell>
                            <TableCell>{note.invoice}</TableCell>
                            <TableCell>{note.amount.toLocaleString()}</TableCell>
                            <TableCell>{note.status}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

export default function CustomerDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumbs customerCode={customer.customerCode} />
      <div className="space-y-4">
        <CustomerInformation customer={customer} />
        <FinancialSummary summary={financialSummary} />
        <RecentInvoices invoices={recentInvoices} />
        <RecentReceipts receipts={recentReceipts} />
        <RecentPayments payments={recentPayments} />
        <RecentCreditNotes creditNotes={recentCreditNotes} />
      </div>
    </div>
  );
}
