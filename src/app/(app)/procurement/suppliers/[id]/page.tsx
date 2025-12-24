'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { ActivitiesTable } from '@/components/procurement/ActivitiesTable'; // Import the new component

// Define types
interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  vat_percentage?: number;
  withholding_tax_applicable?: boolean;
}

interface Activity {
    id: string;
    date: string;
    type: string;
    reference: string;
    amount: number;
}

interface Balance {
    total_invoiced: number;
    total_paid: number;
    outstanding_balance: number;
}

const SupplierDetailsPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const pathname = usePathname();
    const supplierId = pathname.split('/').pop();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [balance, setBalance] = useState<Balance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !supplierId) return;

        const fetchSupplierData = async () => {
            setIsLoading(true);
            try {
                const response = await api<any>(`get-supplier-details.php?id=${supplierId}&company_id=${user.company_id}`);
                setSupplier(response.profile);
                setActivities(response.activities);
                setBalance(response.balance);
            } catch (e: any) {
                setError(`Failed to fetch supplier details: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSupplierData();
    }, [supplierId, user]);

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/> <span className='ml-2'>Loading supplier details...</span></div>;
    }

    if (error) {
        return <div className="flex flex-col items-center justify-center p-8 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>;
    }

    if (!supplier) {
        return <div className="flex items-center justify-center p-8">Supplier not found.</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>{supplier.name}</CardTitle>
                    <CardDescription>
                        Detailed view of the supplier's profile, activities, and balance.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="profile">
                        <TabsList>
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="activities">Activities</TabsTrigger>
                            <TabsTrigger value="balance">Balance</TabsTrigger>
                        </TabsList>
                        <TabsContent value="profile">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Supplier Profile</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <p><strong>Contact Person:</strong> {supplier.contact_person || 'N/A'}</p>
                                    <p><strong>Email:</strong> {supplier.email || 'N/A'}</p>
                                    <p><strong>Phone:</strong> {supplier.phone || 'N/A'}</p>
                                    <p><strong>Address:</strong> {supplier.address || 'N/A'}</p>
                                    <p><strong>VAT Percentage:</strong> {supplier.vat_percentage !== null ? `${supplier.vat_percentage}%` : 'N/A'}</p>
                                    <p><strong>WHT Applicable:</strong> {supplier.withholding_tax_applicable ? 'Yes' : 'No'}</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="activities">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Activities</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ActivitiesTable activities={activities} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="balance">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Balance Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {balance ? (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <p className="text-muted-foreground">Total Invoiced:</p>
                                                <p className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance.total_invoiced)}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-muted-foreground">Total Paid:</p>
                                                <p className="font-medium text-green-600">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance.total_paid)}</p>
                                            </div>
                                            <hr className="my-2"/>
                                            <div className="flex justify-between items-center font-bold text-lg">
                                                <p>Outstanding Balance:</p>
                                                <p className={balance.outstanding_balance > 0 ? 'text-destructive' : 'text-green-600'}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance.outstanding_balance)}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <p>No balance information available.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default SupplierDetailsPage;
