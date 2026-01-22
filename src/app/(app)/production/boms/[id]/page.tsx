'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

// Interfaces for the detailed BOM data structure
interface BomIdentity {
    id: number;
    bom_code: string;
    finished_good_name: string;
    bom_version: string;
    status: string;
    uom: string;
    batch_size: number;
    effective_from: string;
    notes: string;
    scrap_percentage: number;
    prepared_by: string;
    approved_by: string;
    bom_type: string;
}

interface BomComponent {
    id: number;
    item_name: string;
    component_type: string;
    quantity: number;
    uom: string;
    waste_percentage: number;
}

interface BomOperation {
    id: number;
    sequence: number;
    operation_name: string;
    notes: string;
}

interface BomOverhead {
    id: number;
    overhead_name: string;
    cost_category: string;
    cost_method: string;
    cost: number;
    gl_account: string;
}

interface BomDetails {
    identity: BomIdentity;
    components: BomComponent[];
    operations: BomOperation[];
    overheads: BomOverhead[];
}

const BomDetailPage = () => {
    const { id: bomId } = useParams();
    const { toast } = useToast();

    const [bomDetails, setBomDetails] = useState<BomDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBomDetails = useCallback(async () => {
        if (!bomId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-bom-details.php?bom_id=${bomId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch BOM details');
            }

            if (data.success) {
                setBomDetails(data.bom_details);
            } else {
                throw new Error(data.message);
            }
        } catch (error: any) {
            toast({
                title: "Error fetching BOM details",
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [bomId, toast]);

    useEffect(() => {
        fetchBomDetails();
    }, [fetchBomDetails]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    if (!bomDetails) {
        return <div className="text-center p-8">BOM details could not be loaded or found.</div>;
    }

    const { identity, components, operations, overheads } = bomDetails;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <Link href="/production/boms">
                 <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to BOM List
                </Button>
            </Link>

            {/* BOM Identity Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{identity.bom_code} <span className="text-lg font-normal text-muted-foreground"> (v{identity.bom_version})</span></CardTitle>
                            <CardDescription>Details for Bill of Material for <strong>{identity.finished_good_name}</strong></CardDescription>
                        </div>
                        <Badge variant={identity.status === 'Active' ? 'default' : 'secondary'}>{identity.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div><strong>UoM:</strong> {identity.uom}</div>
                    <div><strong>Batch Size:</strong> {identity.batch_size}</div>
                    <div><strong>Scrap %:</strong> {identity.scrap_percentage}%</div>
                    <div><strong>Effective Date:</strong> {new Date(identity.effective_from).toLocaleDateString()}</div>
                    <div><strong>BOM Type:</strong> {identity.bom_type}</div>
                    <div><strong>Prepared By:</strong> {identity.prepared_by}</div>
                    <div><strong>Approved By:</strong> {identity.approved_by}</div>
                    {identity.notes && <div className="col-span-full"><strong>Notes:</strong> <p className="text-muted-foreground">{identity.notes}</p></div>}
                </CardContent>
            </Card>

            {/* Components Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Components</CardTitle>
                    <CardDescription>Raw materials and sub-assemblies required.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead>UoM</TableHead>
                                <TableHead className="text-right">Waste %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {components.length > 0 ? components.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.item_name}</TableCell>
                                    <TableCell>{c.component_type}</TableCell>
                                    <TableCell className="text-right">{c.quantity}</TableCell>
                                    <TableCell>{c.uom}</TableCell>
                                    <TableCell className="text-right">{c.waste_percentage}%</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No components</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Manufacturing Route (Operations) Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Manufacturing Route</CardTitle>
                    <CardDescription>The sequence of operations to produce the finished good.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Seq #</TableHead>
                                <TableHead>Operation</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {operations.length > 0 ? operations.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell>{o.sequence}</TableCell>
                                    <TableCell className="font-medium">{o.operation_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{o.notes}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="text-center h-24">No operations defined</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             {/* Overhead Costs Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Overhead Costs</CardTitle>
                    <CardDescription>Additional costs associated with the production of this BOM.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Overhead</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                                <TableHead>G/L Account</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {overheads.length > 0 ? overheads.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-medium">{o.overhead_name}</TableCell>
                                    <TableCell>{o.cost_category}</TableCell>
                                    <TableCell>{o.cost_method}</TableCell>
                                    <TableCell className="text-right">{o.cost}</TableCell>
                                    <TableCell>{o.gl_account}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={5} className="text-center h-24">No overheads defined</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default BomDetailPage;
