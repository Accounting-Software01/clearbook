'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Updated interfaces to match the new database schema
interface BomIdentity {
    id: number;
    bom_code: string;
    finished_good_name: string;
    bom_version: string;
    status: string;
    uom: string;
    batch_size: string; // Will be a string from backend
    effective_from: string;
    notes: string;
    scrap_percentage: string; // Will be a string
    prepared_by: string;
    approved_by: string;
    bom_type: string;
    total_standard_cost: string; // Will be a string
}

interface BomComponent {
    id: number;
    item_name: string;
    component_type: string;
    quantity: string; // Will be a string
    uom: string;
    waste_percentage: string; // Will be a string
    consumption_uom: string;
}

interface BomOperation {
    id: number;
    sequence: number;
    operation_name: string;
    notes: string;
    sequence_per_hour: string;
    no_of_hours: string;
    qty_per_set: string;
    good_qty: string;
    defect_qty: string;
}

interface BomOverhead {
    id: number;
    overhead_name: string;
    cost_category: string;
    cost_method: string;
    cost: string; // Will be a string
    gl_account: string;
}

interface BomDetails {
    identity: BomIdentity;
    components: BomComponent[];
    operations: BomOperation[];
    overheads: BomOverhead[];
}

// Helper for formatting numbers
const formatNumber = (num: string | number | null, precision: number = 4) => {
    const number = parseFloat(typeof num === 'string' ? num : (num || 0).toString());
    return isNaN(number) ? '0.00' : number.toFixed(precision);
};


const BomDetailPage = () => {
    const { id: bomId } = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const [bomDetails, setBomDetails] = useState<BomDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBomDetails = useCallback(async () => {
        if (!bomId) return;

        setIsLoading(true);
        try {
            // Updated API endpoint
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
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
    }

    if (!bomDetails) {
        return (
            <div className="text-center p-8">
                <p>BOM details could not be loaded or found.</p>
                <Link href="/production/boms">
                    <Button variant="link">Go back to BOM list</Button>
                </Link>
            </div>
        );
    }

    const { identity, components, operations, overheads } = bomDetails;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <Link href="/production/boms">
                     <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to BOM List
                    </Button>
                </Link>
                 <Button variant="outline" onClick={() => router.push(`/production/boms/edit/${identity.id}`)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit BOM
                </Button>
            </div>

            {/* BOM Identity Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{identity.bom_code} <span className="text-lg font-normal text-muted-foreground"> (v{identity.bom_version})</span></CardTitle>
                            <CardDescription>Details for Bill of Material for <strong>{identity.finished_good_name}</strong></CardDescription>
                        </div>
                        <Badge variant={identity.status === 'Active' ? 'success' : 'secondary'}>{identity.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div><strong>UoM:</strong> {identity.uom}</div>
                    <div><strong>Batch Size:</strong> {formatNumber(identity.batch_size)}</div>
                    <div><strong>Scrap %:</strong> {formatNumber(identity.scrap_percentage, 2)}%</div>
                    <div><strong>Effective Date:</strong> {format(new Date(identity.effective_from), 'dd MMM, yyyy')}</div>
                    <div><strong>BOM Type:</strong> {identity.bom_type}</div>
                    <div><strong>Total Standard Cost:</strong> <span className="font-semibold text-primary">{formatNumber(identity.total_standard_cost)}</span></div>
                    <div><strong>Prepared By:</strong> {identity.prepared_by}</div>
                    <div><strong>Approved By:</strong> {identity.approved_by}</div>
                    {identity.notes && <div className="col-span-full"><strong>Notes:</strong> <p className="text-muted-foreground">{identity.notes}</p></div>}
                </CardContent>
            </Card>

            {/* Components Card */}
            <Card>
                <CardHeader><CardTitle>Material Consumption (BOM)</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Consumption UoM</TableHead>
                                <TableHead>Base UoM</TableHead>
                                <TableHead className="text-right">Quantity / Unit</TableHead>
                                <TableHead className="text-right">Waste %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {components.length > 0 ? components.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.item_name}</TableCell>
                                    <TableCell>{c.component_type}</TableCell>
                                    <TableCell><Badge variant="outline">{c.consumption_uom}</Badge></TableCell>
                                    <TableCell>{c.uom}</TableCell>
                                    <TableCell className="text-right">{formatNumber(c.quantity, 6)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(c.waste_percentage, 2)}%</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="text-center h-24">No components</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Manufacturing Route (Operations) Card */}
            <Card>
                <CardHeader><CardTitle>Manufacturing Route</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Seq</TableHead>
                                <TableHead>Operation</TableHead>
                                <TableHead className="text-right">Hours</TableHead>
                                <TableHead className="text-right">Qty per Hour</TableHead>
                                <TableHead className="text-right">Good Qty</TableHead>
                                <TableHead className="text-right">Defect Qty</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {operations.length > 0 ? operations.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell>{o.sequence}</TableCell>
                                    <TableCell className="font-medium">{o.operation_name}</TableCell>
                                    <TableCell className="text-right">{formatNumber(o.no_of_hours)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(o.sequence_per_hour)}</TableCell>
                                    <TableCell className="text-right text-green-600">{formatNumber(o.good_qty)}</TableCell>
                                    <TableCell className="text-right text-red-600">{formatNumber(o.defect_qty)}</TableCell>
                                    <TableCell className="text-muted-foreground">{o.notes}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={7} className="text-center h-24">No operations defined</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             {/* Overhead Costs Card */}
            <Card>
                <CardHeader><CardTitle>Overhead Costs</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Overhead</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>G/L Account</TableHead>
                                <TableHead className="text-right">Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {overheads.length > 0 ? overheads.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell className="font-medium">{o.overhead_name}</TableCell>
                                    <TableCell>{o.cost_category}</TableCell>
                                    <TableCell>{o.cost_method}</TableCell>
                                    <TableCell>{o.gl_account}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatNumber(o.cost)}</TableCell>
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
