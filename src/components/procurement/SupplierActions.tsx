'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';

interface Supplier {
    id: string;
    // Add other supplier properties if needed for delete/edit actions
    name: string; 
}

interface SupplierActionsProps {
    supplier: Supplier;
    onEdit: (supplier: Supplier) => void;
    onDelete: (supplier: Supplier) => void;
}

export function SupplierActions({ supplier, onEdit, onDelete }: SupplierActionsProps) {
    const { user } = useAuth();
    const router = useRouter();

    const isAdmin = user?.role === 'admin';

    const handleView = () => {
        router.push(`/procurement/suppliers/${supplier.id}`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleView}>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                </DropdownMenuItem>
                {isAdmin && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(supplier)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Supplier</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(supplier)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Supplier</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
