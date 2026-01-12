'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusCircle, Trash2, ShieldCheck } from 'lucide-react';
import { PaymentVoucher, PaymentVoucherLineItem } from '@/types/payment-voucher';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SelectGLAccountDialog } from '@/components/SelectGLAccountDialog';
import { Account } from '@/lib/chart-of-accounts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from '@/components/ui/checkbox';
import { Supplier } from '@/types/supplier';
import { TaxAuthority } from '@/types/tax-authority';
import { UnpaidInvoice } from '@/types/unpaid-invoice';
import { PayeeCombobox } from '@/components/PayeeCombobox';


// Define the Dialog component before it is used
interface UnpaidInvoicesDialogProps {
    invoices: UnpaidInvoice[];
    onSelectInvoices: (invoices: UnpaidInvoice[]) => void;
    isFetchingInvoices: boolean;
}

const UnpaidInvoicesDialog: React.FC<UnpaidInvoicesDialogProps> = ({ invoices, onSelectInvoices, isFetchingInvoices }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<UnpaidInvoice[]>([]);

    const handleSelect = (invoice: UnpaidInvoice) => {
        setSelected(prev => 
            prev.some(i => i.supplier_invoice_id === invoice.supplier_invoice_id) 
                ? prev.filter(i => i.supplier_invoice_id !== invoice.supplier_invoice_id)
                : [...prev, invoice]
        );
    }

    const handleAddInvoices = () => {
        onSelectInvoices(selected);
        setIsOpen(false);
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)} disabled={isFetchingInvoices || invoices.length === 0}>
                {isFetchingInvoices ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Select Unpaid Invoices
            </Button>
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
                        <h2 className="text-2xl font-bold mb-4">Select Invoices to Pay</h2>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Select</TableHead>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Invoice Total</TableHead>
                                        <TableHead className="text-right">VAT</TableHead>
                                        <TableHead className="text-right">Amount Due</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map(invoice => (
                                        <TableRow key={invoice.supplier_invoice_id}>
                                            <TableCell><Checkbox checked={selected.some(i => i.supplier_invoice_id === invoice.supplier_invoice_id)} onCheckedChange={() => handleSelect(invoice)} /></TableCell>
                                            <TableCell>{invoice.invoice_number}</TableCell>
                                            <TableCell>{invoice.invoice_date}</TableCell>
                                            <TableCell className="text-right">{parseFloat(invoice.invoice_total).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{parseFloat(invoice.expected_vat).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{(parseFloat(invoice.invoice_total) + parseFloat(invoice.expected_vat)).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-6 flex justify-end gap-4">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddInvoices}>Add Selected Invoices</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}


const NewPaymentVoucherPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [pv, setPv] = useState<Partial<PaymentVoucher>>({
        voucherDate: new Date().toISOString(),
        paymentType: 'Bank',
        currency: 'NGN',
        status: 'Draft',
        payeeType: 'Supplier',
        sourceModule: 'AP',
        lineItems: [],
    });
    const [selectedPayee, setSelectedPayee] = useState<Supplier | TaxAuthority | null>(null);
    const [isGLDialogOpen, setIsGLDialogOpen] = useState(false);
    const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
    const [isFetchingInvoices, setIsFetchingInvoices] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState<UnpaidInvoice[]>([]);

    const handleInputChange = (field: keyof PaymentVoucher | keyof PaymentVoucherLineItem, value: any, index?: number) => {
        if (index !== undefined && Array.isArray(pv.lineItems)) {
            const updatedLineItems = [...pv.lineItems];
            const lineItem = { ...updatedLineItems[index] };

            // Treat debitAmount as VAT-inclusive
            if (field === 'debitAmount') {
                const debitAmount = parseFloat(value) || 0;
                lineItem.debitAmount = debitAmount;

                if (lineItem.vatApplicable) {
                    const vatRate = lineItem.vatRate || 7.5; // Default to 7.5% if not set
                    const grossAmount = debitAmount / (1 + vatRate / 100);
                    lineItem.vatAmount = debitAmount - grossAmount;
                } else {
                    lineItem.vatAmount = 0;
                }
                
                // Recalculate WHT on the gross amount (debitAmount - vatAmount)
                 if (lineItem.whtApplicable) {
                    const whtRate = lineItem.whtRate || 5; // Default to 5% if not set
                    const grossAmount = lineItem.debitAmount - lineItem.vatAmount;
                    lineItem.whtAmount = grossAmount * (whtRate / 100);
                } else {
                    lineItem.whtAmount = 0;
                }


            } else if (field === 'vatApplicable') {
                lineItem.vatApplicable = !!value;
                const debitAmount = lineItem.debitAmount || 0;
                if (lineItem.vatApplicable) {
                    const vatRate = lineItem.vatRate || 7.5;
                    const grossAmount = debitAmount / (1 + vatRate / 100);
                    lineItem.vatAmount = debitAmount - grossAmount;
                    lineItem.vatRate = vatRate;
                } else {
                    lineItem.vatAmount = 0;
                    lineItem.vatRate = 0;
                }
                 // Recalculate WHT
                if (lineItem.whtApplicable) {
                    const whtRate = lineItem.whtRate || 5;
                    const grossAmount = lineItem.debitAmount - lineItem.vatAmount;
                    lineItem.whtAmount = grossAmount * (whtRate / 100);
                }

            } else if (field === 'whtApplicable') {
                lineItem.whtApplicable = !!value;
                if (lineItem.whtApplicable) {
                    const whtRate = lineItem.whtRate || 5; // Default to 5%
                    const grossAmount = lineItem.debitAmount - lineItem.vatAmount;
                    lineItem.whtAmount = grossAmount * (whtRate / 100);
                    lineItem.whtRate = whtRate;
                } else {
                    lineItem.whtAmount = 0;
                    lineItem.whtRate = 0;
                }
            } else if (field in lineItem) {
                // @ts-ignore
                lineItem[field] = value;
            }

            updatedLineItems[index] = lineItem;
            setPv(prev => ({ ...prev, lineItems: updatedLineItems }));
        } else if (field in pv) {
            setPv(prev => ({ ...prev, [field as keyof PaymentVoucher]: value }));
        }
    };


    const handleSelectPayee = (payee: Supplier | TaxAuthority) => {
        setSelectedPayee(payee);
        const isSupplier = 'account_number' in payee;
        setPv(prev => ({
            ...prev,
            payeeCode: payee.id.toString(),
            payeeName: payee.name,
            payeeBankName: isSupplier ? payee.bank_name : '',
            payeeBankAccountNo: isSupplier ? payee.account_number : '',
            payeeTaxId: payee.vat_number || '',
            lineItems: [],
        }));

        if (isSupplier) {
            fetchUnpaidInvoices(payee.id.toString());
        } else {
            setUnpaidInvoices([]);
        }
    };

    const fetchUnpaidInvoices = async (supplierId: string) => {
        if (!user?.company_id) return;
        setIsFetchingInvoices(true);
        try {
            const baseUrl = 'https://hariindustries.net/api/clearbook';
            const url = `${baseUrl}/get_unpaid_invoices.php?company_id=${user.company_id}&supplier_id=${supplierId}`;
            const response = await fetch(url);
            if (!response.ok) {
                 let errorText = `HTTP error! status: ${response.status}`;
                 try { const errorData = await response.json(); errorText = errorData.message || errorData.error || JSON.stringify(errorData); } catch (e) { errorText = response.statusText; }
                 throw new Error(errorText);
            }
            const result = await response.json();
            if (result.success) {
                setUnpaidInvoices(result.invoices);
            } else {
                throw new Error(result.message || 'Failed to fetch invoices from API.');
            }
        } catch (error: any) {
            console.error("Failed to fetch unpaid invoices:", error.message);
            toast({ variant: "destructive", title: "Failed to fetch invoices", description: "Check console for details." });
            setUnpaidInvoices([]);
        } finally {
            setIsFetchingInvoices(false);
        }
    };

    const handleSelectInvoices = (invoices: UnpaidInvoice[]) => {
        setSelectedInvoices(invoices);
    };

    useEffect(() => {
        // This logic is now corrected to align with the backend requirements
        const newLines: PaymentVoucherLineItem[] = selectedInvoices.map((invoice, index) => {
            const invoiceTotal = parseFloat(invoice.invoice_total);
            const expectedVat = parseFloat(invoice.expected_vat);
            // The full liability to be settled, which is VAT-inclusive for AP.
            const debitAmount = invoiceTotal + expectedVat; 

            return {
                lineNo: index + 1,
                accountType: 'AP', // Correctly set to AP for supplier payments
                glAccountCode: '', // Ignored by backend for AP, but good practice to clear
                accountName: '', // Ignored by backend for AP
                lineDescription: `Payment for Invoice ${invoice.invoice_number}`,
                costCenter: '',
                debitAmount: debitAmount, // The full VAT-inclusive amount
                creditAmount: 0,
                vatApplicable: false, // Explicitly false as VAT is not re-posted
                vatRate: 0,
                vatAmount: 0, // Explicitly zero
                whtApplicable: false, // Default to false, can be changed by user
                whtRate: 0,
                whtAmount: 0,
                supplierInvoiceId: invoice.supplier_invoice_id, // CRITICAL: Include the invoice ID
            };
        });
        setPv(prev => ({ ...prev, lineItems: newLines }));
    }, [selectedInvoices]);

    const addLineItem = () => {
        const newLine: PaymentVoucherLineItem = {
            lineNo: (pv.lineItems?.length || 0) + 1, accountType: 'Expense', glAccountCode: '', accountName: '', lineDescription: '',
            costCenter: '', debitAmount: 0, creditAmount: 0, vatApplicable: false, vatRate: 0, vatAmount: 0,
            whtApplicable: false, whtRate: 0, whtAmount: 0,
        };
        setPv(prev => ({ ...prev, lineItems: [...(prev.lineItems || []), newLine] }));
    };

    const removeLineItem = (index: number) => {
        setPv(prev => ({ ...prev, lineItems: prev.lineItems?.filter((_, i) => i !== index) }));
    };

    const openGLDialog = (index: number) => {
        setEditingLineIndex(index);
        setIsGLDialogOpen(true);
    };

    const handleSelectGLAccount = (account: Account) => {
        if (editingLineIndex !== null) {
            handleInputChange('glAccountCode', account.code, editingLineIndex);
            handleInputChange('accountName', account.name, editingLineIndex);
        }
        setEditingLineIndex(null);
    };

    const { grossAmount, totalVAT, totalWHT, netPayable, totalDebit, isBalanced } = useMemo(() => {
      const lineItems = pv.lineItems || [];
      // totalDebit is the sum of all line item debitAmounts (which are VAT-inclusive)
      const debit = lineItems.reduce((sum, item) => sum + (Number(item.debitAmount) || 0), 0);
      // totalVAT is the sum of all calculated vatAmounts
      const vat = lineItems.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0);
      // grossAmount is the total debit less the total VAT
      const gross = debit - vat;
      // totalWHT is the sum of all calculated whtAmounts
      const wht = lineItems.reduce((sum, item) => sum + (Number(item.whtAmount) || 0), 0);
      
      const net = debit - wht;

      return { 
          grossAmount: gross, 
          totalVAT: vat, 
          totalWHT: wht, 
          netPayable: net, // Net payable to supplier is the total debit less withholding tax
          totalDebit: debit, 
          isBalanced: Math.abs(debit - (net + wht)) < 0.01 // Total Debit = Net Paid + WHT
        };
    }, [pv.lineItems]);

    const handleSubmit = async () => {
        if (!isBalanced) {
            toast({ variant: "destructive", title: "Voucher is out of balance!" });
            return;
        }
        setIsSubmitting(true);
        try {
            const finalPayload = { ...pv, preparedBy: user?.email, companyId: user?.company_id, grossAmount, totalVAT, totalWHT, netPayable };
            const baseUrl = 'https://hariindustries.net/api/clearbook';
            const url = `${baseUrl}/create_payment_voucher.php`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload)
            });

            if (!response.ok) {
                 let errorText = `HTTP error! status: ${response.status}`;
                 try { const errorData = await response.json(); errorText = errorData.message || errorData.error || JSON.stringify(errorData); } catch (e) { errorText = response.statusText; }
                 throw new Error(errorText);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                toast({ title: "Voucher Submitted!", description: result.message });
                router.push(`/payment-voucher/${result.created_voucher_id}`); 
            } else {
                throw new Error(result.message || 'An unknown error occurred');
            }
        } catch (error: any) {
            console.error("Voucher Submission Failed:", error.message);
            toast({ variant: "destructive", title: "Submission Failed", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <>
            <SelectGLAccountDialog open={isGLDialogOpen} onOpenChange={setIsGLDialogOpen} onSelectAccount={handleSelectGLAccount} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight">New Payment Voucher</h1>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !isBalanced || pv.lineItems?.length === 0}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} 
                        Submit for Approval
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>A. Payment Voucher Header</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-2"><Label>PV No</Label><Input disabled value="(Auto-generated)" /></div>
                                <div className="space-y-2"><Label>Voucher Date</Label><DatePicker date={new Date(pv.voucherDate!)} setDate={(d) => d && handleInputChange('voucherDate', d.toISOString())} /></div>
                                <div className="space-y-2"><Label>Payment Type</Label><Select value={pv.paymentType} onValueChange={(v) => handleInputChange('paymentType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Bank">Bank</SelectItem><SelectItem value="Cash">Cash</SelectItem></SelectContent></Select></div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>B. Payee Information</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Payee Type</Label><Select value={pv.payeeType} onValueChange={(v) => {handleInputChange('payeeType', v); setSelectedPayee(null);}}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Supplier">Supplier</SelectItem><SelectItem value="Staff">Staff</SelectItem><SelectItem value="Govt">Govt. Authority</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2 md:col-span-2"><Label>Payee</Label>
                                    <PayeeCombobox 
                                        payeeType={pv.payeeType as 'Supplier' | 'Govt'}
                                        onSelectPayee={handleSelectPayee}
                                        selectedPayee={selectedPayee}
                                    />
                                </div>
                                <div className="space-y-2"><Label>Bank Name</Label><Input disabled value={pv.payeeBankName || ''} /></div>
                                <div className="space-y-2"><Label>Bank Account No</Label><Input disabled value={pv.payeeBankAccountNo || ''} /></div>
                                <div className="space-y-2"><Label>Tax ID (TIN)</Label><Input disabled value={pv.payeeTaxId || ''} /></div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>C. Source Document Reference</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                               {pv.payeeType === 'Supplier' && (
                                    <UnpaidInvoicesDialog 
                                        invoices={unpaidInvoices} 
                                        onSelectInvoices={handleSelectInvoices}
                                        isFetchingInvoices={isFetchingInvoices} 
                                    />
                                )}
                                <div className="space-y-2"><Label>Source Document No</Label><Input placeholder="e.g., INV-2024-582" value={pv.sourceDocumentNo || ''} onChange={(e) => handleInputChange('sourceDocumentNo', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Description / Narration</Label><Textarea placeholder="Payment for..." value={pv.narration || ''} onChange={(e) => handleInputChange('narration', e.target.value)} /></div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Card>
                    <CardHeader><CardTitle>D. Line Items (Accounting Distribution)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead className="w-2/5">GL Account</TableHead>
                                <TableHead>Line Description</TableHead>
                                <TableHead className="text-right">Debit (VAT-inclusive)</TableHead>
                                <TableHead className="text-center">VAT?</TableHead>
                                <TableHead className="text-center">WHT?</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                                {pv.lineItems && pv.lineItems.length > 0 ? pv.lineItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell><Button variant="outline" className="w-full justify-start text-left" onClick={() => openGLDialog(index)}>{item.glAccountCode ? `${item.accountName} (${item.glAccountCode})` : "Select GL Account"}</Button></TableCell>
                                        <TableCell><Input placeholder="Line description" value={item.lineDescription} onChange={(e) => handleInputChange('lineDescription', e.target.value, index)} /></TableCell>
                                        <TableCell><Input type="number" className="text-right" placeholder="0.00" value={item.debitAmount} onChange={(e) => handleInputChange('debitAmount', e.target.value, index)} /></TableCell>
                                        <TableCell className="text-center"><Checkbox checked={item.vatApplicable} onCheckedChange={(c) => handleInputChange('vatApplicable', !!c, index)} /></TableCell>
                                        <TableCell className="text-center"><Checkbox checked={item.whtApplicable} onCheckedChange={(c) => handleInputChange('whtApplicable', !!c, index)} /></TableCell>
                                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeLineItem(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No line items yet. Click "Add Line" or select an invoice to begin.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <Button variant="outline" onClick={addLineItem}><PlusCircle className="mr-2 h-4 w-4" />Add Line</Button>
                    </CardFooter>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>E. Tax Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-2 font-mono text-sm">
                            <div className="flex justify-between"><span>Total Gross (Excl. VAT):</span><span>{grossAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Total Input VAT:</span><span>{totalVAT.toFixed(2)}</span></div>
                            <hr className="my-1"/>
                            <div className="flex justify-between font-bold"><span>Total Debit (Incl. VAT):</span><span>{totalDebit.toFixed(2)}</span></div>
                            <div className="flex justify-between text-red-600"><span>Total WHT Payable:</span><span>({totalWHT.toFixed(2)})</span></div>
                            <hr className="my-1"/>
                            <div className="flex justify-between font-bold text-blue-600"><span>Net Amount Payable:</span><span>{netPayable.toFixed(2)}</span></div>
                        </CardContent>
                    </Card>
                     <Card className="bg-slate-50 sticky bottom-0">
                         <CardHeader className="flex-row justify-between items-center">
                             <div>
                                 <CardTitle>Voucher Totals</CardTitle>
                                 <p className={`text-sm ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>{isBalanced ? 'Voucher is balanced.' : 'Voucher is out of balance!'}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-sm text-slate-500">Total Debit</p>
                                 <p className="font-bold text-lg">{totalDebit.toFixed(2)}</p>
                             </div>
                             <div className="text-right">
                                 <p className="text-sm text-slate-500">Net Paid (Bank/Cash)</p>
                                 <p className="font-bold text-2xl text-blue-600">{pv.currency} {netPayable.toFixed(2)}</p>
                             </div>
                         </CardHeader>
                     </Card>
                </div>
            </div>
        </>
    );
};


export default NewPaymentVoucherPage;
