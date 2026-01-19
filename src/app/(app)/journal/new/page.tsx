'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { PlusCircle, Trash2, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { Account } from '@/lib/chart-of-accounts';
import type { Payee } from '@/types/payee';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

// Journal line interface
interface JournalEntryLine {
    id: number;
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    payeeId?: string;
    payees?: Payee[];
}

const NewJournalEntryPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const router = useRouter();

    const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
    const [narration, setNarration] = useState('');
    const [lines, setLines] = useState<JournalEntryLine[]>([
        { id: 1, accountId: '', debit: 0, credit: 0, description: '' },
        { id: 2, accountId: '', debit: 0, credit: 0, description: '' },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [allPayees, setAllPayees] = useState<Payee[]>([]);
    const [isOpeningEntry, setIsOpeningEntry] = useState(false);

    // Fetch chart of accounts
    useEffect(() => {
        const loadAccounts = async () => {
            if (!user?.company_id) return;
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${user.company_id}`);
                const data = await response.json();
                
                let accountsData;
                if (Array.isArray(data)) {
                    accountsData = data;
                } else if (data.success && Array.isArray(data.accounts)) {
                    accountsData = data.accounts;
                } else {
                    throw new Error(data.message || "Invalid data format for chart of accounts.");
                }
                setAccounts(accountsData);
            } catch (error: any) {
                console.error("Failed to fetch accounts", error);
                toast({ variant: 'destructive', title: 'Failed to load Chart of Accounts', description: error.message });
            }
        };
        loadAccounts();
    }, [user, toast]);

    // Fetch payees
    useEffect(() => {
        const fetchPayees = async () => {
            if (!user?.company_id) return;
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-payees.php?company_id=${user.company_id}`);
                if (!response.ok) throw new Error('Failed to fetch payees list.');
                const data: Payee[] = await response.json();
                setAllPayees(data);
            } catch (error) {
                console.error("Could not fetch payees:", error);
                toast({ variant: 'destructive', title: 'Failed to load payees.' });
            }
        };
        fetchPayees();
    }, [user, toast]);

    // Memoized control accounts (dynamic per company)
    const controlAccounts = useMemo(() => ({
        customer: accounts.find(a => a.is_control_account && a.account_type === 'Customer')?.account_code,
        supplier: accounts.find(a => a.is_control_account && a.account_type === 'Supplier')?.account_code,
    }), [accounts]);

    // Add a new line
    const handleAddLine = () => {
        setLines([...lines, { id: Date.now(), accountId: '', debit: 0, credit: 0, description: '' }]);
    };

    // Remove a line
    const handleRemoveLine = (id: number) => {
        if (lines.length > 2) {
            setLines(lines.filter(line => line.id !== id));
        } else {
            toast({ variant: 'destructive', title: 'Minimum two lines required.' });
        }
    };

    // Handle line changes
    const handleLineChange = (id: number, field: keyof JournalEntryLine, value: string | number) => {
        setLines(lines.map(line => {
            if (line.id === id) {
                const updatedLine = { ...line, [field]: value };

                if (field === 'accountId') {
                    updatedLine.payeeId = undefined;
                    updatedLine.payees = [];

                    if (value === controlAccounts.customer) {
                        updatedLine.payees = allPayees.filter(p => p.type === 'Customer');
                    } else if (value === controlAccounts.supplier) {
                        updatedLine.payees = allPayees.filter(p => p.type === 'Supplier');
                    }
                } else if (field === 'debit') {
                    updatedLine.credit = 0;
                } else if (field === 'credit') {
                    updatedLine.debit = 0;
                }

                return updatedLine;
            }
            return line;
        }));
    };

    // Totals and balance check
    const { totalDebits, totalCredits, isBalanced } = useMemo(() => {
        const debits = lines.reduce((acc, line) => acc + (parseFloat(String(line.debit)) || 0), 0);
        const credits = lines.reduce((acc, line) => acc + (parseFloat(String(line.credit)) || 0), 0);
        return {
            totalDebits: debits,
            totalCredits: credits,
            isBalanced: Math.abs(debits - credits) < 0.01 && debits > 0,
        };
    }, [lines]);

    // Save as draft
    const handleSaveAsDraft = async () => {
        if (!entryDate || !narration) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a date and main narration.' });
            return;
        }
        if (!isBalanced) {
            toast({ variant: 'destructive', title: 'Unbalanced Entry', description: 'Debits and credits must be equal.' });
            return;
        }

        setIsLoading(true);
        const apiEndpoint = 'https://hariindustries.net/api/clearbook/journal-entry.php';
        
        const payload = {
            entryDate: format(entryDate, 'yyyy-MM-dd'),
            narration,
            lines: lines.map(line => {
                const account = accounts.find(acc => acc.account_code === line.accountId);
                return {
                    debit: line.debit,
                    credit: line.credit,
                    description: line.description,
                    payeeId: line.payeeId,
                    account_code: account?.account_code,
                    account_name: account?.account_name,
                    account_type: account?.account_type,
                };
            }),
            totalDebits,
            totalCredits,
            user_id: user?.uid,
            company_id: user?.company_id,
            status: 'Draft',
            is_opening_entry: isOpeningEntry,
        };

        try {
            const response = await fetch(apiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error('Server error');
            const result = await response.json();

            if (result.success) {
                toast({ title: "Draft Saved!", description: `Voucher #${result.journalVoucherId} has been saved.` });
                router.push('/journal');
            } else {
                throw new Error(result.error || 'Unknown server error');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to save draft', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Create New Journal Entry</h1>
                <Link href="/journal" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go back to list</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Journal Voucher Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                        <div className="space-y-2">
                            <label className="font-semibold text-sm">Entry Date</label>
                            <DatePicker date={entryDate} onDateChange={setEntryDate} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="font-semibold text-sm">Main Narration / Description</label>
                            <Textarea
                                placeholder="e.g., To record office supply expenses for July (main entry description)"
                                value={narration}
                                onChange={(e) => setNarration(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Account & Line Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell className="align-top space-y-2">
                                            <Select value={line.accountId} onValueChange={(value) => handleLineChange(line.id, 'accountId', value)}>
                                                <SelectTrigger><SelectValue placeholder="Select an account..." /></SelectTrigger>
                                                <SelectContent>
                                                    {accounts
                                                        .filter(account => account && account.account_code)
                                                        .map(account => (
                                                            <SelectItem key={account.account_code} value={String(account.account_code)}>{account.account_code} - {account.account_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            {line.payees && line.payees.length > 0 && (
                                                <div className="pl-2 border-l-2 border-primary">
                                                    <Select value={line.payeeId} onValueChange={(value) => handleLineChange(line.id, 'payeeId', value)}>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder={`Select a ${
                                                                line.accountId === controlAccounts.customer ? 'Customer' :
                                                                line.accountId === controlAccounts.supplier ? 'Supplier' : ''
                                                            }...`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {line.payees.map(payee => <SelectItem key={payee.id} value={String(payee.id)}>{payee.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <Textarea
                                                placeholder="Optional: add a specific description for this line"
                                                className="text-xs"
                                                rows={1}
                                                value={line.description || ''}
                                                onChange={(e) => handleLineChange(line.id, 'description', e.target.value)}
                                            />
                                        </TableCell>

                                        <TableCell className="align-top">
                                            <Input type="number" className="text-right font-mono" placeholder="0.00" value={line.debit || ''} onChange={(e) => handleLineChange(line.id, 'debit', e.target.value)} onFocus={(e) => e.target.select()} />
                                        </TableCell>

                                        <TableCell className="align-top">
                                            <Input type="number" className="text-right font-mono" placeholder="0.00" value={line.credit || ''} onChange={(e) => handleLineChange(line.id, 'credit', e.target.value)} onFocus={(e) => e.target.select()} />
                                        </TableCell>

                                        <TableCell className="text-right align-top">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>

                            <TableFooter>
                                <TableRow>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={handleAddLine}><PlusCircle className="mr-2 h-4 w-4" /> Add Line</Button>
                                    </TableCell>
                                    <TableCell className="text-right font-bold font-mono text-lg">{totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right font-bold font-mono text-lg">{totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>

                    <div className="mt-4 flex justify-end">
                        {isBalanced ? (
                            <div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-5 w-5" /><span>Totals are balanced</span></div>
                        ) : (
                            <div className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" /><span>Totals do not match</span></div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="justify-end">
                    <Button size="lg" onClick={handleSaveAsDraft} disabled={!isBalanced || isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save as Draft
                    </Button>
                </CardFooter>
            </Card>
        </>
    );
};

export default NewJournalEntryPage;
