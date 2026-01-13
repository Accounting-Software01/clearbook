'use client';

import { useState, Fragment, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, MinusCircle, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from 'date-fns';

// Define the type for a payment
interface Payment {
  id: number;
  date: string;
  reference: string;
  payee_name: string;
  payment_type: string;
  cash_bank_account: string; // Credited account code
  cash_bank_account_name?: string;
  debit_account: string; // Debited account code
  debit_account_name?: string;
  amount: number;
  payment_method: string;
  status: 'Draft' | 'Posted';
  description?: string;
  createdBy?: string;
  createdAt?: string;
  fiscalYear?: number;
  period?: string;
}

const PaymentDetailView = ({ payment, onEdit, onPost, onBack, onDelete }: { payment: Payment; onEdit: (payment: Payment) => void; onPost: (id: number) => void; onBack: () => void; onDelete: (id: number) => void; }) => {
    if (!payment) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Payment - {payment.reference}</h2>
                    <Badge variant={payment.status === 'Draft' ? 'outline' : 'default'} className={payment.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{payment.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    {payment.status === 'Draft' && <Button onClick={() => onPost(payment.id)} className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Post Payment</Button>}
                    {payment.status === 'Draft' && <Button onClick={() => onEdit(payment)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Reference:</p>
                                    <p>{payment.reference}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Date:</p>
                                    <p>{format(new Date(payment.date), 'dd MMM yyyy')}</p>

                                    <p className="font-medium text-muted-foreground">Paid To:</p>
                                    <p>{payment.payee_name}</p>

                                    <p className="font-medium text-muted-foreground">Amount:</p>
                                    <p className="font-bold text-red-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(payment.amount)}</p>

                                    <p className="font-medium text-muted-foreground">Payment Method:</p>
                                    <p><Badge variant="secondary">{payment.payment_method}</Badge></p>
                                    
                                    <p className="font-medium text-muted-foreground">Status:</p>
                                    <p><Badge variant={payment.status === 'Draft' ? 'outline' : 'default'}  className={payment.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{payment.status}</Badge></p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{payment.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Accounting Details</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Debit Account:</p>
                                    <div>
                                        <p className="font-bold">{payment.debit_account}</p>
                                        <p>{payment.debit_account_name}</p>
                                        <p className="text-xs text-muted-foreground">DEBIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Credit Account:</p>
                                     <div>
                                        <p className="font-bold">{payment.cash_bank_account}</p>
                                        <p>{payment.cash_bank_account_name}</p>
                                        <p className="text-xs text-muted-foreground">CREDIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Fiscal Year:</p>
                                    <p>{payment.fiscalYear}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Period:</p>
                                    <p>{payment.period}</p>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Created By:</p>
                                    <p>{payment.createdBy || '-'}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Created At:</p>
                                    <p>{payment.createdAt ? format(new Date(payment.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                   {payment.status === 'Draft' && <Button variant="destructive" onClick={() => onDelete(payment.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};


const PaymentsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [paymentsData, setPaymentsData] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const { toast } = useToast();

  // Mock fetching data
  useEffect(() => {
    const mockPayments: Payment[] = [
      {
        id: 1,
        date: "2026-01-13",
        reference: "PAY-20260113-0001",
        payee_name: "Staples Inc.",
        payment_type: "Supplier Payment",
        cash_bank_account: "A10-1010",
        cash_bank_account_name: "Main Bank Account",
        debit_account: "L20-2000",
        debit_account_name: "Accounts Payable",
        amount: 1250.00,
        payment_method: "Bank Transfer",
        status: "Draft",
        description: "Payment for invoice #INV-8872",
        createdAt: "2026-01-13T14:00:00Z",
        createdBy: "finance@example.com",
        fiscalYear: 2026,
        period: "January (1)"
      }
    ];
    setPaymentsData(mockPayments);
  }, []);

  const handleAddNew = () => {
    setFormMode('create');
    setSelectedPayment(null);
  };

  const handleView = (payment: Payment) => {
    setFormMode('view');
    setSelectedPayment(payment);
  };

  const handleEdit = (payment: Payment) => {
    setFormMode('edit');
    setSelectedPayment(payment);
  };

  const handleBackToList = () => {
      setFormMode('list');
      setSelectedPayment(null);
  }

  const handlePost = async (paymentId: number) => {
    toast({ title: "Posting Payment..." });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setPaymentsData(paymentsData.map(p => 
      p.id === paymentId ? { ...p, status: 'Posted' } : p
    ));
    if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment({ ...selectedPayment, status: 'Posted' });
    }
    toast({ title: "Success!", description: "Payment has been posted." });
  };
  
  const handleDelete = async (paymentId: number) => {
    if (confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
        toast({ title: "Deleting Payment..." });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        setPaymentsData(paymentsData.filter(p => p.id !== paymentId));
        handleBackToList();
        toast({ title: "Success!", description: "Payment has been deleted." });
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({ title: "Success!", description: `Payment has been ${formMode === 'create' ? 'created' : 'updated'}.` });
    handleBackToList();
  };
  
  if (formMode === 'view' && selectedPayment) {
    return <PaymentDetailView payment={selectedPayment} onEdit={handleEdit} onPost={handlePost} onBack={handleBackToList} onDelete={handleDelete} />;
  }

  if (formMode === 'create' || formMode === 'edit') {
    const title = formMode === 'create' ? 'Create New Payment' : 'Edit Payment';
    return (
        <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>Fill out the form below to {formMode === 'create' ? 'create a new' : 'update the'} payment record.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="payment-type">Payment Type *</Label>
                        <Select defaultValue={selectedPayment?.payment_type}>
                            <SelectTrigger id="payment-type"><SelectValue placeholder="Select Payment Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Supplier Payment">Supplier Payment</SelectItem>
                                <SelectItem value="Expense Reimbursement">Expense Reimbursement</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input id="date" type="date" defaultValue={selectedPayment?.date || new Date().toISOString().substring(0, 10)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input id="amount" type="number" placeholder="0.00" defaultValue={selectedPayment?.amount} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="payment-method">Payment Method *</Label>
                        <Select defaultValue={selectedPayment?.payment_method}>
                            <SelectTrigger id="payment-method"><SelectValue placeholder="Select Payment Method" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                <SelectItem value="Cheque">Cheque</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="cash-bank-account">Cash/Bank Account *</Label>
                        <Select defaultValue={selectedPayment?.cash_bank_account}>
                            <SelectTrigger id="cash-bank-account"><SelectValue placeholder="Select Account" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="A10-1000">A10-1000 - Cash on Hand</SelectItem>
                                <SelectItem value="A10-1010">A10-1010 - Main Bank Account</SelectItem>
                            </SelectContent>
                        </Select>
                         <p className="text-sm text-muted-foreground">The cash or bank account making the payment.</p>
                    </div>
                     <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" placeholder="Enter description (optional)" maxLength={200} defaultValue={selectedPayment?.description} />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleBackToList}>Cancel</Button>
                  <Button type="submit">{formMode === 'create' ? 'Save Payment' : 'Save Changes'}</Button>
                </div>
              </form>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payments</CardTitle>
            <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Payment</Button>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Payee</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentsData.length > 0 ? paymentsData.map(payment => (
                            <Fragment key={payment.id}>
                                <TableRow>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Actions</Button></DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleView(payment)}>View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(payment)} disabled={payment.status === 'Posted'}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handlePost(payment.id)} disabled={payment.status === 'Posted'}>Post Payment</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(payment.id)} disabled={payment.status === 'Posted'}>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell>{format(new Date(payment.date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell>{payment.reference}</TableCell>
                                    <TableCell>{payment.payee_name}</TableCell>
                                    <TableCell><Badge variant={payment.status === 'Draft' ? 'outline' : 'default'} className={payment.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{payment.status}</Badge></TableCell>
                                    <TableCell className="text-right font-medium text-red-600">{payment.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            </Fragment>
                        )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No payments found.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Showing 1 to {paymentsData.length} of {paymentsData.length} entries</p>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                        <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
                        <PaginationItem><PaginationNext href="#" /></PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </CardContent>
    </Card>
  );
};

export default PaymentsPage;
