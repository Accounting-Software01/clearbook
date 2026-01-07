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

interface ItemHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: { id: number; name: string; item_type: string } | null;
}

interface HistoryEntry {
  date: string;
  type: string;
  description: string;
  quantity: number;
  price: number | null;
  value: number | null;
}

// New interface for the processed data with running balances
interface ProcessedHistoryEntry {
    date: string;
    description: string;
    received_qty: number | null;
    received_price: number | null;
    received_value: number | null;
    issued_qty: number | null;
    issued_price: number | null;
    issued_value: number | null;
    balance_qty: number;
    balance_avg_price: number;
    balance_value: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString();
}

export const ItemHistoryDialog: React.FC<ItemHistoryDialogProps> = ({ open, onOpenChange, item }) => {
    const { user } = useAuth();
    const [processedHistory, setProcessedHistory] = useState<ProcessedHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndProcessHistory = async () => {
            if (!item || !user) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-item-history.php?item_id=${item.id}&company_id=${user.company_id}&item_type=${item.item_type}&user_role=${user.role}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch history');
                }
                const data = await response.json();

                if (data.status === 'success' && Array.isArray(data.history)) {
                    // Process the history data to include running balances
                    let runningQty = 0;
                    let runningValue = 0;
                    const processed = data.history.map((entry: HistoryEntry) => {
                        const isReceived = ['Opening Balance', 'Purchase', 'Production Output', 'Sales Return', 'Adjustment In'].includes(entry.type);
                        const isIssued = ['Sale', 'Production Use', 'Purchase Return', 'Adjustment Out'].includes(entry.type);

                        let received_qty = null, received_price = null, received_value = null;
                        let issued_qty = null, issued_price = null, issued_value = null;
                        
                        const quantity = parseFloat(entry.quantity as any) || 0;
                        const value = parseFloat(entry.value as any) || 0;

                        if (isReceived) {
                            runningQty += quantity;
                            runningValue += value;
                            received_qty = quantity;
                            received_value = value;
                            received_price = entry.price;
                        } else if (isIssued) {
                            runningQty -= quantity;
                            // For issued items, value is often based on the running average cost, which is handled here
                            const costOfGoodsSold = (runningValue / (runningQty + quantity)) * quantity;
                            runningValue -= costOfGoodsSold;
                            issued_qty = quantity;
                            issued_value = costOfGoodsSold;
                            issued_price = costOfGoodsSold / quantity;
                        }

                        const balance_qty = runningQty;
                        const balance_value = runningValue;
                        const balance_avg_price = balance_qty > 0 ? balance_value / balance_qty : 0;

                        return {
                            date: entry.date,
                            description: entry.description,
                            received_qty,
                            received_price,
                            received_value,
                            issued_qty,
                            issued_price,
                            issued_value,
                            balance_qty,
                            balance_avg_price,
                            balance_value,
                        };
                    });
                    setProcessedHistory(processed);
                } else {
                    setProcessedHistory([]);
                    if (data.status !== 'success') throw new Error(data.message || 'An unknown error occurred');
                }
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (open) {
            fetchAndProcessHistory();
        }
    }, [open, item, user]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Item Ledger: {item?.name}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 max-h-[70vh] overflow-y-auto">
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
                                    <TableHead rowSpan={2} className="py-4">Date</TableHead>
                                    <TableHead rowSpan={2}>Description</TableHead>
                                    <TableHead colSpan={user?.role !== 'staff' ? 3 : 1} className="text-center border-l">Received</TableHead>
                                    <TableHead colSpan={user?.role !== 'staff' ? 3 : 1} className="text-center border-l">Issued</TableHead>
                                    <TableHead colSpan={user?.role !== 'staff' ? 3 : 1} className="text-center border-l">Balance</TableHead>
                                </TableRow>
                                <TableRow>
                                    {/* Received */}
                                    <TableHead className="text-right border-l">Qty</TableHead>
                                    {user?.role !== 'staff' && <TableHead className="text-right">Price</TableHead>}
                                    {user?.role !== 'staff' && <TableHead className="text-right">Value</TableHead>}
                                    {/* Issued */}
                                    <TableHead className="text-right border-l">Qty</TableHead>
                                    {user?.role !== 'staff' && <TableHead className="text-right">Price</TableHead>}
                                    {user?.role !== 'staff' && <TableHead className="text-right">Value</TableHead>}
                                    {/* Balance */}
                                    <TableHead className="text-right border-l">Qty</TableHead>
                                    {user?.role !== 'staff' && <TableHead className="text-right">Avg. Price</TableHead>}
                                    {user?.role !== 'staff' && <TableHead className="text-right">Value</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedHistory.length > 0 ? processedHistory.map((entry, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                                        <TableCell>{entry.description}</TableCell>
                                        
                                        {/* Received */}
                                        <TableCell className="text-right border-l">{formatNumber(entry.received_qty)}</TableCell>
                                        {user?.role !== 'staff' && <TableCell className="text-right">{entry.received_price !== null ? formatCurrency(entry.received_price) : '-'}</TableCell>}
                                        {user?.role !== 'staff' && <TableCell className="text-right">{entry.received_value !== null ? formatCurrency(entry.received_value) : '-'}</TableCell>}
                                        
                                        {/* Issued */}
                                        <TableCell className="text-right border-l">{formatNumber(entry.issued_qty)}</TableCell>
                                        {user?.role !== 'staff' && <TableCell className="text-right">{entry.issued_price !== null ? formatCurrency(entry.issued_price) : '-'}</TableCell>}
                                        {user?.role !== 'staff' && <TableCell className="text-right">{entry.issued_value !== null ? formatCurrency(entry.issued_value) : '-'}</TableCell>}

                                        {/* Balance */}
                                        <TableCell className="text-right border-l font-medium">{entry.balance_qty.toLocaleString()}</TableCell>
                                        {user?.role !== 'staff' && <TableCell className="text-right font-medium">{formatCurrency(entry.balance_avg_price)}</TableCell>}
                                        {user?.role !== 'staff' && <TableCell className="text-right font-medium">{formatCurrency(entry.balance_value)}</TableCell>}
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={user?.role !== 'staff' ? 11 : 5} className="text-center py-10">No history found for this item.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};