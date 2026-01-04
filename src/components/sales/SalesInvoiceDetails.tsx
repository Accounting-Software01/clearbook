'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { numberToWords } from '@/lib/number-to-words-converter';
import Image from 'next/image';

// Interfaces define the shape of the data we expect from the API
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
    status: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    items: InvoiceItem[];
    previous_balance: number;
    current_invoice_balance: number;
    total_balance: number;
    company_name: string;
    company_logo: string;
    company_address: string;
    company_phone: string;
    prepared_by: string;
    verified_by: string;
    authorized_by: string;
    verified_by_signature: string;
    authorized_by_signature: string;
}

interface SalesInvoiceDetailsProps {
    invoiceId: number;
    onBack: () => void;
    onPaymentSimulated: () => void;
}

// Helper function to format currency
const formatNaira = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

export function SalesInvoiceDetails({ invoiceId, onBack, onPaymentSimulated }: SalesInvoiceDetailsProps) {
    const { user } = useAuth(); // Auth hook provides user data
    const [invoice, setInvoice] = useState<InvoiceDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canSimulatePayment = user?.role === 'admin' || user?.role === 'accountant';

    const fetchInvoiceDetails = useCallback(async () => {
        if (!user || !user.uid || !user.company_id || !invoiceId) {
            setIsLoading(false); 
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const apiUrl = `get-sales-invoice-details.php?company_id=${user.company_id}&id=${invoiceId}&user_id=${user.uid}`;
            const response = await api<{ invoice: InvoiceDetailsData, success: boolean, error?: string }>(apiUrl);
            
            if (response.success && response.invoice) {
                setInvoice(response.invoice);
            } else {
                throw new Error(response.error || "Invoice details not found.");
            }
        } catch (e: any) {
            console.error("Fetch Error:", e);
            setError(`Failed to load invoice details: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [user, invoiceId]);

    useEffect(() => {
        if (user) {
            fetchInvoiceDetails();
        }
    }, [user, fetchInvoiceDetails]);

    const handleSimulatePayment = async () => {
        if (!invoice || !user?.company_id || !user.uid) return;
        setIsSimulating(true);
        setError(null);
        try {
            await api('simulate-sales-payment.php', {
                method: 'POST',
                body: JSON.stringify({ company_id: user.company_id, invoice_id: invoice.id, user_id: user.uid })
            });
            alert('Payment simulated successfully!');
            onPaymentSimulated();
            fetchInvoiceDetails(); // Re-fetch to update status
        } catch (e: any) {
            setError(e.message || 'Failed to simulate payment.');
        } finally {
            setIsSimulating(false);
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
            <div className="text-destructive text-center py-10">
                <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                <p>{error}</p>
                <Button onClick={fetchInvoiceDetails} variant='outline' className='mt-4'>Retry</Button>
            </div>
        );
    }
    
    if (!invoice) {
        return <div className="text-center text-gray-500 py-10">No invoice data to display. Please ensure the invoice ID is correct and you have permission to view it.</div>;
    }

    const totalAmountNumber = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount;

    const sanitizeImagePath = (path: string) => {
        if (!path) return '';
        let cleanPath = path.replace('/public/', '/');
        if (!cleanPath.startsWith('/')) {
            cleanPath = '/' + cleanPath;
        }
        return cleanPath;
    };

    const verifiedSignaturePath = sanitizeImagePath(invoice.verified_by_signature);
    const authorizedSignaturePath = sanitizeImagePath(invoice.authorized_by_signature);
    const companyLogoPath = sanitizeImagePath(invoice.company_logo);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-10 printable-area">
            <div className="flex justify-between items-center mb-6 non-printable">
                 <div>
                    <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                 </div>
                 <div className='flex space-x-2'>
                    <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                    {canSimulatePayment && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                        <Button size="sm" onClick={handleSimulatePayment} disabled={isSimulating}>
                            {isSimulating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Simulate Payment
                        </Button>
                    )}
                 </div>
            </div>

            <header className="border-b-2 border-gray-800 pb-4 mb-8">
                <div className="flex justify-between items-start">
                    <div className="flex items-center">
                        {companyLogoPath && <Image src={companyLogoPath} alt="Company Logo" width={80} height={80} className="mr-4 object-contain"/>}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{invoice.company_name}</h1>
                            <p className="text-sm">{invoice.company_address}</p>
                            <p className="text-sm">{invoice.company_phone}</p>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <h2 className="text-4xl font-bold uppercase text-gray-800">Sales Invoice</h2>
                        <p className="text-sm">Printed by: {user?.full_name} on {new Date().toLocaleDateString()}</p>
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
                    <div>
                        <p className='font-semibold'>NARRATION:</p>
                        <p className="text-sm">Invoice order</p>
                    </div>
                 </div>
                 <div className='col-span-2 border-l-2 border-gray-800 pl-4 space-y-2'>
                     <div className="flex justify-between items-center text-sm"><span className="font-semibold">Previous Balance:</span><span className="font-semibold">{formatNaira(invoice.previous_balance)}</span></div>
                    <div className="flex justify-between items-center text-sm"><span className="font-semibold">Current Invoice:</span><span className="font-semibold">{formatNaira(invoice.current_invoice_balance)}</span></div>
                    <div className="flex justify-between items-center text-xl font-bold bg-gray-100 px-2 py-1 rounded"><span>Total Balance:</span><span>{formatNaira(invoice.total_balance)}</span></div>
                 </div>
            </section>

            <footer className="border-t-2 border-gray-800 pt-8 mt-12 text-center text-sm">
                <div className="grid grid-cols-3 gap-4">
                    <div className='h-24 flex flex-col justify-between'>
                        <div className="h-12"></div>
                        <p className="font-semibold">{invoice.prepared_by}</p>
                        <p className="border-t-2 border-gray-400 mt-1 pt-1">Prepared By</p>
                    </div>
                    <div className='h-24 flex flex-col justify-between'>
                        <div className="h-12 relative">{verifiedSignaturePath && <Image src={verifiedSignaturePath} alt="Verified By Signature" layout='fill' objectFit='contain'/> }</div>
                        <p className="font-semibold">{invoice.verified_by}</p>
                        <p className="border-t-2 border-gray-400 mt-1 pt-1">Verified By</p>
                    </div>
                    <div className='h-24 flex flex-col justify-between'>
                        <div className="h-12 relative">{authorizedSignaturePath && <Image src={authorizedSignaturePath} alt="Authorized By Signature" layout='fill' objectFit='contain'/> }</div>
                        <p className="font-semibold">{invoice.authorized_by}</p>
                        <p className="border-t-2 border-gray-400 mt-1 pt-1">Authorised Signatory</p>
                    </div>
                </div>
                <p className="mt-8 text-gray-500">Thank you for your business!</p>
            </footer>
            
            <style jsx global>{`
@media print {

  @page {
    size: A4;
    margin: 0;
  }

  html, body {
    width: 210mm;
    height: 297mm;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: white !important;
  }

  /* Hide everything */
  body * {
    visibility: hidden !important;
  }

  /* Show only printable */
  .printable-area,
  .printable-area * {
    visibility: visible !important;
  }

  /* 🚨 KEY FIXES HERE */
  .printable-area {
    position: fixed !important;      /* NOT absolute */
    left: 0 !important;
    top: 0 !important;

    width: 210mm !important;          /* FIXED MM WIDTH */
    min-height: 297mm !important;

    margin: 0 !important;
    padding: 20mm !important;         /* Safe print padding */

    box-sizing: border-box !important;
    background: white !important;

    transform: none !important;       /* Prevent browser scaling */
    zoom: 1 !important;

    display: block !important;
  }

  /* Kill flex/grid influence */
  .printable-area * {
    max-width: 100% !important;
  }

  .non-printable {
    display: none !important;
  }
}
`}</style>

        </div>
    );
}
