'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from '@/lib/utils';

// Corrected status type to match backend
export type CreditNote = {
  id: string;
  credit_note_number: string;
  customer_name: string;
  credit_note_date: string;
  total_amount: number;
  status: 'draft' | 'posted' | 'cancelled'; // Updated status values
};

export const columns: ColumnDef<CreditNote>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'credit_note_number',
    header: 'Credit Note #',
    cell: ({ row }) => {
      const creditNote = row.original;
      return (
        <Link href={`/sales/credit-notes/${creditNote.id}`} className="font-medium text-blue-600 hover:underline">
          {creditNote.credit_note_number}
        </Link>
      );
    },
  },
  {
    accessorKey: 'customer_name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Customer
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'credit_note_date',
    header: 'Date',
    cell: ({ row }) => {
        const date = new Date(row.getValue('credit_note_date'));
        const formatted = date.toLocaleDateString();
        return <div className="font-medium">{formatted}</div>
    }
  },
  {
    accessorKey: 'total_amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total_amount'));
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as CreditNote['status'];
      // Updated badge logic to match new statuses
      const getStatusVariant = (status: string) => {
          switch (status) {
              case 'posted': return 'success';
              case 'draft': return 'secondary';
              case 'cancelled': return 'destructive';
              default: return 'outline';
          }
      };
      return <Badge variant={getStatusVariant(status)} className="capitalize">{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const creditNote = row.original;
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
                 <Link href={`/sales/credit-notes/${creditNote.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Post Journal</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Cancel Credit Note</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
