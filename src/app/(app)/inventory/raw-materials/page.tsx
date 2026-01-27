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
import { PlusCircle, Loader2, AlertCircle, RefreshCw, BookUp } from 'lucide-react';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
import ItemHistoryDialog from '@/components/ItemHistoryDialog';
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
} from "@/components/ui/alert-dialog"

// Matches the aliased output from the get-items.php API
interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit_of_measure: string; // Now directly from API
  unit_cost: number;
  quantity: number;
  item_type: 'product' | 'raw_material';
  total_value: number; // Now directly from API
}

// Matches the history ledger entry from get-item-history.php
interface LedgerEntry {
  date: string;
  type: string;
  description: string;
  quantity: number;
  unit_cost: number | null;
  total_value: number | null;
  balance_quantity: number;
  balance_avg_cost: number | null;
  balance_total_value: number | null;
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
    
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [itemHistory, setItemHistory] = useState<LedgerEntry[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const [showOpeningBalancePrompt, setShowOpeningBalancePrompt] = useState(false);

    const fetchInventory = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}&user_role=${user.role}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data) {
                // Backend now calculates total_value, so we just parse it.
                const processItem = (item: any): InventoryItem => ({
                    ...item,
                    unit_cost: parseFloat(item.unit_cost) || 0,
                    quantity: parseFloat(item.quantity) || 0,
                    total_value: parseFloat(item.total_value) || 0,
                });
                const rawMaterials = (data.raw_materials || []).map(processItem);
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

    const handleRegistrationSuccess = () => {
        toast({ title: 'Success', description: 'Item registered successfully.' });
        fetchInventory();
    };

    const handleRowClick = async (item: InventoryItem) => {
        if (!user) return;
        setSelectedItem(item);
        setIsHistoryDialogOpen(true);
        setIsHistoryLoading(true);
        setItemHistory([]); // Clear previous history

        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-item-history.php?company_id=${user.company_id}&item_id=${item.id}&item_type=raw_material&user_role=${user.role}`);
            const data = await response.json();
            if (data.status === 'success') {
                setItemHistory(data.history);
            } else {
                throw new Error(data.message || 'Failed to fetch history');
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Could not fetch item history: ${error.message}`,
            });
            setIsHistoryDialogOpen(false); // Close dialog on error
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handlePromptAction = (confirm: boolean) => {
        setShowOpeningBalancePrompt(false);
        localStorage.setItem('hasSeenOpeningBalancePrompt_raw_materials', 'true');
        if (confirm) {
            setIsOpeningBalanceDialogOpen(true);
        }
    };
    
    const handleCloseHistoryDialog = () => {
        setIsHistoryDialogOpen(false);
        setSelectedItem(null);
        setItemHistory([]);
    }

    return (
        <>
            <RegisterItemDialog
                open={isRegisterItemDialogOpen}
                onOpenChange={setIsRegisterItemDialogOpen}
                onSuccess={handleRegistrationSuccess}
            />
            {selectedItem && (
                <ItemHistoryDialog
                    isOpen={isHistoryDialogOpen}
                    onClose={handleCloseHistoryDialog}
                    history={itemHistory}
                    itemName={selectedItem.name}
                />
            )}
            <RecordOpeningBalanceDialog
                open={isOpeningBalanceDialogOpen}
                onOpenChange={setIsOpeningBalanceDialogOpen}
                onSuccess={fetchInventory}
                itemType="raw_material"
            />
             <AlertDialog open={showOpeningBalancePrompt} onOpenChange={setShowOpeningBalancePrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Set Your Opening Balances</AlertDialogTitle>
                        <AlertDialogDescription>
                            It looks like you're getting started. Would you like to record the opening stock quantities and costs for your raw materials now?
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
                 {userRole !== 'staff' && <TableFooter>
                    <TableRow>
                        <TableCell colSpan={userRole !== 'staff' ? 6 : 4} className="text-right font-bold">Total Value</TableCell>
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
