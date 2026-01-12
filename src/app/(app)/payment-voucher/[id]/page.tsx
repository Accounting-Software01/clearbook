'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, ThumbsDown, CheckCircle, XCircle, ArrowLeft, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { PaymentVoucher } from '@/types/payment-voucher';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

const ViewPaymentVoucherPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [voucher, setVoucher] = useState<PaymentVoucher | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchVoucher = useCallback(async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            const response = await api<{ status: string; voucher: PaymentVoucher; message?: string }>(
                `api/payment-voucher/get.php?id=${id}`
            );
            if (response.status === 'success') {
                setVoucher(response.voucher);
            } else {
                throw new Error(response.message || 'Failed to fetch voucher.');
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
            setVoucher(null);
        } finally {
            setIsLoading(false);
        }
    }, [id, toast]);

    useEffect(() => {
        fetchVoucher();
    }, [fetchVoucher]);

    const handleStatusUpdate = async (newStatus: 'Approved' | 'Rejected') => {
        if (!voucher) return;
        setIsUpdating(true);
        try {
            const response = await api<{ status: string; message: string }>('/api/payment-voucher/update-status.php', {
                method: 'POST',
                body: JSON.stringify({
                    voucher_id: voucher.id,
                    status: newStatus,
                    user_id: user?.uid
                }),
            });
            if (response.status === 'success') {
                toast({ title: "Status Updated", description: response.message });
                fetchVoucher(); // Refresh data
            } else {
                throw new Error(response.message);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>;
    }

    if (!voucher) {
        return <div className="flex flex-col items-center justify-center h-screen">
            <AlertTriangle className="h-16 w-16 text-red-500"/>
            <h1 className="text-2xl font-bold mt-4">Voucher Not Found</h1>
            <p className="text-slate-500">The payment voucher you are looking for does not exist.</p>
            <Button onClick={() => router.push('/payment-voucher/new')} className="mt-6"><ArrowLeft className="mr-2 h-4 w-4"/>Back to List</Button>
        </div>;
    }

    const isActionable = voucher.status === 'Submitted';

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <Button variant="outline" onClick={() => router.back()} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
                    <h1 className="text-3xl font-bold tracking-tight">Payment Voucher #{voucher.voucher_number || voucher.id}</h1>
                     <div className="flex items-center gap-2 mt-2">
                        <Badge variant={voucher.status === 'Approved' ? 'success' : voucher.status === 'Rejected' ? 'destructive' : 'outline'}>{voucher.status}</Badge>
                        {voucher.journal && (
                            <a href={`/journal-voucher/${voucher.journal.id}`} className="text-sm text-blue-500 hover:underline flex items-center gap-1"><LinkIcon className="h-3 w-3" />Journal #{voucher.journal.voucher_number}</a>
                        )}
                    </div>
                </div>
                {isActionable && (
                    <div className="flex items-center gap-2">
                        <Button variant="destructive" onClick={() => handleStatusUpdate('Rejected')} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ThumbsDown className="mr-2 h-4 w-4" />} Reject
                        </Button>
                        <Button variant="success" onClick={() => handleStatusUpdate('Approved')} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />} Approve
                        </Button>
                    </div>
                )}
            </div>

            {/* All Cards are read-only */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* ... Similar card structure as the creation form, but with disabled Inputs ... */}
                     <Card>
                        <CardHeader><CardTitle>A. Payment Voucher Header</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1"><Label>PV No</Label><Input disabled value={voucher.voucher_number || voucher.id} /></div>
                            <div className="space-y-1"><Label>Voucher Date</Label><Input disabled value={new Date(voucher.voucher_date).toLocaleDateString()} /></div>
                            <div className="space-y-1"><Label>Payment Type</Label><Input disabled value={voucher.payment_type} /></div>
                            <div className="space-y-1"><Label>Payment Mode</Label><Input disabled value={voucher.payment_mode} /></div>
                            <div className="space-y-1"><Label>Currency</Label><Input disabled value={voucher.currency} /></div>
                            <div className="space-y-1"><Label>Exchange Rate</Label><Input disabled value={voucher.exchange_rate} /></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>B. Payee Information</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1"><Label>Payee Type</Label><Input disabled value={voucher.payee_type} /></div>
                            <div className="space-y-1 md:col-span-2"><Label>Payee</Label><Input disabled value={voucher.payee_name} /></div>
                            <div className="space-y-1"><Label>Bank Name</Label><Input disabled value={voucher.payee_bank_name || 'N/A'} /></div>
                            <div className="space-y-1"><Label>Bank Account No</Label><Input disabled value={voucher.payee_bank_account_no || 'N/A'} /></div>
                            <div className="space-y-1"><Label>Tax ID (TIN)</Label><Input disabled value={voucher.payee_tax_id || 'N/A'} /></div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>C. Source Document & Narration</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1"><Label>Source Module</Label><Input disabled value={voucher.source_module} /></div>
                            <div className="space-y-1"><Label>Source Document No</Label><Input disabled value={voucher.source_document_no || 'N/A'} /></div>
                            <div className="space-y-1"><Label>Description / Narration</Label><Textarea disabled value={voucher.narration} /></div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>D. Line Items (Accounting Distribution)</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead>GL Account</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">VAT</TableHead>
                            <TableHead className="text-right">WHT</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {voucher.lineItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.account_name} ({item.gl_account_code})</TableCell>
                                    <TableCell>{item.line_description}</TableCell>
                                    <TableCell className="text-right">{Number(item.debit_amount).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{Number(item.vat_amount).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{Number(item.wht_amount).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>E. Tax Summary</CardTitle></CardHeader>
                    <CardContent className="space-y-2 font-mono text-sm">
                        <div className="flex justify-between"><span>Total Gross (Expense):</span><span>{Number(voucher.gross_amount).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span>Total Input VAT:</span><span>{Number(voucher.total_vat).toFixed(2)}</span></div>
                        <div className="flex justify-between text-red-600"><span>Total WHT Payable:</span><span>({Number(voucher.total_wht).toFixed(2)})</span></div>
                        <hr className="my-1"/>
                        <div className="flex justify-between font-bold"><span>Net Amount Payable:</span><span>{Number(voucher.net_payable).toFixed(2)}</span></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>F. Payment Details</CardTitle></CardHeader>
                     <CardContent className="grid grid-cols-2 gap-4">
                         <div className="space-y-1"><Label>Bank/Cash Account</Label><Input disabled value={voucher.bank_cash_account_code} /></div>
                         <div className="space-y-1"><Label>Cheque No / Ref</Label><Input disabled value={voucher.cheque_no_ref || 'N/A'} /></div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                 <CardHeader><CardTitle>G. Approval & Control</CardTitle></CardHeader>
                 <CardContent className="text-sm space-y-2">
                    <p><strong>Prepared By:</strong> {voucher.prepared_by}</p>
                    <p><strong>Reviewed By:</strong> {voucher.reviewed_by || 'N/A'}</p>
                    <p><strong>Approved By:</strong> {voucher.approved_by || 'N/A'}</p>
                    <p><strong>Approval Date:</strong> {voucher.approval_date ? new Date(voucher.approval_date).toLocaleString() : 'N/A'}</p>
                 </CardContent>
            </Card>

        </div>
    );
};

export default ViewPaymentVoucherPage;
