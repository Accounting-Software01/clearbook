'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// lucide-react icons
import { ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PlusCircle, Search, MoreHorizontal } from "lucide-react";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { RegisterCustomerDialog } from '@/components/RegisterCustomerDialog';
import { RecordOpeningBalanceDialog } from '@/components/RecordOpeningBalanceDialog';

// Define your Customer data type
interface Customer {
  id: string; // Added an ID for better key management in tables
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  type: 'Business' | 'Individual' | 'Walkin';
}

// Dummy data for demonstration
const defaultCustomers: Customer[] = [
  {
    id: '1',
    customerCode: 'CUST-000001',
    name: 'Acme Corporation',
    email: 'info@acmecorp.com',
    phone: '+234-801-234-5678',
    type: 'Business',
  },
  {
    id: '2',
    customerCode: 'CUST-000003',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+234-803-456-7890',
    type: 'Individual',
  },
  {
    id: '3',
    customerCode: 'CUST-000002',
    name: 'Tech Solutions Ltd',
    email: 'contact@techsolutions.com',
    phone: '+234-802-345-6789',
    type: 'Business',
  },
  {
    id: '4',
    customerCode: 'CUST-WALKIN',
    name: 'Walk-in Customer',
    email: 'walkin@system.local',
    phone: 'N/A',
    type: 'Walkin',
  },
  {
    id: '5',
    customerCode: 'CUST-000004',
    name: 'Global Innovations',
    email: 'sales@globalinn.com',
    phone: '+234-804-111-2222',
    type: 'Business',
  },
  {
    id: '6',
    customerCode: 'CUST-000005',
    name: 'Jane Doe',
    email: 'jane.doe@email.com',
    phone: '+234-805-333-4444',
    type: 'Individual',
  },
];

const Breadcrumbs = () => (
  <nav className="text-sm font-medium text-gray-500 dark:text-gray-400" aria-label="breadcrumb">
    <ol className="flex items-center space-x-2">
      <li>
        <Link href="/dashboard" className="hover:text-primary">
          Dashboard
        </Link>
      </li>
      <li>/</li>
      <li>
        <Link href="/business-operations" className="hover:text-primary">
          Business Operations
        </Link>
      </li>
      <li>/</li>
      <li className="text-primary">Customers</li>
    </ol>
  </nav>
);

const CustomerActions = ({ onAddCustomer, onSearch, searchValue }) => (
    <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
        <div className="flex items-center space-x-2">
            <Button onClick={onAddCustomer}>
                <PlusCircle className="mr-2 h-4 w-4"/>Add New Customer
            </Button>
            <div className="relative ml-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search all columns..."
                    value={searchValue}
                    onChange={(event) => onSearch(event.target.value)}
                    className="w-full pl-8"
                />
            </div>
        </div>
    </div>
);

const CustomerTable = ({ columns, data, table }) => (
    <Card>
        <CardHeader>
            <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Showing{" "}
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{" "}
                to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getRowCount()
                )}{" "}
                of {table.getRowCount()} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
        </CardContent>
    </Card>
);


export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>(defaultCustomers);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [isOpeningBalanceOpen, setOpeningBalanceOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Customer | null>(null);


  const handleAddCustomer = () => {
    setRegisterOpen(true);
  };

  const handleRegisterComplete = (customer: Customer) => {
    setRegisterOpen(false);
    setNewCustomer(customer);
    setData(prevData => [...prevData, customer]); // Add new customer to the table
    setOpeningBalanceOpen(true);
  };

  const handleOpeningBalanceComplete = () => {
    setOpeningBalanceOpen(false);
    setNewCustomer(null);
  };

  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      {
        accessorKey: "customerCode",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Customer Code
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue("customerCode")}</div>,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "phone",
        header: "Phone",
      },
      {
        accessorKey: "type",
        header: "Type",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const customer = row.original;
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
                  <Link href={`/customers/${customer.id}`}>View</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumbs />
      <CustomerActions 
        onAddCustomer={handleAddCustomer}
        onSearch={setGlobalFilter}
        searchValue={globalFilter}
      />
      <Tabs defaultValue="all_customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all_customers">All Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="all_customers" className="space-y-4">
            <CustomerTable columns={columns} data={data} table={table} />
        </TabsContent>
      </Tabs>
      <RegisterCustomerDialog isOpen={isRegisterOpen} onOpenChange={setRegisterOpen} onRegisterComplete={handleRegisterComplete} />
      {newCustomer && (
        <RecordOpeningBalanceDialog isOpen={isOpeningBalanceOpen} onOpenChange={setOpeningBalanceOpen} customer={newCustomer} onComplete={handleOpeningBalanceComplete} />
      )}
    </div>
  );
}
