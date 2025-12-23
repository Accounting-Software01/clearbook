
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { PurchaseOrderDetails, PurchaseOrderLine } from '@/types/purchase-order';

interface GrnCreatorProps {
    poId: string;
    onGrnCreated: () => void; 
    onCancel: () => void; // Function to go back to the list
}

interface GrnLine extends PurchaseOrderLine {
    receiving_now: number;
}

export function GrnCreator({ poId, onGrnCreated, onCancel }: GrnCreatorProps) {
    const { toast } = useToast();
    const [order, setOrder] = useState<PurchaseOrderDetails | null>(null);
    const [lines, setLines] = useState<GrnLine[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [grnDate, setGrnDate] = useState(new Date());

    useEffect(() => {
        const fetchPoDetails = async () => {
            setIsLoading(true);
            try {
                const data = await api<PurchaseOrderDetails>(`purchase-order-details.php?id=${poId}`);
                setOrder(data);
                
                const initialGrnLines = data.lines.map(line => ({
                    ...line,
                    receiving_now: line.quantity - (line.quantity_received || 0)
                }));
                setLines(initialGrnLines);

            } catch (e: any) {
                setError("Failed to load purchase order details.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPoDetails();
    }, [poId]);

    const handleQuantityChange = (lineId: string, newQuantity: number) => {
        setLines(lines.map(line => {
            const orderedQty = line.quantity;
            const alreadyReceived = line.quantity_received || 0;
            const maxReceivable = orderedQty - alreadyReceived;

            if (line.id === lineId) {
                let validatedQty = newQuantity;
                if (newQuantity < 0) validatedQty = 0;
                if (newQuantity > maxReceivable) validatedQty = maxReceivable;
                
                return { ...line, receiving_now: validatedQty };
            }
            return line;
        }));
    };

    const handleSubmitGrn = async () => {
        setIsSubmitting(true);

        const receivedLines = lines
            .filter(line => line.receiving_now > 0)
            .map(line => ({
                po_item_id: line.id,
                quantity_received: line.receiving_now,
            }));

        if (receivedLines.length === 0) {
            toast({ variant: "destructive", title: "Validation Error", description: "You must receive at least one item." });
            setIsSubmitting(false);
            return;
        }

        const grnData = {
            purchase_order_id: poId,
            grn_date: grnDate.toISOString().split('T')[0],
            lines: receivedLines,
        };

        try {
            await api('create-grn.php', { method: 'POST', body: grnData });
            toast({ title: "Success", description: "Goods Received Note created successfully." });
            onGrnCreated();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Submission Failed", description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (error) return <div className="text-destructive text-center"><AlertCircle className="mx-auto mb-2" />{error}</div>;
    if (!order) return null;

    return (
        <Card className="mt-6 border-green-500">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Create GRN for PO: {order.po_number}</CardTitle>
                    <CardDescription>Enter the quantities of items you are receiving.</CardDescription>
                </div>
                <Button variant="outline" onClick={onCancel}> <ArrowLeft className="mr-2 h-4 w-4"/> Back to PO List</Button>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div><span className="font-semibold">Supplier:</span> {order.supplier_name}</div>
                    <div><span className="font-semibold">PO Date:</span> {order.po_date}</div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item Description</TableHead>
                            <TableHead>Ordered</TableHead>
                            <TableHead>Received so far</TableHead>
                            <TableHead className="w-40">Receiving Now</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lines.map(line => (
                            <TableRow key={line.id}>
                                <TableCell>{line.description}</TableCell>
                                <TableCell>{line.quantity}</TableCell>
                                <TableCell>{line.quantity_received || 0}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number"
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
            <CardFooter className="flex justify-end">
                <Button onClick={handleSubmitGrn} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4"/>}
                    Save GRN
                </Button>
            </CardFooter>
        </Card>
    );
}
