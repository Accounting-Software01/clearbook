'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { PlusCircle } from 'lucide-react';

interface InventoryItem {
  code: string;
  name: string;
  quantity: number;
  unitCost: number;
}

// Simulated data - in a real app, this would be fetched from an API
const finishedGoods: InventoryItem[] = [
  { code: 'FG-001', name: 'Premium Bottled Water 500ml', quantity: 1500, unitCost: 0.50 },
  { code: 'FG-002', name: 'Flavored Sparkling Water 1L', quantity: 800, unitCost: 0.80 },
  { code: 'FG-003', name: 'Vitamin Enriched Water 750ml', quantity: 950, unitCost: 0.75 },
  { code: 'FG-004', name: 'Alkaline Water 1.5L', quantity: 600, unitCost: 1.20 },
];

const rawMaterials: InventoryItem[] = [
  { code: 'RM-001', name: 'Plastic Bottles 500ml', quantity: 10000, unitCost: 0.10 },
  { code: 'RM-002', name: 'Plastic Caps', quantity: 25000, unitCost: 0.02 },
  { code: 'RM-003', name: 'Cardboard Boxes (24-pack)', quantity: 2000, unitCost: 0.25 },
  { code: 'RM-004', name: 'Printed Labels', quantity: 15000, unitCost: 0.05 },
  { code: 'RM-005', name: 'Purified Water Concentrate', quantity: 5000, unitCost: 0.15 },
];

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const InventoryTable = ({ items, title }: { items: InventoryItem[], title: string }) => {
    const totalValue = items.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                     <Button size="sm" variant="outline">
                        <PlusCircle className="mr-2" />
                        Add New Item
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
};


const InventoryPage = () => {
  return (
    <>
      <p className="text-muted-foreground mb-6">Track stock levels for finished goods and raw materials.</p>
      <Tabs defaultValue="finished-goods">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="finished-goods">Finished Goods</TabsTrigger>
            <TabsTrigger value="raw-materials">Raw Materials</TabsTrigger>
        </TabsList>
        <TabsContent value="finished-goods" className="mt-6">
            <InventoryTable items={finishedGoods} title="Finished Goods Inventory" />
        </TabsContent>
        <TabsContent value="raw-materials" className="mt-6">
            <InventoryTable items={rawMaterials} title="Raw Materials Inventory" />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default InventoryPage;
