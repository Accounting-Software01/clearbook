'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, BadgeCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Grn {
    id: string;
    grn_number: string;
    po_number: string;
    supplier_name: string;
    grn_date: string;
    status: string;
}

export function GrnApprovalList() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [grns, setGrns] = useState<Grn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPendingGrns = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            // You will need to create this API endpoint
            const url = `get-goods-received-notes.php?company_id=${user.company_id}&status=Pending`;
            const response = await api<{ grns: Grn[] }>(url);
            setGrns(response.grns || []);
        } catch (e: any) {
            console.error("API Error:", e);
            setError(e.message || "An error occurred while fetching GRNs.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchPendingGrns();
        }
    }, [fetchPendingGrns, user]);

    const handleApprove = async (grnId: string) => {
        // You will need to create this API endpoint
        toast({ title: "Coming Soon!", description: "GRN approval functionality is under development." });
        console.log("Approving GRN:", grnId);
    };

    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;

    return (
        <div>
            {grns.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No Goods Received Notes are pending approval.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>GRN Number</TableHead>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grns.map(grn => (
                            <TableRow key={grn.id}>
                                <TableCell className="font-medium">{grn.grn_number}</TableCell>
                                <TableCell>{grn.po_number}</TableCell>
                                <TableCell>{grn.supplier_name}</TableCell>
                                <TableCell>{new Date(grn.grn_date).toLocaleDateString()}</TableCell>
                                <TableCell className="text-center"><Badge variant="secondary">{grn.status}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => alert(`Viewing GRN ${grn.id}`)}>View</Button>
                                    <Button size="sm" onClick={() => handleApprove(grn.id)} className="ml-2">
                                        <BadgeCheck className="mr-2 h-4 w-4"/>Approve
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
