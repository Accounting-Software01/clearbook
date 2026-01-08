'use client';

import React from 'react';
import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';
import { numberToWords } from '@/lib/number-to-words-converter';
import { format } from 'date-fns';

// Interfaces (should be consistent with SalesInvoiceDetails)
interface InvoiceItem {
    id: number;
    item_name: string;
    quantity: number;
    unit_price: string | number;
    total_amount: string | number;
}

interface InvoiceDetailsData {
    id: number;
    public_token: string;
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
    prepared_by: string;
    verified_by: string;
    authorized_by: string;
    verified_by_signature: string;
    authorized_by_signature: string;
}

// Helper
const formatNaira = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

interface SalesInvoicePrintLayoutProps {
    invoice: InvoiceDetailsData;
    userFullName: string | null | undefined;
}

export const SalesInvoicePrintLayout = React.forwardRef<HTMLDivElement, SalesInvoicePrintLayoutProps>((props, ref) => {
    const { invoice, userFullName } = props;

    const totalAmountNumber = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount;
    const sanitizeImagePath = (path: string) => path ? (path.replace('/public/', '/').startsWith('/') ? path : '/' + path) : '';

    const verifiedSignaturePath = sanitizeImagePath(invoice.verified_by_signature);
    const authorizedSignaturePath = sanitizeImagePath(invoice.authorized_by_signature);
    const invoiceUrl = `https://hariindustries.net/invoice.php?token=${invoice.public_token}`;

    return (
        <div ref={ref} className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-10 printable-area">
            <header className="border-b-2 border-gray-800 pb-4 mb-8">
                <div className="flex justify-between items-start">
                    <div className="flex items-center">
                        {invoice.company_logo &&
                            <Image
                                src={invoice.company_logo}
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
                        <p className="text-sm">Printed by: {userFullName} on {new Date().toLocaleDateString()}</p>
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
                <table className="w-full">
                    <thead className="bg-gray-800 text-white">
                        <tr>
                            <th className="p-2 text-left">S/No</th>
                            <th className="p-2 text-left">Item Description</th>
                            <th className="p-2 text-right">Quantity</th>
                            <th className="p-2 text-right">Rate</th>
                            <th className="p-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => (
                            <tr key={item.id} className="even:bg-gray-50">
                                <td className="p-2">{index + 1}</td>
                                <td className="p-2 font-medium">{item.item_name}</td>
                                <td className="p-2 text-right">{item.quantity}</td>
                                <td className="p-2 text-right">{formatNaira(item.unit_price)}</td>
                                <td className="p-2 text-right font-semibold">{formatNaira(item.total_amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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

            <footer className="border-t-2 border-gray-800 pt-8 mt-12 text-sm">
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className='h-24 flex flex-col justify-between'>
                        <div className="h-12"></div>
                        <p className="font-semibold">{invoice.prepared_by}</p>
                        <p className="border-t-2 border-gray-400 mt-1 pt-1">Prepared By</p>
                    </div>
                    <div className='h-24 flex flex-col justify-between'>
                        <div className="h-12 relative">{verifiedSignaturePath && <Image src={verifiedSignaturePath} alt="Verified By Signature" layout='fill' objectFit='contain'/>}</div>
                        <p className="font-semibold">{invoice.verified_by}</p>
                        <p className="border-t-2 border-gray-400 mt-1 pt-1">Verified By</p>
                    </div>
                    <div className='h-24 flex flex-col justify-between'>
                        <div className="h-12 relative">{authorizedSignaturePath && <Image src={authorizedSignaturePath} alt="Authorized By Signature" layout='fill' objectFit='contain'/>}</div>
                        <p className="font-semibold">{invoice.authorized_by}</p>
                        <p className="border-t-2 border-gray-400 mt-1 pt-1">Authorised Signatory</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center pt-4">
                    <QRCodeCanvas value={invoiceUrl} size={128} />
                    <p className="mt-2 text-xs">Scan to view invoice details online</p>
                </div>
                <p className="mt-8 text-gray-500 text-center">Thank you for your business!</p>
            </footer>
        </div>
    );
});

SalesInvoicePrintLayout.displayName = 'SalesInvoicePrintLayout';
