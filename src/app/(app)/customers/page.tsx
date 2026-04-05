'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoints } from '@/lib/apiEndpoints';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  PlusCircle, Search, MoreHorizontal, Loader2, Upload, FileUp, AlertCircle,
} from "lucide-react";

import {
  ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel,
  getFilteredRowModel, getSortedRowModel, useReactTable,
} from "@tanstack/react-table";

import { RegisterCustomerDialog } from '@/components/RegisterCustomerDialog';
import { RecordOpeningBalanceDialog } from '@/components/RecordOpeningBalanceDialog';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  email_address: string;
  primary_phone_number: string;
  price_tier: string;
  customer_type: string;
  status: string;
}

// ─── CSV Config ────────────────────────────────────────────────────────────────

const CSV_REQUIRED_COLUMNS = [
  'customer_name', 'trading_name', 'customer_type', 'status', 'customer_category',
  'primary_phone_number', 'alternate_phone', 'email_address',
  'contact_person', 'website',
  'billing_address', 'shipping_address', 'city', 'state', 'country', 'postal_code',
  'is_vat_applicable', 'vat_registration_number', 'customer_tin', 'tax_category',
  'is_wht_applicable', 'payment_type', 'payment_terms', 'credit_limit',
  'currency', 'price_level', 'default_warehouse',
  'preferred_payment_method', 'is_discount_eligible', 'invoice_delivery_method', 'notes',
];

const REQUIRED_FIELDS = ['customer_name', 'status', 'customer_type'];

const CSV_TEMPLATE_EXAMPLE =
  'Alh Babangida Stores,Umar Faruk Global,Business,Active,Corporate,08012345678,08098765432,babangida@example.com,Alh Babangida,N/A,No 5 Zaria Road,No 5 Zaria Road,Zaria,Kaduna,Nigeria,800001,0,,,,0,Bank Transfer,Immediate,50000,NGN,Special,,Bank Transfer,0,Email,';
