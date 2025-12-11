
'use client';
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Trash2, Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { useRouter } from 'next/navigation';
import { PayeeDialog } from '@/components/PayeeDialog';

interface VoucherLine {
    id: number;
    accountId: string;
    amount: number;
}

const NewPaymentVoucherPage = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [voucherDate, setVoucherDate] = useState<Date | undefined>(new Date());
    const [payeeName, setPayeeName] = useState('');
    const [paymentAccountId, setPaymentAccountId] = useState('');
    const [lines, setLines] = useState<VoucherLine[]>([
        { id: 1, accountId: '', amount: 0 },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPayeeDialogOpen, setIsPayeeDialogOpen] = useState(false);

    const expenseAssetAccounts = useMemo(() => chartOfAccounts.filter(acc => acc.type === 'Expense' || acc.type === 'Asset'), []);
    const cashBankAccounts = useMemo(() => chartOfAccounts.filter(acc => acc.type === 'Asset' && acc.code.startsWith('1011')), []);


    const handleAddLine = () => {
        setLines([...lines, { id: Date.now(), accountId: '', amount: 0 }]);
    };

    const handleRemoveLine = (id: number) => {
        if (lines.length > 1) {
            setLines(lines.filter(line => line.id !== id));
        } else {
            toast({
                variant: 'destructive',
                title: 'At least one line item is required.',
            });
        }
    };

    const handleLineChange = (id: number, field: keyof VoucherLine, value: string | number) => {
        let newLines = lines.map(line => {
            if (line.id === id) {
                 if (field === 'amount') {
                    const parsedValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
                    return { ...line, amount: parsedValue };
                }
                return { ...line, [field]: value };
            }
            return line;
        });
        setLines(newLines);
    };

    const totalAmount = useMemo(() => {
        return lines.reduce((acc, line) => acc + line.amount, 0);
    }, [lines]);

    const resetForm = () => {
        setVoucherDate(new Date());
        setPayeeName('');
        setPaymentAccountId('');
        setLines([{ id: 1, accountId: '', amount: 0 }]);
    };

    const handlePostVoucher = async () => {
        if (!voucherDate || !payeeName?.trim() || !paymentAccountId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a date, payee name, and payment account.' });
            return;
        }
        if (lines.some(line => !line.accountId || line.amount <= 0)) {
            toast({ variant: 'destructive', title: 'Incomplete Items', description: 'Please ensure all lines have an account and a valid amount.' });
            return;
        }
        
        setIsLoading(true);
        
        const payload = {
            voucherDate: format(voucherDate, 'yyyy-MM-dd'),
            payeeName,
            paymentAccountId,
            totalAmount,
            lines: lines.map(l => ({ accountId: l.accountId, amount: l.amount }))
        };

        try {
            const response = await fetch('/api/payment-voucher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || `Server responded with status ${response.status}`);
            }

            toast({
                title: 'Payment Voucher Posted!',
                description: `Journal Voucher #${result.journalVoucherId} has been created for the payment to ${payeeName}.`,
            });
            resetForm();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to post voucher', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const formatCurrency = (amount: number) => {
         return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
        }).format(amount);
    };

    return (
        <>
            <PayeeDialog 
                open={isPayeeDialogOpen} 
                onOpenChange={setIsPayeeDialogOpen}
                onSelectPayee={(payee) => {
                    setPayeeName(payee.name);
                    setIsPayeeDialogOpen(false);
                }}
            />
            <p className="text-muted-foreground mb-6">Record a direct payment for expenses or assets.</p>
            <Card>
                <CardHeader>
                    <CardTitle>Payment Voucher Details</CardTitle>
                    <CardDescription>
                        This will debit the selected expense/asset accounts and credit the selected cash/bank account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="font-semibold text-sm" htmlFor="payeeName">Payee Name</label>
                            <div className="flex gap-2">
                                <Input 
                                    id="payeeName"
                                    placeholder="e.g., Electricity Company"
                                    value={payeeName}
                                    onChange={(e) => setPayeeName(e.target.value)}
                                />
                                <Button variant="outline" size="icon" onClick={() => setIsPayeeDialogOpen(true)}>
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="font-semibold text-sm">Voucher Date</label>
                            <DatePicker date={voucherDate} onDateChange={setVoucherDate} />
                        </div>
                        <div className="space-y-2">
                            <label className="font-semibold text-sm">Payment From (Credit)</label>
                            <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Cash/Bank Account..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cashBankAccounts.map(account => (
                                        <SelectItem key={account.code} value={account.code}>
                                            {account.code} - {account.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-2/3">Expense / Asset Account (Debit)</TableHead>
                                    <TableHead className="w-1/3 text-right">Amount</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <Select value={line.accountId} onValueChange={(value) => handleLineChange(line.id, 'accountId', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an account to debit..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {expenseAssetAccounts.map(account => (
                                                        <SelectItem key={account.code} value={account.code}>
                                                            {account.code} - {account.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={line.amount || ''}
                                                onChange={(e) => handleLineChange(line.id, 'amount', e.target.value)}
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
                        </Table>
                        <Button variant="outline" size="sm" onClick={handleAddLine} className="mt-4">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Line
                        </Button>
                    </div>

                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total Amount:</span>
                                <span className="font-mono">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end bg-muted/30 py-4 px-6 rounded-b-lg">
                    <Button size="lg" onClick={handlePostVoucher} disabled={isLoading || totalAmount <= 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post Payment
                    </Button>
                </CardFooter>
            </Card>
        </>
    );
};

export default NewPaymentVoucherPage;
