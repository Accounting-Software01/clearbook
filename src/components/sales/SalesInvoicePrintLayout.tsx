'use client';

import React from 'react';
import Image from 'next/image';
import { numberToWords } from '@/lib/number-to-words-converter';

// This component is exclusively for printing.
// It lays out the invoice data in a clean, paper-friendly format.

const formatNaira = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

const sanitizeImagePath = (path) => {
    if (!path) return '';
    let cleanPath = path.replace('/public/', '/');
    if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
    }
    return cleanPath;
};

export function SalesInvoicePrintLayout({ invoice, user }) {
    if (!invoice || !user) return null;

    const totalAmountNumber = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount;
    const companyLogoPath = sanitizeImagePath(invoice.company_logo);
    const verifiedSignaturePath = sanitizeImagePath(invoice.verified_by_signature);
    const authorizedSignaturePath = sanitizeImagePath(invoice.authorized_by_signature);

    return (
        <div className="bg-white text-black text-sm p-[15mm]">
            <header className="border-b-2 border-black pb-4 mb-8">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {companyLogoPath && <Image src={companyLogoPath} alt="Company Logo" width={80} height={80} style={{ marginRight: '1rem' }}/>}
                        <div>
                            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'black' }}>{invoice.company_name}</h1>
                            <p>{invoice.company_address}</p>
                            <p>{invoice.company_phone}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'black' }}>Sales Invoice</h2>
                        <p>Printed by: {user.full_name} on {new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </header>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', marginBottom: '2rem' }}>
                <div className="border border-black rounded p-4">
                    <h3 className="font-semibold text-gray-700 mb-2">BUYER:</h3>
                    <p className="font-bold text-lg">{invoice.customer_name}</p>
                </div>
                <div className="border border-black rounded p-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div><p style={{ fontWeight: '600' }}>Invoice No.:</p><p>{invoice.invoice_number}</p></div>
                    <div><p style={{ fontWeight: '600' }}>Invoice Date:</p><p>{new Date(invoice.invoice_date).toLocaleDateString()}</p></div>
                    <div><p style={{ fontWeight: '600' }}>Due Date:</p><p>{new Date(invoice.due_date).toLocaleDateString()}</p></div>
                    <div><p style={{ fontWeight: '600' }}>Status:</p><p>{invoice.status}</p></div>
                </div>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'black', color: 'white' }}>
                        <tr>
                            <th style={{ padding: '8px', textAlign: 'left' }}>S/No</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Item Description</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Quantity</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Rate</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #ccc' }}>
                                <td style={{ padding: '8px' }}>{index + 1}</td>
                                <td style={{ padding: '8px', fontWeight: '500' }}>{item.item_name}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatNaira(item.unit_price)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>{formatNaira(item.total_amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            
             <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
                 <div style={{ gridColumn: 'span 3 / span 3' }}>
                     <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: '600' }}>AMOUNT IN WORDS:</p>
                        <p style={{ textTransform: 'capitalize' }}>{numberToWords(totalAmountNumber)} Naira Only</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: '600' }}>NARRATION:</p>
                        <p>Being payment for the sale of goods.</p>
                    </div>
                 </div>
                 <div style={{ gridColumn: 'span 2 / span 2', borderLeft: '2px solid black', paddingLeft: '1rem' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: '600' }}>Previous Balance:</span><span style={{ fontWeight: '600' }}>{formatNaira(invoice.previous_balance)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}><span style={{ fontWeight: '600' }}>Current Invoice:</span><span style={{ fontWeight: '600' }}>{formatNaira(invoice.current_invoice_balance)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.25rem', fontWeight: 'bold', backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', marginTop: '0.5rem' }}><span>Total Balance:</span><span>{formatNaira(invoice.total_balance)}</span></div>
                 </div>
            </section>

            <footer style={{ borderTop: '2px solid black', paddingTop: '2rem', marginTop: '3rem', textAlign: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ height: '6rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ height: '3rem' }}></div>
                        <p style={{ fontWeight: '600' }}>{invoice.prepared_by}</p>
                        <p style={{ borderTop: '2px solid #9ca3af', marginTop: '0.25rem', paddingTop: '0.25rem' }}>Prepared By</p>
                    </div>
                    <div style={{ height: '6rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ height: '3rem', position: 'relative' }}>{verifiedSignaturePath && <Image src={verifiedSignaturePath} alt="Verified By Signature" layout='fill' objectFit='contain'/> }</div>
                        <p style={{ fontWeight: '600' }}>{invoice.verified_by}</p>
                        <p style={{ borderTop: '2px solid #9ca3af', marginTop: '0.25rem', paddingTop: '0.25rem' }}>Verified By</p>
                    </div>
                    <div style={{ height: '6rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ height: '3rem', position: 'relative' }}>{authorizedSignaturePath && <Image src={authorizedSignaturePath} alt="Authorized By Signature" layout='fill' objectFit='contain'/> }</div>
                        <p style={{ fontWeight: '600' }}>{invoice.authorized_by}</p>
                        <p style={{ borderTop: '2px solid #9ca3af', marginTop: '0.25rem', paddingTop: '0.25rem' }}>Authorised Signatory</p>
                    </div>
                </div>
                <p style={{ marginTop: '2rem', color: '#6b7280' }}>Thank you for your business!</p>
            </footer>
        </div>
    );
}
