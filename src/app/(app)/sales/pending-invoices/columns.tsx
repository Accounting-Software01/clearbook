'use client'

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Invoice = {
  id: string
  invoice_number: string
  customer_name: string
  invoice_date: string
  due_date: string
  total_amount: number
  amount_paid: number
  amount_due: number
  status: "ISSUED" | "PARTIAL" | "OVERDUE" | "PAID"
}

const currencyFormatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

export const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Invoice #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "customer_name",
    header: "Customer",
  },
  {
    accessorKey: "invoice_date",
    header: "Invoice Date",
    cell: ({ row }) => new Date(row.original.invoice_date).toLocaleDateString(),
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => new Date(row.original.due_date).toLocaleDateString(),
  },
  {
    accessorKey: "total_amount",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total_amount"))
      return <div className="text-right font-medium">{currencyFormatter.format(amount)}</div>
    },
  },
  {
    accessorKey: "amount_due",
    header: () => <div className="text-right">Amount Due</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount_due"))
      return <div className="text-right font-medium">{currencyFormatter.format(amount)}</div>
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
      if (status === 'OVERDUE') variant = 'destructive';
      if (status === 'PARTIAL') variant = 'outline';
      return <Badge variant={variant}>{status}</Badge>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original
 
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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(invoice.invoice_number)}
            >
              Copy Invoice ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Customer</DropdownMenuItem>
            <DropdownMenuItem>View Invoice Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
