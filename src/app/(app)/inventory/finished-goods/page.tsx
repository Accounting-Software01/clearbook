'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger, 
    DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle, RefreshCw, Settings, BookUp, AlertTriangle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
import { PriceTierManagerDialog } from '@/components/PriceTierManagerDialog';
import ItemHistoryDialog from '@/components/ItemHistoryDialog';
import { RecordOpeningBalanceDialog } from '@/components/RecordOpeningBalanceDialog';
import { EditFinishedGoodDialog } from '@/components/inventory/EditFinishedGoodDialog'; // Import the new dialog
import { ResolveOrphansDialog, OrphanItem } from '@/components/inventory/ResolveOrphansDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
  quantity: number;
  item_type: 'product' | 'raw_material';
  total_value: number;
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

    // Dialog states
    const [isRegisterItemDialogOpen, setIsRegisterItemDialogOpen] = useState(false);
    const [isPriceTierDialogOpen, setIsPriceTierDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isOpeningBalanceDialogOpen, setIsOpeningBalanceDialogOpen] = useState(false);
    const [isResolveOrphansDialogOpen, setIsResolveOrphansDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [orphans, setOrphans] = useState<OrphanItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [itemToManage, setItemToManage] = useState<InventoryItem | null>(null);

    const fetchInventory = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        setOrphans([]);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}&user_role=${user.role}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) || {};
                throw new Error(errorData.message || response.statusText);
            }
            const data = await response.json();
            if (data && data.products) {
                const allProducts = data.products || [];
                const foundOrphans = allProducts.filter((item: any) => item.is_orphan).map((item: any): OrphanItem => ({ ...item, account_code: item.id.replace('orphan_', '') }));
                setOrphans(foundOrphans);
                const regularItems = allProducts.filter((item: any) => !item.is_orphan).map((item: any): InventoryItem => ({
                    ...item,
                    unit_cost: parseFloat(item.unit_cost) || 0,
                    quantity: parseFloat(item.quantity) || 0,
                    total_value: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0),
                }));
                setItems(regularItems);
            }
        } catch (e: any) {
            setError(`Failed to fetch inventory: ${e.message}`);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch inventory: ${e.message}` });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => { if (user) fetchInventory(); }, [user, fetchInventory]);

    const handleDataUpdateSuccess = () => {
        toast({ title: 'Success', description: 'Inventory data has been updated.' });
        fetchInventory();
    };

    // --- ACTION HANDLERS ---
    const handleEditClick = (item: InventoryItem) => {
        setItemToManage(item);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (item: InventoryItem) => {
        setItemToManage(item);
        setIsDeleteDialogOpen(true);
    };
    
    const handleManageTiersClick = (item: InventoryItem) => {
        setItemToManage(item);
        setIsPriceTierDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToManage || !user?.company_id) return;
        const { id } = toast({ title: 'Deleting Product...', description: 'Please wait.' });
        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/delete-finished-good.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_id: user.company_id, item_id: itemToManage.id })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Failed to delete product.');
            toast.update(id, { title: 'Success!', description: 'Product has been deleted.' });
            fetchInventory();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast.update(id, { title: 'Deletion Failed', description: errorMessage, variant: 'destructive' });
        }
        setIsDeleteDialogOpen(false);
        setItemToManage(null);
    };

    const handleRowClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsHistoryDialogOpen(true);
    };

    return (
        <>
            {/* --- DIALOGS --- */}
            <RegisterItemDialog open={isRegisterItemDialogOpen} onOpenChange={setIsRegisterItemDialogOpen} onSuccess={handleDataUpdateSuccess} />
            <EditFinishedGoodDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} item={itemToManage} onSuccess={handleDataUpdateSuccess} />
            <PriceTierManagerDialog open={isPriceTierDialogOpen} onOpenChange={setIsPriceTierDialogOpen} product={itemToManage ? { id: itemToManage.id, name: itemToManage.name } : null} />
            {user?.company_id && <ResolveOrphansDialog open={isResolveOrphansDialogOpen} onOpenChange={setIsResolveOrphansDialogOpen} orphans={orphans} companyId={user.company_id} onSuccess={handleDataUpdateSuccess} />}
            {selectedItem && <ItemHistoryDialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} item={selectedItem} itemType="product" />}
            <RecordOpeningBalanceDialog open={isOpeningBalanceDialogOpen} onOpenChange={setIsOpeningBalanceDialogOpen} onSuccess={handleDataUpdateSuccess} itemType="finished_good" />
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product "<b>{itemToManage?.name}</b>". <br/><br/>
                            <span className="font-bold text-destructive">Important:</span> You cannot delete a product that has been used in invoices, has a Bill of Materials, or has price tiers defined.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {orphans.length > 0 && !isLoading && (
                 <Alert className="mb-6 border-amber-500/50 text-amber-900 dark:text-amber-200"><AlertTriangle className="h-4 w-4 text-amber-500" /><AlertTitle>Data Inconsistency Detected</AlertTitle><AlertDescription>We found {orphans.length} product account(s) that are not registered as items.<Button variant="link" className="p-0 h-auto ml-2 text-amber-900 dark:text-amber-200 font-bold" onClick={() => setIsResolveOrphansDialogOpen(true)}>Click here to resolve.</Button></AlertDescription></Alert>
            )}

            <div className="flex justify-between items-center mb-4">
                <div><h1 className="text-2xl font-bold">Finished Goods</h1><p className="text-muted-foreground">Track and manage all registered products.</p></div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchInventory} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh</Button>
                    {user?.role === 'admin' && <Button size="sm" variant="outline" onClick={() => setIsOpeningBalanceDialogOpen(true)}><BookUp className="mr-2 h-4 w-4" />Set Opening Balances</Button>}
                    <Button size="sm" onClick={() => setIsRegisterItemDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Register New Item</Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 bg-destructive/10 text-destructive rounded-lg"><AlertCircle className="h-10 w-10 mb-2" /><p className="text-lg font-semibold">An Error Occurred</p><p>{error}</p></div>
            ) : (
                <InventoryTable items={items} userRole={user?.role} onRowClick={handleRowClick} onEdit={handleEditClick} onDelete={handleDeleteClick} onManageTiers={handleManageTiersClick} />
            )}
        </>
    );
};

const InventoryTable = ({ items, userRole, onRowClick, onEdit, onDelete, onManageTiers }: { items: InventoryItem[], userRole: string | undefined, onRowClick: (item: InventoryItem) => void, onEdit: (item: InventoryItem) => void, onDelete: (item: InventoryItem) => void, onManageTiers: (item: InventoryItem) => void }) => (
    <Card><CardContent className="pt-6">
        <Table>
            <TableHeader><TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit of Measure</TableHead>
                {userRole !== 'staff' && <TableHead className="text-right">Avg. Unit Cost</TableHead>}
                <TableHead className="text-right">Stock on Hand</TableHead>
                {userRole !== 'staff' && <TableHead className="text-right">Total Value</TableHead>}
                {userRole === 'admin' && <TableHead className="text-center">Actions</TableHead>}
            </TableRow></TableHeader>
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
                        {userRole === 'admin' && (
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(item)}><Pencil className="mr-2 h-4 w-4" />Edit Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onManageTiers(item)}><Settings className="mr-2 h-4 w-4" />Manage Price Tiers</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Product</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
             {userRole !== 'staff' && items.length > 0 && <TableFooter>
                <TableRow>
                    <TableCell colSpan={userRole === 'admin' ? 7 : 6} className="text-right font-bold">Total Value</TableCell>
                    <TableCell className="text-right font-bold font-mono">{formatCurrency(items.reduce((acc, item) => acc + item.total_value, 0))}</TableCell>
                    {userRole === 'admin' && <TableCell></TableCell>}
                </TableRow>
            </TableFooter>}
        </Table>
        {items.length === 0 && <div className="text-center py-12 text-muted-foreground"><p>No finished goods registered yet.</p>{userRole === 'admin' && <p className="mt-2 text-sm">You can add your initial inventory using the &quot;Set Opening Balances&quot; button.</p>}</div>}
    </CardContent></Card>
);

export default FinishedGoodsPage;
