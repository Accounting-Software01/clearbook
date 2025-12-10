'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle } from "lucide-react";
import type { Payee } from '@/types/payee';


interface PayeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPayee: (payee: Payee) => void;
}

export function PayeeDialog({ open, onOpenChange, onSelectPayee }: PayeeDialogProps) {
    const [payees, setPayees] = useState<Payee[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (open) {
            const fetchPayees = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const response = await fetch('https://hariindustries.net/busa-api/database/get-payees.php');
                    if (!response.ok) {
                        throw new Error('Failed to fetch payees from the server.');
                    }
                    const data: Payee[] = await response.json();
                    setPayees(data);
                } catch (e: any) {
                    setError('Failed to fetch payees.');
                    console.error(e);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPayees();
        }
    }, [open]);

    const filteredPayees = useMemo(() => {
        return payees.filter(payee => 
            payee.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [payees, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select a Payee</DialogTitle>
          <DialogDescription>
            Choose a customer or supplier from your records.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <Input 
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <ScrollArea className="h-72 w-full rounded-md border">
                <div className="p-4">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col justify-center items-center h-full text-destructive">
                            <AlertCircle className="h-6 w-6 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                           {filteredPayees.map(payee => (
                               <li 
                                    key={payee.id}
                                    onClick={() => onSelectPayee(payee)}
                                    className="p-2 rounded-md hover:bg-muted cursor-pointer flex justify-between items-center"
                                >
                                   <span>{payee.name}</span>
                                   <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">{payee.type}</span>
                               </li>
                           ))}
                        </ul>
                    )}
                     {!isLoading && !error && filteredPayees.length === 0 && (
                        <p className="text-center text-muted-foreground p-4">No payees found.</p>
                    )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
