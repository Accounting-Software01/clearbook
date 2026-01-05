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
import { ProductionOrderHistoryDialog } from '@/components/ProductionOrderHistoryDialog';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

// Define types for the data we expect from the API
interface WorkInProgressItem {
    id: number;
    product_name: string;
    quantity_to_produce: number;
    status: string;
    start_date: string;
    bom: {
        raw_material_id: number;
        quantity_required: number;
        unit_cost: number;
        raw_material_name: string;
    }[];
}

const WorkInProgressPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [workInProgressValue, setWorkInProgressValue] = useState(0);
    const [workInProgressItems, setWorkInProgressItems] = useState<WorkInProgressItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<WorkInProgressItem | null>(null);

    const fetchWorkInProgressData = useCallback(async () => {
        if (!user?.company_id) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/manage-production?company_id=${user.company_id}&status=In Progress&with_details=true&user_role=${user.role}`);

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

            if (data && data.orders) {
                setWorkInProgressItems(data.orders);

                if (user.role !== 'staff') {
                    const totalValue = data.orders.reduce((total: number, order: WorkInProgressItem) => {
                        const orderValue = order.bom.reduce((sum: number, item) => {
                            return sum + (item.quantity_required * item.unit_cost);
                        }, 0);
                        return total + (orderValue * order.quantity_to_produce);
                    }, 0);

                    setWorkInProgressValue(totalValue);
                }
            } else {
                setWorkInProgressItems([]);
                setWorkInProgressValue(0);
            }
        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred';
            setError(`Failed to fetch work-in-progress data: ${errorMessage}`);
            toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch work-in-progress data: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchWorkInProgressData();
        }
    }, [user, fetchWorkInProgressData]);

    const handleRowClick = (order: WorkInProgressItem) => {
        setSelectedOrder(order);
        setIsHistoryDialogOpen(true);
    };

    return (
        <>
            <ProductionOrderHistoryDialog
                open={isHistoryDialogOpen}
                onOpenChange={setIsHistoryDialogOpen}
                order={selectedOrder}
            />
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Work-in-Progress Inventory</h1>
                    <p className="text-muted-foreground">Track and manage all items currently in production.</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchWorkInProgressData} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {user?.role !== 'staff' && <Card className="mb-6">
                <CardHeader>
                    <CardTitle>WIP Inventory Value</CardTitle>
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
                        <p className="text-3xl font-bold">{formatCurrency(workInProgressValue)}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">Estimated value of all materials in active production orders.</p>
                </CardContent>
            </Card>}

            <Card>
                <CardHeader>
                    <CardTitle>Active Production Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-destructive text-center py-10">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p>Failed to load production orders.</p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    ) : workInProgressItems.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order ID</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    {user?.role !== 'staff' && <TableHead className="text-right">WIP Value</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workInProgressItems.map((order) => {
                                    const orderValue = user?.role !== 'staff' ? order.bom.reduce((sum, item) => sum + (item.quantity_required * item.unit_cost), 0) * order.quantity_to_produce : 0;
                                    return (
                                        <TableRow key={order.id} onClick={() => handleRowClick(order)} className="cursor-pointer">
                                            <TableCell className="font-medium">#{order.id}</TableCell>
                                            <TableCell>{order.product_name}</TableCell>
                                            <TableCell>{order.quantity_to_produce}</TableCell>
                                            <TableCell>{new Date(order.start_date).toLocaleDateString()}</TableCell>
                                            {user?.role !== 'staff' && <TableCell className="text-right">{formatCurrency(orderValue)}</TableCell>}
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-10">
                            <p>No items are currently in production.</p>
                            <p className="text-sm text-muted-foreground">Start a new production order to see it here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default WorkInProgressPage;
