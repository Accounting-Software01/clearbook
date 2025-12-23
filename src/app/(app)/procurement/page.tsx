
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


    // --- DATA FETCHING & MUTATIONS ---
    const fetchSuppliers = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await api<Supplier[]>('supplier.php', { params: { company_id: user.company_id } });
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

    const handleWizardComplete = () => {
        setIsWizardOpen(false);
        fetchSuppliers();
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
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="orders"><List className="mr-2 h-4 w-4"/>Purchase Orders</TabsTrigger>
                    <TabsTrigger value="new_po"><FilePlus className="mr-2 h-4 w-4"/>New PO</TabsTrigger>
                    <TabsTrigger value="grn"><Truck className="mr-2 h-4 w-4"/>Goods Received</TabsTrigger>
                    <TabsTrigger value="suppliers"><Building className="mr-2 h-4 w-4"/>Suppliers</TabsTrigger>
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
            </Tabs>

            <SupplierRegistrationWizard 
                isOpen={isWizardOpen} 
                onOpenChange={setIsWizardOpen} 
                onComplete={handleWizardComplete} 
            />

        </div>
    );
}
