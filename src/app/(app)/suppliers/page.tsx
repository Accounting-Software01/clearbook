'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from '@/contexts/LanguageContext';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { useToast } from '@/hooks/use-toast';

interface Supplier {
  id: string;
  name: string;
  code: string;
  ap_account_id: string;
  payment_terms: string;
  company_id: string;
  status: 'Active' | 'Inactive';
}

const SuppliersPage = () => {
    const { language } = useLanguage();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentSupplier, setCurrentSupplier] = useState<Partial<Supplier>>({});

    const fetchSuppliers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) throw new Error('Failed to fetch suppliers');
            const data = await response.json();
            setSuppliers(data);
        } catch (e: any) {
            setError(`Failed to load suppliers.`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const method = currentSupplier.id ? 'PUT' : 'POST';
            const url = currentSupplier.id ? `/api/suppliers/${currentSupplier.id}` : '/api/suppliers';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentSupplier),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save supplier');
            }

            toast({ title: `Supplier ${currentSupplier.id ? 'updated' : 'created'}`, description: "The supplier list has been updated." });
            setIsDialogOpen(false);
            fetchSuppliers(); // Refetch the list
        } catch (error: any) {
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this supplier?')) return;

        try {
            const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete supplier');
            toast({ title: "Supplier Deleted", description: "The supplier has been removed." });
            fetchSuppliers();
        } catch (error: any) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        }
    };

  return (
    <>
      <p className="text-muted-foreground mb-6">Manage your list of suppliers and their accounting details.</p>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>All Suppliers</CardTitle>
                <CardDescription>A list of all your company's suppliers.</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setCurrentSupplier({ status: 'Active', company_id: 'C-001' })}> 
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Supplier
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentSupplier.id ? 'Edit Supplier' : 'Create New Supplier'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <Input placeholder="Supplier Name" value={currentSupplier.name || ''} onChange={e => setCurrentSupplier({...currentSupplier, name: e.target.value})} />
                        <Input placeholder="Supplier Code" value={currentSupplier.code || ''} onChange={e => setCurrentSupplier({...currentSupplier, code: e.target.value})} />
                        <Select value={currentSupplier.ap_account_id} onValueChange={value => setCurrentSupplier({...currentSupplier, ap_account_id: value})}>
                            <SelectTrigger><SelectValue placeholder="Select AP Control Account" /></SelectTrigger>
                            <SelectContent>
                                {chartOfAccounts.filter(a => a.code.startsWith('2010')).map(account => (
                                    <SelectItem key={account.code} value={account.code}>{account.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input placeholder="Payment Terms (e.g., Net 30)" value={currentSupplier.payment_terms || ''} onChange={e => setCurrentSupplier({...currentSupplier, payment_terms: e.target.value})} />
                         <Select value={currentSupplier.status} onValueChange={value => setCurrentSupplier({...currentSupplier, status: value as any})}>
                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Supplier'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : error ? (
                <div className="flex flex-col justify-center items-center h-40 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>A/P Account</TableHead>
                        <TableHead>Payment Terms</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                            <TableCell className="font-mono">{supplier.code}</TableCell>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell className="font-mono">{supplier.ap_account_id}</TableCell>
                            <TableCell>{supplier.payment_terms}</TableCell>
                            <TableCell>{supplier.status}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => { setCurrentSupplier(supplier); setIsDialogOpen(true); }}>Edit</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(supplier.id)}>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
             { !isLoading && !error && suppliers.length === 0 && (
                <div className="flex justify-center items-center h-40 text-muted-foreground"><p>No suppliers found.</p></div>
            )}
        </CardContent>
      </Card>
    </>
  );
};

export default SuppliersPage;
