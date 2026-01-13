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
import { fetchChartOfAccounts, type Account } from '@/lib/chart-of-accounts';
import type { Payee } from '@/types/payee';
import { useAuth } from '@/hooks/useAuth';


// Control account constants
const CUSTOMER_CONTROL_ACCOUNT = '101200'; // Trade Receivables - Customers
const SUPPLIER_CONTROL_ACCOUNT = '201020'; // Trade Creditors - Suppliers

interface JournalEntryLine {
    id: number;
    accountId: string;
    debit: number;
    credit: number;
    payeeId?: string;
    payees?: Payee[]; // List of relevant payees for this line
}

const NewJournalEntryPage = () => {
    const { toast } = useToast();
    const { user } = useAuth(); 

    const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
    const [narration, setNarration] = useState('');
    const [lines, setLines] = useState<JournalEntryLine[]>([
        { id: 1, accountId: '', debit: 0, credit: 0 },
        { id: 2, accountId: '', debit: 0, credit: 0 },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [allPayees, setAllPayees] = useState<Payee[]>([]);
    const [isOpeningEntry, setIsOpeningEntry] = useState(false);

     useEffect(() => {
        if (user?.company_id) {
            fetchChartOfAccounts(user.company_id)
                .then(setAccounts)
                .catch(error => {
                    console.error("Failed to fetch accounts", error);
                    toast({ variant: 'destructive', title: 'Failed to load Chart of Accounts' });
                });
        }
    }, [user, toast]);

    useEffect(() => {
        const fetchPayees = async () => {
            if (!user?.company_id) return;
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-payees.php?company_id=${user.company_id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch payees list.');
                }
                const data: Payee[] = await response.json();
                setAllPayees(data);
            } catch (error) {
                console.error("Could not fetch payees:", error);
                toast({
                    variant: 'destructive',
                    title: 'Failed to load payees.',
                    description: 'Could not fetch the list of customers and suppliers.',
                });
            }
        };
        fetchPayees();
    }, [user, toast]);

    const handleAddLine = () => {
        setLines([...lines, { id: Date.now(), accountId: '', debit: 0, credit: 0 }]);
    };

    const handleRemoveLine = (id: number) => {
        if (lines.length > 2) {
            setLines(lines.filter(line => line.id !== id));
        } else {
            toast({
                variant: 'destructive',
                title: 'Minimum two lines required.',
                description: 'A journal entry must have at least two lines.',
            });
        }
    };

    const handleLineChange = (id: number, field: keyof JournalEntryLine, value: string | number) => {
        setLines(lines.map(line => {
            if (line.id === id) {
                const updatedLine = { ...line };

                if (field === 'accountId') {
                    updatedLine.accountId = value as string;
                    updatedLine.payeeId = undefined; // Reset payee when account changes
                    updatedLine.payees = [];

                    if (value === CUSTOMER_CONTROL_ACCOUNT) {
                        updatedLine.payees = allPayees.filter(p => p.type === 'Customer');
                    } else if (value === SUPPLIER_CONTROL_ACCOUNT) {
                        updatedLine.payees = allPayees.filter(p => p.type === 'Supplier');
                    }
                    return updatedLine;
                }

                if (field === 'debit') {
                    const parsedValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
                    updatedLine.debit = parsedValue;
                    updatedLine.credit = 0;
                } else if (field === 'credit') {
                    const parsedValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
                    updatedLine.credit = parsedValue;
                    updatedLine.debit = 0;
                } else {
                    return { ...line, [field]: value };
                }
                return updatedLine;
            }
            return line;
        }));
    };

    const { totalDebits, totalCredits, isBalanced } = useMemo(() => {
        const debits = lines.reduce((acc, line) => acc + line.debit, 0);
        const credits = lines.reduce((acc, line) => acc + line.credit, 0);
        return {
            totalDebits: debits,
            totalCredits: credits,
            isBalanced: Math.abs(debits - credits) < 0.01 && debits > 0,
        };
    }, [lines]);
    
    const resetForm = () => {
        setEntryDate(new Date());
        setNarration('');
        setLines([
            { id: 1, accountId: '', debit: 0, credit: 0 },
            { id: 2, accountId: '', debit: 0, credit: 0 },
        ]);
        setIsOpeningEntry(false);
    }

    const handlePostEntry = async () => {
        // ... (validation logic as before) ...
        
        setIsLoading(true);

        const apiEndpoint = isOpeningEntry 
            ? 'https://hariindustries.net/api/clearbook/opening-entry.php'
            : 'https://hariindustries.net/api/clearbook/journal-entry.php';

        const payload = {
            entryDate: entryDate ? format(entryDate, 'yyyy-MM-dd') : new Date(),
            narration,
            lines: lines.map(({id, payees, ...rest}) => rest),
            totalDebits,
            totalCredits,
            user_id: user?.uid,
            company_id: user?.company_id,
        };

        try {
            const response = await fetch(apiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error('Failed to post');
            const result = await response.json();
            if (result.success) {
                toast({ title: `Entry Posted!`, description: `Voucher #${result.journalVoucherId} recorded.` });
                resetForm();
            } else {
                throw new Error(result.error || 'Unknown server error');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to post entry.', description: error.message });
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
                    {/* Form content remains the same */}
                    <div className="grid md:grid-cols-3 gap-6 mb-6">
                        <div className="space-y-2">
                            <label className="font-semibold text-sm">Entry Date</label>
                            <DatePicker date={entryDate} onDateChange={setEntryDate} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="font-semibold text-sm">Narration / Description</label>
                            <Textarea 
                                placeholder="e.g., To record office supply expenses for July"
                                value={narration}
                                onChange={(e) => setNarration(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="mb-6 flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isOpeningEntry"
                            checked={isOpeningEntry}
                            onChange={(e) => setIsOpeningEntry(e.target.checked)}
                            className="form-checkbox h-4 w-4 text-primary rounded"
                        />
                        <label htmlFor="isOpeningEntry" className="text-sm font-medium leading-none">This is an Opening Entry</label>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                           <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Account</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line) => (
                                    <React.Fragment key={line.id}>
                                    <TableRow>
                                        <TableCell className="align-top">
                                            <Select
                                                value={line.accountId}
                                                onValueChange={(value) => handleLineChange(line.id, 'accountId', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an account..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accounts.map(account => (
                                                        <SelectItem key={account.code} value={account.code}>
                                                            {account.code} - {account.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {line.payees && line.payees.length > 0 && (
                                                <div className="mt-2 pl-2 border-l-2 border-primary">
                                                    <Select
                                                        value={line.payeeId}
                                                        onValueChange={(value) => handleLineChange(line.id, 'payeeId', value)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder={`Select a ${line.accountId === CUSTOMER_CONTROL_ACCOUNT ? 'Customer' : 'Supplier'}...`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {line.payees.map(payee => (
                                                                <SelectItem key={payee.id} value={payee.id}>
                                                                    {payee.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <Input
                                                type="number"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={line.debit || ''}
                                                onChange={(e) => handleLineChange(line.id, 'debit', e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <Input
                                                type="number"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={line.credit || ''}
                                                onChange={(e) => handleLineChange(line.id, 'credit', e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right align-top">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={handleAddLine}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Line
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-right font-bold font-mono text-lg">
                                        {totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-bold font-mono text-lg">
                                        {totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
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
                    <Button size="lg" onClick={handlePostEntry} disabled={!isBalanced || isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post Journal Entry
                    </Button>
                </CardFooter>
            </Card>
        </>
    );
};

export default NewJournalEntryPage;
