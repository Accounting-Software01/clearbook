'use client';
import React, { useState, useEffect } from 'react';
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
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InventoryItem {
  code: string;
  name: string;
  quantity: number;
  unitCost: number;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const InventoryTable = ({ 
    items, 
    title, 
    onAddItem, 
    isLoading,
    error 
}: { 
    items: InventoryItem[], 
    title: string, 
    onAddItem: () => void,
    isLoading: boolean,
    error: string | null
}) => {
    const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                     <Button size="sm" variant="outline" onClick={onAddItem}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Item
                    </Button>
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
                                <TableHead className="text-right">Quantity on Hand</TableHead>
                                <TableHead className="text-right">Unit Cost</TableHead>
                                <TableHead className="text-right">Total Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.code}>
                                    <TableCell className="font-mono">{item.code}</TableCell>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right font-mono">{item.quantity.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.unitCost)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(item.quantity * item.unitCost)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="text-right font-bold text-lg">Total Inventory Value</TableCell>
                                <TableCell className="text-right font-bold font-mono text-lg">{formatCurrency(totalValue)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};


const InventoryPage = () => {
    const { toast } = useToast();
    const [finishedGoods, setFinishedGoods] = useState<InventoryItem[]>([]);
    const [rawMaterials, setRawMaterials] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState({ goods: true, materials: true });
    const [error, setError] = useState({ goods: null, materials: null });

    useEffect(() => {
        const fetchFinishedGoods = async () => {
            try {
                const response = await fetch('https://hariindustries.net/busa-api/database/get-finished-goods.php');
                if (!response.ok) throw new Error('Failed to fetch finished goods.');
                const data = await response.json();
                setFinishedGoods(data);
            } catch (e: any) {
                setError(prev => ({ ...prev, goods: e.message }));
            } finally {
                setLoading(prev => ({ ...prev, goods: false }));
            }
        };

        const fetchRawMaterials = async () => {
             try {
                const response = await fetch('https://hariindustries.net/busa-api/database/get-raw-materials.php');
                if (!response.ok) throw new Error('Failed to fetch raw materials.');
                const data = await response.json();
                setRawMaterials(data);
            } catch (e: any) {
                setError(prev => ({ ...prev, materials: e.message }));
            } finally {
                setLoading(prev => ({ ...prev, materials: false }));
            }
        };

        fetchFinishedGoods();
        fetchRawMaterials();
    }, []);

    const handleAddFinishedGood = () => {
        // This is a simulation. In a real app, this would open a form,
        // send data to the backend, and then the backend would trigger the journal entry.
        const newItemValue = 100 * 1.50; // 100 units at $1.50
        console.log('--- SIMULATING AUTOMATIC JOURNAL ENTRY ---');
        console.log('A new finished good has been added.');
        console.log(`Value: ${formatCurrency(newItemValue)}`);
        console.log('Journal Entry created:');
        console.log(`DEBIT: 101340 - Inventory - Finished Goods | Amount: ${formatCurrency(newItemValue)}`);
        console.log(`CREDIT: 201020 - Trade Creditors - Suppliers | Amount: ${formatCurrency(newItemValue)}`);
        console.log('--- SIMULATION END ---');

        toast({
            title: "Inventory Action Simulated",
            description: "Check the console to see the automatic journal entry that would be created.",
        });
    };

    const handleAddRawMaterial = () => {
         toast({
            title: "Action Not Implemented",
            description: "This is a placeholder for adding a new raw material.",
            variant: "destructive"
        });
    }

  return (
    <>
      <p className="text-muted-foreground mb-6">Track stock levels for finished goods and raw materials. Adding items here can automatically update your accounting records.</p>
      <Tabs defaultValue="finished-goods">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
            <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
        </TabsList>
        <TabsContent value="finished-goods" className="mt-6">
            <InventoryTable 
                items={finishedGoods} 
                title="Finished Goods Inventory" 
                onAddItem={handleAddFinishedGood} 
                isLoading={loading.goods}
                error={error.goods}
            />
        </TabsContent>
        <TabsContent value="raw-materials" className="mt-6">
            <InventoryTable 
                items={rawMaterials} 
                title="Raw Materials Inventory" 
                onAddItem={handleAddRawMaterial}
                isLoading={loading.materials}
                error={error.materials}
            />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default InventoryPage;
