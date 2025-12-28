'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Supplier } from '@/types/supplier'; // Assuming you have a Supplier type
import { Loader2 } from 'lucide-react';

interface SelectPayeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPayee: (payee: Supplier) => void;
  payeeType: 'Supplier' | 'Staff' | 'Govt' | 'Other';
}

export const SelectPayeeDialog: React.FC<SelectPayeeDialogProps> = ({ open, onOpenChange, onSelectPayee, payeeType }) => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Supplier[]>([]);

    useEffect(() => {
        if (open && user?.company_id) {
            const fetchPayees = async () => {
                setLoading(true);
                try {
                    // This will be expanded for other payee types
                    if (payeeType === 'Supplier') {
                        const data = await api<Supplier[]>(`suppliers.php?company_id=${user.company_id}&search=${searchTerm}`);
                        setResults(data);
                    }
                    // Add else if for 'Staff', 'Govt' etc. later
                } catch (error) {
                    console.error("Failed to fetch payees", error);
                    // Add toast notification for error
                } finally {
                    setLoading(false);
                }
            };

            const debounceFetch = setTimeout(fetchPayees, 300); // Debounce API calls
            return () => clearTimeout(debounceFetch);
        }
    }, [open, searchTerm, payeeType, user?.company_id]);

    const handleSelect = (payee: Supplier) => {
        onSelectPayee(payee);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Select {payeeType}</DialogTitle>
                    <DialogDescription>Search for a payee by name or code.</DialogDescription>
                </DialogHeader>
                <Command>
                    <CommandInput 
                        placeholder="Type to search..." 
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <CommandList>
                        {loading && <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                        {!loading && (
                            <>
                                <CommandEmpty>No results found.</CommandEmpty>
                                <CommandGroup heading="Results">
                                    {results.map((item) => (
                                        <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                                            {item.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
};
