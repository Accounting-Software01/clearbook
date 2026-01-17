'use client';

import { useState, Fragment, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Assuming useAuth hook provides company_id
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, MinusCircle, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { format, parseISO } from 'date-fns';

// Matches the backend structure
interface Income {
  id: number;
  date: string;
  reference: string;
  received_from: string | null;
  income_account: string;
  income_account_code: string | null;
  payment_account: string;
  payment_account_code: string | null;
  amount: number;
  payment_method: string | null;
  status: 'draft' | 'posted';
  description?: string;
  createdBy?: string;
  createdAt?: string;
}

interface Account {
    id: number;
    account_code: string;
    account_name: string;
    account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

const IncomeDetailView = ({ income, onEdit, onPost, onBack, onDelete, isPosting }: { income: Income; onEdit: (income: Income) => void; onPost: (id: number) => void; onBack: () => void; onDelete: (id: number) => void; isPosting: boolean; }) => {
    if (!income) return null;
    const isDraft = income.status === 'draft';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">Income - {income.reference}</h2>
                    <Badge variant={isDraft ? 'outline' : 'default'} className={income.status === 'posted' ? 'bg-green-500 text-white capitalize' : 'capitalize'}>{income.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    {isDraft && <Button onClick={() => onPost(income.id)} className="bg-green-600 hover:bg-green-700" disabled={isPosting}>
                        {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Post Income
                    </Button>}
                    {isDraft && <Button onClick={() => onEdit(income)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>}
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Income Information</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Reference:</p><p>{income.reference}</p>
                                    <p className="font-medium text-muted-foreground">Date:</p><p>{format(parseISO(income.date), 'dd MMM yyyy')}</p>
                                    <p className="font-medium text-muted-foreground">Amount:</p><p className="font-bold text-blue-600">{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(income.amount)}</p>
                                    <p className="font-medium text-muted-foreground">Payment Method:</p><p><Badge variant="secondary">{income.payment_method || 'N/A'}</Badge></p>
                                    <p className="font-medium text-muted-foreground">Received From:</p><p>{income.received_from || '-'}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Description</h3>
                                <p className="text-sm text-muted-foreground">{income.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Accounting Details</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    {/* CORRECTED: Payment Account (Asset) is DEBITED */}
                                    <p className="font-medium text-muted-foreground">Payment Account:</p>
                                    <div>
                                        <p className="font-bold">{income.payment_account_code}</p>
                                        <p>{income.payment_account}</p>
                                        <p className="text-xs text-green-600 font-semibold">DEBIT</p>
                                    </div>

                                    {/* CORRECTED: Income Account (Revenue) is CREDITED */}
                                    <p className="font-medium text-muted-foreground">Income Account:</p>
                                    <div>
                                        <p className="font-bold">{income.income_account_code}</p>
                                        <p>{income.income_account}</p>
                                        <p className="text-xs text-orange-600 font-semibold">CREDIT</p>
                                    </div>
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold mb-2">Audit Trail</h3>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <p className="font-medium text-muted-foreground">Created By:</p><p>{income.createdBy || '-'}</p>
                                    <p className="font-medium text-muted-foreground">Created At:</p><p>{income.createdAt ? format(parseISO(income.createdAt), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6">
                   {isDraft && <Button variant="destructive" onClick={() => onDelete(income.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>}
                </CardFooter>
            </Card>
        </div>
    );
};

const IncomesPage = () => {
  const { user } = useAuth(); // Use the auth hook
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [incomesData, setIncomesData] = useState<Income[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const companyId = user?.company_id;
  const userId = user?.uid; // <-- Add this line

  const fetchIncomes = useCallback(async () => {
    // Depend on both companyId and userId
    if (!companyId || !userId) return;
    setIsLoading(true);
    try {
        // Add userId to the fetch URL
        const response = await fetch(`https://hariindustries.net/api/clearbook/incomes.php?company_id=${companyId}&user_id=${userId}`);
        const data = await response.json();
        if (response.ok) {
            setIncomesData(data);
        } else {
            throw new Error(data.error || 'Failed to fetch incomes');
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsLoading(false);
    }
    // Add userId to the dependency array
}, [companyId, userId, toast]);


  

const fetchAccounts = useCallback(async () => {
    // Depend on both companyId and userId
    if (!companyId || !userId) return;
    try {
        // Add userId to the fetch URL
        const response = await fetch(`https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${companyId}&user_id=${userId}`);
        const data = await response.json();
        if (response.ok) {
            setAccounts(data);
        } else {
            throw new Error(data.error || 'Failed to fetch accounts');
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    // Add userId to the dependency array
}, [companyId, userId, toast]);

  useEffect(() => {
    fetchIncomes();
    fetchAccounts();
  }, [fetchIncomes, fetchAccounts]);

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
    // Add a check for companyId and userId
    if (!companyId || !userId) {
        toast({ variant: "destructive", title: "Authentication Error", description: "User or company not found." });
        return;
    }
    setIsPosting(true);
    toast({ title: "Posting Income...", description: "Creating ledger entries..." });
    try {
        // Add userId to the fetch URL
        const response = await fetch(`https://hariindustries.net/api/clearbook/incomes.php?action=post&id=${incomeId}&company_id=${companyId}&user_id=${userId}`, { method: 'POST' });
        const data = await response.json();
        if (response.ok && data.success) {
            toast({ title: "Success!", description: "Income has been posted to the ledger." });
            fetchIncomes();
            setIsFormOpen(false);
        } else {
            throw new Error(data.error || 'Failed to post income');
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Posting Failed', description: error.message });
    } finally {
        setIsPosting(false);
    }
};

const handleDelete = async (incomeId: number) => {
    // Add a check for companyId and userId
    if (!companyId || !userId) {
        toast({ variant: "destructive", title: "Authentication Error", description: "User or company not found." });
        return;
    }
    if (confirm("Are you sure you want to delete this DRAFT income? This action cannot be undone.")) {
        try {
            // Add userId to the fetch URL
            const response = await fetch(`https://hariindustries.net/api/clearbook/incomes.php?id=${incomeId}&company_id=${companyId}&user_id=${userId}`, { method: 'DELETE' });
            const data = await response.json();
            if (response.ok && data.success) {
                toast({ title: "Success!", description: "Draft income has been deleted." });
                fetchIncomes();
                setIsFormOpen(false);
            } else {
                throw new Error(data.error || 'Failed to delete income');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        }
    }
};

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    if (!companyId || !user?.uid) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not identify user or company. Please try logging in again.",
        });
        setIsSaving(false);
        return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
        date: formData.get('date'),
        amount: Number(formData.get('amount')),
        income_account_id: formData.get('income_account_id'),
        payment_account_id: formData.get('payment_account_id'),
        payment_method: formData.get('payment_method'),
        received_from: formData.get('received_from'),
        description: formData.get('description'),
        company_id: companyId,
        user_id: user.uid,
    };

    const isEdit = formMode === 'edit';
    const url = isEdit
        ? `https://hariindustries.net/api/clearbook/incomes.php?id=${selectedIncome?.id}&company_id=${companyId}`
        : `https://hariindustries.net/api/clearbook/incomes.php?company_id=${companyId}`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (response.ok) {
            toast({ title: "Success!", description: `Draft income has been ${isEdit ? 'updated' : 'created'}.` });
            fetchIncomes();
            setIsFormOpen(false);
        } else {
            throw new Error(data.error || 'Save operation failed');
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  
  const toggleRow = (id: number) => setExpandedRow(expandedRow === id ? null : id);
  const getFormTitle = () => (formMode === 'create' ? 'Create New Income' : 'Edit Income');

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!isFormOpen) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Incomes</CardTitle>
                    <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> Add New Income</Button>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Received From</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {incomesData.length > 0 ? incomesData.map(income => (
                                    <Fragment key={income.id}>
                                        <TableRow>
                                            <TableCell><Button variant="ghost" size="icon" onClick={() => toggleRow(income.id)}>{expandedRow === income.id ? <MinusCircle /> : <PlusCircle />}</Button></TableCell>
                                            <TableCell><DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleView(income)}>View Details</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(income)} disabled={income.status === 'posted'}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePost(income.id)} disabled={income.status === 'posted'}>Post Income</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(income.id)} disabled={income.status === 'posted'}>Delete Draft</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu></TableCell>
                                            <TableCell>{format(parseISO(income.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{income.reference}</TableCell>
                                            <TableCell><Badge variant={income.status === 'draft' ? 'outline' : 'default'} className={`capitalize ${income.status === 'posted' ? 'bg-green-500 text-white' : ''}`}>{income.status}</Badge></TableCell>
                                            <TableCell>{new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(income.amount)}</TableCell>
                                            <TableCell>{income.received_from || '-'}</TableCell>
                                        </TableRow>
                                        {expandedRow === income.id && (
                                            <TableRow><TableCell colSpan={7} className="p-4 bg-muted/50">
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div><strong>Income Account:</strong> {income.income_account} ({income.income_account_code})</div>
                                                    <div><strong>Payment Account:</strong> {income.payment_account} ({income.payment_account_code})</div>
                                                    <div><strong>Payment Method:</strong> {income.payment_method}</div>
                                                </div>
                                            </TableCell></TableRow>
                                        )}
                                    </Fragment>
                                )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No incomes found.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Pagination can be added here */}
                </CardContent>
            </Card>
        );
    }
    
    if (formMode === 'view') {
        return <IncomeDetailView income={selectedIncome!} onEdit={handleEdit} onPost={handlePost} onBack={() => setIsFormOpen(false)} onDelete={handleDelete} isPosting={isPosting} />;
    }

    // Render Create/Edit Form
    const revenueAccounts = accounts.filter(acc => acc.account_type === 'Revenue');
    const assetAccounts = accounts.filter(acc => acc.account_type === 'Asset');

    return (
        <div>
          <Button variant="outline" onClick={() => setIsFormOpen(false)} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" />Back to List</Button>
          <Card>
            <CardHeader>
              <CardTitle>{getFormTitle()}</CardTitle>
              <CardDescription>Create or edit a DRAFT income. It must be posted to affect the ledger.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input id="date" name="date" type="date" defaultValue={selectedIncome?.date.substring(0, 10)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input id="amount" name="amount" type="number" placeholder="0.00" step="0.01" defaultValue={selectedIncome?.amount} required />
                    </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_account_id">Receiving Account (Asset) *</Label>
                  <Select name="payment_account_id" defaultValue={selectedIncome?.payment_account_code} required>
                    <SelectTrigger><SelectValue placeholder="Select Cash/Bank Account" /></SelectTrigger>
                    <SelectContent>{assetAccounts.map(acc => <SelectItem key={acc.account_code} value={acc.account_code}>{acc.account_name} ({acc.account_code})</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">This account will be DEBITED.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="income_account_id">Income Account (Revenue) *</Label>
                  <Select name="income_account_id" defaultValue={selectedIncome?.income_account_code} required>
                    <SelectTrigger><SelectValue placeholder="Select Income Account" /></SelectTrigger>
                    <SelectContent>{revenueAccounts.map(acc => <SelectItem key={acc.account_code} value={acc.account_code}>{acc.account_name} ({acc.account_code})</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">This account will be CREDITED.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select name="payment_method" defaultValue={selectedIncome?.payment_method || 'Cash'} required>
                    <SelectTrigger><SelectValue placeholder="Select Payment Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Mobile Money">Mobile Money</SelectItem><SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="received_from">Received From (Optional)</Label>
                  <Input id="received_from" name="received_from" placeholder="e.g., Client Name or reason" defaultValue={selectedIncome?.received_from || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input id="description" name="description" placeholder="Additional notes" defaultValue={selectedIncome?.description || ''}/>
                </div>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (formMode === 'create' ? 'Save Draft' : 'Save Changes')}
                    </Button>
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
