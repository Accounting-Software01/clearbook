
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chartOfAccounts } from '@/lib/chart-of-accounts';


interface Supplier {
  id: string;
  name: string;
}

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        try {
            // This is a simulation. In a real app, you would fetch from your backend API.
            const supplierAccounts = chartOfAccounts
                .filter(acc => acc.type === 'Liability' && acc.name.toLowerCase().includes('supplier'))
                .map(acc => ({ id: acc.code, name: acc.name }));
            
            setSuppliers(supplierAccounts);
        } catch (e: any) {
            setError("Failed to load suppliers.");
        } finally {
            setIsLoading(false);
        }
    }, []);

  return (
    <>
      <p className="text-muted-foreground mb-6">Manage your list of suppliers and their contact information.</p>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>All Suppliers</CardTitle>
                <CardDescription>A list of all your company's suppliers.</CardDescription>
            </div>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Supplier
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
                        <TableHead>Supplier ID</TableHead>
                        <TableHead>Supplier Name</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                        <TableCell className="font-mono">{supplier.id}</TableCell>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
             { !isLoading && !error && suppliers.length === 0 && (
                <div className="flex justify-center items-center h-40 text-muted-foreground">
                    <p>No suppliers found in the chart of accounts.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
};

export default SuppliersPage;
