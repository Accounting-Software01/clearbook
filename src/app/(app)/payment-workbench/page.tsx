'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronsRight, Search, Wallet, AlertTriangle, ChevronsLeft, PlusCircle, CheckCircle, Printer } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { api } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { numberToWords } from '@/lib/number-to-words';
import { Account } from '@/types/index';

// --- Interfaces ---
interface Supplier { id: string; name: string; }
interface SupplierDetails extends Supplier {
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
}
interface SupplierInvoice { id: number; invoice_number: string; due_date: string; total_amount: number; }
interface ScheduledPayment {
    supplier: SupplierDetails;
    invoices: SupplierInvoice[];
    totalAmount: number;
    purpose: string;
}

const accountOptions: Account[] = chartOfAccounts.map(acc => ({ 
    account_id: acc.code, 
    account_name: acc.name, 
    account_type: acc.type, 
    opening_balance: 0, 
    is_enabled: true, 
    company_id: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    bank_name: null,
    account_number: null,
    is_bank_account: false,
}));

const PaymentWorkbenchPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // --- State Management ---
    const [currentStage, setCurrentStage] = useState('build'); // 'build' | 'review' | 'success'
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierDetails, setSupplierDetails] = useState<Record<string, SupplierDetails>>({});
    const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
    const [bankAndCashAccounts, setBankAndCashAccounts] = useState<Account[]>([]); 
    const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
    
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Record<number, boolean>>({});
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [whtRate, setWhtRate] = useState<number>(5); // Default to 5%
    
    const [isFetchingSuppliers, setIsFetchingSuppliers] = useState(true);
    const [isFetchingInvoices, setIsFetchingInvoices] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [finalVoucherIds, setFinalVoucherIds] = useState<string[]>([]);

    // --- Derived State ---
    const selectedSupplier = useMemo(() => supplierDetails[selectedSupplierId || ''], [supplierDetails, selectedSupplierId]);
    const selectedInvoices = useMemo(() => invoices.filter(inv => selectedInvoiceIds[inv.id]), [invoices, selectedInvoiceIds]);
    const totalPaymentAmount = useMemo(() => selectedInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0), [selectedInvoices]);
    const scheduleTotal = useMemo(() => scheduledPayments.reduce((sum, p) => sum + p.totalAmount, 0), [scheduledPayments]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user?.company_id) return;
            setIsFetchingSuppliers(true);
            try {
                const fetchedSuppliers = await api<Supplier[]>(`suppliers.php?company_id=${user.company_id}`);
                setSuppliers(fetchedSuppliers);

                const cashAndBank = accountOptions.filter(acc => 
                    acc.account_name.toLowerCase().includes('cash') || acc.account_name.toLowerCase().includes('bank')
                );
                setBankAndCashAccounts(cashAndBank);

            } catch (err: any) { 
                toast({ 
                    variant: "destructive", 
                    title: "Failed to Load Suppliers", 
                    description: err.message || "Could not connect to the server. Please check your connection or contact support."
                }); 
            } finally { 
                setIsFetchingSuppliers(false); 
            }
        };
        fetchInitialData();
    }, [user, toast]);

    useEffect(() => {
        const fetchSupplierData = async () => {
            if (!user?.company_id || !selectedSupplierId) return;
            setIsFetchingInvoices(true);
            try {
                if (!supplierDetails[selectedSupplierId]) {
                    const detailsRes = await api<SupplierDetails>(`suppliers.php?company_id=${user.company_id}&id=${selectedSupplierId}`);
                    setSupplierDetails(prev => ({ ...prev, [selectedSupplierId]: detailsRes }));
                }
                const invoicesRes = await api<SupplierInvoice[]>(`get-supplier-invoices.php?company_id=${user.company_id}&supplier_id=${selectedSupplierId}&status=Unpaid`);
                setInvoices(invoicesRes);
                setSelectedInvoiceIds({});
            } catch (e: any) { 
                toast({ 
                    variant: "destructive", 
                    title: "Supplier Data Error", 
                    description: e.message || "Failed to load supplier invoices and details."
                }); 
            } finally { 
                setIsFetchingInvoices(false); 
            }
        };
        fetchSupplierData();
    }, [user?.company_id, selectedSupplierId, toast, supplierDetails]);

    // --- Actions ---
    const handleAddToSchedule = () => {
        if (!selectedSupplier || selectedInvoices.length === 0) return;
        const newPayment: ScheduledPayment = {
            supplier: selectedSupplier,
            invoices: selectedInvoices,
            totalAmount: totalPaymentAmount,
            purpose: `Payment for Inv #${selectedInvoices.map(i => i.invoice_number).join(', ')}`
        };
        setScheduledPayments(prev => [...prev, newPayment]);
        toast({ title: "Added to Schedule", description: `${selectedSupplier.name} payment of NGN ${totalPaymentAmount.toFixed(2)} added.` });
        setSelectedSupplierId(null);
        setInvoices([]);
    };

    const handleProcessSchedule = async () => {
        if (!user || !selectedAccountId || whtRate < 0 || scheduledPayments.length === 0) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select a payment account and ensure WHT rate is not negative." });
            return;
        }
        setIsProcessing(true);
        try {
            const response = await api<{ status: string; message: string; created_voucher_ids: string[] }>('create-payment-schedule.php', {
                method: 'POST',
                body: JSON.stringify({
                    company_id: user.company_id,
                    user_id: user.uid,
                    payment_account_id: selectedAccountId,
                    wht_rate: whtRate,
                    payments: scheduledPayments
                })
            });

            if (response.status === 'success') {
                setFinalVoucherIds(response.created_voucher_ids);
                setCurrentStage('success');
                toast({ title: "Success", description: response.message });
            } else {
                throw new Error(response.message);
            }
        } catch (error: any) { 
            toast({ variant: "destructive", title: "Processing Error", description: error.message || "An unexpected error occurred." });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // --- UI Rendering ---
    const renderBuildStage = () => (
        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center"><Search className="mr-2" />1. Select Supplier</CardTitle></CardHeader>
                    <CardContent>
                        <Select onValueChange={val => setSelectedSupplierId(val)} value={selectedSupplierId || ''} disabled={isFetchingSuppliers}>
                            <SelectTrigger><SelectValue placeholder={isFetchingSuppliers ? "Loading suppliers..." : "Choose a supplier..."} /></SelectTrigger>
                            <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                        {isFetchingSuppliers && <Loader2 className="h-4 w-4 animate-spin mt-2"/>}
                    </CardContent>
                </Card>
                {isFetchingInvoices && selectedSupplierId && <div className="text-center p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                {selectedSupplierId && !isFetchingInvoices && <Card>
                    <CardHeader><CardTitle>2. Select Invoices</CardTitle><CardDescription>Select unpaid invoices for <span className="font-bold">{selectedSupplier?.name}</span>.</CardDescription></CardHeader>
                    <CardContent><div className="border rounded-lg"><Table><TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Invoice #</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{invoices.length > 0 ? invoices.map(inv => <TableRow key={inv.id}><TableCell><Checkbox checked={!!selectedInvoiceIds[inv.id]} onCheckedChange={checked => setSelectedInvoiceIds(prev => ({ ...prev, [inv.id]: !!checked }))} /></TableCell><TableCell>{inv.invoice_number}</TableCell><TableCell>{format(new Date(inv.due_date), 'PPP')}</TableCell><TableCell className="text-right font-mono">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(inv.total_amount)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="text-center h-24">No unpaid invoices for this supplier.</TableCell></TableRow>}</TableBody></Table></div></CardContent>
                    <CardFooter className="flex justify-end"><Button onClick={handleAddToSchedule} disabled={selectedInvoices.length === 0}><PlusCircle className="mr-2 h-4 w-4"/> Add to Schedule</Button></CardFooter>
                </Card>}
            </div>
            <div className="space-y-6">
                 <Card className="sticky top-6"><CardHeader><CardTitle>Payment Schedule</CardTitle><CardDescription>Payments will appear here. Review when done.</CardDescription></CardHeader><CardContent>
                    {scheduledPayments.length > 0 ? scheduledPayments.map((p, i) => <div key={i} className="flex justify-between items-center py-2 border-b last:border-b-0"><span>{p.supplier.name}</span><span className="font-mono">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(p.totalAmount)}</span></div>) : <p className="text-slate-500 text-center py-8">No payments added.</p>}
                </CardContent><CardFooter className="flex flex-col gap-4"><div className="flex justify-between w-full font-bold text-lg"><span>Total:</span><span>{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(scheduleTotal)}</span></div><Button size="lg" className="w-full" disabled={scheduledPayments.length === 0} onClick={() => setCurrentStage('review')}>Review Schedule <ChevronsRight className="ml-2"/></Button></CardFooter></Card>
            </div>
        </div>
    );

    const renderReviewStage = () => (
        <Card className="max-w-6xl mx-auto"><CardHeader className="border-b pb-4">
            <div className="flex justify-between items-start">
                <div><h1 className="text-2xl font-bold">Review & Process Payment Schedule</h1><p className="text-slate-500">Confirm details and process the payment to generate journal vouchers.</p></div>
                <div className="text-right"><p className="font-mono">DATE: {format(new Date(), 'dd/MM/yyyy')}</p></div>
            </div>
        </CardHeader><CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="payment-account">Source of Funds (Bank/Cash)</Label>
                    <Select onValueChange={setSelectedAccountId} value={selectedAccountId || ''}><SelectTrigger id="payment-account"><SelectValue placeholder="Select account..." /></SelectTrigger><SelectContent>{bankAndCashAccounts.map(acc => <SelectItem key={acc.account_id} value={acc.account_id}>{acc.account_name} ({acc.account_id})</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="wht-rate">Withholding Tax Rate (%)</Label>
                    <Input id="wht-rate" type="number" placeholder="e.g., 5 for 5%" value={whtRate} onChange={e => setWhtRate(parseFloat(e.target.value) || 0)} />
                </div>
            </div>
            <div className="border rounded-lg overflow-hidden"><Table><TableHeader><TableRow><TableHead>S/N</TableHead><TableHead>Beneficiary</TableHead><TableHead>Bank</TableHead><TableHead>Account No</TableHead><TableHead>Purpose</TableHead><TableHead className="text-right">Amount (NGN)</TableHead></TableRow></TableHeader><TableBody>
                {scheduledPayments.map((p, i) => <TableRow key={i}><TableCell>{i + 1}</TableCell><TableCell>{p.supplier.account_name || p.supplier.name}</TableCell><TableCell>{p.supplier.bank_name}</TableCell><TableCell>{p.supplier.account_number}</TableCell><TableCell>{p.purpose}</TableCell><TableCell className="text-right font-mono">{p.totalAmount.toFixed(2)}</TableCell></TableRow>)}
                <TableRow className="font-bold bg-gray-50"><TableCell colSpan={5} className="text-right">TOTAL</TableCell><TableCell className="text-right font-mono">{scheduleTotal.toFixed(2)}</TableCell></TableRow>
            </TableBody></Table></div>
             <div className="mt-4 p-4 bg-gray-50 rounded-lg"><strong>Amount in Words:</strong> {numberToWords(scheduleTotal)}</div>
        </CardContent><CardFooter className="flex justify-between"><Button variant="outline" onClick={() => setCurrentStage('build' )} disabled={isProcessing}><ChevronsLeft className="mr-2 h-4 w-4"/> Back</Button><Button onClick={handleProcessSchedule} disabled={isProcessing || !selectedAccountId}>{isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</> : <><Wallet className="mr-2 h-4 w-4"/> Process Payment & Post to Journal</>}</Button></CardFooter></Card>
    );

    const renderSuccessStage = () => (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader><CheckCircle className="mx-auto h-16 w-16 text-green-500"/></CardHeader>
            <CardContent className="space-y-4">
                <h1 className="text-2xl font-bold">Payment Processed Successfully!</h1>
                <p className="text-slate-600">The payment schedule has been processed and the corresponding journal vouchers have been created.</p>
                <div>
                    <p className="font-semibold">Created Voucher IDs:</p>
                    <ul className="font-mono text-sm">{finalVoucherIds.map(id => <li key={id}>{id}</li>)}</ul>
                </div>
            </CardContent>
            <CardFooter className="justify-center">
                <Button onClick={() => { setCurrentStage('build'); setScheduledPayments([]); }}>Create Another Schedule</Button>
            </CardFooter>
        </Card>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Payment Workbench</h1>
            {currentStage === 'build' && renderBuildStage()}
            {currentStage === 'review' && renderReviewStage()}
            {currentStage === 'success' && renderSuccessStage()}
        </div></div>
    );
};

export default PaymentWorkbenchPage;
