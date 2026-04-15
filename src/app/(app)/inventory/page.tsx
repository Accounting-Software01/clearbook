'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
import { ResolveOrphansDialog, OrphanItem } from '@/components/inventory/ResolveOrphansDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const InventoryPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [totalInventoryValue, setTotalInventoryValue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRegisterItemDialogOpen, setIsRegisterItemDialogOpen] = useState(false);
    const [isResolveOrphansDialogOpen, setIsResolveOrphansDialogOpen] = useState(false);
    const [orphans, setOrphans] = useState<OrphanItem[]>([]);

    const fetchInventoryValue = useCallback(async () => {
        if (!user?.company_id) return;

        setIsLoading(true);
        setError(null);
        setOrphans([]);

        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}`);
            
            if (!response.ok) {
                let errorText = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorText = errorData.message || JSON.stringify(errorData);
                } catch (jsonError) {
                    errorText = response.statusText;
                }
                throw new Error(errorText);
            }
            
            const data = await response.json();

            if (data) {
                const allItems = [ ...(data.products || []), ...(data.raw_materials || [])];

                const foundOrphans = allItems.filter(item => item.is_orphan === true)
                  .map(item => ({...item, account_code: item.id.replace('orphan_', '') }));

                setOrphans(foundOrphans);

                const calculateValue = (items: any[]) => 
                    items.reduce((acc, item) => {
                        const quantity = parseFloat(item.quantity) || 0;
                        const unitCost = parseFloat(item.unit_cost) || 0;
                        return acc + (quantity * unitCost);
                    }, 0);

                const productsValue = calculateValue(data.products || []);
                const rawMaterialsValue = calculateValue(data.raw_materials || []);
                
                setTotalInventoryValue(productsValue + rawMaterialsValue);
            }
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred';
            setError(`Failed to fetch inventory value: ${errorMessage}`);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch inventory value: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        if (user) {
            fetchInventoryValue();
        }
    }, [user, fetchInventoryValue]);

    const handleRegistrationSuccess = () => {
        toast({ title: 'Success', description: 'Item registered successfully.' });
        fetchInventoryValue(); // Refreshes the list, which will also re-check for orphans
    };

    return (
        <>
            <RegisterItemDialog
                open={isRegisterItemDialogOpen}
                onOpenChange={setIsRegisterItemDialogOpen}
                onSuccess={handleRegistrationSuccess}
            />
            {user?.company_id && (
              <ResolveOrphansDialog
                  open={isResolveOrphansDialogOpen}
                  onOpenChange={setIsResolveOrphansDialogOpen}
                  orphans={orphans}
                  companyId={user.company_id}
                  onSuccess={handleRegistrationSuccess} // Re-use the same success handler
              />
            )}

            {orphans.length > 0 && !isLoading && (
                <Alert className="mb-6 border-amber-500/50 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle>Data Inconsistency Detected</AlertTitle>
                  <AlertDescription>
                    We found {orphans.length} inventory account(s) in your ledger that are not registered as items.
                    <Button variant="link" className="p-0 h-auto ml-2 text-amber-900 dark:text-amber-200 font-bold" onClick={() => setIsResolveOrphansDialogOpen(true)}>
                        Click here to resolve.
                    </Button>
                  </AlertDescription>
                </Alert>
            )}

            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Inventory Overview</h1>
                    <p className="text-muted-foreground">An overview of your entire inventory.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchInventoryValue} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => setIsRegisterItemDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Register New Item
                    </Button>
                </div>
            </div>

            <Card className="mb-6">
                 <CardHeader>
                    <CardTitle>Total Inventory Value</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : error ? (
                         <div className="text-destructive">
                            <AlertCircle className="inline-block mr-2 h-5 w-5" />
                            Could not load value.
                         </div>
                    ) : (
                        <p className="text-3xl font-bold">{formatCurrency(totalInventoryValue)}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">Combined value of all finished products and raw materials.</p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Finished Goods</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Manage products that are ready for sale.</p>
                        <Link href="/inventory/finished-goods" passHref>
                           <Button>
                                View Finished Goods <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Raw Materials</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Manage materials used in your production process.</p>
                         <Link href="/inventory/raw-materials" passHref>
                           <Button>
                                View Raw Materials <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Work-in-Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all items currently in production.</p>
                         <Link href="/inventory/work-in-progress" passHref>
                           <Button>
                                View Work-in-Progress <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                {/* Other cards remain unchanged */}
            </div>
        </>
    );
};

export default InventoryPage;