// ─── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): { rows: Record<string, string>[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2)
    return { rows: [], errors: ['CSV must have a header row and at least one data row.'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));

  const missing = REQUIRED_FIELDS.filter(c => !headers.includes(c));
  if (missing.length > 0)
    return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

  const errors: string[] = [];
  const rows: Record<string, string>[] = [];

  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 2}: column count mismatch.`);
      return;
    }
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx]; });

    const rowMissing = REQUIRED_FIELDS.filter(f => !row[f] || row[f] === '');
    if (rowMissing.length > 0) {
      errors.push(`Row ${i + 2}: missing required fields — ${rowMissing.join(', ')}.`);
      return;
    }
    rows.push(row);
  });

  return { rows, errors };
}

// ─── Edit Dialog ───────────────────────────────────────────────────────────────

interface EditCustomerDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditCustomerDialog({ customer, isOpen, onClose, onSaved }: EditCustomerDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', status: '', customer_type: '', registration_no: '', tax_id: '',
    primary_phone_number: '', secondary_phone_number: '', email_address: '',
    address: '', credit_limit: '', payment_terms: '', credit_days: '', preferred_payment: '',
  });

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name ?? '',
        status: customer.status ?? '',
        customer_type: customer.customer_type ?? '',
        registration_no: (customer as any).registration_no ?? '',
        tax_id: (customer as any).tax_id ?? '',
        primary_phone_number: customer.primary_phone_number ?? '',
        secondary_phone_number: (customer as any).secondary_phone_number ?? '',
        email_address: customer.email_address ?? '',
        address: (customer as any).address ?? '',
        credit_limit: (customer as any).credit_limit ?? '',
        payment_terms: (customer as any).payment_terms ?? '',
        credit_days: (customer as any).credit_days ?? '',
        preferred_payment: (customer as any).preferred_payment ?? '',
      });
    }
  }, [customer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    if (!customer || !user?.company_id) return;
    setIsSaving(true);
    try {
      const res = await fetch(apiEndpoints.updateCustomer(user.company_id, customer.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_id: user.company_id, customer_id: customer.id }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Customer updated successfully.' });
        onSaved();
        onClose();
      } else {
        toast({ variant: 'destructive', title: 'Update failed', description: result.error || 'Unknown error' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Unexpected error', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { label: 'Full Name',           name: 'name',                   required: true },
    { label: 'Status',              name: 'status',                  required: true },
    { label: 'Customer Type',       name: 'customer_type',           required: true },
    { label: 'Registration No.',    name: 'registration_no' },
    { label: 'Tax ID',              name: 'tax_id' },
    { label: 'Primary Phone',       name: 'primary_phone_number' },
    { label: 'Secondary Phone',     name: 'secondary_phone_number' },
    { label: 'Email Address',       name: 'email_address' },
    { label: 'Address',             name: 'address' },
    { label: 'Credit Limit (₦)',    name: 'credit_limit' },
    { label: 'Payment Terms',       name: 'payment_terms' },
    { label: 'Credit Days',         name: 'credit_days' },
    { label: 'Preferred Payment',   name: 'preferred_payment' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer — {customer?.id}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map(({ label, name, required }) => (
            <div key={name} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={name} className="text-right text-sm">
                {label}{required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={name}
                name={name}
                value={form[name as keyof typeof form]}
                onChange={handleChange}
                className="col-span-3"
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving || !form.name}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV Upload Dialog ─────────────────────────────────────────────────────────

interface CSVUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

function CSVUploadDialog({ isOpen, onClose, onImported }: CSVUploadDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const resetState = () => {
    setFileName(null);
    setPreview([]);
    setParseErrors([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => { resetState(); onClose(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, errors } = parseCSV(text);
      setPreview(rows.slice(0, 5));
      setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !user?.company_id) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const { rows, errors } = parseCSV(text);
        if (errors.length > 0 && rows.length === 0) {
          toast({ variant: 'destructive', title: 'Import failed', description: errors[0] });
          setIsImporting(false);
          return;
        }
        const res = await fetch(apiEndpoints.bulkImportCustomers(user.company_id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: user.company_id, customers: rows }),
        });
        const result = await res.json();
        if (result.success) {
          toast({ title: 'Import successful', description: `${result.imported ?? rows.length} customers imported.` });
          handleClose();
          onImported();
        } else {
          toast({ variant: 'destructive', title: 'Import failed', description: result.error || 'Unknown error' });
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Unexpected error', description: err.message });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob(
      [`${CSV_REQUIRED_COLUMNS.join(',')}\n${CSV_TEMPLATE_EXAMPLE}\n`],
      { type: 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customers via CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <span>Download a sample CSV with the correct headers.</span>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>Download Template</Button>
          </div>
          <div>
            <Label className="mb-1 block">Select CSV File</Label>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed py-8 hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {fileName ?? 'Click to choose a .csv file'}
              </span>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>
          {parseErrors.length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 space-y-1">
              {parseErrors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{e}</span>
                </div>
              ))}
            </div>
          )}
          {preview.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Preview (first {preview.length} rows):</p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {CSV_REQUIRED_COLUMNS.map(col => (
                        <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((row, i) => (
                      <TableRow key={i}>
                        {CSV_REQUIRED_COLUMNS.map(col => (
                          <TableCell key={col} className="text-xs">{row[col] || '—'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>Cancel</Button>
          <Button onClick={handleImport} disabled={isImporting || preview.length === 0}>
            {isImporting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</>
              : <><Upload className="mr-2 h-4 w-4" />Import Customers</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Breadcrumbs ───────────────────────────────────────────────────────────────

const Breadcrumbs = () => (
  <nav className="text-sm font-medium text-gray-500 dark:text-gray-400" aria-label="breadcrumb">
    <ol className="flex items-center space-x-2">
      <li><Link href="/dashboard" className="hover:text-primary">Dashboard</Link></li>
      <li>/</li>
      <li><Link href="/business-operations" className="hover:text-primary">Business Operations</Link></li>
      <li>/</li>
      <li className="text-primary">Customers</li>
    </ol>
  </nav>
);

// ─── Customer Actions Bar ──────────────────────────────────────────────────────

const CustomerActions = ({ onAddCustomer, onImportCSV, onSearch, searchValue, isLoading }: any) => (
  <div className="flex items-center justify-between space-y-2">
    <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
    <div className="flex items-center space-x-2">
      <Button variant="outline" onClick={onImportCSV} disabled={isLoading}>
        <Upload className="mr-2 h-4 w-4" />Import CSV
      </Button>
      <Button onClick={onAddCustomer} disabled={isLoading}>
        <PlusCircle className="mr-2 h-4 w-4" />Add New Customer
      </Button>
      <div className="relative ml-auto">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search all columns..."
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-8"
        />
      </div>
    </div>
  </div>
);

// ─── Customer Table ────────────────────────────────────────────────────────────

const CustomerTable = ({ columns, data, table }: any) => (
  <Card>
    <CardHeader><CardTitle>All Customers</CardTitle></CardHeader>
    <CardContent>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg: any) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h: any) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: any) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getRowCount()
          )} of {table.getRowCount()} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState<string>('');

  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [isOpeningBalanceOpen, setOpeningBalanceOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<any | null>(null);

  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [isEditOpen, setEditOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCSVOpen, setCSVOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCustomers = useCallback(async () => {
    if (!user?.company_id) return;
    setIsLoading(true);
    try {
      const res = await fetch(apiEndpoints.getCustomersInfo(user.company_id));
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setData(result.data);
      } else {
        toast({ variant: 'destructive', title: 'Failed to fetch customers', description: result.error || 'Unknown error' });
        setData([]);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Unexpected error', description: error.message });
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, toast]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleCustomerRegistered = (customer: any) => {
    setRegisterOpen(false);
    setNewCustomer(customer);
    setOpeningBalanceOpen(true);
    fetchCustomers();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !user?.company_id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(apiEndpoints.deleteCustomer(user.company_id, deleteTarget.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: user.company_id, customer_id: deleteTarget.id }),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Customer deleted.' });
        fetchCustomers();
      } else {
        toast({ variant: 'destructive', title: 'Delete failed', description: result.error || 'Unknown error' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Unexpected error', description: err.message });
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  const columns: ColumnDef<Customer>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Customer Code <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue('id')}</div>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'email_address',
      header: 'Email',
      cell: ({ row }) => <div>{row.getValue('email_address') || 'N/A'}</div>,
    },
    {
      accessorKey: 'primary_phone_number',
      header: 'Phone',
      cell: ({ row }) => <div>{row.getValue('primary_phone_number') || 'N/A'}</div>,
    },
    {
      accessorKey: 'price_tier',
      header: 'Price Tier',
      cell: ({ row }) => <div>{row.getValue('price_tier') || 'N/A'}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            status === 'Active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {status || 'N/A'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
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
              <DropdownMenuItem onClick={() => { setEditTarget(customer); setEditOpen(true); }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => { setDeleteTarget(customer); setDeleteOpen(true); }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: { globalFilter },
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Breadcrumbs />
      <CustomerActions
        onAddCustomer={() => setRegisterOpen(true)}
        onImportCSV={() => setCSVOpen(true)}
        onSearch={setGlobalFilter}
        searchValue={globalFilter}
        isLoading={isLoading}
      />
      <Tabs defaultValue="all_customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all_customers">All Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="all_customers" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CustomerTable columns={columns} data={data} table={table} />
          )}
        </TabsContent>
      </Tabs>

      <RegisterCustomerDialog
        isOpen={isRegisterOpen}
        onClose={() => setRegisterOpen(false)}
        onCustomerRegistered={handleCustomerRegistered}
      />

      {newCustomer && (
        <RecordOpeningBalanceDialog
          isOpen={isOpeningBalanceOpen}
          onClose={() => setOpeningBalanceOpen(false)}
          customer={newCustomer}
          onBalanceRecorded={() => { setOpeningBalanceOpen(false); setNewCustomer(null); fetchCustomers(); }}
        />
      )}

      <EditCustomerDialog
        customer={editTarget}
        isOpen={isEditOpen}
        onClose={() => { setEditOpen(false); setEditTarget(null); }}
        onSaved={fetchCustomers}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.id}).
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CSVUploadDialog
        isOpen={isCSVOpen}
        onClose={() => setCSVOpen(false)}
        onImported={fetchCustomers}
      />
    </div>
  );
}