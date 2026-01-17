'use client';

import { useState, Fragment, useEffect, useCallback, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, ArrowLeft, Edit, Trash2, CheckCircle, Printer } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

// ======================================================
// TYPES
// ======================================================
interface CompanyInfo {
    company_name: string;
    address: string;
    phone: string;
    email: string;
    logo_path: string;
}

interface Receipt {
  id: number;
  date: string;
  reference: string;
  customer_id: string;
  customer_name: string;
  receipt_type: 'Customer Receipt' | 'Refund' | 'Advance Payment' | 'Other';
  invoice_ids?: number[];
  receipt_account_id: number;
  cash_bank_account: string;
  cash_bank_account_code?: string;
  amount: number;
  payment_method: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  description?: string;
  created_by?: string;
  created_at?: string;
  fiscal_year?: number;
  accounting_period?: string;
  company_info?: CompanyInfo;
}

interface Account {
    id: number;
    account_name: string;
    account_code: string;
    account_type: string;
}

interface Customer {
    customer_id: string;
    customer_name: string;
}

interface Invoice {
    id: number;
    invoice_number: string;
    amount_due: string;
}

// ======================================================
// PRINTABLE VOUCHER COMPONENT
// ======================================================
const PrintableContent = ({ receipt }: { receipt: Receipt | null }) => {
    if (!receipt || !receipt.company_info) return <div className="p-8 text-center">Receipt or company information not available.</div>;
    
    const { company_name, address, phone, email, logo_path } = receipt.company_info;

    return (
        <div className="p-10 font-sans">
            <header className="flex justify-between items-center pb-4 border-b-2 border-gray-800">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{company_name}</h1>
                    <p>{address}</p>
                    <p>Tel: {phone} | Email: {email}</p>
                </div>
                {logo_path && <img src={logo_path} alt="Company Logo" className="h-16 max-w-[200px] object-contain" />}
            </header>
            <main className="mt-8">
                <h2 className="text-2xl font-bold text-center mb-6">Receipt Voucher</h2>
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
                    <div>
                        <p><strong>Voucher No:</strong> {receipt.reference}</p>
                        <p><strong>Date:</strong> {format(new Date(receipt.date), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="text-right">
                        <p><strong>Status:</strong> <span className="font-bold">{receipt.status}</span></p>
                    </div>
                </div>

                <div className="mb-8">
                    <p><strong>Received From:</strong> {receipt.customer_name || '-'}</p>
                    <p><strong>Payment Method:</strong> {receipt.payment_method}</p>
                    <p className="mt-2"><strong>Description:</strong> {receipt.description || '-'}</p>
                </div>

                <div className="border-t border-b border-gray-400 my-6 py-2">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total Amount</span>
                        <span>{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(receipt.amount)}</span>
                    </div>
                </div>
                
                <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                    <div>
                        <p className="border-t border-gray-400 pt-2">Prepared By</p>
                        <p className="mt-4 text-sm">{receipt.created_by}</p>
                    </div>
                    <div><p className="border-t border-gray-400 pt-2">Checked By</p></div>
                    <div><p className="border-t border-gray-400 pt-2">Signature</p></div>
                </div>
            </main>
        </div>
    );
};


// ======================================================
// DETAIL VIEW
// ======================================================
const ReceiptDetailView = ({ receipt, onEdit, onPost, onBack, onDelete, isPosting, onPrintA4 }: { receipt: Receipt | null; onEdit: (receipt: Receipt) => void; onPost: (id: number) => void; onBack: () => void; onDelete: (id: number) => void; isPosting: boolean; onPrintA4: () => void; }) => {
    if (!receipt) return null;
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Receipt - {receipt.reference}</h2>
                    <Badge variant={receipt.status.toLowerCase() === 'draft' ? 'outline' : 'default'} className={receipt.status.toLowerCase() === 'posted' ? 'bg-green-500 text-white' : receipt.status.toLowerCase() === 'reversed' ? 'bg-amber-500 text-white' : ''}>{receipt.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={onPrintA4}><Printer className="mr-2 h-4 w-4"/> Print A4</Button>
                    {receipt.status.toLowerCase() === 'draft' && (
                        <Button onClick={() => onPost(receipt.id)} className="bg-green-600 hover:bg-green-700" disabled={isPosting}>
                            {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Post
                        </Button>
                    )}
                    {receipt.status.toLowerCase() === 'draft' && <Button onClick={() => onEdit(receipt)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>
            <Card>
                 <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                             <div>
                                <h3 className="text-lg font-semibold mb-2">Receipt Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Reference:</p><p>{receipt.reference}</p>
                                    <p className="font-medium text-muted-foreground">Date:</p><p>{format(new Date(receipt.date), 'dd MMM yyyy')}</p>
                                    <p className="font-medium text-muted-foreground">Amount:</p><p className="font-bold text-green-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(receipt.amount)}</p>
                                    <p className="font-medium text-muted-foreground">Type:</p><p>{receipt.receipt_type}</p>
                                    <p className="font-medium text-muted-foreground">Customer:</p><p>{receipt.customer_name || '-'}</p>
                                    <p className="font-medium text-muted-foreground">Payment Method:</p><div><Badge variant="secondary">{receipt.payment_method}</Badge></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{receipt.description || 'No description provided.'}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Accounting Details</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Debit Account:</p>
                                    <div><p className="font-bold">{receipt.cash_bank_account_code}</p><p>{receipt.cash_bank_account}</p></div>
                                    <p className="font-medium text-muted-foreground">Fiscal Year:</p><p>{receipt.fiscal_year || 'N/A'}</p>
                                    <p className="font-medium text-muted-foreground">Period:</p><p>{receipt.accounting_period || 'N/A'}</p>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Created By:</p><p>{receipt.created_by || '-'}</p>
                                    <p className="font-medium text-muted-foreground">Created At:</p><p>{receipt.created_at ? format(new Date(receipt.created_at), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                   {receipt.status.toLowerCase() === 'draft' && <Button variant="destructive" onClick={() => onDelete(receipt.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};


// ======================================================
// CREATE/EDIT FORM
// ======================================================
const ReceiptForm = ({ formMode, selectedReceipt, onSave, onCancel, isSaving, receiptAccounts, customers }: {
    formMode: 'create' | 'edit';
    selectedReceipt: Receipt | null;
    onSave: (event: React.FormEvent<HTMLFormElement>, selectedInvoiceIds: number[]) => void;
    onCancel: () => void;
    isSaving: boolean;
    receiptAccounts: Account[];
    customers: Customer[];
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
    const [isFetchingInvoices, setIsFetchingInvoices] = useState(false);

    const [receiptType, setReceiptType] = useState(selectedReceipt?.receipt_type || 'Customer Receipt');
    const [customerId, setCustomerId] = useState<string | null>(selectedReceipt?.customer_id || null);
    const [amount, setAmount] = useState(selectedReceipt?.amount.toString() || '');
    const [selectedInvoices, setSelectedInvoices] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        if (selectedReceipt?.invoice_ids) {
            selectedReceipt.invoice_ids.forEach(id => { initial[id] = true; });
        }
        return initial;
    });


    useEffect(() => {
        if (receiptType === 'Customer Receipt' && customerId) {
            setIsFetchingInvoices(true);
            fetch(`https://hariindustries.net/api/clearbook/get_customer_unpaid_invoices.php?company_id=${user?.company_id}&customer_id=${customerId}`)
                .then(res => res.json())
                .then(data => {
                    setUnpaidInvoices(data || []);
                    // If editing, ensure the selected invoice amount is calculated
                    if (formMode === 'edit') {
                        recalculateAmount(selectedInvoices, data || []);
                    }
                })
                .catch(() => toast({ variant: 'destructive', title: 'Error fetching invoices' }))
                .finally(() => setIsFetchingInvoices(false));
        } else {
            setUnpaidInvoices([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receiptType, customerId, user?.company_id, toast]);
    
    const recalculateAmount = (currentSelection: Record<number, boolean>, invoices: Invoice[]) => {
        let total = 0;
        for (const id in currentSelection) {
            if (currentSelection[id]) {
                const inv = invoices.find(i => i.id === parseInt(id));
                if (inv) {
                    total += parseFloat(inv.amount_due);
                }
            }
        }
        setAmount(total.toFixed(2));
    };

    const handleInvoiceSelectionChange = (invoiceId: number, isChecked: boolean) => {
        const newSelection = { ...selectedInvoices, [invoiceId]: isChecked };
        setSelectedInvoices(newSelection);
        recalculateAmount(newSelection, unpaidInvoices);
    };
    
    const handleInvoiceChange = (invoiceId: string) => {
        const selectedInvoice = unpaidInvoices.find(inv => inv.id.toString() === invoiceId);
        if (selectedInvoice) {
            setAmount(selectedInvoice.amount_due);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{formMode === 'create' ? 'Create New Receipt' : 'Edit Receipt'}</CardTitle>
                <CardDescription>Fill out the form to record a receipt.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="receipt_type">Receipt Type *</Label>
                            <Select name="receipt_type" value={receiptType} onValueChange={setReceiptType} required>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Customer Receipt">Customer Receipt</SelectItem>
                                    <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                                    <SelectItem value="Refund">Refund</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label htmlFor="date">Date *</Label><Input id="date" name="date" type="date" defaultValue={selectedReceipt?.date ? format(new Date(selectedReceipt.date), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]} required /></div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="customer_id">Customer *</Label>
                        <Select name="customer_id" value={customerId || ''} onValueChange={setCustomerId} required>
                            <SelectTrigger><SelectValue placeholder="Select a customer"/></SelectTrigger>
                            <SelectContent>{(customers || []).map((cust: Customer) => <SelectItem key={cust.customer_id} value={cust.customer_id}>{cust.customer_name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    
                    {receiptType === 'Customer Receipt' && (
                         <div className="space-y-2">
                            <Label htmlFor="invoice_id">Invoice (Optional)</Label>
                            <Select name="invoice_id" onValueChange={handleInvoiceChange} disabled={isFetchingInvoices || unpaidInvoices.length === 0}>
                                <SelectTrigger><SelectValue placeholder={isFetchingInvoices ? 'Loading invoices...' : 'Select an unpaid invoice'}/></SelectTrigger>
                                <SelectContent>{unpaidInvoices.map((inv: Invoice) => <SelectItem key={inv.id} value={inv.id.toString()}>{inv.invoice_number} (Due: {inv.amount_due})</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="amount">Amount *</Label><Input id="amount" name="amount" type="number" placeholder="0.00" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
                        <div className="space-y-2">
                           <Label htmlFor="payment_method">Payment Method *</Label>
                            <Select name="payment_method" defaultValue={selectedReceipt?.payment_method || ''} required><SelectTrigger><SelectValue placeholder="Select Method" /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
                        </div>
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="receipt_account_id">Cash/Bank Account *</Label>
                        <Select name="receipt_account_id" defaultValue={String(selectedReceipt?.receipt_account_id || '')} required><SelectTrigger><SelectValue placeholder="Select Cash/Bank Account" /></SelectTrigger><SelectContent>{receiptAccounts.map((acc: Account) => <SelectItem key={acc.id} value={String(acc.id)}>{acc.account_code} - {acc.account_name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    
                    <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" placeholder="e.g. Payment for invoice #123" defaultValue={selectedReceipt?.description}/></div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
                      <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {formMode === 'create' ? 'Save Draft' : 'Save Changes'}</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

// ======================================================
// MAIN PAGE COMPONENT
// ======================================================
const ReceiptsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [receiptsData, setReceiptsData] = useState<Receipt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const companyId = user?.company_id;
  const userId = user?.uid;

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ content: () => printRef.current });

  const fetchData = useCallback(async (endpoint: string, setter: Function, entityName: string, dataKey?: string) => {
      if (!companyId || !userId) return;
      try {
          const response = await fetch(`https://hariindustries.net/api/clearbook/${endpoint}?company_id=${companyId}&user_id=${userId}`);
          const result = await response.json();
          if (response.ok) {
              const dataToSet = dataKey ? result[dataKey] : result;
              setter(dataToSet || []);
          } else {
              throw new Error(result.error || `Failed to fetch ${entityName}`);
          }
      } catch (error: any) {
          toast({ variant: 'destructive', title: `Error fetching ${entityName}`, description: error.message });
          setter([]); // Ensure state is an array on error
      }
  }, [companyId, userId, toast]);

  const fetchReceipts = useCallback(() => fetchData('receipts.php', (data: any[]) => {
      const parsed = data.map(rec => ({ ...rec, amount: parseFloat(rec.amount) }));
      setReceiptsData(parsed);
  }, 'receipts'), [fetchData]);

  useEffect(() => {
      if(companyId && userId){
          setIsLoading(true);
          Promise.all([
              fetchReceipts(),
              fetchData('get-chart-of-accounts.php', setAccounts, 'accounts'),
              fetchData('get_customers.php', setCustomers, 'customers', 'data'),
          ]).finally(() => setIsLoading(false));
      }
  }, [companyId, userId, fetchReceipts, fetchData]);

  const receiptAccounts = useMemo(() => 
      accounts.filter(acc => acc.account_type === 'Asset' && (acc.account_name.toLowerCase().includes('cash') || acc.account_name.toLowerCase().includes('bank')))
  , [accounts]);

  const handleAddNew = () => { setFormMode('create'); setSelectedReceipt(null); setIsFormOpen(true); };
  const handleView = (receipt: Receipt) => { setFormMode('view'); setSelectedReceipt(receipt); setIsFormOpen(true); };
  const handleEdit = (receipt: Receipt) => { setFormMode('edit'); setSelectedReceipt(receipt); setIsFormOpen(true); };
  const handleCancel = () => setIsFormOpen(false);

  const handleAction = (action: string, receipt: Receipt) => {
    setSelectedReceipt(receipt);
    switch (action) {
        case 'view': handleView(receipt); break;
        case 'edit': handleEdit(receipt); break;
        case 'post': handlePost(receipt.id); break;
        case 'delete': handleDelete(receipt.id); break;
        case 'reverse': handleReverse(receipt.id); break;
        case 'print_a4':
             setTimeout(() => handlePrint(), 0); // Use timeout to ensure state is updated
            break;
        default: break;

    }
  }

  const apiCall = async (url: string, method: string, body?: any) => {
      if (!companyId || !userId) {
          toast({ variant: "destructive", title: "Authentication Error" });
          return null;
      }
      try {
          const options = {
              method,
              headers: body ? { 'Content-Type': 'application/json' } : {},
              body: body ? JSON.stringify({ ...body, company_id: companyId, user_id: userId }) : null
          };
          const response = await fetch(url, options);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'An error occurred');
          return data;
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'API Request Failed', description: error.message });
          return null;
      }
  };

  const handlePost = async (receiptId: number) => {
    // Add a check for companyId and userId
    if (!companyId || !userId) {
        toast({ variant: "destructive", title: "Authentication Error" });
        return;
    }

    setIsPosting(true);

    // Add company_id and user_id to the URL
    const url = `https://hariindustries.net/api/clearbook/receipts.php?action=post&id=${receiptId}&company_id=${companyId}&user_id=${userId}`;
    
    // Use the generic apiCall and pass the updated URL
    const data = await apiCall(url, 'POST');

    if (data) {
        toast({ title: "Success!", description: "Receipt has been posted." });
        fetchReceipts();
        setIsFormOpen(false);
    }
    setIsPosting(false);
};

  const handleDelete = async (receiptId: number) => {
      if (confirm("Are you sure you want to delete this DRAFT receipt?")) {
          const data = await apiCall(`https://hariindustries.net/api/clearbook/receipts.php?id=${receiptId}`, 'DELETE');
          if (data) {
              toast({ title: "Success!", description: "Draft receipt has been deleted." });
              fetchReceipts();
              setIsFormOpen(false);
          }
      }
  };
  
  const handleReverse = async (receiptId: number) => {
      if (confirm("Are you sure you want to reverse this POSTED receipt?")) {
           const data = await apiCall(`https://hariindustries.net/api/clearbook/receipts.php?action=reverse&id=${receiptId}`, 'POST');
           if (data) {
               toast({ title: "Success!", description: "Receipt has been reversed." });
               fetchReceipts();
           }
      }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSaving(true);
      
      const formData = new FormData(event.currentTarget);
      const formValues = Object.fromEntries(formData.entries());
      const payload = { ...formValues, amount: Number(formValues.amount) };

      const isEdit = formMode === 'edit';
      const url = isEdit ? `https://hariindustries.net/api/clearbook/receipts.php?id=${selectedReceipt?.id}` : `https://hariindustries.net/api/clearbook/receipts.php?action=create`;
      const method = isEdit ? 'PUT' : 'POST';

      const data = await apiCall(url, method, payload);
      if (data) {
          toast({ title: "Success!", description: `Draft receipt ${isEdit ? 'updated' : 'created'}.` });
          fetchReceipts();
          setIsFormOpen(false);
      }
      setIsSaving(false);
  };
  
  const renderContent = () => {
    if (isLoading && receiptsData.length === 0) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    
    if (isFormOpen) {
        if (formMode === 'view') {
            return <ReceiptDetailView receipt={selectedReceipt!} onEdit={handleEdit} onPost={handlePost} onBack={handleCancel} onDelete={handleDelete} isPosting={isPosting} onPrintA4={() => handleAction('print_a4', selectedReceipt!)} />;
        }
        return <ReceiptForm formMode={formMode} selectedReceipt={selectedReceipt} onSave={handleSave} onCancel={handleCancel} isSaving={isSaving} receiptAccounts={receiptAccounts} customers={customers} />;
    }
    
    return (
        <Fragment>
            <div style={{ display: 'none' }}><div ref={printRef}>{selectedReceipt && <PrintableContent receipt={selectedReceipt}/>}</div></div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>All Receipts</CardTitle>
                    <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Receipt</Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                             <TableHeader><TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {receiptsData.length > 0 ? receiptsData.map(receipt => (
                                    <TableRow key={receipt.id} onClick={() => handleView(receipt)} className="cursor-pointer">
                                        <TableCell>{format(new Date(receipt.date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{receipt.reference}</TableCell>
                                        <TableCell>{receipt.customer_name}</TableCell>
                                        <TableCell>{receipt.receipt_type}</TableCell>
                                        <TableCell><Badge variant={receipt.status.toLowerCase() === 'draft' ? 'outline' : 'default'} className={`capitalize ${receipt.status.toLowerCase() === 'posted' ? 'bg-green-500 text-white' : receipt.status.toLowerCase() === 'reversed' ? 'bg-amber-500 text-white' : ''}`}>{receipt.status}</Badge></TableCell>
                                        <TableCell className="font-medium text-right">{receipt.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>...</Button></DropdownMenuTrigger>
                                                <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem onClick={() => handleAction('view', receipt)}>View Details</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction('edit', receipt)} disabled={receipt.status.toLowerCase() !== 'draft'}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction('post', receipt)} disabled={receipt.status.toLowerCase() !== 'draft'}>Post to Journal</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleAction('print_a4', receipt)}>Print A4</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleAction('reverse', receipt)} disabled={receipt.status.toLowerCase() !== 'posted'} className="text-amber-600">Reverse</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleAction('delete', receipt)} disabled={receipt.status.toLowerCase() !== 'draft'} className="text-red-600">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No receipts found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </Fragment>
    );
  }
  
  return renderContent();
};

export default ReceiptsPage;
