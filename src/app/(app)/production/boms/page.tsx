'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusCircle, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Bom {
    id: number;
    bom_code: string;
    finished_good_id: number;
    bom_version: string;
    status: 'Active' | 'Inactive' | 'Archived';
    effective_from: string;
    created_at: string;
}

const BomListPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [boms, setBoms] = useState<Bom[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBoms = useCallback(async () => {
        if (!user?.company_id) return;

        setIsLoading(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-boms.php?company_id=${user.company_id}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch BOMs');
            }

            if (data.success) {
                setBoms(data.boms);
            } else {
                throw new Error(data.message);
            }
        } catch (error: any) {
            toast({
                title: "Error fetching BOMs",
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        fetchBoms();
    }, [fetchBoms]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Bill of Materials</h1>
                    <p className="text-muted-foreground">
                        Manage and review all master Bill of Materials for your products.
                    </p>
                </div>
                <Link href="/production/boms/new">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New BOM
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>BOM List</CardTitle>
                    <CardDescription>
                        A list of all currently configured BOMs in your company.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>BOM Code</TableHead>
                                <TableHead>Finished Good ID</TableHead>
                                <TableHead>Version</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Effective From</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {boms.length > 0 ? (
                                boms.map((bom) => (
                                    <TableRow key={bom.id}>
                                        <TableCell className="font-medium">{bom.bom_code}</TableCell>
                                        <TableCell>{bom.finished_good_id}</TableCell>
                                        <TableCell>{bom.bom_version}</TableCell>
                                        <TableCell>
                                            <Badge variant={bom.status === 'Active' ? 'default' : 'secondary'}>
                                                {bom.status}
                                            </Badge>
                                        </TableCell>
                                         <TableCell>{new Date(bom.effective_from).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Link href={`/production/boms/${bom.id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        No Bill of Materials found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default BomListPage;
