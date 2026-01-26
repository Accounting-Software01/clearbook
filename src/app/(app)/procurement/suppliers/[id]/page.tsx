'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertCircle, Mail, Phone, MapPin, FileText, Edit, PlusCircle, User, Briefcase, Building } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LedgerTable } from '@/components/procurement/LedgerTable';
import { Badge } from '@/components/ui/badge';

// Define new types based on the API response
interface Supplier {
    id: number;
    supplier_code: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    supplier_currency: string;
    payment_terms: number;
    vat_number: string;
}

interface LedgerEntry {
    date: string;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

const SupplierDetailsPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const pathname = usePathname();
    const supplierId = pathname.split('/').pop();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [currentBalance, setCurrentBalance] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !supplierId) return;

        const fetchSupplierData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-supplier-ledger.php?company_id=${user.company_id}&supplier_id=${supplierId}`);
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Failed to fetch supplier ledger.");
                }

                setSupplier(result.supplier);
                setLedger(result.ledger);
                setCurrentBalance(result.current_balance);

            } catch (e: any) {
                setError(`Failed to fetch supplier details: ${e.message}`);
                toast({
                    variant: "destructive",
                    title: "Error fetching data",
                    description: e.message,
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSupplierData();
    }, [supplierId, user, toast]);

    const formatCurrency = (amount: number) => {
        if (!supplier) return 'N/A';
        const currencyCode = supplier.supplier_currency && supplier.supplier_currency !== '0' ? supplier.supplier_currency : 'NGN';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
        
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/> <span className='ml-2'>Loading supplier ledger...</span></div>;
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
                        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{supplier.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold">{supplier.name}</h1>
                        <p className="text-muted-foreground">Supplier Code: {supplier.supplier_code}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline"><Edit className="h-4 w-4 mr-2"/> Edit</Button>
                    <Button><PlusCircle className="h-4 w-4 mr-2"/> New Bill</Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">Account Summary</h3>
                     <div className="grid gap-4 md:grid-cols-3 mt-4">
                        <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Currency</p>
                            <p className="text-2xl font-bold">{supplier.supplier_currency}</p>
                        </div>
                         <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Total AP</p>
                            <p className={`text-2xl font-bold ${currentBalance !== null && currentBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {currentBalance !== null ? formatCurrency(currentBalance) : 'N/A'}
                            </p>
                        </div>
                         <div className="p-4 border rounded-lg">
                             <p className="text-sm text-muted-foreground">Payment Terms</p>
                             <p className="text-2xl font-bold">{supplier.payment_terms !== null ? `${supplier.payment_terms} days` : 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="activities">
                <TabsList>
                    <TabsTrigger value="activities">Transaction Ledger</TabsTrigger>
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                </TabsList>

                 <TabsContent value="activities">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Transactional History</CardTitle>
                            <CardDescription>A detailed record of all transactions with this supplier.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <LedgerTable ledger={ledger} currency={supplier.supplier_currency} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profile">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Supplier Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start space-x-3">
                                    <Building className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Legal Name</p>
                                        <p>{supplier.name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <User className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Contact Person</p>
                                        <p>{supplier.contact_person || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Mail className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Email</p>
                                        <p className="hover:underline cursor-pointer">{supplier.email || 'N/A'}</p>
                                    </div>
                                </div>
                                 <div className="flex items-start space-x-3">
                                    <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Phone</p>
                                        <p>{supplier.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Address</p>
                                        <p>{`${supplier.address}, ${supplier.city}, ${supplier.state}, ${supplier.country}`}</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <Briefcase className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="font-semibold">Tax ID / VAT Number</p>
                                        <p>{supplier.vat_number || 'Not Provided'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SupplierDetailsPage;
