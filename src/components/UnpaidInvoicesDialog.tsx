'use client';
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FilePlus2 } from 'lucide-react';

interface Invoice {
    id: number;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total: number;
    expected_vat: number;
}

interface UnpaidInvoicesDialogProps {
    invoices: Invoice[];
    onSelectInvoices: (selectedInvoices: Invoice[]) => void;
    isFetchingInvoices: boolean;
}

const UnpaidInvoicesDialog: React.FC<UnpaidInvoicesDialogProps> = ({ invoices, onSelectInvoices, isFetchingInvoices }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState<Invoice[]>([]);

    useEffect(() => {
        // Reset selection when dialog opens
        if (isOpen) {
            setSelectedInvoices([]);
        }
    }, [isOpen]);

    const handleSelect = () => {
        onSelectInvoices(selectedInvoices);
        setIsOpen(false);
    };

    const handleInvoiceToggle = (invoice: Invoice, checked: boolean | 'indeterminate') => {
        if (checked) {
            setSelectedInvoices(prev => [...prev, invoice]);
        } else {
            setSelectedInvoices(prev => prev.filter(i => i.id !== invoice.id));
        }
    };
    
    const isInvoiceSelected = (invoiceId: number) => {
        return selectedInvoices.some(i => i.id === invoiceId);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Select Unpaid Invoices
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[800px]">
                <DialogHeader>
                    <DialogTitle>Select Unpaid Invoices</DialogTitle>
                    <DialogDescription>
                        Select the invoices you want to pay with this voucher.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[50vh] overflow-y-auto">
                    {isFetchingInvoices ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : invoices.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Invoice No.</TableHead>
                                    <TableHead>Invoice Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Amount Due</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map((invoice) => (
                                    <TableRow key={invoice.id} >
                                        <TableCell>
                                           <Checkbox 
                                                checked={isInvoiceSelected(invoice.id)}
                                                onCheckedChange={(checked) => handleInvoiceToggle(invoice, checked)}
                                                id={`invoice-${invoice.id}`}
                                           />
                                        </TableCell>
                                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                        <TableCell>{invoice.invoice_date}</TableCell>
                                        <TableCell>{invoice.due_date}</TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.total + invoice.expected_vat)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                         <div className="flex h-48 items-center justify-center">
                            <p className="text-muted-foreground">No unpaid invoices found for this supplier.</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSelect} disabled={selectedInvoices.length === 0}>
                        Add {selectedInvoices.length > 0 ? selectedInvoices.length : ''} Selected Invoices
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UnpaidInvoicesDialog;