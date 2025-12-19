'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Supplier {
    id: string;
    name: string;
}

interface SelectPayeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectPayee: (payee: { id: string; name: string }) => void;
    suppliers: Supplier[];
}

export const SelectPayeeDialog: React.FC<SelectPayeeDialogProps> = ({ open, onOpenChange, onSelectPayee, suppliers }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSuppliers = suppliers && suppliers.length > 0 ? suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select a Payee</DialogTitle>
                    <DialogDescription>
                        Search for a supplier or create a new one.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {(!suppliers || suppliers.length === 0) ? (
                        <div className="text-center text-gray-500">
                            You have no suppliers on your list.
                        </div>
                    ) : (
                        <>
                            <Input
                                placeholder="Search suppliers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="mb-4"
                            />
                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {filteredSuppliers.length > 0 ? (
                                    filteredSuppliers.map((supplier) => (
                                        <Button
                                            key={supplier.id}
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => onSelectPayee(supplier)}
                                        >
                                            {supplier.name}
                                        </Button>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500">
                                        No suppliers found for your search.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};