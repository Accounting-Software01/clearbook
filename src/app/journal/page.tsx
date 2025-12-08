
'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { PlusCircle, Trash2, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { chartOfAccounts } from '@/lib/chart-of-accounts';

interface JournalEntryLine {
    id: number;
    accountId: string;
    debit: number;
    credit: number;
}

const formatCurrencyForInput = (value: number | string): string => {
    if (typeof value === 'string') {
        value = parseFloat(value.replace(/,/g, ''));
    }
    if (isNaN(value) || value === 0) {
        return '';
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
};


const JournalPage = () => {
    const { toast } = useToast();
    const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
    const [narration, setNarration] = useState('');
    const [lines, setLines] = useState<JournalEntryLine[]>([
        { id: 1, accountId: '', debit: 0, credit: 0 },
        { id: 2, accountId: '', debit: 0, credit: 0 },
    ]);
    const [isLoading, setIsLoading] = useState(false);

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
                if (field === 'debit') {
                    return { ...line, debit: parseCurrency(value as string), credit: 0 };
                }
                if (field === 'credit') {
                    return { ...line, credit: parseCurrency(value as string), debit: 0 };
                }
                return { ...line, [field]: value };
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
    }

    const handlePostEntry = async () => {
        if (!isBalanced) {
             toast({
                variant: 'destructive',
                title: 'Entry is not balanced.',
                description: 'Total debits must equal total credits.',
            });
            return;
        }
         if (!entryDate || !narration.trim()) {
            toast({
                variant: 'destructive',
                title: 'Missing information.',
                description: 'Please provide a date and narration for the entry.',
            });
            return;
        }
        
        const hasEmptyAccount = lines.some(line => !line.accountId);
        if (hasEmptyAccount) {
            toast({
                variant: 'destructive',
                title: 'Incomplete entry.',
                description: 'Please select an account for each line.',
            });
            return;
        }
        
        setIsLoading(true);

        const payload = {
            entryDate: format(entryDate, 'yyyy-MM-dd'),
            narration,
            lines: lines.map(({id, ...rest}) => rest), // Remove client-side id before sending
            totalDebits,
            totalCredits
        };

        try {
            const response = await fetch('https://hariindustries.net/busa-api/database/journal-entry.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: 'An unknown error occurred.'}));
                throw new Error(errorData.error || `Server responded with status ${response.status}`);
            }
            
            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Journal Entry Posted!',
                    description: `Voucher #${result.journalVoucherId} has been successfully recorded.`,
                });
                resetForm();
            } else {
                throw new Error(result.error || 'The server indicated a failure, but did not provide an error message.');
            }

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Failed to post entry.',
                description: error.message || 'An unexpected error occurred. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>New Journal Entry</CardTitle>
                    <CardDescription>
                        Record a new manual journal voucher. Ensure that total debits equal total credits.
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <Select
                                                value={line.accountId}
                                                onValueChange={(value) => handleLineChange(line.id, 'accountId', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an account..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {chartOfAccounts.map(account => (
                                                        <SelectItem key={account.code} value={account.code}>
                                                            {account.code} - {account.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="text"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={line.debit > 0 ? formatCurrencyForInput(line.debit) : ''}
                                                onChange={(e) => handleLineChange(line.id, 'debit', e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </TableCell>
                                         <TableCell>
                                            <Input
                                                type="text"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={line.credit > 0 ? formatCurrencyForInput(line.credit) : ''}
                                                onChange={(e) => handleLineChange(line.id, 'credit', e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
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
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-md">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-semibold">Totals are balanced</span>
                            </div>
                        ) : (
                             <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-md">
                                <AlertTriangle className="h-5 w-5" />
                                <span className="font-semibold">Totals do not match</span>
                            </div>
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
        </div>
    );
};

export default JournalPage;

    