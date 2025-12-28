'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Banknote, Building, ChevronsRight, HardHat, Loader2, PlusCircle, Receipt, Search, Trash2, User, Wallet, Check, Landmark, Scale, ShieldCheck } from 'lucide-react';
import { PaymentVoucher, PaymentVoucherLineItem } from '@/types/payment-voucher';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SelectPayeeDialog } from '@/components/SelectPayeeDialog';
import { SelectGLAccountDialog } from '@/components/SelectGLAccountDialog';
import { Account } from '@/lib/chart-of-accounts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { api } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Supplier } from '@/types/supplier';

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
    const [isPayeeDialogOpen, setIsPayeeDialogOpen] = useState(false);
    const [isGLDialogOpen, setIsGLDialogOpen] = useState(false);
    const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (field: keyof PaymentVoucher | keyof PaymentVoucherLineItem, value: any, index?: number) => {
        if (index !== undefined && Array.isArray(pv.lineItems)) {
            const updatedLineItems = [...pv.lineItems];
            const lineItem = { ...updatedLineItems[index], [field]: value };

            // Recalculate VAT and WHT if applicable
            if (field === 'debitAmount' || field === 'vatApplicable' || field === 'whtApplicable') {
                const baseAmount = parseFloat(lineItem.debitAmount) || 0;
                if (lineItem.vatApplicable) {
                    lineItem.vatRate = 7.5; // Default or from settings
                    lineItem.vatAmount = baseAmount * (lineItem.vatRate / 100);
                } else {
                    lineItem.vatAmount = 0;
                }
                if (lineItem.whtApplicable) {
                    lineItem.whtRate = 5; // Default or from settings
                    lineItem.whtAmount = baseAmount * (lineItem.whtRate / 100);
                } else {
                    lineItem.whtAmount = 0;
                }
            }
            updatedLineItems[index] = lineItem;
            setPv(prev => ({ ...prev, lineItems: updatedLineItems }));
        } else if (field in pv) {
            setPv(prev => ({ ...prev, [field as keyof PaymentVoucher]: value }));
        }
    };

    const handleSelectPayee = (payee: Supplier) => {
        setPv(prev => ({
            ...prev,
            payeeCode: payee.id.toString(),
            payeeName: payee.name,
            payeeBankName: payee.bank_name,
            payeeBankAccountNo: payee.account_number,
            payeeTaxId: payee.tax_id,
        }));
    };

    const addLineItem = () => {
        const newLine: PaymentVoucherLineItem = {
            lineNo: (pv.lineItems?.length || 0) + 1,
            accountType: 'Expense',
            glAccountCode: '',
            accountName: '',
            lineDescription: '',
            costCenter: '',
            debitAmount: 0,
            creditAmount: 0,
            vatApplicable: false, vatRate: 0, vatAmount: 0,
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

    const { grossAmount, totalVAT, totalWHT, netPayable, totalDebit, totalCredit, isBalanced } = useMemo(() => {
        const lineItems = pv.lineItems || [];
        const gross = lineItems.reduce((sum, item) => sum + (Number(item.debitAmount) || 0), 0);
        const vat = lineItems.reduce((sum, item) => sum + (Number(item.vatAmount) || 0), 0);
        const wht = lineItems.reduce((sum, item) => sum + (Number(item.whtAmount) || 0), 0);
        const debit = gross + vat;
        const credit = wht;

        return {
            grossAmount: gross,
            totalVAT: vat,
            totalWHT: wht,
            netPayable: debit - credit,
            totalDebit: debit,
            totalCredit: credit,
            isBalanced: Math.abs(debit - (credit + (gross + vat - wht))) < 0.01 // Dr(Expense+VAT) = Cr(WHT + Bank)
        };
    }, [pv.lineItems]);

    const handleSubmit = async () => {
        if (!isBalanced) {
            toast({ variant: "destructive", title: "Voucher is out of balance!" });
            return;
        }
        setIsSubmitting(true);
        try {
            // Construct the final payload according to backend logic
            const finalPayload = {
                ...pv,
                preparedBy: user?.email,
                grossAmount,
                totalVAT,
                totalWHT,
                netPayable,
            };
            
            const response = await api<{ status: string; message: string; created_voucher_id?: string; errors?: string[] }>('/api/payment-voucher/create', {
                method: 'POST',
                body: JSON.stringify(finalPayload),
            });

            if (response.status === 'success') {
                toast({ title: "Voucher Submitted!", description: response.message });
                router.push(`/payment-voucher/${response.created_voucher_id}`); 
            } else {
                throw new Error(response.message + (response.errors ? `: ${response.errors.join(', ')}` : ''));
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Submission Failed", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const netPaidAmount = totalDebit - totalWHT;

    return (
        <>
            <SelectPayeeDialog open={isPayeeDialogOpen} onOpenChange={setIsPayeeDialogOpen} onSelectPayee={handleSelectPayee} payeeType={pv.payeeType || 'Supplier'} />
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
                    {/* Column 1: Header, Payee */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>A. Payment Voucher Header</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="space-y-2"><Label>PV No</Label><Input disabled value="(Auto-generated)" /></div>
                                <div className="space-y-2"><Label>Voucher Date</Label><DatePicker date={new Date(pv.voucherDate!)} setDate={(d) => d && handleInputChange('voucherDate', d.toISOString())} /></div>
                                <div className="space-y-2"><Label>Payment Type</Label><Select value={pv.paymentType} onValueChange={(v) => handleInputChange('paymentType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Bank">Bank</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Mobile">Mobile</SelectItem><SelectItem value="FX">FX</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Payment Mode</Label><Select value={pv.paymentMode} onValueChange={(v) => handleInputChange('paymentMode', v)}><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger><SelectContent><SelectItem value="Transfer">Transfer</SelectItem><SelectItem value="Cheque">Cheque</SelectItem><SelectItem value="Cash">Cash</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Currency</Label><Select value={pv.currency} onValueChange={(v) => handleInputChange('currency', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NGN">NGN</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Exchange Rate</Label><Input type="number" value={pv.exchangeRate} onChange={(e) => handleInputChange('exchangeRate', e.target.value)} disabled={pv.currency === 'NGN'} /></div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>B. Payee Information</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-2"><Label>Payee Type</Label><Select value={pv.payeeType} onValueChange={(v) => handleInputChange('payeeType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Supplier">Supplier</SelectItem><SelectItem value="Staff">Staff</SelectItem><SelectItem value="Govt">Govt. Authority</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2 md:col-span-2"><Label>Payee</Label><Button variant="outline" className="w-full justify-start" onClick={() => setIsPayeeDialogOpen(true)}><Search className="mr-2 h-4 w-4"/>{pv.payeeName || `Select a ${pv.payeeType}...`}</Button></div>
                                <div className="space-y-2"><Label>Bank Name</Label><Input disabled value={pv.payeeBankName || ''} /></div>
                                <div className="space-y-2"><Label>Bank Account No</Label><Input disabled value={pv.payeeBankAccountNo || ''} /></div>
                                <div className="space-y-2"><Label>Tax ID (TIN)</Label><Input disabled value={pv.payeeTaxId || ''} /></div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Column 2: Source Doc, Narration */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>C. Source Document Reference</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2"><Label>Source Module</Label><Select value={pv.sourceModule} onValueChange={(v) => handleInputChange('sourceModule', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="AP">Accounts Payable</SelectItem><SelectItem value="Payroll">Payroll</SelectItem><SelectItem value="Expense">Expense</SelectItem><SelectItem value="FA">Fixed Assets</SelectItem><SelectItem value="Treasury">Treasury</SelectItem></SelectContent></Select></div>
                                <div className="space-y-2"><Label>Source Document No</Label><Input placeholder="e.g., INV-2024-582" value={pv.sourceDocumentNo} onChange={(e) => handleInputChange('sourceDocumentNo', e.target.value)} /></div>
                                <div className="space-y-2"><Label>Description / Narration</Label><Textarea placeholder="Payment for..." value={pv.narration} onChange={(e) => handleInputChange('narration', e.target.value)} /></div>
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
                                <TableHead className="text-right">Debit</TableHead>
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
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No line items yet. Click "Add Line" to begin.</TableCell></TableRow>
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
                            <div className="flex justify-between"><span>Total Gross (Expense):</span><span>{grossAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Total Input VAT:</span><span>{totalVAT.toFixed(2)}</span></div>
                            <div className="flex justify-between text-red-600"><span>Total WHT Payable:</span><span>({totalWHT.toFixed(2)})</span></div>
                            <hr className="my-1"/>
                            <div className="flex justify-between font-bold"><span>Net Amount Payable:</span><span>{netPayable.toFixed(2)}</span></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>F. Payment Details</CardTitle></CardHeader>
                         <CardContent className="grid grid-cols-2 gap-4">
                             <div className="space-y-2"><Label>Bank/Cash Account</Label><Input placeholder="e.g., 101101 - GTB Bank" value={pv.bankOrCashAccount} onChange={(e) => handleInputChange('bankOrCashAccount', e.target.value)}/></div>
                             <div className="space-y-2"><Label>Cheque No / Ref</Label><Input placeholder="Optional" value={pv.chequeNoOrRef} onChange={(e) => handleInputChange('chequeNoOrRef', e.target.value)}/></div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="bg-slate-50 sticky bottom-0">
                    <CardHeader className="flex-row justify-between items-center">
                        <div>
                            <CardTitle>Voucher Totals</CardTitle>
                            <p className={`text-sm ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>{isBalanced ? 'Voucher is balanced and ready.' : 'Voucher is out of balance!'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Debit (Expense + VAT)</p>
                            <p className="font-bold text-lg">{totalDebit.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Credit (WHT + Net Paid)</p>
                            <p className={`font-bold text-lg ${!isBalanced ? 'text-red-500' : ''}`}>{(totalWHT + netPaidAmount).toFixed(2)}</p>
                        </div>
                         <div className="text-right">
                            <p className="text-sm text-slate-500">Net Paid Amount</p>
                            <p className="font-bold text-2xl text-blue-600">{pv.currency} {netPaidAmount.toFixed(2)}</p>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        </>
    );
};

export default NewPaymentVoucherPage;
