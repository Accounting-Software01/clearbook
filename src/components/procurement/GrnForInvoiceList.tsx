
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FilePlus, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GrnForInvoice {
    id: number;
    grn_number: string;
    received_date: string;
    supplier_name: string;
    po_number: string;
    supplier_id: number;
    purchase_order_id: number;
    is_invoiced: 0 | 1;
}

export function GrnForInvoiceList() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [grns, setGrns] = useState<GrnForInvoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<number | null>(null);

    const fetchGrnsForInvoicing = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const response = await api<{ grns: GrnForInvoice[] }>(`get-grns-for-invoicing.php?company_id=${user.company_id}`);
            // Sort the GRNs so that uninvoiced ones (is_invoiced === 0) come first
            const sortedGrns = (response.grns || []).sort((a, b) => a.is_invoiced - b.is_invoiced);
            setGrns(sortedGrns);
        } catch (e: any) {
            setError("Failed to load GRNs.");
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id]);

    useEffect(() => {
        fetchGrnsForInvoicing();
    }, [fetchGrnsForInvoicing]);

    const handleGenerateInvoice = async (grn: GrnForInvoice) => {
        if (!user || !user.company_id || !user.uid) {
            toast({ title: "Authentication Error", description: "Please log in again.", variant: "destructive" });
            return;
        }
        
        setIsGenerating(grn.id);

        try {
            const invoiceData = {
                company_id: user.company_id,
                grn_id: grn.id,
                supplier_id: grn.supplier_id,
                purchase_order_id: grn.purchase_order_id,
                created_by: user.uid,
            };

            await api('create-invoice-from-grn.php', { 
                method: 'POST', 
                body: JSON.stringify(invoiceData) 
            });

            toast({
                title: "Invoice Generated",
                description: "Supplier invoice created and is now awaiting approval.",
            });

            fetchGrnsForInvoicing(); // Re-fetch and re-sort the list

        } catch (e: any) {
             toast({
                title: "Generation Failed",
                description: e.message || "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setIsGenerating(null);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /> <p>{error}</p></div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>GRNs for Invoicing</CardTitle>
                <CardDescription>Generate supplier invoices from Goods Received Notes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>GRN Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Received Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grns.length > 0 ? (
                            grns.map(grn => (
                                <TableRow key={grn.id} className={grn.is_invoiced ? 'bg-muted/50' : ''}>
                                    <TableCell className="font-medium">{grn.grn_number}</TableCell>
                                    <TableCell>{grn.supplier_name}</TableCell>
                                    <TableCell>{grn.po_number}</TableCell>
                                    <TableCell>{new Date(grn.received_date).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleGenerateInvoice(grn)}
                                            disabled={grn.is_invoiced === 1 || isGenerating === grn.id}
                                        >
                                            {grn.is_invoiced === 1 ? (
                                                <><CheckCircle className="mr-2 h-4 w-4" /> Submitted</>
                                            ) : isGenerating === grn.id ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                                            ) : (
                                                <><FilePlus className="mr-2 h-4 w-4" /> Generate Invoice</>
                                            )}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">No GRNs found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
