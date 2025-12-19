
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
import { PlusCircle, PackagePlus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { AddStockDialog } from '@/components/AddStockDialog';
import { RegisterItemDialog } from '@/components/RegisterItemDialog';
import { ItemActivityDialog } from '@/components/ItemActivityDialog';
import { getCurrentUser } from '@/lib/auth';

interface InventoryItem {
  id: number;
  code: string;
  name: string;
  quantity: number; 
  unitCost: number;
}

interface User {
    uid: string;
    company_id: string;
    role: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
    }).format(amount);
};

const InventoryTable = ({ 
    items, 
    title, 
    user,
    onAddStock,
    onRegisterItem, 
    onRefresh,
    onSelectItem,
    isLoading,
    error 
}: { 
    items: InventoryItem[], 
    title: string, 
    user: User | null,
    onAddStock: () => void,
    onRegisterItem: () => void,
    onRefresh: () => void,
    onSelectItem: (itemId: number, itemName: string) => void,
    isLoading: boolean,
    error: string | null
}) => {
    const isStoreManager = user?.role === 'store_manager';

    const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh table">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={onRegisterItem}>
                            <PackagePlus className="mr-2 h-4 w-4" />
                            Register New Item
                        </Button>
                         <Button size="sm" onClick={onAddStock}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Stock
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                     <div className="flex flex-col justify-center items-center h-40 text-destructive">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Code</TableHead>
                                <TableHead>Item Name</TableHead>
                                <TableHead className="text-right">Stock on Hand</TableHead>
                                {!isStoreManager && <TableHead className="text-right">Unit Cost</TableHead>}
                                {!isStoreManager && <TableHead className="text-right">Total Value</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.code}>
                                    <TableCell className="font-mono">{item.code}</TableCell>
                                    <TableCell 
                                        className="font-medium cursor-pointer hover:underline"
                                        onClick={() => onSelectItem(item.id, item.name)}
                                    >
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                                    {!isStoreManager && <TableCell className="text-right font-mono">{formatCurrency(item.unitCost)}</TableCell>}
                                    {!isStoreManager && <TableCell className="text-right font-mono">{formatCurrency(item.quantity * item.unitCost)}</TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                        {!isStoreManager && (
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={4} className="text-right font-bold text-lg">Total Inventory Value</TableCell>
                                    <TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalValue)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>
                )}
                 { !isLoading && !error && items.length === 0 && (
                    <div className="flex justify-center items-center h-40 text-muted-foreground">
                        <p>No inventory items found.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


const InventoryPage = () => {
    const [finishedGoods, setFinishedGoods] = useState<InventoryItem[]>([]);
    const [rawMaterials, setRawMaterials] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState({ goods: true, materials: true });
    const [error, setError] = useState<{ goods: string | null, materials: string | null }>({ goods: null, materials: null });
    const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
    const [isRegisterItemDialogOpen, setIsRegisterItemDialogOpen] = useState(false);
    const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
    const [dialogMode, setDialogMode] = useState<'product' | 'raw_material'>('product');
    const [activeTab, setActiveTab] = useState<'goods' | 'materials'>('goods');
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        };
        fetchUser();
    }, []);

    const fetchInventory = useCallback(async (type: 'goods' | 'materials', companyId: string) => {
        const endpoint = type === 'goods' 
            ? 'https://hariindustries.net/busa-api/database/get-finished-good.php' 
            : 'https://hariindustries.net/busa-api/database/get-raw-material.php';
        
        setLoading(prev => ({ ...prev, [type]: true }));
        setError(prev => ({ ...prev, [type]: null }));

        try {
            const response = await fetch(`${endpoint}?companyId=${companyId}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch ${type}: ${errorText}`);
            }
            const data = await response.json();

            if (type === 'goods') {
                setFinishedGoods(data);
            } else {
                setRawMaterials(data);
            }
        } catch (e: any) {
            setError(prev => ({ ...prev, [type]: e.message }));
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    }, []);

    useEffect(() => {
        if (user && user.company_id) {
            fetchInventory('goods', user.company_id);
            fetchInventory('materials', user.company_id);
        }
    }, [user, fetchInventory]);

    const handleOpenAddStockDialog = (mode: 'product' | 'raw_material') => {
        setDialogMode(mode);
        setIsAddStockDialogOpen(true);
    };

    const handleOpenRegisterItemDialog = (mode: 'product' | 'raw_material') => {
        setDialogMode(mode);
        setIsRegisterItemDialogOpen(true);
    };

    const handleOpenItemActivityDialog = (itemId: number, itemName: string) => {
        setSelectedItemId(itemId);
        setSelectedItemName(itemName);
        setIsActivityLogOpen(true);
    };

    const handleSuccess = () => {
        if (user && user.company_id) {
            const type = dialogMode === 'product' ? 'goods' : 'materials';
            fetchInventory(type, user.company_id);
        }
    }

    const handleRefresh = () => {
        if (user && user.company_id) {
            fetchInventory(activeTab, user.company_id);
        }
    };

  return (
    <>
      <AddStockDialog
        open={isAddStockDialogOpen}
        onOpenChange={setIsAddStockDialogOpen}
        mode={dialogMode}
        onSuccess={handleSuccess}
      />
      <RegisterItemDialog
        open={isRegisterItemDialogOpen}
        onOpenChange={setIsRegisterItemDialogOpen}
        mode={dialogMode}
        onSuccess={handleSuccess}
      />
        <ItemActivityDialog 
            open={isActivityLogOpen}
            onOpenChange={setIsActivityLogOpen}
            itemId={selectedItemId}
            itemName={selectedItemName}
        />
      <p className="text-muted-foreground mb-6">Track stock levels for finished goods and raw materials. Adding items here automatically updates your accounting records.</p>
      <Tabs 
        defaultValue="finished-goods" 
        onValueChange={(value) => setActiveTab(value === 'finished-goods' ? 'goods' : 'materials')}
       >
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
            <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
        </TabsList>
        <TabsContent value="finished-goods" className="mt-6">
            <InventoryTable 
                items={finishedGoods} 
                title="Finished Goods Inventory" 
                user={user}
                onAddStock={() => handleOpenAddStockDialog('product')} 
                onRegisterItem={() => handleOpenRegisterItemDialog('product')}
                onRefresh={handleRefresh}
                onSelectItem={handleOpenItemActivityDialog}
                isLoading={loading.goods}
                error={error.goods}
            />
        </TabsContent>
        <TabsContent value="raw-materials" className="mt-6">
            <InventoryTable 
                items={rawMaterials} 
                title="Raw Materials Inventory" 
                user={user}
                onAddStock={() => handleOpenAddStockDialog('raw_material')} 
                onRegisterItem={() => handleOpenRegisterItemDialog('raw_material')}
                onRefresh={handleRefresh}
                onSelectItem={handleOpenItemActivityDialog}
                isLoading={loading.materials}
                error={error.materials}
            />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default InventoryPage;