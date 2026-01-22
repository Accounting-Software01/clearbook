'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface CreditNoteItem {
    id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    tax_amount: number;
    line_total: number;
}

interface CreditNoteDetails {
    id: string;
    credit_note_number: string;
    credit_note_date: string;
    reason: string;
    notes: string;
    terms_and_conditions: string;
    subtotal: number;
    total_tax: number;
    total_discount: number;
    total_amount: number;
    status: 'draft' | 'posted' | 'cancelled';
    customer_name: string;
    created_by_name: string;
    items: CreditNoteItem[];
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || '-'}</p>
    </div>
);

export default function CreditNoteDetailPage() {
    const { user } = useAuth();
    const params = useParams();
    const id = params.id as string;

    const [creditNote, setCreditNote] = useState<CreditNoteDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.company_id || !id) return;

        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-credit-note-details.php?company_id=${user.company_id}&id=${id}`);
                const data = await response.json();

                if (response.ok && data) {
                    setCreditNote(data);
                } else {
                    throw new Error(data.error || 'Failed to fetch credit note details.');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [user, id]);

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-center py-20 text-red-500">Error: {error}</div>;
    }

    if (!creditNote) {
        return <div className="text-center py-20">Credit note not found.</div>;
    }
    
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'posted': return 'success';
            case 'draft': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'default';
        }
    };

    return (
        <div className="container mx-auto py-10 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Credit Note #{creditNote.credit_note_number}</h1>
                    <p className="text-muted-foreground">Details for the credit note.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4"/> Print</Button>
                    {creditNote.status === 'draft' && (
                        <Button>Post to Journals</Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Details</CardTitle>
                    <Badge variant={getStatusVariant(creditNote.status)} className="capitalize">{creditNote.status}</Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <DetailItem label="Customer" value={creditNote.customer_name} />
                    <DetailItem label="Credit Note Date" value={format(new Date(creditNote.credit_note_date), 'PPP')} />
                    <DetailItem label="Reason" value={creditNote.reason} />
                    <DetailItem label="Created By" value={creditNote.created_by_name} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Items</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Discount</TableHead>
                                <TableHead className="text-right">Tax</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {creditNote.items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.item_name}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                    <TableCell className="text-right text-red-500">-{formatCurrency(item.discount)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.tax_amount)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.line_total)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <div className="w-full max-w-sm space-y-4">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(creditNote.subtotal)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Discount</span><span className="text-red-500">-{formatCurrency(creditNote.total_discount)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Total Tax</span><span>{formatCurrency(creditNote.total_tax)}</span></div>
                        <div className="flex justify-between font-bold text-lg"><span>Grand Total</span><span>{formatCurrency(creditNote.total_amount)}</span></div>
                    </div>
                </CardFooter>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {creditNote.notes && (
                    <Card>
                        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{creditNote.notes}</p></CardContent>
                    </Card>
                )}
                {creditNote.terms_and_conditions && (
                    <Card>
                        <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{creditNote.terms_and_conditions}</p></CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
