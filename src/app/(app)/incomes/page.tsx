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
import { Loader2, PlusCircle, MinusCircle, ArrowLeft, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
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

// Define the type for an income for better type-checking
interface Income {
  id: number;
  date: string;
  reference: string;
  received_from: string;
  income_account: string;
  income_account_code?: string;
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

const IncomeDetailView = ({ income, onEdit, onPost, onBack, onDelete }: { income: Income; onEdit: (income: Income) => void; onPost: (id: number) => void; onBack: () => void; onDelete: (id: number) => void; }) => {
    if (!income) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Income - {income.reference}</h2>
                    <Badge variant={income.status === 'Draft' ? 'outline' : 'default'} className={income.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{income.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    {income.status === 'Draft' && <Button onClick={() => onPost(income.id)} className="bg-green-600 hover:bg-green-700"><CheckCircle className="mr-2 h-4 w-4" /> Post Income</Button>}
                    {income.status === 'Draft' && <Button onClick={() => onEdit(income)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Income Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Reference:</p>
                                    <p>{income.reference}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Date:</p>
                                    <p>{format(new Date(income.date), 'dd MMM yyyy')}</p>

                                    <p className="font-medium text-muted-foreground">Amount:</p>
                                    <p className="font-bold text-blue-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(income.amount)}</p>

                                    <p className="font-medium text-muted-foreground">Payment Method:</p>
                                    <p><Badge variant="secondary">{income.payment_method}</Badge></p>

                                    <p className="font-medium text-muted-foreground">Received From:</p>
                                    <p>{income.received_from || '-'}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Status:</p>
                                    <p><Badge variant={income.status === 'Draft' ? 'outline' : 'default'}  className={income.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{income.status}</Badge></p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{income.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Accounting Details</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Income Account:</p>
                                    <div>
                                        <p className="font-bold">{income.income_account_code}</p>
                                        <p>{income.income_account}</p>
                                        <p className="text-xs text-muted-foreground">DEBIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Payment Account:</p>
                                     <div>
                                        <p className="font-bold">{income.payment_account_code}</p>
                                        <p>{income.payment_account}</p>
                                        <p className="text-xs text-muted-foreground">CREDIT</p>
                                    </div>

                                    <p className="font-medium text-muted-foreground">Fiscal Year:</p>
                                    <p>{income.fiscalYear}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Period:</p>
                                    <p>{income.period}</p>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">User Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Created By:</p>
                                    <p>{income.createdBy || '-'}</p>
                                    
                                    <p className="font-medium text-muted-foreground">Created At:</p>
                                    <p>{income.createdAt ? format(new Date(income.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                   {income.status === 'Draft' && <Button variant="destructive" onClick={() => onDelete(income.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};


const IncomesPage = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [incomesData, setIncomesData] = useState<Income[]>([]);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const { toast } = useToast();

  // Mock fetching data
  useEffect(() => {
    const mockIncomes: Income[] = [
      {
        id: 1,
        date: "2026-01-12",
        reference: "INC-20260112-0001",
        received_from: "Client A",
        income_account_code: "I10-4000",
        income_account: "Sales Revenue",
        payment_account_code: "A10-1000",
        payment_account: "Cash on Hand",
        amount: 44444.00,
        payment_method: "Cash",
        status: "Draft",
        description: "Payment for services rendered on invoice #INV-0034.",
        createdAt: "2026-01-12T10:49:00Z",
        createdBy: "admin@example.com",
        fiscalYear: 2026,
        period: "January (1)"
      }
    ];
    setIncomesData(mockIncomes);
  }, []);

  const handleAddNew = () => {
    setFormMode('create');
    setSelectedIncome(null);
    setIsFormOpen(true);
  };

  const handleView = (income: Income) => {
    setFormMode('view');
    setSelectedIncome(income);
    setIsFormOpen(true);
  };

  const handleEdit = (income: Income) => {
    setFormMode('edit');
    setSelectedIncome(income);
    setIsFormOpen(true);
  };

  const handlePost = async (incomeId: number) => {
    toast({ title: "Posting Income...", description: "Creating ledger entries..." });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIncomesData(incomesData.map(inc => 
      inc.id === incomeId ? { ...inc, status: 'Posted' } : inc
    ));
    // Also update the selected income if it's the one being posted
    if (selectedIncome && selectedIncome.id === incomeId) {
        setSelectedIncome({ ...selectedIncome, status: 'Posted' });
    }
    toast({ title: "Success!", description: "Income has been posted to the ledger." });
  };
  
  const handleDelete = async (incomeId: number) => {
    if (confirm("Are you sure you want to delete this income record? This action cannot be undone.")) {
        toast({ title: "Deleting Income...", description: "Removing record permanently." });
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIncomesData(incomesData.filter(inc => inc.id !== incomeId));
        setIsFormOpen(false); // Go back to list after delete
        toast({ title: "Success!", description: "Income has been deleted." });
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    toast({ title: "Success!", description: `Income has been ${formMode === 'create' ? 'created' : 'updated'}.` });
    setIsFormOpen(false);
  };
  
  const toggleRow = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const getFormTitle = () => {
      if (formMode === 'create') return 'Create New Income';
      if (formMode === 'edit') return 'Edit Income';
      return 'View Income Details';
  }

  const renderContent = () => {
    if (!isFormOpen) {
        return (
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">Incomes</h3>
                </div>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>All Incomes</CardTitle>
                        <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Income</Button>
                    </CardHeader>
                    <CardContent>
                        {/* Search and filter can go here */}
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Income Account</TableHead>
                                        <TableHead>Payment Account</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incomesData.length > 0 ? incomesData.map(income => (
                                        <Fragment key={income.id}>
                                            <TableRow>
                                                <TableCell><Button variant="ghost" size="icon" onClick={() => toggleRow(income.id)}>{expandedRow === income.id ? <MinusCircle /> : <PlusCircle />}</Button></TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => handleView(income)}>View Details</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(income)} disabled={income.status === 'Posted'}>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handlePost(income.id)} disabled={income.status === 'Posted'}>Post Income</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(income.id)} disabled={income.status === 'Posted'}>Delete</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                                <TableCell>{new Date(income.date).toLocaleDateString()}</TableCell>
                                                <TableCell>{income.reference}</TableCell>
                                                <TableCell><Badge variant={income.status === 'Draft' ? 'outline' : 'default'} className={income.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{income.status}</Badge></TableCell>
                                                <TableCell className="text-blue-600">{income.income_account}</TableCell>
                                                <TableCell className="text-blue-600">{income.payment_account}</TableCell>
                                            </TableRow>
                                            {expandedRow === income.id && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="p-4 bg-muted/50">
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div><strong>Amount:</strong> {income.amount.toFixed(2)}</div>
                                                            <div><strong>Payment Method:</strong> {income.payment_method}</div>
                                                            <div><strong>Received From:</strong> {income.received_from}</div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No incomes found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">Showing 1 to {incomesData.length} of {incomesData.length} entries</p>
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
        return <IncomeDetailView income={selectedIncome!} onEdit={handleEdit} onPost={handlePost} onBack={() => setIsFormOpen(false)} onDelete={handleDelete} />;
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
              <CardDescription>View, create, or edit an income record. Posting an income will create corresponding ledger entries.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input id="date" type="date" defaultValue={selectedIncome?.date} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input id="amount" type="number" placeholder="0.00" defaultValue={selectedIncome?.amount} />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income-account">Income Account *</Label>
                  <Select defaultValue={selectedIncome?.income_account}>
                    <SelectTrigger id="income-account"><SelectValue placeholder="Select Income Account" /></SelectTrigger>
                    <SelectContent>{/* TODO: Populate with accounts from API */}</SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">This account will be debited.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiving-account">Receiving Account *</Label>
                  <Select defaultValue={selectedIncome?.payment_account}>
                    <SelectTrigger id="receiving-account"><SelectValue placeholder="Select Cash/Bank Account" /></SelectTrigger>
                    <SelectContent>{/* TODO: Populate with accounts from API */}</SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">This account will be credited.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Payment Method *</Label>
                  <Select defaultValue={selectedIncome?.payment_method}>
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
                  <Label htmlFor="received-from">Received From (Optional)</Label>
                  <Input id="received-from" placeholder="Person or entity paid to" defaultValue={selectedIncome?.received_from} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input id="description" placeholder="Additional notes or description" defaultValue={selectedIncome?.description}/>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button type="submit">{formMode === 'create' ? 'Save Income' : 'Save Changes'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
    );
  }
  
  return renderContent();
};

export default IncomesPage;
