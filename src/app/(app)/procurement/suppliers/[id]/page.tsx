'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle, Mail, Phone, MapPin, FileText, Edit, PlusCircle, User, Briefcase, Building, Printer } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LedgerTable } from '@/components/procurement/LedgerTable';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAYMENTS_API_URL = 'https://hariindustries.net/api/clearbook/payments_simulation.php';

// Define new types based on the API response
interface Supplier {
    id: number;
    supplier_code: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    supplier_currency: string;
    payment_terms: number;
    vat_number: string;
}

interface LedgerEntry {
    date: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
    voucher_id?: number;
    voucher_type?: string;
    reference_id?: number | null;
}

interface OutstandingInvoice {
    id: number;
    invoice_number: string;
    total_amount: number;
    outstanding_amount: number;
}

interface BankAccount {
    id: number;
    account_name: string;
    gl_account_code: string;
}

const SupplierDetailsPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const pathname = usePathname();
    const supplierId = pathname.split('/').pop();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Outstanding invoices + Pay flow
    const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
    const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [payTargetInvoice, setPayTargetInvoice] = useState<OutstandingInvoice | null>(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('');
    const [payBankAccount, setPayBankAccount] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    // Reversal confirmation
    const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
    const [reverseTargetId, setReverseTargetId] = useState<number | null>(null);
    const [isReversing, setIsReversing] = useState(false);

    const callPaymentsApi = useCallback(async (url: string, method: string, body: any = null) => {
        if (!user?.company_id || !user?.uid) throw new Error('Authentication credentials not found.');
        const urlWithAuth = new URL(url);
        const searchParams = new URLSearchParams(urlWithAuth.search);
        searchParams.set('company_id', user.company_id);
        searchParams.set('user_id', user.uid);
        urlWithAuth.search = searchParams.toString();

        const options: RequestInit = { method, headers: {} };
        if (body) {
            (options.headers as any)['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(urlWithAuth.href, options);
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || 'Payment API request failed');
        return result;
    }, [user]);

    const fetchSupplierData = useCallback(async () => {
        if (!user || !supplierId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-supplier-ledger.php?company_id=${user.company_id}&supplier_id=${supplierId}`);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to fetch supplier ledger.");
            }

            setSupplier(result.supplier);
            setLedger(result.ledger);
            setCurrentBalance(result.current_balance);

        } catch (e: any) {
            setError(`Failed to fetch supplier details: ${e.message}`);
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: e.message,
            });
        } finally {
            setIsLoading(false);
        }
    }, [supplierId, user, toast]);

    const fetchOutstandingInvoices = useCallback(async () => {
        if (!supplierId) return;
        setIsInvoicesLoading(true);
        try {
            const data = await callPaymentsApi(`${PAYMENTS_API_URL}?action=get_supplier_unpaid_invoices&supplier_id=${supplierId}`, 'GET');
            setOutstandingInvoices(Array.isArray(data) ? data : []);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error fetching outstanding invoices', description: e.message });
        } finally {
            setIsInvoicesLoading(false);
        }
    }, [supplierId, callPaymentsApi, toast]);

    useEffect(() => {
        fetchSupplierData();
        fetchOutstandingInvoices();
    }, [fetchSupplierData, fetchOutstandingInvoices]);

    useEffect(() => {
        callPaymentsApi(`${PAYMENTS_API_URL}?action=get_bank_accounts`, 'GET')
            .then(setBankAccounts)
            .catch(() => {});
    }, [callPaymentsApi]);

    const formatCurrency = (amount: number) => {
        if (!supplier) return 'N/A';
        const currencyCode = supplier.supplier_currency && supplier.supplier_currency !== '0' ? supplier.supplier_currency : 'NGN';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
    };

    // ── Pay flow ────────────────────────────────────────────────────────
    // Opens with the selected invoice's own outstanding balance as a
    // SUGGESTED amount only — same principle as the standalone Payments
    // page: the field stays editable, so paying less is a genuine partial
    // payment and paying more carries the excess to Supplier Advances,
    // both handled by the backend's FIFO sweep, not by anything here.
    const openPayDialog = (invoice: OutstandingInvoice | null) => {
        setPayTargetInvoice(invoice);
        setPayAmount(invoice ? invoice.outstanding_amount.toFixed(2) : '');
        setPayMethod('');
        setPayBankAccount('');
        setPayDialogOpen(true);
    };

    const submitPayment = async () => {
        if (!supplier || !payAmount || Number(payAmount) <= 0) {
            toast({ variant: 'destructive', title: 'Enter a valid amount' });
            return;
        }
        if (!payMethod || !payBankAccount) {
            toast({ variant: 'destructive', title: 'Select a payment method and account' });
            return;
        }

        setIsPaying(true);
        try {
            const createResult = await callPaymentsApi(`${PAYMENTS_API_URL}?action=create`, 'POST', {
                date: new Date().toISOString().substring(0, 10),
                amount: payAmount,
                payee_name: supplier.name,
                supplier_id: supplier.id,
                cash_bank_account_code: payBankAccount,
                payment_type: 'Supplier Payment',
                payment_method: payMethod,
                description: payTargetInvoice
                    ? `Payment toward Invoice ${payTargetInvoice.invoice_number}`
                    : `Payment to ${supplier.name}`,
            });

            await callPaymentsApi(`${PAYMENTS_API_URL}?id=${createResult.id}&action=post`, 'POST');

            toast({ title: 'Payment posted', description: `Payment to ${supplier.name} recorded successfully.` });
            setPayDialogOpen(false);
            fetchSupplierData();
            fetchOutstandingInvoices();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Payment failed', description: e.message });
        } finally {
            setIsPaying(false);
        }
    };

    // ── Reversal flow ───────────────────────────────────────────────────
    const requestReverse = (voucherId: number) => {
        setReverseTargetId(voucherId);
        setReverseDialogOpen(true);
    };

    const confirmReverse = async () => {
        if (!reverseTargetId) return;
        setIsReversing(true);
        try {
            await callPaymentsApi(`${PAYMENTS_API_URL}?id=${reverseTargetId}&action=reverse`, 'POST');
            toast({ title: 'Payment reversed' });
            fetchSupplierData();
            fetchOutstandingInvoices();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Reversal failed', description: e.message });
        } finally {
            setIsReversing(false);
            setReverseDialogOpen(false);
            setReverseTargetId(null);
        }
    };

    const handlePrint = () => { window.print(); };

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/> <span className='ml-2'>Loading supplier ledger...</span></div>;
    }

    if (error) {
        return <div className="flex flex-col items-center justify-center p-8 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>;
    }

    if (!supplier) {
        return <div className="flex items-center justify-center p-8">Supplier not found.</div>;
    }

    return (
        <div className="printable-area p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{supplier.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold">{supplier.name}</h1>
                        <p className="text-muted-foreground">Supplier Code: {supplier.supplier_code}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2"/> Print Statement</Button>
                    <Button variant="outline"><Edit className="h-4 w-4 mr-2"/> Edit</Button>
                    <Button><PlusCircle className="h-4 w-4 mr-2"/> New Bill</Button>
                </div>
            </div>

            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Supplier Statement: {supplier.name}</h1>
                <p>Supplier Code: {supplier.supplier_code}</p>
                <p>Printed: {new Date().toLocaleDateString()}</p>
            </div>

            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">Account Summary</h3>
                     <div className="grid gap-4 md:grid-cols-3 mt-4">
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Currency</p>
                            <p className="text-2xl font-bold">{supplier.supplier_currency}</p>
                        </div>
                         <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Total AP</p>
                            <p className={`text-2xl font-bold ${currentBalance !== null && currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {currentBalance !== null ? formatCurrency(currentBalance) : 'N/A'}
                            </p>
                        </div>
                         <div className="p-4 border rounded-lg">
                             <p className="text-sm text-muted-foreground">Payment Terms</p>
                             <p className="text-2xl font-bold">{supplier.payment_terms !== null ? `${supplier.payment_terms} days` : 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="outstanding">
                <TabsList className="print:hidden">
                    <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
                    <TabsTrigger value="activities">Transaction Ledger</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                </TabsList>

                <TabsContent value="outstanding" className="print:hidden">
                    <Card className="mt-4">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Outstanding Invoices</CardTitle>
                                <CardDescription>Open bills for this supplier, oldest first.</CardDescription>
                            </div>
                            <Button variant="outline" onClick={() => openPayDialog(null)}>
                                <PlusCircle className="h-4 w-4 mr-2"/> Record Payment
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isInvoicesLoading ? (
                                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Outstanding</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {outstandingInvoices.length > 0 ? outstandingInvoices.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell>{inv.invoice_number}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(inv.outstanding_amount)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => openPayDialog(inv)}>Pay</Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={4} className="text-center h-24">No outstanding invoices.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                 <TabsContent value="activities">
                    <Card className="mt-4">
                        <CardHeader className="print:hidden">
                            <CardTitle>Transactional History</CardTitle>
                            <CardDescription>A detailed record of all transactions with this supplier.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <LedgerTable ledger={ledger} currency={supplier.supplier_currency} onReverse={requestReverse} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profile" className="print:hidden">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Supplier Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start space-x-3">
                                    <Building className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Legal Name</p>
                                        <p>{supplier.name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <User className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Contact Person</p>
                                        <p>{supplier.contact_person || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Email</p>
                                        <p className="hover:underline cursor-pointer">{supplier.email || 'N/A'}</p>
                                    </div>
                                </div>
                                 <div className="flex items-start space-x-3">
                                    <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Phone</p>
                                        <p>{supplier.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Address</p>
                                        <p>{`${supplier.address}, ${supplier.city}, ${supplier.state}, ${supplier.country}`}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Briefcase className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Tax ID / VAT Number</p>
                                        <p>{supplier.vat_number || 'Not Provided'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── Pay Dialog ─────────────────────────────────────────────── */}
            <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment to {supplier.name}</DialogTitle>
                        <DialogDescription>
                            {payTargetInvoice
                                ? `Suggested amount is Invoice ${payTargetInvoice.invoice_number}'s outstanding balance — edit freely for a partial or combined payment.`
                                : `Amount will be applied automatically across this supplier's open invoices, oldest first.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="pay-amount">Amount *</Label>
                            <Input id="pay-amount" type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pay-method">Payment Method *</Label>
                            <Select value={payMethod} onValueChange={setPayMethod}>
                                <SelectTrigger id="pay-method"><SelectValue placeholder="Select method" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pay-bank">Pay From *</Label>
                            <Select value={payBankAccount} onValueChange={setPayBankAccount}>
                                <SelectTrigger id="pay-bank"><SelectValue placeholder="Select bank/cash account" /></SelectTrigger>
                                <SelectContent>
                                    {bankAccounts.map(acc => (
                                        <SelectItem key={acc.gl_account_code} value={acc.gl_account_code}>
                                            {acc.gl_account_code} - {acc.account_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitPayment} disabled={isPaying}>
                            {isPaying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Record Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Reverse Confirmation ───────────────────────────────────── */}
            <AlertDialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reverse this payment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This creates an offsetting entry and restores any invoices it was applied to. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmReverse} disabled={isReversing}>
                            {isReversing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Reverse
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default SupplierDetailsPage;
