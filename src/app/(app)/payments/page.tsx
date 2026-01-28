'use client';

import { useState, Fragment, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Assuming useAuth hook provides company_id
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, ArrowLeft, Edit, Trash2, CheckCircle, Loader2, MoreVertical, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
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

// ### Data Interfaces ###
interface JournalVoucher {
  id: number;
  date: string;
  reference: string;
  status: 'draft' | 'posted' | 'reversed';
  amount: number;
  narration: string; 
  created_by?: string;
  created_at?: string;
  posted_by?: string;
  posted_at?: string;
}

interface JournalVoucherLine {
    account_name: string;
    account_code: string;
    description: string;
    debit: number;
    credit: number;
}

interface DecodedNarration {
    description: string;
    details: {
        payment_type: string;
    payment_method: string;
    payee_name: string;
    debit_account_code: string;
    cash_bank_account_code: string;
    invoice_id?: string | null;
    }
}

interface Supplier { id: number; name: string; }
interface Customer { id: number; customer_name: string; }
interface Invoice { id: number; invoice_number: string; outstanding_amount?: number; total_amount?: number; }
interface ChartOfAccount { id: number; account_name: string; account_code: string; }
interface BankAccount {
    id: number;
    account_name: string;
    gl_account_code: string;
    // The other fields from the API are available if you need them
    bank_name: string;
    account_number: string;
    currency: string;
  }

const API_URL = 'https://hariindustries.net/api/clearbook/payments_simulation.php';

// ======================================================
// Payment Form Component
// ======================================================
const PaymentForm = ({ payment, onSave, onCancel, isLoading, callApi, debitAccounts, bankAccounts }) => {

    const { toast } = useToast(); // <-- ADD THIS LINE

    const initialNarration = payment ? JSON.parse(payment.narration) : {};

    const details = initialNarration.details || {};

    const [paymentType, setPaymentType] = useState(details.payment_type || '');
    const [payeeId, setPayeeId] = useState(''); // Can be supplier or customer id
    const [invoiceId, setInvoiceId] = useState(details.invoice_id || '');
    const [amount, setAmount] = useState(payment?.amount || '');

    // Data for dropdowns
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);



    const [debitAccountCode, setDebitAccountCode] = useState(details.debit_account_code || '');


    // Loading states
    const [isPayeeLoading, setIsPayeeLoading] = useState(false);
    const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);

    


    useEffect(() => {
        setPayeeId(''); setInvoiceId(''); setInvoices([]);
        if (!paymentType) return;
        
        let payeeAction = '';
        if (paymentType === 'Supplier Payment' || paymentType === 'Advanced Payment') {
            payeeAction = 'get_suppliers';
        } else if (paymentType === 'Customer Refund') {
            payeeAction = 'get_customers';
        }

        if (payeeAction) {
            setIsPayeeLoading(true);
            callApi(`${API_URL}?action=${payeeAction}`, 'GET')
                .then(data => {
                    if (payeeAction === 'get_suppliers') setSuppliers(data);
                    else setCustomers(data);
                })
                .finally(() => setIsPayeeLoading(false));
        }
    }, [paymentType, callApi]);

    useEffect(() => {
        if (!payeeId) {
            setInvoices([]);
            return;
        }
        setIsInvoicesLoading(true);
    
        const handleSetInvoices = (data: any[]) => {
            if (!Array.isArray(data)) {
                setInvoices([]);
                return;
            }
            
            const processedInvoices = data.map(inv => {
                // --- ROBUST FIX ---
                // Try to find the reference number, falling back from one name to the other.
                const reference = inv.reference || inv.invoice_number;
                // Try to find the due amount, falling back from one name to the other.
                
                const due = inv.balance_due ?? inv.amount_due ?? inv.outstanding_amount;

    
                // Create a clean display string, with fallbacks for safety.
                const displayRef = reference || `Invoice ID: ${inv.id}`;
                const displayDue = due !== undefined ? `Due: ${Number(due).toFixed(2)}` : 'N/A';
    
                return {
                    ...inv, // Keep all the original data from the API
                    display: `${displayRef} (${displayDue})` // Create the final display string
                };
            });
            setInvoices(processedInvoices);
        };
    
        let action = '';
        let params = '';
        if (paymentType.includes('Supplier')) {

            action = 'get_supplier_unpaid_invoices';
            params = `&supplier_id=${payeeId}`;
        } else if (paymentType.includes('Customer')) {
            action = 'get_customer_invoices';
            params = `&customer_id=${payeeId}`;
        }
    
        if (action) {
            callApi(`${API_URL}?action=${action}${params}`, 'GET')
                .then(handleSetInvoices)
                .catch(() => toast({ variant: 'destructive', title: 'Error fetching invoices' }))
                .finally(() => setIsInvoicesLoading(false));
        } else {
            setInvoices([]);
            setIsInvoicesLoading(false);
        }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payeeId, paymentType, callApi, toast]);
    
    useEffect(() => {
        if (invoiceId && invoices.length > 0) {
            const selectedInvoice = invoices.find(inv => inv.id.toString() === invoiceId);
            if (selectedInvoice) {
                // Use the correct amount property from the full invoice object
                const newAmount = selectedInvoice.balance_due ?? selectedInvoice.amount_due ?? selectedInvoice.outstanding_amount;

                if (newAmount !== undefined) {
                    setAmount(Number(newAmount).toFixed(2));
                }
            }
        } else {
             // If no invoice is selected, clear the amount
             if (paymentType !== 'Customer Refund') {
                setAmount('');
             }
        }
    }, [invoiceId, invoices, paymentType]);
    

