'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2, MoreHorizontal, AlertCircle, FilePlus, Building, Truck, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { SupplierRegistrationWizard } from '@/components/procurement/SupplierRegistrationWizard';
import { PurchaseOrderList } from '@/components/procurement/PurchaseOrderList';
import { NewPurchaseOrderForm } from '@/components/procurement/NewPurchaseOrderForm';
import { GrnTabContent } from '@/components/procurement/GrnTabContent';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SupplierOpeningBalanceForm } from '@/components/procurement/SupplierOpeningBalanceForm';

// --- TYPES ---
interface Supplier {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  contact_person?: string;
  ap_account_id: string;
  email?: string;
  phone?: string;
  address?: string;
}

// --- COMPONENT ---
export default function ProcurementPage() {
    const { toast } = useToast();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState('orders');
    const [isLoading, setIsLoading] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
    const [newlyCreatedSupplier, setNewlyCreatedSupplier] = useState<{id: string, name: string} | null>(null);


    // --- DATA FETCHING & MUTATIONS ---
    const fetchSuppliers = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            // CORRECTED: Manually construct the query string for the GET request
            const endpoint = `supplier.php?company_id=${user.company_id}`;
            const data = await api<Supplier[]>(endpoint);
            setSuppliers(data);
        } catch (e: any) {
            setError(e.message);
            toast({ title: "Error Loading Suppliers", description: e.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (user && activeTab === 'suppliers') {
            fetchSuppliers();
        }
    }, [user, activeTab, fetchSuppliers]);

    const handleWizardComplete = (supplierId?: string, supplierName?: string) => {
        setIsWizardOpen(false);
        fetchSuppliers(); // Refresh the list
        if (supplierId && supplierName) {
            setNewlyCreatedSupplier({ id: supplierId, name: supplierName });
            setShowOpeningBalanceDialog(true);
        }
    }

    const handleCloseOpeningBalanceDialog = () => {
        setShowOpeningBalanceDialog(false);
        setNewlyCreatedSupplier(null);
        setActiveTab('suppliers');
    }

    const handleAddOpeningBalance = () => {
        setShowOpeningBalanceDialog(false);
        setActiveTab('opening_balance');
    }

    // --- RENDER ---
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Procurement</h1>
                    <p className="text-muted-foreground">Manage your company’s purchasing lifecycle.</p>
                </div>
                <Button onClick={() => setActiveTab('new_po')}><FilePlus className="mr-2 h-4 w-4"/> Create PO</Button>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                 <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="orders"><List className="mr-2 h-4 w-4"/>Purchase Orders</TabsTrigger>
                    <TabsTrigger value="new_po"><FilePlus className="mr-2 h-4 w-4"/>New PO</TabsTrigger>
                    <TabsTrigger value="grn"><Truck className="mr-2 h-4 w-4"/>Goods Received</TabsTrigger>
                    <TabsTrigger value="suppliers"><Building className="mr-2 h-4 w-4"/>Suppliers</TabsTrigger>
                    {/* This tab is only visible when the opening balance form needs to be shown */}
                    {activeTab === 'opening_balance' && <TabsTrigger value="opening_balance">Opening Balance</TabsTrigger>}
                </TabsList>

                <TabsContent value="orders" className="mt-4">
                    <PurchaseOrderList />
                </TabsContent>

                <TabsContent value="new_po" className="mt-4">
                    <NewPurchaseOrderForm />
                </TabsContent>

                <TabsContent value="grn" className="mt-4">
                    <GrnTabContent />
                </TabsContent>
                
                <TabsContent value="suppliers" className="mt-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>All Suppliers</CardTitle>
                                    <CardDescription>Manage your company's suppliers.</CardDescription>
                                </div>
                                <Button onClick={() => setIsWizardOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Supplier
                                </Button>
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
                                            <TableHead>Contact</TableHead>
                                            <TableHead>A/P Account</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {suppliers.map((supplier) => (
                                        <TableRow key={supplier.id}>
                                            <TableCell className="font-mono">{supplier.code}</TableCell>
                                            <TableCell className="font-medium">
                                                <Link href={`/procurement/suppliers/${supplier.id}`} className="hover:underline">{supplier.name}</Link>
                                            </TableCell>
                                            <TableCell>{supplier.contact_person || 'N/A'}</TableCell>
                                            <TableCell className="font-mono">{supplier.ap_account_id}</TableCell>
                                            <TableCell><Badge variant={supplier.status === 'active' ? 'default' : 'destructive'}>{supplier.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="opening_balance" className="mt-4">
                    {newlyCreatedSupplier && <SupplierOpeningBalanceForm supplier={newlyCreatedSupplier} onComplete={() => setActiveTab('suppliers')} />}
                </TabsContent>

            </Tabs>

            <SupplierRegistrationWizard 
                isOpen={isWizardOpen} 
                onOpenChange={setIsWizardOpen} 
                onComplete={handleWizardComplete} 
            />

            <AlertDialog open={showOpeningBalanceDialog} onOpenChange={setShowOpeningBalanceDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supplier Successfully Created</AlertDialogTitle>
                        <AlertDialogDescription>
                           Does supplier {newlyCreatedSupplier?.name} have an opening balance that you want to record?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCloseOpeningBalanceDialog}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAddOpeningBalance}>Yes, add opening balance</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
