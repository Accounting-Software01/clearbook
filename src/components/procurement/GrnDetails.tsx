'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface GrnItem {
    id: number;
    raw_material_name: string;
    description: string;
    quantity_received: number;
}

interface GrnDetailsData {
    id: number;
    grn_number: string;
    received_date: string;
    supplier_name: string;
    po_number: string;
    items: GrnItem[];
}

interface GrnDetailsProps {
    grnId: number;
    onBack: () => void;
}

export function GrnDetails({ grnId, onBack }: GrnDetailsProps) {
    const { user } = useAuth();
    const [grn, setGrn] = useState<GrnDetailsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGrnDetails = useCallback(async () => {
        if (!user?.company_id || !grnId) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await api<{ grn: GrnDetailsData }>(`get-grns.php?company_id=${user.company_id}&id=${grnId}`);
            if (response.grn) {
                setGrn(response.grn);
            } else {
                throw new Error("GRN details not found.");
            }
        } catch (e: any) {
            console.error("Error fetching GRN details:", e);
            setError("Failed to load GRN details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, grnId]);

    useEffect(() => {
        fetchGrnDetails();
    }, [fetchGrnDetails]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (error) {
        return (
            <div className="text-destructive text-center py-10">
                <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                <p>{error}</p>
                <Button onClick={onBack} variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to List
                </Button>
            </div>
        );
    }

    if (!grn) return null;

    return (
        <Card className="border-t-4 border-blue-600 shadow-lg">
            <CardHeader className="bg-muted/50 p-4">
                 <div className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-xl">GRN Details: {grn.grn_number}</CardTitle>
                        <CardDescription>Details for Goods Received Note.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4"/> Back to List
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm p-4 bg-muted/30 rounded-lg">
                    <div><p className="font-semibold">Supplier:</p> <p>{grn.supplier_name}</p></div>
                    <div><p className="font-semibold">PO Number:</p> <p>{grn.po_number}</p></div>
                    <div><p className="font-semibold">Received Date:</p> <p>{new Date(grn.received_date).toLocaleDateString()}</p></div>
                </div>

                <h3 className="font-bold text-lg mb-2">Items Received</h3>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Quantity Received</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {grn.items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.raw_material_name}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell className="text-right font-medium">{item.quantity_received}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
             <CardFooter className="p-4 bg-muted/50 text-xs text-muted-foreground">
                GRN ID: {grn.id}
            </CardFooter>
        </Card>
    );
}
