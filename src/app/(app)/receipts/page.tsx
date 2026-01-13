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

// Define the type for a receipt
interface Receipt {
  id: number;
  date: string;
  reference: string;
  customer_name: string;
  receipt_type: string;
  cash_bank_account: string; // This would ideally be a code/ID
  cash_bank_account_name?: string;
  amount: number;
  payment_method: string;
  status: 'Draft' | 'Posted';
  description?: string;
  createdBy?: string;
  createdAt?: string;
  fiscalYear?: number;
  period?: string;
}

const ReceiptDetailView = ({ receipt, onEdit, onPost, onBack, onDelete }: { receipt: Receipt; onEdit: (receipt: Receipt) => void; onPost: (id: number) => void; onBack: () => void; onDelete: (id: number) => void; }) => {
    if (!receipt) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Receipt - {receipt.reference}</h2>
                    <Badge variant={receipt.status === 'Draft' ? 'outline' : 'default'} className={receipt.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{receipt.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    {receipt.status === 'Draft' && <Button onClick={() => onPost(receipt.id)} className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Post Receipt</Button>}
                    {receipt.status === 'Draft' && <Button onClick={() => onEdit(receipt)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Receipt Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Reference:</p>
                                    <p>{receipt.reference}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Date:</p>
                                    <p>{format(new Date(receipt.date), 'dd MMM yyyy')}</p>

                                    <p className="font-medium text-muted-foreground">Customer:</p>
                                    <p>{receipt.customer_name}</p>

                                    <p className="font-medium text-muted-foreground">Amount:</p>
                                    <p className="font-bold text-green-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(receipt.amount)}</p>

                                    <p className="font-medium text-muted-foreground">Payment Method:</p>
                                    <p><Badge variant="secondary">{receipt.payment_method}</Badge></p>
                                    
                                    <p className="font-medium text-muted-foreground">Status:</p>
                                    <p><Badge variant={receipt.status === 'Draft' ? 'outline' : 'default'}  className={receipt.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{receipt.status}</Badge></p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{receipt.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Accounting Details</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Debit Account:</p>
                                    <div>
                                        <p className="font-bold">{receipt.cash_bank_account}</p>
                                        <p>{receipt.cash_bank_account_name || 'Cash/Bank'}</p>
                                        <p className="text-xs text-muted-foreground">DEBIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Credit Account:</p>
                                     <div>
                                        <p className="font-bold">1200</p> {/* Example Account */} 
                                        <p>Accounts Receivable</p>
                                        <p className="text-xs text-muted-foreground">CREDIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Fiscal Year:</p>
                                    <p>{receipt.fiscalYear}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Period:</p>
                                    <p>{receipt.period}</p>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Created By:</p>
                                    <p>{receipt.createdBy || '-'}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Created At:</p>
                                    <p>{receipt.createdAt ? format(new Date(receipt.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                   {receipt.status === 'Draft' && <Button variant="destructive" onClick={() => onDelete(receipt.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};


const ReceiptsPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [receiptsData, setReceiptsData] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const { toast } = useToast();

  // Mock fetching data
  useEffect(() => {
    const mockReceipts: Receipt[] = [
      {
        id: 1,
        date: "2026-01-13",
        reference: "RCT-20260113-0001",
        customer_name: "Walk-in Customer",
        receipt_type: "Customer Payment",
        cash_bank_account: "A10-1000",
        cash_bank_account_name: "Cash on Hand",
        amount: 500.00,
        payment_method: "Cash",
        status: "Draft",
        description: "Cash payment for items purchased.",
        createdAt: "2026-01-13T09:30:00Z",
        createdBy: "cashier@example.com",
        fiscalYear: 2026,
        period: "January (1)"
      }
    ];
    setReceiptsData(mockReceipts);
  }, []);

  const handleAddNew = () => {
    setFormMode('create');
    setSelectedReceipt(null);
    setIsFormOpen(true);
  };

  const handleView = (receipt: Receipt) => {
    setFormMode('view');
    setSelectedReceipt(receipt);
    setIsFormOpen(true);
  };

  const handleEdit = (receipt: Receipt) => {
    setFormMode('edit');
    setSelectedReceipt(receipt);
    setIsFormOpen(true);
  };

  const handlePost = async (receiptId: number) => {
    toast({ title: "Posting Receipt...", description: "Creating ledger entries..." });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setReceiptsData(receiptsData.map(rec => 
      rec.id === receiptId ? { ...rec, status: 'Posted' } : rec
    ));
    if (selectedReceipt && selectedReceipt.id === receiptId) {
        setSelectedReceipt({ ...selectedReceipt, status: 'Posted' });
    }
    toast({ title: "Success!", description: "Receipt has been posted." });
  };
  
  const handleDelete = async (receiptId: number) => {
    if (confirm("Are you sure you want to delete this receipt? This action cannot be undone.")) {
        toast({ title: "Deleting Receipt..." });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        setReceiptsData(receiptsData.filter(rec => rec.id !== receiptId));
        setIsFormOpen(false);
        toast({ title: "Success!", description: "Receipt has been deleted." });
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({ title: "Success!", description: `Receipt has been ${formMode === 'create' ? 'created' : 'updated'}.` });
    setIsFormOpen(false);
  };
  
  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const getFormTitle = () => {
      if (formMode === 'create') return 'Create New Receipt';
      if (formMode === 'edit') return 'Edit Receipt';
      return 'View Receipt Details';
  }

  const renderContent = () => {
    if (!isFormOpen) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Receipts</CardTitle>
                    <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Receipt</Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receiptsData.length > 0 ? receiptsData.map(receipt => (
                                    <Fragment key={receipt.id}>
                                        <TableRow>
                                            <TableCell><Button variant="ghost" size="icon" onClick={() => toggleRow(receipt.id)}>{expandedRow === receipt.id ? <MinusCircle /> : <PlusCircle />}</Button></TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Actions</Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleView(receipt)}>View Details</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(receipt)} disabled={receipt.status === 'Posted'}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handlePost(receipt.id)} disabled={receipt.status === 'Posted'}>Post Receipt</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(receipt.id)} disabled={receipt.status === 'Posted'}>Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell>{format(new Date(receipt.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{receipt.reference}</TableCell>
                                            <TableCell>{receipt.customer_name}</TableCell>
                                            <TableCell><Badge variant={receipt.status === 'Draft' ? 'outline' : 'default'} className={receipt.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{receipt.status}</Badge></TableCell>
                                            <TableCell className="text-right font-medium">{receipt.amount.toFixed(2)}</TableCell>
                                        </TableRow>
                                        {expandedRow === receipt.id && (
                                            <TableRow className="bg-muted/50">
                                                <TableCell colSpan={7} className="p-4">
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div><strong>Receipt Type:</strong> {receipt.receipt_type}</div>
                                                        <div><strong>Payment Method:</strong> {receipt.payment_method}</div>
                                                        <div><strong>Account:</strong> {receipt.cash_bank_account_name} ({receipt.cash_bank_account})</div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No receipts found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">Showing 1 to {receiptsData.length} of {receiptsData.length} entries</p>
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
    }
    
    if (formMode === 'view') {
        return <ReceiptDetailView receipt={selectedReceipt!} onEdit={handleEdit} onPost={handlePost} onBack={() => setIsFormOpen(false)} onDelete={handleDelete} />;
    }

    // Render Create/Edit Form
    return (
        <Card>
            <CardHeader>
              <CardTitle>{getFormTitle()}</CardTitle>
              <CardDescription>Fill out the form to {formMode === 'create' ? 'create a new' : 'update the'} receipt.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Form fields from your previous request */}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit">{formMode === 'create' ? 'Save Receipt' : 'Save Changes'}</Button>
                </div>
              </form>
            </CardContent>
        </Card>
    );
  }
  
  return renderContent();
};

export default ReceiptsPage;
