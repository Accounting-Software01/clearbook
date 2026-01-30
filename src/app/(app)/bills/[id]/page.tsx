'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';

// --- TYPE DEFINITIONS ---
type BillItem = {
    description: string;
    quantity: number;
    unit_price: string;
    tax_rate: string;
    discount: string;
    line_total: string;
};

type BillDetails = {
    id: number;
    supplier_id: number; // <-- FIXED: Added this required field
    bill_date: string;
    due_date: string;
    supplier_name: string;
    supplier_address: string;
    supplier_tin: string;
    notes: string;
    terms_and_conditions: string;
    total_amount: string;
    status: string;
    items: BillItem[];
};

type PaymentAccount = {
    account_code: string;
    account_name: string;
};

// --- PAY BILL DIALOG COMPONENT ---
interface PayBillDialogProps {
    billId: string;
    companyId: string;
    userId: number;
    supplierId: number;
    totalAmount: number;
    onPaymentSuccess: () => void;
}

function PayBillDialog({ billId, companyId, userId, supplierId, totalAmount, onPaymentSuccess }: PayBillDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
    const [amount, setAmount] = useState(totalAmount.toFixed(2));
    const [paymentAccountId, setPaymentAccountId] = useState<string | undefined>();
    const [notes, setNotes] = useState('');
    const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchAccounts = async () => {
                try {
                    const res = await fetch(`https://hariindustries.net/api/clearbook/get_payment_accounts.php?company_id=${companyId}`);
                    const data = await res.json();
                    if (data.success) {
                        setAccounts(data.accounts);
                    } else {
                        toast({ variant: "destructive", title: "Error", description: data.message });
                    }
                } catch (error) {
                    toast({ variant: "destructive", title: "Network Error", description: "Failed to fetch payment accounts." });
                }
            };
            fetchAccounts();
        }
    }, [isOpen, companyId, toast]);

    const handleSubmit = async () => {
        if (!paymentDate || !amount || !paymentAccountId) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please fill all required fields." });
            return;
        }

        setIsSubmitting(true);
        const payload = {
            bill_id: billId,
            company_id: companyId,
            user_id: userId,
            supplier_id: supplierId,
            payment_date: paymentDate.toISOString().split('T')[0],
            amount: parseFloat(amount),
            payment_account_id: paymentAccountId,
            notes
        };

        try {
            const res = await fetch('https://hariindustries.net/api/clearbook/create_bill_payment.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                onPaymentSuccess();
                setIsOpen(false);
            } else {
                toast({ variant: "destructive", title: "Payment Failed", description: data.message });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Network Error", description: "Could not submit payment." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button disabled={totalAmount <= 0}>Pay Bill</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>Record a payment for Bill #{billId}.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="paymentDate" className="text-right">Payment Date</Label>
                        <div className="col-span-3">
                            <DatePicker date={paymentDate} setDate={setPaymentDate} />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount</Label>
                        <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="account" className="text-right">Pay From</Label>
                         <Select onValueChange={setPaymentAccountId} value={paymentAccountId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(acc => (
                                    <SelectItem key={acc.account_code} value={acc.account_code}>{acc.account_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">Notes</Label>
                        <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Confirm Payment'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN BILL DETAILS PAGE ---
const BillDetailsPage = () => {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const billId = params.id;

    const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchBillDetails = async () => {
        if (!user || !billId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`https://hariindustries.net/api/clearbook/get_bill_details.php?id=${billId}&company_id=${user.company_id}`);
            const data = await res.json();
            if (res.ok && data.success) {
                setBillDetails(data.data);
            } else {
                setError(data.message || 'Failed to fetch bill details.');
            }
        } catch (err) {
            setError('A network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBillDetails();
    }, [user, billId, refreshKey]);

    const handlePaymentSuccess = () => {
        toast({ title: "Success", description: "Payment recorded successfully." });
        setRefreshKey(prev => prev + 1);
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!billDetails) return <div className="p-4">No bill details found.</div>;

    const subtotal = billDetails.items.reduce((acc, item) => acc + (parseFloat(item.unit_price) * item.quantity), 0);
    const totalTax = billDetails.items.reduce((acc, item) => {
        const net = parseFloat(item.unit_price) * item.quantity * (1 - parseFloat(item.discount) / 100);
        return acc + (net * (parseFloat(item.tax_rate) / 100));
    }, 0);
    const totalDiscount = billDetails.items.reduce((acc, item) => acc + (parseFloat(item.unit_price) * item.quantity * (parseFloat(item.discount) / 100)), 0);

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Bill Details</h1>
                <Button variant="outline" onClick={() => router.push('/bills')}>Back to All Bills</Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-3xl">BILL-{billDetails.id}</CardTitle>
                            <CardDescription>Bill Date: {new Date(billDetails.bill_date).toLocaleDateString()}</CardDescription>
                        </div>
                        <Badge variant={billDetails.status === 'Paid' ? 'default' : 'secondary'}>{billDetails.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* ... content as before ... */}
                     <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 className="font-semibold mb-2">Supplier</h3>
                            <p className="font-bold text-lg">{billDetails.supplier_name}</p>
                            <p className="text-sm text-gray-600">{billDetails.supplier_address || 'No address provided'}</p>
                            {billDetails.supplier_tin && <p className="text-sm text-gray-600">TIN: {billDetails.supplier_tin}</p>}
                        </div>
                        <div className="text-right">
                             <h3 className="font-semibold mb-2">Payment Details</h3>
                             <p>Due Date: {new Date(billDetails.due_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <Separator className="my-4" />
                    <h3 className="font-semibold mb-2">Items</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {billDetails.items.map((item, index) => {
                                const lineTotal = parseFloat(item.unit_price) * item.quantity;
                                return (
                                <TableRow key={index}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">₦{parseFloat(item.unit_price).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">₦{lineTotal.toFixed(2)}</TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    <Separator className="my-4" />
                     <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between"><span>Subtotal:</span><span>₦{subtotal.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Discount:</span><span className="text-red-500">-₦{totalDiscount.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Tax:</span><span>₦{totalTax.toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold text-lg"><span>Total Amount:</span><span>₦{parseFloat(billDetails.total_amount).toFixed(2)}</span></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2 mt-6">
                    <Button variant="outline">Print</Button>
                    {billDetails.status !== 'paid' && (
                        <PayBillDialog
                            billId={billId as string}
                            companyId={user?.company_id ?? ''}
                            userId={user?.uid ?? 0}
                            supplierId={billDetails.supplier_id}
                            totalAmount={parseFloat(billDetails.total_amount)}
                            onPaymentSuccess={handlePaymentSuccess}
                        />
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default BillDetailsPage;
