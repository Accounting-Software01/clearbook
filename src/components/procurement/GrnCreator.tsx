'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface PurchaseOrderLine {
    id: number;
    description: string;
    quantity: number;
    quantity_received?: number;
}

interface PurchaseOrderDetails {
    id: string;
    po_number: string;
    supplier_name: string;
    po_date: string;
    items: PurchaseOrderLine[];
}

interface GrnCreatorProps {
    poId: string;
    onGrnCreated: () => void; 
    onCancel: () => void;
}

interface GrnLine extends PurchaseOrderLine {
    receiving_now: number;
}

export function GrnCreator({ poId, onGrnCreated, onCancel }: GrnCreatorProps) {
    const { toast } = useToast();
    const { user } = useAuth(); // Get user for company_id and user_id
    const [order, setOrder] = useState<PurchaseOrderDetails | null>(null);
    const [lines, setLines] = useState<GrnLine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [grnDate, setGrnDate] = useState(new Date());

    const fetchPoDetails = useCallback(async () => {
        if (!user?.company_id || !poId) return;
        setIsLoading(true);
        try {
            const response = await api<{ purchase_orders: PurchaseOrderDetails[] }>(`get-purchase-orders.php?company_id=${user.company_id}&id=${poId}`);
            const orderData = response.purchase_orders[0];

            if (!orderData) {
                throw new Error("Purchase Order not found or API did not return expected data.");
            }
            
            setOrder(orderData);
            
            const initialGrnLines = orderData.items.map(line => ({
                ...line,
                receiving_now: line.quantity - (line.quantity_received || 0)
            }));
            setLines(initialGrnLines);

        } catch (e: any) {
            console.error("Error fetching PO details:", e);
            setError("Failed to load purchase order details. " + e.message);
        } finally {
            setIsLoading(false);
        }
    }, [poId, user?.company_id]);

    useEffect(() => {
        if(user) {
            fetchPoDetails();
        }
    }, [fetchPoDetails, user]);

    const handleQuantityChange = (lineId: number, newQuantity: number) => {
        setLines(lines.map(line => {
            if (line.id === lineId) {
                const orderedQty = line.quantity;
                const alreadyReceived = line.quantity_received || 0;
                const maxReceivable = orderedQty - alreadyReceived;

                let validatedQty = isNaN(newQuantity) ? 0 : newQuantity;
                if (validatedQty < 0) validatedQty = 0;
                if (validatedQty > maxReceivable) validatedQty = maxReceivable;
                
                return { ...line, receiving_now: validatedQty };
            }
            return line;
        }));
    };

    const handleSubmitGrn = async () => {
        if (!user?.company_id || !user?.uid) {
            toast({ variant: "destructive", title: "Authentication Error", description: "User information is missing. Please log in again." });
            return;
        }

        const receivedLines = lines
            .filter(line => line.receiving_now > 0)
            .map(line => ({
                po_item_id: line.id,
                quantity_received: line.receiving_now,
            }));

        if (receivedLines.length === 0) {
            toast({ variant: "destructive", title: "Validation Error", description: "You must enter a quantity for at least one item." });
            return;
        }

        setIsSubmitting(true);
        const grnData = {
            company_id: user.company_id,
            user_id: user.uid, // <-- ADDED THIS LINE
            purchase_order_id: poId,
            grn_date: grnDate.toISOString().split('T')[0],
            lines: receivedLines,
        };

        // **** I HAVE ADDED THIS LOG ****
        console.log("Submitting GRN with the following company_id:", user.company_id);

        try {
            await api('create-grn.php', { method: 'POST', body: JSON.stringify(grnData) });
            toast({ title: "Success", description: "Goods Received Note and corresponding journal entry have been created." });
            onGrnCreated(); // Callback to refresh the list and go back
        } catch (e: any) {
            toast({ variant: "destructive", title: "Submission Failed", description: e.message || "An unknown error occurred while creating the GRN." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    if (error) return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;
    if (!order) return null;

    return (
        <Card className="mt-4 border-t-4 border-green-600 shadow-lg">
            <CardHeader className="flex flex-row items-start justify-between bg-muted/50 p-4">
                <div>
                    <CardTitle className="text-xl">Create GRN for PO: {order.po_number}</CardTitle>
                    <CardDescription>Enter the quantities received for each item below.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={onCancel}> <ArrowLeft className="mr-2 h-4 w-4"/>Back to List</Button>
            </CardHeader>
            <CardContent className="p-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm p-4 bg-muted/30 rounded-lg">
                    <div><Label className="font-semibold">Supplier:</Label> <p>{order.supplier_name}</p></div>
                    <div><Label className="font-semibold">PO Date:</Label> <p>{new Date(order.po_date).toLocaleDateString()}</p></div>
                     <div><Label htmlFor="grnDate">GRN Date:</Label><Input id="grnDate" type="date" value={grnDate.toISOString().split('T')[0]} onChange={e => setGrnDate(new Date(e.target.value))} /></div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/2">Item Description</TableHead>
                            <TableHead className="text-center">Ordered</TableHead>
                            <TableHead className="text-center">Received</TableHead>
                            <TableHead className="w-40 text-center font-bold">Receiving Now</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map(line => (
                            <TableRow key={line.id}>
                                <TableCell className="font-medium">{line.description}</TableCell>
                                <TableCell className="text-center">{line.quantity}</TableCell>
                                <TableCell className="text-center">{line.quantity_received || 0}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number"
                                        className="text-center font-semibold"
                                        value={line.receiving_now}
                                        onChange={e => handleQuantityChange(line.id, e.target.valueAsNumber)}
                                        max={line.quantity - (line.quantity_received || 0)}
                                        min={0}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="flex justify-end p-4 bg-muted/50">
                <Button onClick={handleSubmitGrn} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                    Save GRN
                </Button>
            </CardFooter>
        </Card>
    );
}
