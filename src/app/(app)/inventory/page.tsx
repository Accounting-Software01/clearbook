'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
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

    const fetchInventoryValue = useCallback(async () => {
        if (!user?.company_id) return;

        setIsLoading(true);
        setError(null);

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
        fetchInventoryValue();
    };

    return (
        <>
            <RegisterItemDialog
                open={isRegisterItemDialogOpen}
                onOpenChange={setIsRegisterItemDialogOpen}
                onSuccess={handleRegistrationSuccess}
            />

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
                <Card>
                    <CardHeader>
                        <CardTitle>Packaging Materials</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all packaging materials.</p>
                         <Link href="/inventory/packaging-materials" passHref>
                           <Button>
                                View Packaging Materials <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Consumables & Supplies</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all consumables and production supplies.</p>
                         <Link href="/inventory/consumables-supplies" passHref>
                           <Button>
                                View Consumables & Supplies <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Spare Parts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all spare parts and maintenance inventory.</p>
                         <Link href="/inventory/spare-parts" passHref>
                           <Button>
                                View Spare Parts <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Fuel & Energy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all fuel and energy inventory.</p>
                         <Link href="/inventory/fuel-energy" passHref>
                           <Button>
                                View Fuel & Energy <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Returned Goods</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all returned goods and reverse inventory.</p>
                         <Link href="/inventory/returned-goods" passHref>
                           <Button>
                                View Returned Goods <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Obsolete & Scrap</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all obsolete, expired, and scrap inventory.</p>
                         <Link href="/inventory/obsolete-scrap" passHref>
                           <Button>
                                View Obsolete & Scrap <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Goods-in-Transit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all goods currently in transit.</p>
                         <Link href="/inventory/goods-in-transit" passHref>
                           <Button>
                                View Goods-in-Transit <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Promotional Materials</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all promotional and marketing inventory.</p>
                         <Link href="/inventory/promotional-materials" passHref>
                           <Button>
                                View Promotional Materials <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Safety Stock</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all safety stock and buffer inventory.</p>
                         <Link href="/inventory/safety-stock" passHref>
                           <Button>
                                View Safety Stock <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Quality-Hold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all rejected and quality-hold inventory.</p>
                         <Link href="/inventory/quality-hold" passHref>
                           <Button>
                                View Quality-Hold <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Consignment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Track and manage all third-party and consignment inventory.</p>
                         <Link href="/inventory/consignment" passHref>
                           <Button>
                                View Consignment <ArrowRight className="ml-2 h-4 w-4" />
                           </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default InventoryPage;
