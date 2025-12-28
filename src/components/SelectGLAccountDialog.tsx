'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import { Loader2 } from 'lucide-react';

interface SelectGLAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAccount: (account: Account) => void;
}

export const SelectGLAccountDialog: React.FC<SelectGLAccountDialogProps> = ({ open, onOpenChange, onSelectAccount }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Account[]>([]);

    useEffect(() => {
        if (open) {
            setLoading(true);
            const filteredAccounts = chartOfAccounts.filter(acc => 
                acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                acc.code.includes(searchTerm)
            );
            setResults(filteredAccounts);
            setLoading(false);
        }
    }, [open, searchTerm]);

    const handleSelect = (account: Account) => {
        onSelectAccount(account);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Select GL Account</DialogTitle>
                    <DialogDescription>Search for a GL account by name or code.</DialogDescription>
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
                                        <CommandItem key={item.code} onSelect={() => handleSelect(item)}>
                                            <div className="flex justify-between w-full">
                                                <span>{item.name}</span>
                                                <span className="text-gray-500 font-mono">{item.code}</span>
                                            </div>
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
