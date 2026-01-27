'use client';

import React from 'react';
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
import { format } from 'date-fns';

// New interface matching the backend response
interface LedgerEntry {
  date: string;
  type: string;
  description: string;
  quantity: number;
  unit_cost: number | null;
  total_value: number | null;
  balance_quantity: number;
  balance_avg_cost: number | null;
  balance_total_value: number | null;
}

interface ItemHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  history: LedgerEntry[];
  itemName: string;
}

// Helper for formatting currency
const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);
};

const ItemHistoryDialog: React.FC<ItemHistoryDialogProps> = ({ isOpen, onClose, history, itemName }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <DialogTitle>Item Ledger: {itemName}</DialogTitle>
          <DialogDescription>
            Detailed transaction history and running balance for the selected item.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead rowSpan={2} className="text-center align-middle">Date</TableHead>
                <TableHead rowSpan={2} className="text-center align-middle">Description</TableHead>
                <TableHead colSpan={3} className="text-center border-l border-r">Received / Produced</TableHead>
                <TableHead colSpan={3} className="text-center border-r">Issued / Sold</TableHead>
                <TableHead colSpan={3} className="text-center">Balance</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-right border-l">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right border-r">Value</TableHead>
                
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right border-r">Value</TableHead>

                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Avg. Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history && history.length > 0 ? (
                history.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{entry.type}</div>
                      <div className="text-xs text-muted-foreground">{entry.description}</div>
                    </TableCell>
                    
                    {/* Received Column */}
                    {entry.quantity > 0 ? (
                      <>
                        <TableCell className="text-right border-l">{entry.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.unit_cost)}</TableCell>
                        <TableCell className="text-right border-r">{formatCurrency(entry.total_value)}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="border-l"></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="border-r"></TableCell>
                      </>
                    )}

                    {/* Issued Column */}
                    {entry.quantity < 0 ? (
                      <>
                        <TableCell className="text-right text-red-600">{Math.abs(entry.quantity).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(entry.unit_cost)}</TableCell>
                        <TableCell className="text-right text-red-600 border-r">{formatCurrency(Math.abs(entry.total_value ?? 0))}</TableCell>
                      </>
                    ) : (
                       <>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="border-r"></TableCell>
                      </>
                    )}

                    {/* Balance Column */}
                    <TableCell className="text-right font-bold">{entry.balance_quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(entry.balance_avg_cost)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(entry.balance_total_value)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    No transaction history found for this item.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ItemHistoryDialog;