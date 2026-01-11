'use client';

import React, { useState, useEffect } from 'react';
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { Supplier } from '@/types/supplier';
import { TaxAuthority } from '@/types/tax-authority';
import { cn } from '@/lib/utils';

interface PayeeComboboxProps {
    payeeType: 'Supplier' | 'Govt';
    onSelectPayee: (payee: Supplier | TaxAuthority) => void;
    selectedPayee: Supplier | TaxAuthority | null;
}

export const PayeeCombobox: React.FC<PayeeComboboxProps> = ({ payeeType, onSelectPayee, selectedPayee }) => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [payees, setPayees] = useState<(Supplier | TaxAuthority)[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.company_id) return;

        const fetchPayees = async () => {
            setIsLoading(true);
            setError(null);
            setPayees([]);
            const baseUrl = 'https://hariindustries.net/api/clearbook';
            const endpoint = payeeType === 'Supplier' ? '/get_suppliers.php' : '/get_tax_authorities.php';
            const url = `${baseUrl}${endpoint}?company_id=${user.company_id}`;

            try {
                const response = await fetch(url);

                if (!response.ok) {
                    let errorText = `HTTP error! status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorText = errorData.message || errorData.error || JSON.stringify(errorData);
                    } catch (jsonError) {
                        errorText = response.statusText;
                    }
                    throw new Error(errorText);
                }

                const result = await response.json();

                if (result.success) {
                    const data = payeeType === 'Supplier' ? result.suppliers : result.authorities;
                    if (Array.isArray(data)) {
                        setPayees(data);
                    } else {
                        throw new Error(`API response for ${payeeType} is not an array.`);
                    }
                } else {
                    throw new Error(result.message || `Failed to fetch ${payeeType}s.`);
                }

            } catch (err: any) {
                console.error(`Error fetching ${payeeType}s:`, err.message);
                setError(`Failed to load ${payeeType}s. Check console for details.`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPayees();
    }, [user?.company_id, payeeType]);

    const handleSelect = (payee: Supplier | TaxAuthority) => {
        onSelectPayee(payee);
        setOpen(false);
    };

    const selectedValue = selectedPayee ? selectedPayee.id.toString() : "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedPayee
                        ? payees.find((payee) => payee.id.toString() === selectedValue)?.name
                        : `Select ${payeeType}...`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                <Command>
                    <CommandInput placeholder={`Search ${payeeType}...`} />
                    <CommandList>
                        <CommandEmpty>
                            {isLoading ? 'Loading...' : error ? error : `No ${payeeType} found.`}
                        </CommandEmpty>
                        <CommandGroup>
                            {payees.map((payee) => (
                                <CommandItem
                                    key={payee.id}
                                    value={payee.id.toString()}
                                    onSelect={(currentValue) => {
                                        const selected = payees.find(p => p.id.toString() === currentValue);
                                        if(selected) handleSelect(selected);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedValue === payee.id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {payee.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
