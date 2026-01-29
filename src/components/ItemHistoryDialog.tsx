'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';

// This interface is for the item being passed in
interface InventoryItem {
  id: number;
  name: string;
}

// **FIXED**: This interface now matches the actual API response data
interface LedgerEntry {
    date: string;
    type: string;
    description: string;
    quantity: number; // Corrected from quantity_change
    unit_cost: number | null;
    total_value: number | null; // Corrected from value_change
    balance_quantity: number;
    balance_avg_cost: number | null;
    balance_total_value: number | null;
}

// The props for your intelligent dialog
interface ItemHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  itemType: 'product' | 'raw_material'; // We need to know the type
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(value);
};

const ItemHistoryDialog: React.FC<ItemHistoryDialogProps> = ({ open, onOpenChange, item, itemType }) => {
  const { user } = useAuth(); // Needed for the API call
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This useEffect hook is preserved as you intended.
  useEffect(() => {
    if (open && item && user) {
      const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(
              `https://hariindustries.net/api/clearbook/get-item-history.php?company_id=${user.company_id}&item_id=${item.id}&item_type=${itemType}&user_role=${user.role}`
            
          );
          if (!response.ok) {
            throw new Error('Failed to fetch item history.');
          }
          const data = await response.json();
          if (data.status === 'success') {
            setHistory(data.history);
          } else {
            throw new Error(data.message || 'An unknown error occurred.');
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };

      fetchHistory();
    }
  }, [open, item, itemType, user]); // It re-runs if any of these change

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <DialogTitle>Item Ledger: {item?.name || ''}</DialogTitle>
          <DialogDescription>
            Detailed transaction history and running balance for the selected item.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-12 w-12 animate-spin" />
            </div>
          ) : error ? (
             <div className="flex flex-col items-center justify-center h-48 text-red-600">
                <AlertCircle className="h-10 w-10 mb-2" />
                <p className="font-semibold">Error Loading History</p>
                <p>{error}</p>
            </div>
          ) : (
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead rowSpan={2} className="text-center align-middle py-2">Date</TableHead>
                    <TableHead rowSpan={2} className="text-center align-middle">Transaction</TableHead>
                    <TableHead colSpan={3} className="text-center border-l border-r">In (Receipts / Production)</TableHead>
                    <TableHead colSpan={3} className="text-center border-r">Out (Issues / Sales)</TableHead>
                    <TableHead colSpan={3} className="text-center">Running Balance</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="text-right border-l">Qty</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right border-r">Value</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right border-r">Value</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Avg. Cost</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {history && history.length > 0 ? (
                  history.map((entry, index) => {
                    // **FIXED**: Logic now uses `entry.quantity` which exists in your data.
                    const isPositive = (entry.quantity ?? 0) > 0;
                    return (
                      <TableRow key={index} className={entry.type === 'Opening Balance' ? 'bg-secondary/50' : ''}>
                        <TableCell className="text-sm">{entry.date ? format(new Date(entry.date), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{entry.type}</div>
                          <div className="text-xs text-muted-foreground">{entry.description}</div>
                        </TableCell>
                        
                        {/* INFLOW - **FIXED**: Now reads from `quantity` and `total_value` */}
                        <TableCell className="text-right border-l text-green-600">{isPositive ? (entry.quantity ?? 0).toLocaleString() : ''}</TableCell>
                        <TableCell className="text-right text-green-600">{isPositive ? formatCurrency(entry.unit_cost) : ''}</TableCell>
                        <TableCell className="text-right border-r text-green-600">{isPositive ? formatCurrency(entry.total_value) : ''}</TableCell>

                        {/* OUTFLOW - **FIXED**: Now reads from `quantity` and `total_value` */}
                        <TableCell className="text-right text-red-600">{!isPositive ? Math.abs(entry.quantity ?? 0).toLocaleString() : ''}</TableCell>
                        <TableCell className="text-right text-red-600">{!isPositive ? formatCurrency(entry.unit_cost) : ''}</TableCell>
                        <TableCell className="text-right border-r text-red-600">{!isPositive ? formatCurrency(Math.abs(entry.total_value ?? 0)) : ''}</TableCell>

                        {/* BALANCE - Reads from the correct balance fields, which were already correct */}
                        <TableCell className="text-right font-bold">{(entry.balance_quantity ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(entry.balance_avg_cost)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(entry.balance_total_value)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                      No transaction history found for this item.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemHistoryDialog;
