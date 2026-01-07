'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { numberToWords } from '@/lib/number-to-words-converter';
import Image from 'next/image';
import { useParams } from 'next/navigation';

// Interfaces
interface InvoiceItem {
    id: number;
    item_name: string;
    quantity: number;
    unit_price: string | number;
    total_amount: string | number;
}

interface InvoiceDetailsData {
    id: number;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    customer_name: string;
    total_amount: string | number;
    amount_due: number;
    status: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    items: InvoiceItem[];
    previous_balance: number;
    current_invoice_balance: number;
    total_balance: number;
    company_name: string;
    company_logo: string;
    company_address: string;
    company_phone: string;
}

// Helper
const formatNaira = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

export default function PublicInvoicePage() {
    const params = useParams();
    const invoiceId = params.id;

    const [invoice, setInvoice] = useState<InvoiceDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvoiceDetails = useCallback(async () => {
        if (!invoiceId) {
            setIsLoading(false);
            setError('No invoice ID provided.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const apiUrl = `get-public-invoice-details.php?id=${invoiceId}`;
            const response = await api<{ invoice: InvoiceDetailsData, success: boolean, error?: string }>(apiUrl);
            if (response.success && response.invoice) {
                setInvoice(response.invoice);
            } else {
                throw new Error(response.error || "Invoice details not found.");
            }
        } catch (e: any) {
            setError(`Failed to load invoice details: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => {
        fetchInvoiceDetails();
    }, [fetchInvoiceDetails]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
            <div className="text-destructive text-center py-10">
                <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                <p>{error}</p>
                <button onClick={fetchInvoiceDetails} className='mt-4 px-4 py-2 border rounded'>Retry</button>
            </div>
        );
    }
    
    if (!invoice) {
        return <div className="text-center text-gray-500 py-10">No invoice data to display.</div>;
    }

    const totalAmountNumber = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount;
    const companyLogoPath = invoice.company_logo ? (invoice.company_logo.replace('/public/', '/').startsWith('/') ? invoice.company_logo : '/' + invoice.company_logo) : '';

    return (
        <div className="bg-gray-50 min-h-screen flex justify-center items-center p-4 sm:p-6 lg:p-8">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-10">
                <header className="border-b-2 border-gray-800 pb-4 mb-8">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center">
                            {companyLogoPath && 
                                <Image 
                                    src={companyLogoPath} 
                                    alt="Company Logo" 
                                    width={80} 
                                    height={80} 
                                    className="mr-4 object-contain"
                                />
                            }
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800">{invoice.company_name}</h1>
                                <p className="text-sm">{invoice.company_address}</p>
                                <p className="text-sm">{invoice.company_phone}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <h2 className="text-4xl font-bold uppercase text-gray-800">Sales Invoice</h2>
                        </div>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-x-12 mb-8">
                    <div className="border border-gray-300 rounded p-4">
                        <h3 className="font-semibold text-gray-600 mb-2">BUYER:</h3>
                        <p className="font-bold text-lg">{invoice.customer_name}</p>
                    </div>
                    <div className="border border-gray-300 rounded p-4 grid grid-cols-2 gap-4 text-sm">
                        <div><p className='font-semibold'>Invoice No.:</p><p>{invoice.invoice_number}</p></div>
                        <div><p className='font-semibold'>Invoice Date:</p><p>{new Date(invoice.invoice_date).toLocaleDateString()}</p></div>
                        <div><p className='font-semibold'>Due Date:</p><p>{new Date(invoice.due_date).toLocaleDateString()}</p></div>
                        <div><p className='font-semibold'>Status:</p><span className={`px-2 py-1 text-xs font-bold rounded-full ${invoice.status === 'PAID' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{invoice.status}</span></div>
                    </div>
                </section>

                <section className="mb-8">
                    <Table>
                        <TableHeader className="bg-gray-800">
                            <TableRow>
                                <TableHead className="text-white">S/No</TableHead>
                                <TableHead className="text-white">Item Description</TableHead>
                                <TableHead className="text-right text-white">Quantity</TableHead>
                                <TableHead className="text-right text-white">Rate</TableHead>
                                <TableHead className="text-right text-white">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item, index) => (
                                <TableRow key={item.id} className="even:bg-gray-50">
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatNaira(item.unit_price)}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatNaira(item.total_amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </section>
                
                 <section className="grid grid-cols-5 gap-8 mb-8">
                     <div className='col-span-3 space-y-4'>
                         <div>
                            <p className='font-semibold'>AMOUNT IN WORDS:</p>
                            <p className="capitalize text-sm font-semibold">{numberToWords(totalAmountNumber)} Naira Only</p>
                        </div>
                     </div>
                     <div className='col-span-2 border-l-2 border-gray-800 pl-4 space-y-2'>
                         <div className="flex justify-between items-center text-sm"><span className="font-semibold">Previous Balance:</span><span className="font-semibold">{formatNaira(invoice.previous_balance)}</span></div>
                        <div className="flex justify-between items-center text-sm"><span className="font-semibold">Current Invoice:</span><span className="font-semibold">{formatNaira(invoice.current_invoice_balance)}</span></div>
                        <div className="flex justify-between items-center text-xl font-bold bg-gray-100 px-2 py-1 rounded"><span>Total Balance:</span><span>{formatNaira(invoice.total_balance)}</span></div>
                     </div>
                </section>

                <footer className="border-t-2 border-gray-800 pt-8 mt-12 text-center text-sm">
                    <p className="text-gray-500">Thank you for your business!</p>
                </footer>
            </div>
        </div>
    );
}
