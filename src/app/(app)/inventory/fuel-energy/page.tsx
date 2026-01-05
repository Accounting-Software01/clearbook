'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

interface FuelEnergy {
    id: number;
    name: string;
    quantity: number;
    unit_cost: number;
    reorder_level: number;
}

const FuelEnergyPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [inventoryValue, setInventoryValue] = useState(0);
    const [fuelEnergy, setFuelEnergy] = useState<FuelEnergy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFuelEnergy = useCallback(async () => {
        if (!user?.company_id) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}&item_type=fuel_energy`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data && data.fuel_energy) {
                setFuelEnergy(data.fuel_energy);
                const totalValue = data.fuel_energy.reduce((acc: number, item: FuelEnergy) => {
                    return acc + (item.quantity * item.unit_cost);
                }, 0);
                setInventoryValue(totalValue);
            } else {
                setFuelEnergy([]);
                setInventoryValue(0);
            }
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred';
            setError(`Failed to fetch fuel and energy data: ${errorMessage}`);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch fuel and energy data: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        if (user) {
            fetchFuelEnergy();
        }
    }, [user, fetchFuelEnergy]);


    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Fuel & Energy</h1>
                    <p className="text-muted-foreground">Track and manage all fuel and energy inventory.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchFuelEnergy} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Inventory Value</CardTitle>
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
                        <p className="text-3xl font-bold">{formatCurrency(inventoryValue)}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">Total value of all fuel and energy in stock.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Fuel & Energy List</CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-destructive text-center py-10">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p>Failed to load items.</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    ) : fuelEnergy.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Unit Cost</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fuelEnergy.map((item) => (
                                    <TableRow key={item.id} className={item.quantity <= item.reorder_level ? 'bg-red-100 dark:bg-red-900/50' : ''}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.quantity * item.unit_cost)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : (
                        <div className="text-center py-10">
                            <p>No fuel or energy items found.</p>
                            <p className="text-sm text-muted-foreground">Register a new item to see it here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default FuelEnergyPage;
