'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-react';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
import { PriceTierManagerDialog } from '@/components/PriceTierManagerDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Interface matches the aliased output from the get-items.php API
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number; // Aliased from average_unit_cost
  quantity: number;  // Aliased from quantity_on_hand
  item_type: 'product' | 'raw_material';
  total_value: number; // This will be calculated on the client
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const InventoryPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [items, setItems] = useState<{ products: InventoryItem[], raw_materials: InventoryItem[] }>({ products: [], raw_materials: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isRegisterItemDialogOpen, setIsRegisterItemDialogOpen] = useState(false);
    const [isPriceTierDialogOpen, setIsPriceTierDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);

    const fetchInventory = useCallback(async () => {
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
                const processItem = (item: any): InventoryItem => ({
                    ...item,
                    unit_cost: parseFloat(item.unit_cost) || 0,
                    quantity: parseFloat(item.quantity) || 0,
                    total_value: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0),
                });

                setItems({
                    products: (data.products || []).map(processItem),
                    raw_materials: (data.raw_materials || []).map(processItem),
                });
            }
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred';
            setError(`Failed to fetch inventory: ${errorMessage}`);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch inventory: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        if (user) { // Ensure user object is available before fetching
            fetchInventory();
        }
    }, [user, fetchInventory]);

    const handleOpenPriceTierDialog = (product: InventoryItem) => {
        setSelectedProduct({ id: product.id, name: product.name });
        setIsPriceTierDialogOpen(true);
    };

    const handleRegistrationSuccess = () => {
        toast({ title: 'Success', description: 'Item registered successfully.' });
        fetchInventory();
    };

    const totalInventoryValue = [...items.products, ...items.raw_materials].reduce((acc, item) => acc + item.total_value, 0);

    return (
        <>
            <RegisterItemDialog
                open={isRegisterItemDialogOpen}
                onOpenChange={setIsRegisterItemDialogOpen}
                onSuccess={handleRegistrationSuccess}
            />
            <PriceTierManagerDialog
                open={isPriceTierDialogOpen}
                onOpenChange={setIsPriceTierDialogOpen}
                product={selectedProduct}
            />

            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Inventory Management</h1>
                    <p className="text-muted-foreground">Track and manage all registered products and raw materials.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchInventory} disabled={isLoading}>
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
                    <CardTitle>Inventory Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xl font-semibold">Total Inventory Value: {formatCurrency(totalInventoryValue)}</p>
                    <p className="text-sm text-muted-foreground">Combined value of all finished products and raw materials.</p>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="h-10 w-10 mb-2" />
                    <p className="text-lg font-semibold">An Error Occurred</p>
                    <p>{error}</p>
                </div>
            ) : (
                <Tabs defaultValue="products">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="products">Finished Goods ({items.products.length})</TabsTrigger>
                        <TabsTrigger value="raw_materials">Raw Materials ({items.raw_materials.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="products" className="mt-4">
                        <InventoryTable
                            items={items.products}
                            itemType="product"
                            onManageTiers={handleOpenPriceTierDialog}
                        />
                    </TabsContent>

                    <TabsContent value="raw_materials" className="mt-4">
                        <InventoryTable items={items.raw_materials} itemType="raw_material" />
                    </TabsContent>
                </Tabs>
            )}
        </>
    );
};


const InventoryTable = ({ items, itemType, onManageTiers }: { items: InventoryItem[], itemType: 'product' | 'raw_material', onManageTiers?: (item: InventoryItem) => void }) => (
    <Card>
        <CardContent className="pt-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit of Measure</TableHead>
                        <TableHead className="text-right">Avg. Unit Cost</TableHead>
                        <TableHead className="text-right">Stock on Hand</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                        {itemType === 'product' && <TableHead className="text-center">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.sku || 'N/A'}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.unit_cost)}</TableCell>
                            <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(item.total_value)}</TableCell>
                            {itemType === 'product' && (
                                <TableCell className="text-center">
                                    <Button variant="outline" size="sm" onClick={() => onManageTiers?.(item)}>
                                        <Settings className="h-4 w-4 mr-2" />
                                        Manage Tiers
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
                 <TableFooter>
                    <TableRow>
                        <TableCell colSpan={itemType === 'product' ? 7 : 6} className="text-right font-bold">Total Value</TableCell>
                        <TableCell className="text-right font-bold font-mono">
                            {formatCurrency(items.reduce((acc, item) => acc + item.total_value, 0))}
                        </TableCell>
                        {itemType === 'product' && <TableCell></TableCell>}
                    </TableRow>
                </TableFooter>
            </Table>
            {items.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No {itemType.replace('_', ' ')} registered yet.</p>
                </div>
            )}
        </CardContent>
    </Card>
);

export default InventoryPage;
