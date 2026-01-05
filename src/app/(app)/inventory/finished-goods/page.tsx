'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PlusCircle, Loader2, AlertCircle, RefreshCw, Settings, BookUp } from 'lucide-react';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
import { PriceTierManagerDialog } from '@/components/PriceTierManagerDialog';
import { ItemHistoryDialog } from '@/components/ItemHistoryDialog';
import { RecordOpeningBalanceDialog } from '@/components/RecordOpeningBalanceDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const FinishedGoodsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isRegisterItemDialogOpen, setIsRegisterItemDialogOpen] = useState(false);
    const [isPriceTierDialogOpen, setIsPriceTierDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isOpeningBalanceDialogOpen, setIsOpeningBalanceDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null);
    const [showOpeningBalancePrompt, setShowOpeningBalancePrompt] = useState(false);

    const fetchInventory = useCallback(async () => {
        if (!user?.company_id) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}&user_role=${user.role}`);
            
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

                const finishedGoods = (data.finished_goods || []).map(processItem);
                setItems(finishedGoods);

                // Prompt for opening balance if it's the first time and no stock exists
                const hasSeenPrompt = localStorage.getItem('hasSeenOpeningBalancePrompt_finished_goods');
                if (user && user.role === 'admin' && !hasSeenPrompt && finishedGoods.length > 0 && finishedGoods.every(item => item.quantity === 0)) {
                    setShowOpeningBalancePrompt(true);
                }
            }
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred';
            setError(`Failed to fetch inventory: ${errorMessage}`);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch inventory: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (user) { 
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
    
    const handleOpeningBalanceSuccess = () => {
        toast({ title: 'Success', description: 'Opening balances recorded successfully.' });
        fetchInventory();
    };

    const handleRowClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsHistoryDialogOpen(true);
    };

    const handlePromptAction = (confirm: boolean) => {
        setShowOpeningBalancePrompt(false);
        localStorage.setItem('hasSeenOpeningBalancePrompt_finished_goods', 'true');
        if (confirm) {
            setIsOpeningBalanceDialogOpen(true);
        }
    };

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
            <ItemHistoryDialog
                open={isHistoryDialogOpen}
                onOpenChange={setIsHistoryDialogOpen}
                item={selectedItem}
            />
             <RecordOpeningBalanceDialog
                open={isOpeningBalanceDialogOpen}
                onOpenChange={setIsOpeningBalanceDialogOpen}
                onSuccess={handleOpeningBalanceSuccess}
                itemType="finished_good"
            />
            <AlertDialog open={showOpeningBalancePrompt} onOpenChange={setShowOpeningBalancePrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Set Your Opening Balances</AlertDialogTitle>
                        <AlertDialogDescription>
                            It looks like you're getting started. Would you like to record the opening stock quantities and costs for your finished goods now?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => handlePromptAction(false)}>Maybe Later</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handlePromptAction(true)}>Yes, Let's Do It</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Finished Goods</h1>
                    <p className="text-muted-foreground">Track and manage all registered products.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchInventory} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {user?.role === 'admin' && <Button size="sm" variant="outline" onClick={() => setIsOpeningBalanceDialogOpen(true)}>
                        <BookUp className="mr-2 h-4 w-4" />
                        Set Opening Balances
                    </Button>}
                    <Button size="sm" onClick={() => setIsRegisterItemDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Register New Item
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 bg-destructive/10 text-destructive rounded-lg">
                    <AlertCircle className="h-10 w-10 mb-2" />
                    <p className="text-lg font-semibold">An Error Occurred</p>
                    <p>{error}</p>
                </div>
            ) : (
                <InventoryTable
                    items={items}
                    onManageTiers={handleOpenPriceTierDialog}
                    userRole={user?.role}
                    onRowClick={handleRowClick}
                    user={user}
                />
            )}
        </>
    );
};


const InventoryTable = ({ items, onManageTiers, userRole, onRowClick, user }: { items: InventoryItem[], onManageTiers?: (item: InventoryItem) => void, userRole: string | undefined, onRowClick: (item: InventoryItem) => void, user: any }) => (
    <Card>
        <CardContent className="pt-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit of Measure</TableHead>
                        {userRole !== 'staff' && <TableHead className="text-right">Avg. Unit Cost</TableHead>}
                        <TableHead className="text-right">Stock on Hand</TableHead>
                        {userRole !== 'staff' && <TableHead className="text-right">Total Value</TableHead>}
                        <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id} onClick={() => onRowClick(item)} className="cursor-pointer">
                            <TableCell className="font-mono">{item.sku || 'N/A'}</TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            {userRole !== 'staff' && <TableCell className="text-right font-mono">{formatCurrency(item.unit_cost)}</TableCell>}
                            <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                            {userRole !== 'staff' && <TableCell className="text-right font-mono">{formatCurrency(item.total_value)}</TableCell>}
                            <TableCell className="text-center">
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onManageTiers?.(item); }}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Manage Tiers
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                 {userRole !== 'staff' && <TableFooter>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-bold">Total Value</TableCell>
                        <TableCell className="text-right font-bold font-mono">
                            {formatCurrency(items.reduce((acc, item) => acc + item.total_value, 0))}
                        </TableCell>
                        <TableCell></TableCell> 
                    </TableRow>
                </TableFooter>}
            </Table>
             {items.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No finished goods registered yet.</p>
                    {user?.role === 'admin' && <p className="mt-2 text-sm">You can add your initial inventory using the &quot;Set Opening Balances&quot; button.</p>}
                </div>
            )}
        </CardContent>
    </Card>
);

export default FinishedGoodsPage;
