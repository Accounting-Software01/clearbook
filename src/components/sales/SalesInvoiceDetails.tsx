'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, AlertCircle, ArrowLeft, Printer, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { numberToWords } from '@/lib/number-to-words-converter';
import Image from 'next/image';
import { QRCodeCanvas } from 'qrcode.react';

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

interface SalesInvoiceDetailsProps {
    invoiceId: number;
    onBack: () => void;
    onPaymentSimulated: () => void;
}

interface BankAccount {
    bank_id: number;
    bank_name: string;
    account_name: string;
    account_number: string;
    currency: string;
    gl_account_code: string;
    gl_account_name: string;
}


// Helper
const formatNaira = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
};

export function SalesInvoiceDetails({ invoiceId, onBack, onPaymentSimulated }: SalesInvoiceDetailsProps) {
    const { user } = useAuth();
    const [invoice, setInvoice] = useState<InvoiceDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

    const canReceivePayment = user?.role === 'admin' || user?.role === 'accountant';

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

    const handlePrint = () => window.print();

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
        return <div className="text-center text-gray-500 py-10">No invoice data to display.</div>;
    }

    const totalAmountNumber = typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : invoice.total_amount;
    const sanitizeImagePath = (path: string) => path ? (path.replace('/public/', '/').startsWith('/') ? path : '/' + path) : '';

    const verifiedSignaturePath = sanitizeImagePath(invoice.verified_by_signature);
    const authorizedSignaturePath = sanitizeImagePath(invoice.authorized_by_signature);
    const companyLogoPath = sanitizeImagePath(invoice.company_logo);
    const invoiceUrl = `https://hariindustries.net/invoice.php?token=${invoice.public_token}`;

    return (
        <>
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-10 printable-area">
                <div className="flex justify-between items-center mb-6 non-printable">
                    <div>
                        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                    </div>
                    <div className='flex space-x-2'>
                        <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                        {canReceivePayment && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                            <Button size="sm" onClick={() => setIsPaymentDialogOpen(true)}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Receive Payment
                            </Button>
                        )}
                    </div>
                </div>

                {/* Invoice Content */}
                
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

            <footer className="border-t-2 border-gray-800 pt-8 mt-12 text-sm">
                 <div className="grid grid-cols-3 gap-4 mb-8">
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
                <div className="flex flex-col items-center justify-center pt-4 print-only">
                    <QRCodeCanvas value={invoiceUrl} size={128} />
                    <p className="mt-2 text-xs">Scan to view invoice details online</p>
                </div>
                <p className="mt-8 text-gray-500 text-center">Thank you for your business!</p>
            </footer>
            </div>

            <ReceivePaymentDialog 
                isOpen={isPaymentDialogOpen} 
                onClose={() => setIsPaymentDialogOpen(false)} 
                invoice={invoice}
                onPaymentSuccess={() => {
                    setIsPaymentDialogOpen(false);
                    onPaymentSimulated();
                    fetchInvoiceDetails();
                }}
            />
        </>
    );
}

// ReceivePaymentDialog Component
interface ReceivePaymentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: InvoiceDetailsData | null;
    onPaymentSuccess: () => void;
}

function ReceivePaymentDialog({ isOpen, onClose, invoice, onPaymentSuccess }: ReceivePaymentDialogProps) {
    const { user } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
    const [bankAccountId, setBankAccountId] = useState<number | undefined>();
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [paymentReference, setPaymentReference] = useState('');
    const [narration, setNarration] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (invoice) {
            setPaymentAmount(invoice.amount_due);
            setNarration(`Payment for invoice ${invoice.invoice_number}`);
            setPaymentReference('');
        }
        if (user?.company_id && isOpen) {
            api<{ bank_accounts: BankAccount[] }>(`get_bank_accounts_with_gl.php?company_id=${user.company_id}`)
                .then(data => {
                    const accounts = data?.bank_accounts || [];
                    setBankAccounts(accounts);

                    if (accounts.length > 0) {
                        setBankAccountId(accounts[0].bank_id);
                        setError(''); // Clear previous errors
                    } else {
                        setError('No bank accounts configured. Please add a bank account in settings.');
                    }
                })
                .catch(() => setError('Could not load bank accounts. Check network connection.'));
        }
    }, [invoice, user?.company_id, isOpen]);

    const handleSubmit = async () => {
        if (!invoice || !user || !paymentDate || !bankAccountId || paymentAmount <= 0) {
            setError('Please fill all fields correctly.');
            return;
        }
        setIsProcessing(true);
        setError('');
        try {
            await api('simulate-sales-payment.php', {
                method: 'POST',
                body: JSON.stringify({
                    company_id: user.company_id,
                    user_id: user.uid,
                    invoice_id: invoice.id,
                    amount: paymentAmount,
                    payment_date: paymentDate.toISOString().split('T')[0],
                    bank_account_id: bankAccountId,
                    reference: paymentReference,
                    narration: narration
                })
            });
            onPaymentSuccess();
        } catch (e: any) {
            setError(e.message || 'Payment failed.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Receive Payment for {invoice?.invoice_number}</DialogTitle>
                    <DialogDescription>Record a payment received from {invoice?.customer_name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label>Payment Amount</label>
                        <Input 
                            type="number" 
                            value={paymentAmount} 
                            onChange={e => setPaymentAmount(parseFloat(e.target.value))} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label>Payment Date</label>
                        <DatePicker date={paymentDate} onDateChange={setPaymentDate} />
                    </div>
                    <div className="space-y-2">
                        <label>Deposit to Account</label>
                        <Select 
                            onValueChange={(val) => setBankAccountId(Number(val))}
                            value={bankAccountId ? String(bankAccountId) : ""} 
                            disabled={bankAccounts.length === 0}
                        >
                            <SelectTrigger><SelectValue placeholder="Select a bank account" /></SelectTrigger>
                            <SelectContent>
                                {bankAccounts.length === 0 ? (
                                    <SelectItem value="none" disabled>No accounts available</SelectItem>
                                ) : (
                                    bankAccounts.map(acc => (
                                        <SelectItem key={acc.bank_id} value={String(acc.bank_id)}>
                                            <div>
                                                <p className='font-semibold'>{acc.bank_name} - {acc.account_name}</p>
                                                <p className='text-xs text-gray-500'>GL: {acc.gl_account_name}</p>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="paymentReference">Payment Reference</label>
                        <Input
                            id="paymentReference"
                            type="text"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="e.g., Bank transfer ID, Cheque no."
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="narration">Narration</label>
                        <Input
                            id="narration"
                            type="text"
                            value={narration}
                            onChange={(e) => setNarration(e.target.value)}
                            placeholder="e.g., Part payment for goods"
                        />
                    </div>
                    {error && <p className="text-destructive text-sm font-semibold">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isProcessing || bankAccounts.length === 0}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
