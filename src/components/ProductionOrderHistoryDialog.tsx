'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ProductionOrderHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: { id: number; product_name: string } | null;
}

interface HistoryEntry {
  date: string;
  type: string;
  description: string;
  quantity: number;
  price: number | null;
  value: number | null;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

export const ProductionOrderHistoryDialog: React.FC<ProductionOrderHistoryDialogProps> = ({ open, onOpenChange, order }) => {
    const { user } = useAuth();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!order || !user) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/clearbook/get-production-order-history?production_order_id=${order.id}&company_id=${user.company_id}&user_role=${user.role}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch history');
                }
                const data = await response.json();
                if (data.status === 'success') {
                    setHistory(data.history);
                } else {
                    throw new Error(data.message || 'An unknown error occurred');
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (open) {
            fetchHistory();
        }
    }, [open, order, user]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Production Order History: #{order?.id} - {order?.product_name}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-destructive/10 text-destructive rounded-lg">
                            <AlertCircle className="h-10 w-10 mb-2" />
                            <p className="text-lg font-semibold">An Error Occurred</p>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    {user?.role !== 'staff' && <TableHead className="text-right">Price</TableHead>}
                                    {user?.role !== 'staff' && <TableHead className="text-right">Value</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((entry, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{entry.type}</TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        <TableCell className="text-right">{entry.quantity.toLocaleString()}</TableCell>
                                        {user?.role !== 'staff' && <TableCell className="text-right">{entry.price !== null ? formatCurrency(entry.price) : 'N/A'}</TableCell>}
                                        {user?.role !== 'staff' && <TableCell className="text-right">{entry.value !== null ? formatCurrency(entry.value) : 'N/A'}</TableCell>}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
