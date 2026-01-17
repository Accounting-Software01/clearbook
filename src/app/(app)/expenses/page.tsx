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
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, MinusCircle, ArrowLeft, Edit, Trash2, CheckCircle, MoreVertical, Printer } from 'lucide-react';
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

// TYPES
interface CompanyInfo {
    company_name: string;
    address: string;
    phone: string;
    email: string;
    logo_path: string;
}

interface Expense {
  id: number;
  date: string;
  reference: string;
  paid_to: string;
  expense_account_id: number;
  expense_account: string;
  expense_account_code?: string;
  payment_account_id: number;
  payment_account: string;
  payment_account_code?: string;
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

// PRINTABLE COMPONENT
const PrintableContent = ({ expense }: { expense: Expense }) => {
    if (!expense?.company_info) return <div className="p-8 text-center">Company information not available.</div>;
    
    const { company_name, address, phone, email, logo_path } = expense.company_info;

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
                <h2 className="text-2xl font-bold text-center mb-6">Expense Voucher</h2>
                <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8">
                    <div>
                        <p><strong>Voucher No:</strong> {expense.reference}</p>
                        <p><strong>Date:</strong> {format(new Date(expense.date), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="text-right">
                        <p><strong>Status:</strong> <span className="font-bold">{expense.status}</span></p>
                    </div>
                </div>

                <div className="mb-8">
                    <p><strong>Paid To:</strong> {expense.paid_to || '-'}</p>
                    <p><strong>Payment Method:</strong> {expense.payment_method}</p>
                    <p className="mt-2"><strong>Description:</strong> {expense.description || '-'}</p>
                </div>

                <div className="border-t border-b border-gray-400 my-6 py-2">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total Amount</span>
                        <span>{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(expense.amount)}</span>
                    </div>
                </div>
                
                <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                    <div>
                        <p className="border-t border-gray-400 pt-2">Prepared By</p>
                        <p className="mt-4 text-sm">{expense.created_by}</p>
                    </div>
                    <div><p className="border-t border-gray-400 pt-2">Checked By</p></div>
                    <div><p className="border-t border-gray-400 pt-2">Received By</p></div>
                </div>
            </main>
        </div>
    );
};


// DETAIL VIEW
const ExpenseDetailView = ({ expense, onEdit, onPost, onBack, onDelete, isPosting, onPrintA4 }: { expense: Expense; onEdit: (expense: Expense) => void; onPost: (id: number) => void; onBack: () => void; onDelete: (id: number) => void; isPosting: boolean; onPrintA4: () => void; }) => {
    if (!expense) return null;
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Expense - {expense.reference}</h2>
                    <Badge variant={expense.status.toLowerCase() === 'draft' ? 'outline' : 'default'} className={expense.status.toLowerCase() === 'posted' ? 'bg-green-500 text-white' : expense.status.toLowerCase() === 'reversed' ? 'bg-amber-500 text-white' : ''}>{expense.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={onPrintA4}><Printer className="mr-2 h-4 w-4"/> Print A4</Button>
                    {expense.status.toLowerCase() === 'draft' && (
                        <Button onClick={() => onPost(expense.id)} className="bg-green-600 hover:bg-green-700" disabled={isPosting}>
                            {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Post
                        </Button>
                    )}
                    {expense.status.toLowerCase() === 'draft' && <Button onClick={() => onEdit(expense)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Expense Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Reference:</p><p>{expense.reference}</p>
                                    <p className="font-medium text-muted-foreground">Date:</p><p>{format(new Date(expense.date), 'dd MMM yyyy')}</p>
                                    <p className="font-medium text-muted-foreground">Amount:</p><p className="font-bold text-red-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(expense.amount)}</p>
                                    <p className="font-medium text-muted-foreground">Payment Method:</p><p><Badge variant="secondary">{expense.payment_method}</Badge></p>
                                    <p className="font-medium text-muted-foreground">Paid To:</p><p>{expense.paid_to || '-'}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{expense.description || 'No description provided.'}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Accounting Details</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Expense Account:</p>
                                    <div><p className="font-bold">{expense.expense_account_code}</p><p>{expense.expense_account}</p><p className="text-xs text-muted-foreground">DEBIT</p></div>
                                    <p className="font-medium text-muted-foreground">Payment Account:</p>
                                    <div><p className="font-bold">{expense.payment_account_code}</p><p>{expense.payment_account}</p><p className="text-xs text-muted-foreground">CREDIT</p></div>
                                    <p className="font-medium text-muted-foreground">Fiscal Year:</p><p>{expense.fiscal_year || 'N/A'}</p>
                                    <p className="font-medium text-muted-foreground">Period:</p><p>{expense.accounting_period || 'N/A'}</p>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Created By:</p><p>{expense.created_by || '-'}</p>
                                    <p className="font-medium text-muted-foreground">Created At:</p><p>{expense.created_at ? format(new Date(expense.created_at), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                   {expense.status.toLowerCase() === 'draft' && <Button variant="destructive" onClick={() => onDelete(expense.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};


const ExpensesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const companyId = user?.company_id;
  const userId = user?.uid;

  // PRINTING
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
      content: () => printRef.current,
  });

  const fetchExpenses = useCallback(async () => {
      if (!companyId || !userId) return;
      setIsLoading(true);
      try {
          const response = await fetch(`https://hariindustries.net/api/clearbook/expenses.php?company_id=${companyId}&user_id=${userId}`);
          const data = await response.json();
          if (response.ok) {
              const parsedExpenses = data.map((exp: any) => ({ ...exp, amount: parseFloat(exp.amount) }));
              setExpensesData(parsedExpenses);
          } else {
              throw new Error(data.error || 'Failed to fetch expenses');
          }
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error fetching expenses', description: error.message });
      } finally {
          setIsLoading(false);
      }
  }, [companyId, userId, toast]);

  const fetchAccounts = useCallback(async () => {
      if (!companyId || !userId) return;
      try {
          const response = await fetch(`https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${companyId}&user_id=${userId}`);
          const data = await response.json();
          if (response.ok) setAccounts(data);
          else throw new Error(data.error || 'Failed to fetch accounts');
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error fetching accounts', description: error.message });
      }
  }, [companyId, userId, toast]);

  useEffect(() => {
      if(companyId && userId){
          fetchExpenses();
          fetchAccounts();
      }
  }, [companyId, userId, fetchExpenses, fetchAccounts]);

  const expenseAccounts = useMemo(() => accounts.filter(acc => acc.account_type === 'Expense'), [accounts]);
  const paymentAccounts = useMemo(() => 
      accounts.filter(acc => acc.account_type === 'Asset' && (acc.account_name.toLowerCase().includes('cash') || acc.account_name.toLowerCase().includes('bank')))
  , [accounts]);

  const handleAddNew = () => { setFormMode('create'); setSelectedExpense(null); setIsFormOpen(true); };
  const handleView = (expense: Expense) => { setFormMode('view'); setSelectedExpense(expense); setIsFormOpen(true); };
  const handleEdit = (expense: Expense) => { setFormMode('edit'); setSelectedExpense(expense); setIsFormOpen(true); };

  const handleAction = (action: string, expense: Expense) => {
    setSelectedExpense(expense);
    switch (action) {
        case 'view': handleView(expense); break;
        case 'edit': handleEdit(expense); break;
        case 'post': handlePost(expense.id); break;
        case 'delete': handleDelete(expense.id); break;
        case 'reverse': handleReverse(expense.id); break;
        case 'print_a4':
             setTimeout(() => handlePrint(), 0);
            break;
        case 'print_pos':
            toast({ title: "Feature not available", description: "POS printing is not yet implemented." });
            break;
        default: break;
    }
  }

  const handlePost = async (expenseId: number) => {
      if (!companyId || !userId) return toast({ variant: "destructive", title: "Authentication Error" });
      setIsPosting(true);
      try {
          const response = await fetch(`https://hariindustries.net/api/clearbook/expenses.php?action=post&id=${expenseId}&company_id=${companyId}&user_id=${userId}`, { method: 'POST' });
          const data = await response.json();
          if (response.ok && data.success) {
              toast({ title: "Success!", description: "Expense has been posted." });
              fetchExpenses();
              setIsFormOpen(false);
          } else {
              throw new Error(data.error || 'Failed to post expense');
          }
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Posting Failed', description: error.message });
      } finally {
          setIsPosting(false);
      }
  };

  const handleDelete = async (expenseId: number) => {
      if (!companyId || !userId) return toast({ variant: "destructive", title: "Authentication Error" });
      if (confirm("Are you sure you want to delete this DRAFT expense? This action cannot be undone.")) {
          try {
              const response = await fetch(`https://hariindustries.net/api/clearbook/expenses.php?action=delete&id=${expenseId}&company_id=${companyId}`, { method: 'DELETE' });
              const data = await response.json();
              if (response.ok && data.success) {
                  toast({ title: "Success!", description: "Draft expense has been deleted." });
                  fetchExpenses();
                  setIsFormOpen(false);
              } else {
                  throw new Error(data.error || 'Failed to delete expense');
              }
          } catch (error: any) {
              toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
          }
      }
  };
  
  const handleReverse = async (expenseId: number) => {
      if (!companyId || !userId) return toast({ variant: "destructive", title: "Authentication Error" });
      if (confirm("Are you sure you want to reverse this POSTED expense? This will create a new journal entry to counteract it.")) {
          try {
              const response = await fetch(`https://hariindustries.net/api/clearbook/expenses.php?action=reverse&id=${expenseId}&company_id=${companyId}&user_id=${userId}`, { method: 'POST' });
              const data = await response.json();
              if (response.ok && data.success) {
                  toast({ title: "Success!", description: "Expense has been reversed." });
                  fetchExpenses();
              } else {
                  throw new Error(data.error || 'Failed to reverse expense');
              }
          } catch (error: any) {
              toast({ variant: 'destructive', title: 'Reversal Failed', description: error.message });
          }
      }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!companyId || !userId) return toast({ variant: "destructive", title: "Authentication Error" });
      
      setIsSaving(true);
      const formData = new FormData(event.currentTarget);
      const formValues = Object.fromEntries(formData.entries());
      const payload = { ...formValues, amount: Number(formValues.amount), company_id: companyId, user_id: userId };

      const isEdit = formMode === 'edit';
      const url = isEdit ? `https://hariindustries.net/api/clearbook/expenses.php?action=update&id=${selectedExpense?.id}` : `https://hariindustries.net/api/clearbook/expenses.php?action=create`;
      const method = isEdit ? 'PUT' : 'POST';

      try {
          const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const data = await response.json();
          if (response.ok) {
              toast({ title: "Success!", description: `Draft expense ${isEdit ? 'updated' : 'created'}.` });
              fetchExpenses();
              setIsFormOpen(false);
          } else {
              throw new Error(data.error || 'Save operation failed');
          }
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
      } finally {
          setIsSaving(false);
      }
  };
  
  const toggleRow = (id: number) => setExpandedRow(expandedRow === id ? null : id);

  const getFormTitle = () => formMode === 'create' ? 'Create New Expense' : 'Edit Expense';

  const renderContent = () => {
    if (isLoading && expensesData.length === 0) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    
    if (isFormOpen) {
        if (formMode === 'view') {
            return <ExpenseDetailView expense={selectedExpense!} onEdit={handleEdit} onPost={handlePost} onBack={() => setIsFormOpen(false)} onDelete={handleDelete} isPosting={isPosting} onPrintA4={() => handleAction('print_a4', selectedExpense!)} />;
        }
        // RENDER CREATE/EDIT FORM
        return (
            <Card>
              <CardHeader>
                <CardTitle>{getFormTitle()}</CardTitle>
                <CardDescription>All fields are required. Posting an expense will create corresponding ledger entries.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Back to List</Button>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label htmlFor="date">Date *</Label><Input id="date" name="date" type="date" defaultValue={selectedExpense?.date ? format(new Date(selectedExpense.date), 'yyyy-MM-dd') : ''} required /></div>
                      <div className="space-y-2"><Label htmlFor="amount">Amount *</Label><Input id="amount" name="amount" type="number" placeholder="0.00" step="0.01" defaultValue={selectedExpense?.amount} required /></div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_account_id">Expense Account *</Label>
                    <Select name="expense_account_id" defaultValue={String(selectedExpense?.expense_account_id || '')} required><SelectTrigger><SelectValue placeholder="Select Expense Account" /></SelectTrigger><SelectContent>{expenseAccounts.map(acc => <SelectItem key={acc.id} value={String(acc.id)}>{acc.account_code} - {acc.account_name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_account_id">Payment Account *</Label>
                    <Select name="payment_account_id" defaultValue={String(selectedExpense?.payment_account_id || '')} required><SelectTrigger><SelectValue placeholder="Select Cash/Bank Account" /></SelectTrigger><SelectContent>{paymentAccounts.map(acc => <SelectItem key={acc.id} value={String(acc.id)}>{acc.account_code} - {acc.account_name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method *</Label>
                    <Select name="payment_method" defaultValue={selectedExpense?.payment_method || ''} required><SelectTrigger><SelectValue placeholder="Select Payment Method" /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label htmlFor="paid_to">Paid To</Label><Input id="paid_to" name="paid_to" placeholder="Person or entity paid to" defaultValue={selectedExpense?.paid_to} /></div>
                  <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" name="description" placeholder="Additional notes or description" defaultValue={selectedExpense?.description}/></div>
                  <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                      <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {formMode === 'create' ? 'Save Draft' : 'Save Changes'}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
        );
    }
    
    return (
        <Fragment>
            <div style={{ display: 'none' }}><div ref={printRef}>{selectedExpense && <PrintableContent expense={selectedExpense}/>}</div></div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>All Expenses</CardTitle>
                    <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Expense</Button>
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
                                    <TableHead>Status</TableHead>
                                    <TableHead>Expense Account</TableHead>
                                    <TableHead>Payment Account</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expensesData.length > 0 ? expensesData.map(expense => (
                                    <Fragment key={expense.id}>
                                        <TableRow onClick={() => setSelectedExpense(expense)} className="cursor-pointer">
                                            <TableCell><Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); toggleRow(expense.id)}}>{expandedRow === expense.id ? <MinusCircle /> : <PlusCircle />}</Button></TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="outline" onClick={(e) => e.stopPropagation()}>Actions</Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenuItem onClick={() => handleAction('view', expense)}>View Details</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAction('edit', expense)} disabled={expense.status.toLowerCase() !== 'draft'}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAction('post', expense)} disabled={expense.status.toLowerCase() !== 'draft'}>Post to Journal</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleAction('print_a4', expense)}><Printer className="mr-2 h-4 w-4" /> Print A4</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAction('print_pos', expense)}><Printer className="mr-2 h-4 w-4" /> Print POS</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleAction('reverse', expense)} disabled={expense.status.toLowerCase() !== 'posted'} className="text-amber-600">Reverse</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAction('delete', expense)} disabled={expense.status.toLowerCase() !== 'draft'} className="text-red-600">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell>{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{expense.reference}</TableCell>
                                            <TableCell><Badge variant={expense.status.toLowerCase() === 'draft' ? 'outline' : 'default'} className={expense.status.toLowerCase() === 'posted' ? 'bg-green-500 text-white' : expense.status.toLowerCase() === 'reversed' ? 'bg-amber-500 text-white' : ''}>{expense.status}</Badge></TableCell>
                                            <TableCell className="text-red-600">{expense.expense_account}</TableCell>
                                            <TableCell className="text-blue-600">{expense.payment_account}</TableCell>
                                        </TableRow>
                                        {expandedRow === expense.id && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="p-4 bg-muted/50">
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div><strong>Amount:</strong> {typeof expense.amount === 'number' ? expense.amount.toFixed(2) : 'N/A'}</div>
                                                        <div><strong>Payment Method:</strong> {expense.payment_method}</div>
                                                        <div><strong>Paid To:</strong> {expense.paid_to}</div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No expenses found.</TableCell></TableRow>}
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

export default ExpensesPage;
