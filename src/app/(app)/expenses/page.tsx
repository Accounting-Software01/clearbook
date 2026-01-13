'use client';

import { useState, Fragment, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, MinusCircle, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
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

// Define the type for an expense
interface Expense {
  id: number;
  date: string;
  reference: string;
  paid_to: string;
  expense_account: string;
  expense_account_code?: string;
  payment_account: string;
  payment_account_code?: string;
  amount: number;
  payment_method: string;
  status: 'Draft' | 'Posted';
  description?: string;
  createdBy?: string;
  createdAt?: string;
  fiscalYear?: number;
  period?: string;
}

const ExpenseDetailView = ({ expense, onEdit, onPost, onBack, onDelete }: { expense: Expense; onEdit: (expense: Expense) => void; onPost: (id: number) => void; onBack: () => void; onDelete: (id: number) => void; }) => {
    if (!expense) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Expense - {expense.reference}</h2>
                    <Badge variant={expense.status === 'Draft' ? 'outline' : 'default'} className={expense.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{expense.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    {expense.status === 'Draft' && <Button onClick={() => onPost(expense.id)} className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Post Expense</Button>}
                    {expense.status === 'Draft' && <Button onClick={() => onEdit(expense)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Expense Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Reference:</p>
                                    <p>{expense.reference}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Date:</p>
                                    <p>{format(new Date(expense.date), 'dd MMM yyyy')}</p>

                                    <p className="font-medium text-muted-foreground">Amount:</p>
                                    <p className="font-bold text-red-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(expense.amount)}</p>

                                    <p className="font-medium text-muted-foreground">Payment Method:</p>
                                    <p><Badge variant="secondary">{expense.payment_method}</Badge></p>

                                    <p className="font-medium text-muted-foreground">Paid To:</p>
                                    <p>{expense.paid_to || '-'}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Status:</p>
                                    <p><Badge variant={expense.status === 'Draft' ? 'outline' : 'default'}  className={expense.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{expense.status}</Badge></p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{expense.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Accounting Details</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Expense Account:</p>
                                    <div>
                                        <p className="font-bold">{expense.expense_account_code}</p>
                                        <p>{expense.expense_account}</p>
                                        <p className="text-xs text-muted-foreground">DEBIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Payment Account:</p>
                                     <div>
                                        <p className="font-bold">{expense.payment_account_code}</p>
                                        <p>{expense.payment_account}</p>
                                        <p className="text-xs text-muted-foreground">CREDIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Fiscal Year:</p>
                                    <p>{expense.fiscalYear}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Period:</p>
                                    <p>{expense.period}</p>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Created By:</p>
                                    <p>{expense.createdBy || '-'}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Created At:</p>
                                    <p>{expense.createdAt ? format(new Date(expense.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                   {expense.status === 'Draft' && <Button variant="destructive" onClick={() => onDelete(expense.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};


const ExpensesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [expensesData, setExpensesData] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const { toast } = useToast();

  // Mock fetching data
  useEffect(() => {
    const mockExpenses: Expense[] = [
      {
        id: 1,
        date: "2026-01-15",
        reference: "EXP-20260115-0001",
        paid_to: "Office Supplies Inc.",
        expense_account_code: "E20-6100",
        expense_account: "Office Supplies",
        payment_account_code: "A10-1000",
        payment_account: "Cash on Hand",
        amount: 1500.00,
        payment_method: "Cash",
        status: "Draft",
        description: "Purchase of new office chairs and desks.",
        createdAt: "2026-01-15T11:20:00Z",
        createdBy: "admin@example.com",
        fiscalYear: 2026,
        period: "January (1)"
      }
    ];
    setExpensesData(mockExpenses);
  }, []);

  const handleAddNew = () => {
    setFormMode('create');
    setSelectedExpense(null);
    setIsFormOpen(true);
  };

  const handleView = (expense: Expense) => {
    setFormMode('view');
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setFormMode('edit');
    setSelectedExpense(expense);
    setIsFormOpen(true);
  };

  const handlePost = async (expenseId: number) => {
    toast({ title: "Posting Expense...", description: "Creating ledger entries..." });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setExpensesData(expensesData.map(exp => 
      exp.id === expenseId ? { ...exp, status: 'Posted' } : exp
    ));
    if (selectedExpense && selectedExpense.id === expenseId) {
        setSelectedExpense({ ...selectedExpense, status: 'Posted' });
    }
    toast({ title: "Success!", description: "Expense has been posted to the ledger." });
  };
  
  const handleDelete = async (expenseId: number) => {
    if (confirm("Are you sure you want to delete this expense record? This action cannot be undone.")) {
        toast({ title: "Deleting Expense...", description: "Removing record permanently." });
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExpensesData(expensesData.filter(exp => exp.id !== expenseId));
        setIsFormOpen(false);
        toast({ title: "Success!", description: "Expense has been deleted." });
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({ title: "Success!", description: `Expense has been ${formMode === 'create' ? 'created' : 'updated'}.` });
    setIsFormOpen(false);
  };
  
  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const getFormTitle = () => {
      if (formMode === 'create') return 'Create New Expense';
      if (formMode === 'edit') return 'Edit Expense';
      return 'View Expense Details';
  }

  const renderContent = () => {
    if (!isFormOpen) {
        return (
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Expenses</h3>
                </div>
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
                                            <TableRow>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => toggleRow(expense.id)}>{expandedRow === expense.id ? <MinusCircle /> : <PlusCircle />}</Button></TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleView(expense)}>View Details</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(expense)} disabled={expense.status === 'Posted'}>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handlePost(expense.id)} disabled={expense.status === 'Posted'}>Post Expense</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(expense.id)} disabled={expense.status === 'Posted'}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                                <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                                <TableCell>{expense.reference}</TableCell>
                                                <TableCell><Badge variant={expense.status === 'Draft' ? 'outline' : 'default'} className={expense.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{expense.status}</Badge></TableCell>
                                                <TableCell className="text-red-600">{expense.expense_account}</TableCell>
                                                <TableCell className="text-blue-600">{expense.payment_account}</TableCell>
                                            </TableRow>
                                            {expandedRow === expense.id && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="p-4 bg-muted/50">
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div><strong>Amount:</strong> {expense.amount.toFixed(2)}</div>
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
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">Showing 1 to {expensesData.length} of {expensesData.length} entries</p>
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
            </div>
        );
    }
    
    if (formMode === 'view') {
        return <ExpenseDetailView expense={selectedExpense!} onEdit={handleEdit} onPost={handlePost} onBack={() => setIsFormOpen(false)} onDelete={handleDelete} />;
    }

    // Render Create/Edit Form
    return (
        <div>
          <Button variant="outline" onClick={() => setIsFormOpen(false)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to List
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>{getFormTitle()}</CardTitle>
              <CardDescription>View, create, or edit an expense record. Posting an expense will create corresponding ledger entries.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input id="date" type="date" defaultValue={selectedExpense?.date} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input id="amount" type="number" placeholder="0.00" defaultValue={selectedExpense?.amount} />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-account">Expense Account *</Label>
                  <Select defaultValue={selectedExpense?.expense_account}>
                    <SelectTrigger id="expense-account"><SelectValue placeholder="Select Expense Account" /></SelectTrigger>
                    <SelectContent>{/* TODO: Populate with accounts from API */}</SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">This account will be debited.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-account">Payment Account *</Label>
                  <Select defaultValue={selectedExpense?.payment_account}>
                    <SelectTrigger id="payment-account"><SelectValue placeholder="Select Cash/Bank Account" /></SelectTrigger>
                    <SelectContent>{/* TODO: Populate with accounts from API */}</SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">This account will be credited.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method *</Label>
                  <Select defaultValue={selectedExpense?.payment_method}>
                    <SelectTrigger id="payment-method"><SelectValue placeholder="Select Payment Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid-to">Paid To (Optional)</Label>
                  <Input id="paid-to" placeholder="Person or entity paid to" defaultValue={selectedExpense?.paid_to} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input id="description" placeholder="Additional notes or description" defaultValue={selectedExpense?.description}/>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button type="submit">{formMode === 'create' ? 'Save Expense' : 'Save Changes'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
    );
  }
  
  return renderContent();
};

export default ExpensesPage;
