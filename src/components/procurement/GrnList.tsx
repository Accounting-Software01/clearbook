'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Eye, PlusCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface GrnSummary {
    id: number;
    grn_number: string;
    received_date: string;
    supplier_name: string;
    po_number: string;
    status: string;
}

interface GrnListProps {
    onViewDetails: (grnId: number) => void;
    onGoToCreate: () => void; // Function to switch view to the creation flow
}

export function GrnList({ onViewDetails, onGoToCreate }: GrnListProps) {
    const { user } = useAuth();
    const [grns, setGrns] = useState<GrnSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGrns = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await api<{ grns: GrnSummary[] }>(`get-grns.php?company_id=${user.company_id}`);
            setGrns(response.grns || []);
        } catch (e: any) {
            console.error("Error fetching GRNs:", e);
            setError("Failed to load Goods Received Notes. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id]);

    useEffect(() => {
        // Fetch GRNs when the component mounts
        fetchGrns();
    }, [fetchGrns]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Goods Received Notes</CardTitle>
                    <CardDescription>A list of all GRNs recorded for your company.</CardDescription>
                </div>
                <Button onClick={onGoToCreate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New GRN
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>GRN Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Received Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grns.length > 0 ? (
                            grns.map((grn) => (
                                <TableRow key={grn.id}>
                                    <TableCell className="font-medium">{grn.grn_number}</TableCell>
                                    <TableCell>{grn.supplier_name}</TableCell>
                                    <TableCell>{grn.po_number}</TableCell>
                                    <TableCell>{new Date(grn.received_date).toLocaleDateString()}</TableCell>
                                    <TableCell><Badge>{grn.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => onViewDetails(grn.id)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No Goods Received Notes found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
