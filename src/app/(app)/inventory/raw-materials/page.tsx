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
import { PlusCircle, Loader2, AlertCircle, RefreshCw, BookUp, AlertTriangle } from 'lucide-react';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
import ItemHistoryDialog from '@/components/ItemHistoryDialog';
import { RecordOpeningBalanceDialog } from '@/components/RecordOpeningBalanceDialog';
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
} from "@/components/ui/alert-dialog"

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

const RawMaterialsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isRegisterItemDialogOpen, setIsRegisterItemDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isOpeningBalanceDialogOpen, setIsOpeningBalanceDialogOpen] = useState(false);
    const [isResolveOrphansDialogOpen, setIsResolveOrphansDialogOpen] = useState(false);
    const [orphans, setOrphans] = useState<OrphanItem[]>([]);
    
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [showOpeningBalancePrompt, setShowOpeningBalancePrompt] = useState(false);

    const fetchInventory = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        setOrphans([]);

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
            if (data && data.raw_materials) {
                const allRawMaterials = data.raw_materials || [];

                const foundOrphans = allRawMaterials
                    .filter((item: any) => item.is_orphan === true)
                    .map((item: any): OrphanItem => ({ 
                        ...item, 
                        id: item.id, // Keep the orphan_xxx ID
                        account_code: item.id.replace('orphan_', '') 
                    }));
                
                setOrphans(foundOrphans);

                const regularItems = allRawMaterials.filter((item: any) => !item.is_orphan);

                const processItem = (item: any): InventoryItem => ({
                    ...item,
                    unit_cost: parseFloat(item.unit_cost) || 0,
                    quantity: parseFloat(item.quantity) || 0,
                    total_value: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0),
                });

                const rawMaterials = regularItems.map(processItem);
                setItems(rawMaterials);

                const hasSeenPrompt = localStorage.getItem('hasSeenOpeningBalancePrompt_raw_materials');
                if (user && user.role === 'admin' && !hasSeenPrompt && rawMaterials.length > 0 && rawMaterials.every(item => item.quantity === 0)) {
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

    const handleDataUpdateSuccess = () => {
        toast({ title: 'Success', description: 'Inventory data has been updated.' });
        fetchInventory();
    };

    const handleRowClick = (item: InventoryItem) => {
        setSelectedItem(item);
        setIsHistoryDialogOpen(true);
    };

    const handlePromptAction = (confirm: boolean) => {
        setShowOpeningBalancePrompt(false);
        localStorage.setItem('hasSeenOpeningBalancePrompt_raw_materials', 'true');
        if (confirm) {
            setIsOpeningBalanceDialogOpen(true);
        }
    };

    return (
        <>
            <RegisterItemDialog
                open={isRegisterItemDialogOpen}
                onOpenChange={setIsRegisterItemDialogOpen}
                onSuccess={handleDataUpdateSuccess}
            />
            {user?.company_id && (
                <ResolveOrphansDialog
                    open={isResolveOrphansDialogOpen}
                    onOpenChange={setIsResolveOrphansDialogOpen}
                    orphans={orphans}
                    companyId={user.company_id}
                    onSuccess={handleDataUpdateSuccess}
                />
            )}
            {selectedItem && (
                <ItemHistoryDialog
                    open={isHistoryDialogOpen}
                    onOpenChange={setIsHistoryDialogOpen}
                    item={selectedItem}
                    itemType="raw_material"
                />
            )}
            <RecordOpeningBalanceDialog
                open={isOpeningBalanceDialogOpen}
                onOpenChange={setIsOpeningBalanceDialogOpen}
                onSuccess={handleDataUpdateSuccess}
                itemType="raw_material"
            />
             <AlertDialog open={showOpeningBalancePrompt} onOpenChange={setShowOpeningBalancePrompt}>
                {/* ... existing alert dialog content ... */}
            </AlertDialog>

            {orphans.length > 0 && !isLoading && (
                <Alert className="mb-6 border-amber-500/50 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle>Data Inconsistency Detected</AlertTitle>
                  <AlertDescription>
                    We found {orphans.length} raw material account(s) that are not registered as items.
                    <Button variant="link" className="p-0 h-auto ml-2 text-amber-900 dark:text-amber-200 font-bold" onClick={() => setIsResolveOrphansDialogOpen(true)}>
                        Click here to resolve.
                    </Button>
                  </AlertDescription>
                </Alert>
            )}

            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Raw Materials</h1>
                    <p className="text-muted-foreground">Track and manage all registered raw materials.</p>
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
                <InventoryTable items={items} userRole={user?.role} onRowClick={handleRowClick} />
            )}
        </>
    );
};


const InventoryTable = ({ items, userRole, onRowClick }: { items: InventoryItem[], userRole: string | undefined, onRowClick: (item: InventoryItem) => void }) => (
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
                        </TableRow>
                    ))}
                </TableBody>
                 {userRole !== 'staff' && items.length > 0 && <TableFooter>
                    <TableRow>
                        <TableCell colSpan={6} className="text-right font-bold">Total Value</TableCell>
                        <TableCell className="text-right font-bold font-mono">
                            {formatCurrency(items.reduce((acc, item) => acc + item.total_value, 0))}
                        </TableCell>
                    </TableRow>
                </TableFooter>}
            </Table>
            {items.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No raw materials registered yet.</p>
                    {userRole === 'admin' && <p className="mt-2 text-sm">You can add your initial inventory using the &quot;Set Opening Balances&quot; button.</p>}
                </div>
            )}
        </CardContent>
    </Card>
);

export default RawMaterialsPage;
