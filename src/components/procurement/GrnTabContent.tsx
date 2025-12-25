'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GrnList } from './GrnList';
import { GrnDetails } from './GrnDetails';
import { GrnCreator } from './GrnCreator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, PlusCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

// --- TYPES ---
type GrnView = 'list' | 'details' | 'select_po' | 'creator';

interface PurchaseOrderForList {
    id: string;
    po_number: string;
    supplier_name: string;
    po_date: string;
    status: string;
}

interface ApiResponse {
    purchase_orders?: PurchaseOrderForList[] | null;
}

// --- MAIN CONTROLLER COMPONENT ---
export function GrnTabContent() {
    const { user } = useAuth();
    const [view, setView] = useState<GrnView>('list');
    const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
    const [selectedGrnId, setSelectedGrnId] = useState<number | null>(null);
    
    // State for the PO selection view
    const [selectableOrders, setSelectableOrders] = useState<PurchaseOrderForList[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- DATA FETCHING for PO Selection ---
    const fetchSelectableOrders = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await api<ApiResponse>(`get-purchase-orders.php?company_id=${user.company_id}`);
            const orders = Array.isArray(data.purchase_orders) ? data.purchase_orders : [];
            const openOrders = orders.filter(po => po.status === 'Approved' || po.status === 'Partially Received');
            setSelectableOrders(openOrders);
        } catch (e: any) {
            setError(e.message || "An error occurred while fetching orders.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Trigger fetch when switching to the select_po view
    useEffect(() => {
        if (view === 'select_po') {
            fetchSelectableOrders();
        }
    }, [view, fetchSelectableOrders]);

    // --- NAVIGATION HANDLERS ---
    const handleGoToCreateFlow = () => setView('select_po');
    const handlePoSelected = (poId: string) => {
        setSelectedPoId(poId);
        setView('creator');
    };
    const handleGrnCreated = () => {
        setView('list');
        setSelectedPoId(null);
    };
    const handleCancelCreation = () => {
        setView('list');
        setSelectedPoId(null);
    };
    const handleViewDetails = (grnId: number) => {
        setSelectedGrnId(grnId);
        setView('details');
    };
    const handleBackToList = () => {
        setView('list');
        setSelectedGrnId(null);
    };

    // --- RENDER LOGIC ---
    const renderContent = () => {
        switch (view) {
            case 'select_po':
                if (isLoading) {
                    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
                }
                if (error) {
                    return <div className="text-destructive text-center py-10"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>;
                }
                return (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Create Goods Received Note (GRN)</CardTitle>
                                <Button variant="outline" size="sm" onClick={handleBackToList}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to GRN List
                                </Button>
                            </div>
                            <CardDescription>Select an approved Purchase Order to receive items against.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>PO Number</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>PO Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectableOrders.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-10">No approved purchase orders available to receive against.</TableCell></TableRow>
                                    ) : (
                                        selectableOrders.map(po => (
                                            <TableRow key={po.id}>
                                                <TableCell className="font-mono">{po.po_number}</TableCell>
                                                <TableCell>{po.supplier_name}</TableCell>
                                                <TableCell>{new Date(po.po_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{po.status}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => handlePoSelected(po.id)}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> Receive Items
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );

            case 'creator':
                return <GrnCreator poId={selectedPoId!} onGrnCreated={handleGrnCreated} onCancel={handleCancelCreation} />;
            
            case 'details':
                return <GrnDetails grnId={selectedGrnId!} onBack={handleBackToList} />;
            
            case 'list':
            default:
                return <GrnList onViewDetails={handleViewDetails} onGoToCreate={handleGoToCreateFlow} />;
        }
    };

    return <>{renderContent()}</>;
}
