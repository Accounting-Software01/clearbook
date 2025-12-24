
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, PlusCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { GrnCreator } from './GrnCreator';

// Simplified type to match the actual API response for the list view
interface PurchaseOrderForList {
    id: string;
    po_number: string;
    supplier_name: string; // Corrected from supplier.name
    po_date: string;       // Corrected from order_date
    status: string;
}

export function GrnTabContent() {
    const { user } = useAuth();
    const [selectableOrders, setSelectableOrders] = useState<PurchaseOrderForList[]>([]);
    const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSelectableOrders = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            // Correctly construct the URL with the company_id query parameter
            const url = `get-purchase-orders.php?company_id=${user.company_id}`;
            const orders = await api<PurchaseOrderForList[]>(url);

            // Filter for orders that can be received against ('Approved' or 'Partially Received')
            const openOrders = orders.filter(
                po => po.status === 'Approved' || po.status === 'Partially Received'
            );
            setSelectableOrders(openOrders);
        } catch (e: any) {
            console.error("API Error:", e);
            setError("An error occurred while fetching orders.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!selectedPoId) {
            fetchSelectableOrders();
        }
    }, [fetchSelectableOrders, selectedPoId]);

    const handleGrnCreated = () => {
        setSelectedPoId(null); // Go back to the list view
        fetchSelectableOrders(); // Refresh the list of orders
    };
    
    const handleCancel = () => {
        setSelectedPoId(null);
    };

    // If a PO is selected, show the GRN creation screen
    if (selectedPoId) {
        return <GrnCreator poId={selectedPoId} onGrnCreated={handleGrnCreated} onCancel={handleCancel} />;
    }

    // Display loading or error states
    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;

    // Display the list of selectable purchase orders
    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Goods Received Note (GRN)</CardTitle>
                <CardDescription>Select an approved Purchase Order to receive items against.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>PO Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {selectableOrders.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10">No approved purchase orders available to receive against.</TableCell></TableRow>
                        ) : selectableOrders.map(po => (
                            <TableRow key={po.id}>
                                <TableCell className="font-mono">{po.po_number}</TableCell>
                                <TableCell>{po.supplier_name}</TableCell> {/* Corrected */} 
                                <TableCell>{new Date(po.po_date).toLocaleDateString()}</TableCell> {/* Corrected and formatted */}
                                <TableCell>{po.status}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => setSelectedPoId(po.id)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Receive Items
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
