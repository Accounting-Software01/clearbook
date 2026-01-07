'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Loader2, AlertCircle, Mail, Phone, MapPin, FileText, Percent, Edit, PlusCircle } from 'lucide-react';
import { ActivitiesTable } from '@/components/procurement/ActivitiesTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Define types
interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  billing_address?: string;
  payment_terms?: number;
  vat_percentage?: number;
  withholding_tax_applicable?: boolean;
}

interface Activity {
    id: string;
    date: string;
    type: string;
    reference: string;
    amount: number;
    status: string;
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
                // Simulating fetch with the data provided by the user
                const response = {
                    "success":true,
                    "profile":{
                        "id":"12",
                        "name":"Sagheer+ Lab Limited",
                        "contact_person":"Muhammad Sagheer",
                        "email":"contact@sagheerplus.com.ng",
                        "phone":"08063386516",
                        "billing_address":"KM 142 Kano Kaduna Expressway, Maraban Gwanda, Sabon Gari Zaria",
                        "payment_terms":0,
                        "wht_applicable":1,
                        "vat_percentage":0,
                        "withholding_tax_applicable":true
                    },
                    "activities":[
                        {"id":"103","date":"2026-01-07","reference":"O/B-12","amount":20000,"status":"posted","type":"Payment"}
                    ],
                    "balance":{"total_invoiced":0,"total_paid":20000,"outstanding_balance":-20000}
                };
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-2xl">{supplier.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold">{supplier.name}</h1>
                        <p className="text-muted-foreground">Supplier ID: {supplier.id}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline"><Edit className="h-4 w-4 mr-2"/> Edit Supplier</Button>
                    <Button><PlusCircle className="h-4 w-4 mr-2"/> New Invoice</Button>
                </div>
            </div>

            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="grid gap-4 md:grid-cols-3 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Invoiced</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{balance ? formatCurrency(balance.total_invoiced) : 'N/A'}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Paid</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-green-600">{balance ? formatCurrency(balance.total_paid) : 'N/A'}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Outstanding Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className={`text-2xl font-bold ${balance && balance.outstanding_balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                    {balance ? formatCurrency(balance.outstanding_balance) : 'N/A'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="profile">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Supplier Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start space-x-3">
                                    <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Contact Person</p>
                                        <p>{supplier.contact_person || 'N/A'}</p>
                                        <p className="text-sm text-muted-foreground">{supplier.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Email</p>
                                        <p>{supplier.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Billing Address</p>
                                        <p>{supplier.billing_address || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Payment Terms</p>
                                        <p>{supplier.payment_terms !== null ? `${supplier.payment_terms} days` : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Percent className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Tax Information</p>
                                        <p>VAT: {supplier.vat_percentage !== null ? `${supplier.vat_percentage}%` : 'N/A'}</p>
                                        <p>WHT Applicable: {supplier.withholding_tax_applicable ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activities">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Transactional History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ActivitiesTable activities={activities} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SupplierDetailsPage;
