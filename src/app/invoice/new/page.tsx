
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
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { useRouter } from 'next/navigation';


interface InvoiceLine {
    id: number;
    productId: string;
    productName: string;
    quantity: number;
    rate: number;
    total: number;
}

const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
};

const formatCurrencyForInput = (value: number | string): string => {
    if (typeof value === 'string') {
        value = parseFloat(value.replace(/,/g, ''));
    }
    if (isNaN(value) || value === 0) {
        return '';
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


const NewInvoicePage = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [invoiceDate, setInvoiceDate] = useState<Date | undefined>(new Date());
    const [customerId, setCustomerId] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<InvoiceLine[]>([
        { id: 1, productId: '', productName: '', quantity: 1, rate: 0, total: 0 },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const customerAccounts = useMemo(() => chartOfAccounts.filter(acc => acc.type === 'Asset' && acc.name.includes('Receivable')), []);
    const productAccounts = useMemo(() => chartOfAccounts.filter(acc => acc.type === 'Revenue'), []);


    const handleAddLine = () => {
        setLines([...lines, { id: Date.now(), productId: '', productName: '', quantity: 1, rate: 0, total: 0 }]);
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

    const handleLineChange = (id: number, field: keyof InvoiceLine, value: string | number) => {
        let newLines = lines.map(line => {
            if (line.id === id) {
                 const updatedLine = { ...line, [field]: value };
                 if(field === 'productId') {
                     const product = productAccounts.find(p => p.code === value);
                     updatedLine.productName = product ? product.name : '';
                 }
                 if(field === 'quantity' || field === 'rate') {
                     const quantity = field === 'quantity' ? (typeof value === 'number' ? value : parseInt(value, 10)) : updatedLine.quantity;
                     const rate = field === 'rate' ? (typeof value === 'number' ? value : parseCurrency(value as string)) : updatedLine.rate;
                     updatedLine.total = (quantity || 0) * (rate || 0);
                 }
                 return updatedLine;
            }
            return line;
        });
        setLines(newLines);
    };

    const { subTotal, vatAmount, totalAmount } = useMemo(() => {
        const sub = lines.reduce((acc, line) => acc + line.total, 0);
        const vat = sub * 0.075; // Assuming a 7.5% VAT rate
        const total = sub + vat;
        return { subTotal: sub, vatAmount: vat, totalAmount: total };
    }, [lines]);

    const handlePostInvoice = async () => {
        if (!invoiceDate || !customerId) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an invoice date and customer.' });
            return;
        }
        if (lines.some(line => !line.productId || line.quantity <= 0 || line.rate <= 0)) {
            toast({ variant: 'destructive', title: 'Incomplete Items', description: 'Please ensure all invoice lines have a product, quantity, and rate.' });
            return;
        }
        
        setIsLoading(true);
        
        const customer = customerAccounts.find(c => c.code === customerId);

        const payload = {
            issueDate: format(invoiceDate, 'yyyy-MM-dd'),
            customerId: customerId,
            customerName: customer?.name,
            totalAmount: totalAmount,
            // You can expand this payload to include all invoice details if you create an 'invoices' table
        };

        try {
            const response = await fetch('https://hariindustries.net/busa-api/database/new-invoice.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Server responded with status ${response.status}`);
            }

            toast({
                title: 'Invoice Posted!',
                description: `Journal Voucher #${result.journalVoucherId} has been created.`,
            });
            router.push(`/invoice/${result.invoiceId}`);

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to post invoice', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Create New Sales Invoice</CardTitle>
                    <CardDescription>
                        This will create a new invoice and automatically post the corresponding sales journal entry.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                             <label className="font-semibold text-sm">Customer</label>
                             <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a customer..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {customerAccounts.map(account => (
                                        <SelectItem key={account.code} value={account.code}>
                                            {account.code} - {account.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                             <label className="font-semibold text-sm">Invoice Date</label>
                             <DatePicker date={invoiceDate} onDateChange={setInvoiceDate} />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/2">Item/Service</TableHead>
                                    <TableHead className="w-1/6 text-right">Quantity</TableHead>
                                    <TableHead className="w-1/6 text-right">Rate</TableHead>
                                    <TableHead className="w-1/6 text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lines.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <Select value={line.productId} onValueChange={(value) => handleLineChange(line.id, 'productId', value)}>
                                                 <SelectTrigger>
                                                    <SelectValue placeholder="Select an item..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                     {productAccounts.map(account => (
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
                                                className="text-right"
                                                value={line.quantity}
                                                onChange={(e) => handleLineChange(line.id, 'quantity', parseInt(e.target.value, 10))}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="text"
                                                className="text-right font-mono"
                                                placeholder="0.00"
                                                value={formatCurrencyForInput(line.rate)}
                                                onChange={(e) => handleLineChange(line.id, 'rate', e.target.value)}
                                                onFocus={(e) => e.target.select()}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(line.total)}</TableCell>
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
                             <div className="flex justify-between">
                                <span className="font-semibold">Subtotal:</span>
                                <span className="font-mono">{formatCurrency(subTotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">VAT (7.5%):</span>
                                <span className="font-mono">{formatCurrency(vatAmount)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                                <span>Total Amount:</span>
                                <span className="font-mono">{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="font-semibold text-sm">Notes</label>
                        <Textarea 
                            placeholder="Add any notes for the customer here..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                </CardContent>
                <CardFooter className="justify-end">
                    <Button size="lg" onClick={handlePostInvoice} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post Invoice & Create Journal
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default NewInvoicePage;