// This new hook correctly sets the Debit Account when the Payment Type changes
useEffect(() => {
    if (debitAccounts.length === 0 && paymentType) return; // Guard clause

    let autoSelectAccountType = null;
    if (paymentType === 'Supplier Payment') {
        autoSelectAccountType = 'trade creditors';
    } else if (paymentType === 'Advanced Payment') {
        autoSelectAccountType = 'advances to suppliers';
    } else if (paymentType === 'Customer Refund') {
        autoSelectAccountType = 'trade debtors';
    }

    if (autoSelectAccountType) {
        const foundAccount = debitAccounts.find(acc => acc.account_name.toLowerCase().includes(autoSelectAccountType));
        if (foundAccount) {
            // SUCCESS: Account found, set it automatically.
           
            setDebitAccountCode(foundAccount.account_code);


        } else {
            // FAIL: Account not found, clear the selection to allow manual input.
            
            setDebitAccountCode('');

        }
    } else {
        // For 'Expense' and 'Other', allow manual selection.
        if (!payment) {
            setDebitAccountCode('');

        }
    }
}, [paymentType, debitAccounts, payment]);



const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // Get payee name for narration
    const payeeList = paymentType.includes('Supplier') || paymentType.includes('Advanced') ? suppliers : customers;
    const selectedPayee = payeeList.find(p => p.id.toString() === data.payee_id);
    data.payee_name = selectedPayee ? selectedPayee.name || selectedPayee.customer_name : data.payee_name_other;

    // --- FIX ---
    // Manually add values from state for any fields that might be disabled,
    // as FormData does not include disabled inputs in its output.
    data.amount = amount;
    
    data.debit_account_code = debitAccountCode;



    onSave(data);
};

    const isInvoicePayment = paymentType === 'Supplier Payment' || paymentType === 'Customer Refund';
    const showPayeeSelect = isInvoicePayment || paymentType === 'Advanced Payment';
    const showPayeeInput = paymentType && !showPayeeSelect;

    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>{payment ? 'Edit Payment' : 'Create New Payment'}</CardTitle>
                    <CardDescription>Fill out the form below to record a payment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="date">Date *</Label>
                            <Input id="date" name="date" type="date" defaultValue={payment?.date || new Date().toISOString().substring(0, 10)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment-type">Payment Type *</Label>
                            <Select name="payment_type" onValueChange={setPaymentType} defaultValue={paymentType} required>
                                <SelectTrigger id="payment-type"><SelectValue placeholder="Select Payment Type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Supplier Payment">Supplier Payment</SelectItem>
                                    <SelectItem value="Advanced Payment">Advanced Payment to Supplier</SelectItem>
                                    <SelectItem value="Customer Refund">Customer Refund</SelectItem>
                                    <SelectItem value="Expense Reimbursement">Expense Reimbursement</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {showPayeeSelect && (
                             <div className="space-y-2 relative">
                                <Label htmlFor="payee_id">{paymentType.includes('Customer') ? 'Customer' : 'Supplier'} *</Label>
                                <Select name="payee_id" onValueChange={setPayeeId} value={payeeId} required disabled={!paymentType || isPayeeLoading}>
                                    <SelectTrigger id="payee_id"><SelectValue placeholder={`Select a ${paymentType.includes('Customer') ? 'customer' : 'supplier'}`} /></SelectTrigger>
                                    <SelectContent>
                                        {(paymentType.includes('Supplier') || paymentType.includes('Advanced') ? suppliers : customers).map(p => (
                                            
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name || p.customer_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {isPayeeLoading && <Loader2 className="absolute right-2 top-9 h-4 w-4 animate-spin" />}
                            </div>
                        )}

                        {showPayeeInput && (
                            <div className="space-y-2">
                                <Label htmlFor="payee_name_other">Paid To *</Label>
                                <Input id="payee_name_other" name="payee_name_other" placeholder="e.g. John Doe, Office Supplies Inc." defaultValue={details.payee_name} required />
                            </div>
                        )}

                        {isInvoicePayment && (
                             <div className="space-y-2 relative">
                                <Label htmlFor="invoice_id">Invoice</Label>
                                <Select name="invoice_id" onValueChange={setInvoiceId} value={invoiceId} disabled={!payeeId || isInvoicesLoading}>
                                                                                                        
                                    <SelectTrigger id="invoice_id"><SelectValue placeholder="Select an invoice" /></SelectTrigger>
                                    <SelectContent>
                                    {invoices.map((inv: any) => (
                                        <SelectItem key={inv.id} value={inv.id.toString()}>
                                            {inv.display}
                                        </SelectItem>
                                    ))}
                                        </SelectContent>
                                </Select>
                                {isInvoicesLoading && <Loader2 className="absolute right-2 top-9 h-4 w-4 animate-spin" />}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount *</Label>
                            <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={isInvoicePayment && !!invoiceId} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment_method">Payment Method *</Label>
                            <Select name="payment_method" defaultValue={details.payment_method} required>
                                <SelectTrigger id="payment_method"><SelectValue placeholder="Select Payment Method" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Cheque">Cheque</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="cash_bank_account_id">Payment From (Credit) *</Label>

                            <Select name="cash_bank_account_code" defaultValue={details.cash_bank_account_code} required>

                                <SelectTrigger id="cash_bank_account_id"><SelectValue placeholder="Select a bank/cash account" /></SelectTrigger>
                                <SelectContent>
                                    
                                    {bankAccounts.map(acc => <SelectItem key={acc.gl_account_code} value={acc.gl_account_code.toString()}>{acc.gl_account_code} - {acc.account_name}</SelectItem>)}

                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
    <Label htmlFor="debit_account_id">Payment For (Debit) *</Label>
    <Select 
    name="debit_account_code"
    value={debitAccountCode}
    onValueChange={setDebitAccountCode}
    required
    disabled={
        (paymentType === 'Supplier Payment' ||
         paymentType === 'Advanced Payment' ||
         paymentType === 'Customer Refund') &&
        !!debitAccountCode
    }
>

        <SelectTrigger id="debit_account_id"><SelectValue placeholder="Select a debit account" /></SelectTrigger>
        <SelectContent>
            {debitAccounts.map(acc => <SelectItem key={acc.account_code} value={acc.account_code}>
    {acc.account_code} - {acc.account_name}
</SelectItem>
)}
        </SelectContent>
    </Select>
</div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description / Memo</Label>
                            <Textarea id="description" name="description" placeholder="A brief memo for this payment (e.g., invoice number, purpose)" defaultValue={initialNarration.description} />
                        </div>

                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} {payment ? 'Save Changes' : 'Create Payment'}</Button>
                </CardFooter>
            </form>
        </Card>
    );
};



// ======================================================
// NEW Detail View Component
// ======================================================
const DetailItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="text-sm">{children || '-'}</div>
    </div>
);

const PaymentDetailView = ({ payment, onEdit, onPost, onBack, onDelete, voucherLines, debitAccounts, bankAccounts }: {
    payment: JournalVoucher;
    onEdit: (payment: JournalVoucher) => void;
    onPost: (id: number) => void;
    onBack: () => void;
    onDelete: (id: number) => void;
    voucherLines: JournalVoucherLine[];
    debitAccounts: ChartOfAccount[];
    bankAccounts: BankAccount[];
}) => {
    if (!payment) return null;
    
    const narration: DecodedNarration = payment.narration ? JSON.parse(payment.narration) : { description: '', details: {} };
    const details = narration.details || {};

    const handlePrint = () => { window.print(); };

    const creditAccount = bankAccounts.find(acc => acc.gl_account_code === details.cash_bank_account_code);

    return (
        <div className="printable-area space-y-4">
            {/* Updated: Use `print:hidden` to hide on print */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Payment - {payment.reference}</h2>
                     <Badge variant={payment.status === 'draft' ? 'outline' : 'default'} className={`capitalize ${payment.status === 'posted' ? 'bg-green-500 text-white' : ''}`}>{payment.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handlePrint}><FileText className="mr-2 h-4 w-4" /> Print</Button>
                    {payment.status === 'draft' && <Button onClick={() => onPost(payment.id)} className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Post</Button>}
                    {payment.status === 'draft' && <Button onClick={() => onEdit(payment)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>

            {/* Updated: Use `hidden print:block` to show ONLY on print */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Payment Voucher: {payment.reference}</h1>
                <p>Date: {format(new Date(payment.date), 'dd MMM yyyy')}</p>
            </div>

            <Card>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6">
                    {/* Column 1: Payee and Invoice */}
                    <div className="space-y-6">
                        <DetailItem label="Payment Type">{details.payment_type}</DetailItem>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{details.payment_type?.includes('Supplier') ? 'Supplier' : details.payment_type?.includes('Customer') ? 'Customer' : 'Payee'}</p>
                            <p className="text-sm font-semibold">{details.payee_name || '-'}</p>
                            {details.payee_email && <p className="text-xs text-muted-foreground">{details.payee_email}</p>}
                        </div>
                        <DetailItem label="Linked Bill">{details.invoice_ref || 'No linked bill - General payment'}</DetailItem>
                    </div>

                    {/* Column 2: Payment Details */}
                    <div className="space-y-6">
                         <DetailItem label="Date">{format(new Date(payment.date), 'dd MMM, yyyy')}</DetailItem>
                         <DetailItem label="Reference">{payment.reference}</DetailItem>
                         <DetailItem label="Amount">
                            <span className="font-bold text-lg text-red-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(payment.amount)}</span>
                         </DetailItem>
                         <DetailItem label="Payment Method">{details.payment_method}</DetailItem>
                         <DetailItem label="Cash/Bank Account">{creditAccount ? `${creditAccount.gl_account_code} - ${creditAccount.account_name}` : details.cash_bank_account_id}</DetailItem>
                    </div>

                    {/* Column 3: Fiscal and Memo */}
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Fiscal Period</p>
                            <p className="text-sm">Year: {new Date(payment.date).getFullYear()}</p>
                            <p className="text-sm">Month: {format(new Date(payment.date), 'MMMM')}</p>
                        </div>
                        <DetailItem label="Description">{narration.description}</DetailItem>
                    </div>
                </CardContent>

                {/* Journal Entry Section */}
                {payment.status === 'posted' && voucherLines && voucherLines.length > 0 && (
                    <CardContent className="p-6 border-t">
                        <h3 className="text-lg font-semibold mb-2">Journal Entry</h3>
                        <Table>
                           <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                           <TableBody>
                               {voucherLines.map(line => (
                                   <TableRow key={line.id}>
                                       <TableCell>{line.account_code} - {line.account_name}</TableCell>
                                       <TableCell>{line.description}</TableCell>
                                       <TableCell className="text-right">{Number(line.debit) > 0 ? Number(line.debit).toFixed(2) : '-'}</TableCell>
                                       <TableCell className="text-right">{Number(line.credit) > 0 ? Number(line.credit).toFixed(2) : '-'}</TableCell>
                                   </TableRow>
                               ))}
                           </TableBody>
                        </Table>
                    </CardContent>
                )}

                {/* Audit Info Footer */}
                <CardFooter className="p-6 border-t text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <p className="font-semibold">Created By: {payment.created_by || 'N/A'}</p>
                         <p>{payment.created_at ? format(new Date(payment.created_at), 'dd MMM, yyyy hh:mm a') : ''}</p>
                    </div>
                     <div>
                         <p className="font-semibold">Posted By: {payment.status === 'posted' ? (payment.posted_by || 'N/A') : 'N/A'}</p>
                         <p>{payment.status === 'posted' ? (payment.posted_at ? format(new Date(payment.posted_at), 'dd MMM, yyyy hh:mm a') : 'N/A') : ''}</p>
                    </div>
                </CardFooter>
                {/* Updated: Use `print:hidden` to hide on print */}
                <CardFooter className="flex justify-end p-6 pt-0 print:hidden">
                    {payment.status === 'draft' && <Button variant="destructive" onClick={() => onDelete(payment.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};

// ======================================================
// Main Payments Page Component
// ======================================================
const PaymentsPage = () => {
  const [payments, setPayments] = useState<JournalVoucher[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<JournalVoucher | null>(null);
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  
  const [voucherLines, setVoucherLines] = useState<{[key: number]: JournalVoucherLine[]}>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

// ADD THESE TWO LINES
const [debitAccounts, setDebitAccounts] = useState<ChartOfAccount[]>([]);
const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);


// Add this near the top of your component
const [dialogOpen, setDialogOpen] = useState(false);
const [actionToConfirm, setActionToConfirm] = useState<{action: 'post' | 'delete', id: number, data?: any} | null>(null);

  
  const { toast } = useToast();
  const { user } = useAuth();
const companyId = user?.company_id;
const userId = user?.uid;
  
  const callApi = useCallback(async (url: string, method: string, body: any = null) => {
    if (!companyId || !userId) {
        const errorMsg = 'Authentication credentials not found.';
        toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
        throw new Error(errorMsg);
    }

    const urlWithAuth = new URL(url);
    const searchParams = new URLSearchParams(urlWithAuth.search);
    searchParams.set('company_id', companyId);
    searchParams.set('user_id', userId);
    urlWithAuth.search = searchParams.toString();

    try {
      const options: RequestInit = { method, headers: {} };
      if (body) {
        (options.headers as any)['Content-Type'] = 'application/json';
        options.body = JSON.stringify({ ...body }); // Auth details are now added to URL search params
      }
      const response = await fetch(urlWithAuth.href, options);
      const result = await response.json();

      if (!response.ok || result.error) throw new Error(result.error || 'API request failed');
      return result;

    } catch (error: any) {
      toast({ title: `Error: ${error.message}`, variant: "destructive" });
      throw error;
    }
  }, [companyId, userId, toast]);

  const fetchPayments = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const data = await callApi(API_URL, 'GET');
      setPayments(Array.isArray(data) ? data : []);
    } finally {
      setIsDataLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    if (formMode === 'list') {
      fetchPayments();
    }
  }, [formMode, fetchPayments]);

  useEffect(() => {
    // Fetch accounts once for the whole page
    callApi(`${API_URL}?action=get_bank_accounts`, 'GET').then(setBankAccounts);
    callApi(`${API_URL}?action=get_debit_accounts`, 'GET').then(setDebitAccounts);
  }, [callApi]);



  const executeAction = async (action: 'create' | 'post' | 'update' | 'delete', id?: number, data?: any) => {
    let url = API_URL;
    let method = 'POST';

    if (action === 'create') {
        url += `?action=create`;
    } else if (id) {
        url += `?id=${id}`;
        if (action === 'post') {
            url += `&action=post`;
        }
        method = action === 'update' ? 'PUT' : (action === 'delete' ? 'DELETE' : 'POST');
    } else {
        return; // Or handle error
    }

    setIsLoading(true);
    try {
        const result = await callApi(url, method, data);
        if (result.success) {
            toast({ title: 'Success', description: `Payment successfully ${action}d.` });
            setFormMode('list');
        }
    } finally {
        setIsLoading(false);
    }
};


const handleAction = (action: 'create' | 'post' | 'update' | 'delete', id?: number, data?: any) => {
    // These actions require confirmation
    if ((action === 'post' || action === 'delete') && id !== undefined) {
        setActionToConfirm({ action, id, data });
        setDialogOpen(true);
    } else {
        // These actions can be executed immediately
        executeAction(action, id, data);
    }
};

const onConfirmAction = () => {
    if (actionToConfirm) {
        executeAction(actionToConfirm.action, actionToConfirm.id, actionToConfirm.data);
    }
    // Hide and reset the dialog state
    setDialogOpen(false);
    setActionToConfirm(null);
};

  const toggleRow = async (id: number) => {
    const isExpanded = expandedRows.includes(id);
    if (isExpanded) {
      setExpandedRows(expandedRows.filter(rowId => rowId !== id));
    } else {
      setExpandedRows([...expandedRows, id]);
      if (!voucherLines[id]) {
        const lines = await callApi(`${API_URL}?action=get_voucher_lines&id=${id}`, 'GET');
        setVoucherLines(prev => ({...prev, [id]: lines}));
      }
    }
  }

  const handleAddNew = () => { setFormMode('create'); setSelectedPayment(null); };
  const handleView = (payment: JournalVoucher) => { setFormMode('view'); setSelectedPayment(payment); };
  
  const handleEdit = (payment: JournalVoucher) => { setFormMode('edit'); setSelectedPayment(payment); };
  const handleCancel = () => { setFormMode('list'); };

  // ### Render Logic ###

  if (isDataLoading && formMode === 'list') {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
}

if (formMode === 'view' && selectedPayment) {
  return <PaymentDetailView 
              payment={selectedPayment} 
              onEdit={handleEdit} 
              onPost={(id) => handleAction('post', id)} 
              onBack={handleCancel} 
              onDelete={(id) => handleAction('delete', id)}
              voucherLines={voucherLines[selectedPayment.id] || []}
              debitAccounts={debitAccounts}
              bankAccounts={bankAccounts}
          />;
}

if (formMode === 'create' || formMode === 'edit') {
  return <PaymentForm 
              payment={selectedPayment} 
              onSave={(data) => handleAction(formMode === 'create' ? 'create' : 'update', selectedPayment?.id, data)} 
              onCancel={handleCancel} 
              isLoading={isLoading} 
              callApi={callApi} 
              debitAccounts={debitAccounts}
              bankAccounts={bankAccounts}
          />
}
const messages = {
    post: "Are you sure you want to post this payment? This creates a permanent journal entry.",
    delete: "Are you sure you want to delete this draft payment?"
};

// ### Render Logic ###

if (isDataLoading && formMode === 'list') {
  return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
}

if (formMode === 'view' && selectedPayment) {
  return <PaymentDetailView 
              payment={selectedPayment} 
              onEdit={handleEdit} 
              onPost={(id) => handleAction('post', id)} 
              onBack={handleCancel} 
              onDelete={(id) => handleAction('delete', id)}
              voucherLines={voucherLines[selectedPayment.id] || []}
              debitAccounts={debitAccounts}
              bankAccounts={bankAccounts}
          />;
}

if (formMode === 'create' || formMode === 'edit') {
  return <PaymentForm 
              payment={selectedPayment} 
              onSave={(data) => handleAction(formMode === 'create' ? 'create' : 'update', selectedPayment?.id, data)} 
              onCancel={handleCancel} 
              isLoading={isLoading} 
              callApi={callApi} 
              debitAccounts={debitAccounts}
              bankAccounts={bankAccounts}
          />
}

return (
    <Fragment>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between non-printable">
                <CardTitle>Payments</CardTitle>
                <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Payment</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Payee</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments.length > 0 ? payments.map(p => {
                            const narration: DecodedNarration = p.narration ? JSON.parse(p.narration) : { description: '-', details: {} };
                            const isExpanded = expandedRows.includes(p.id);
      
                            // Find account names for the expanded view
                            const debitAccount = debitAccounts.find(acc => acc.account_code === narration.details.debit_account_code);

                            const creditAccount = bankAccounts.find(acc => acc.gl_account_code === narration.details.cash_bank_account_code);

                            return (
                                <Fragment key={p.id}>
                                    <TableRow>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => toggleRow(p.id)}>
                                                {isExpanded ? <MinusCircle className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell>{format(new Date(p.date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{p.reference}</TableCell>
                                        <TableCell>{narration.details.payee_name}</TableCell>
                                        <TableCell><Badge variant={p.status === 'draft' ? 'outline' : 'default'} className={`capitalize ${p.status === 'posted' ? 'bg-green-500 text-white' : ''}`}>{p.status}</Badge></TableCell>
                                        <TableCell className="text-right font-medium text-red-600">{Number(p.amount).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Actions</Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleView(p)}><FileText className="mr-2 h-4 w-4"/>View Details</DropdownMenuItem>
                                                    {p.status === 'draft' && <DropdownMenuItem onClick={() => handleEdit(p)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>}
                                                    {p.status === 'draft' && <DropdownMenuItem onClick={() => handleAction('post', p.id)}><CheckCircle className="mr-2 h-4 w-4 text-green-500"/>Post</DropdownMenuItem>}
                                                    {p.status === 'draft' && <DropdownMenuItem className="text-red-500" onClick={() => handleAction('delete', p.id)}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="p-2 bg-muted/50">
                                                <div className="p-4 grid grid-cols-3 gap-4 text-sm">
                                                    <div><strong>Debit Account:</strong> {debitAccount?.account_name} ({debitAccount?.account_code})</div>
                                                    <div><strong>Credit Account:</strong> {creditAccount?.account_name} ({creditAccount?.gl_account_code})</div>
                                                    <div><strong>Payment Method:</strong> {narration.details.payment_method}</div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            );
                        }) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No payments found.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {actionToConfirm && messages[actionToConfirm.action]}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirmAction}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Fragment>
  );
};
export default PaymentsPage;
