'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RawMaterial {
    id: number;
    name: string;
    quantity_on_hand: number;
}

interface MaterialIssue {
    id: number;
    material_name: string;
    quantity_issued: number;
    issued_by: string;
    unit_cost_at_issue: number;
    issue_date: string;
}

const IssueMaterialPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [issues, setIssues] = useState<MaterialIssue[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<string | undefined>(undefined);
    const [quantity, setQuantity] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const canIssueMaterials = user?.role === 'admin' || user?.role === 'staff';

    const fetchRawMaterials = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}&item_type=raw_material`);
            const data = await response.json();
            if (data && data.raw_materials) {
                setMaterials(data.raw_materials);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch raw materials.' });
        }
    }, [user?.company_id, toast]);

    const fetchMaterialIssues = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-material-issues.php?company_id=${user.company_id}`);
            const data = await response.json();
            if (data && data.issues) {
                setIssues(data.issues);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch material issues.' });
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        if (user) {
            fetchRawMaterials();
            fetchMaterialIssues();
        }
    }, [user, fetchRawMaterials, fetchMaterialIssues]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canIssueMaterials) {
            toast({ variant: 'destructive', title: 'Error', description: 'You are not authorized to perform this action.' });
            return;
        }

        if (!selectedMaterial || !quantity) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a material and enter a quantity.' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/issue-material.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    material_id: parseInt(selectedMaterial),
                    quantity: parseFloat(quantity),
                    user_id: user?.id, 
                    company_id: user?.company_id,
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                toast({ title: 'Success', description: 'Material issued successfully.' });
                setSelectedMaterial(undefined);
                setQuantity('');
                fetchRawMaterials(); // Refresh the list
                fetchMaterialIssues(); // Refresh the issues history
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.message || 'Failed to issue material.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Issue Raw Material</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {canIssueMaterials ? (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label htmlFor="material">Raw Material</Label>
                                        <Select onValueChange={setSelectedMaterial} value={selectedMaterial}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a material" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {materials.map((material) => (
                                                    <SelectItem key={material.id} value={String(material.id)}>
                                                        {material.name} (Stock: {material.quantity_on_hand})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="quantity">Quantity to Issue</Label>
                                        <Input
                                            id="quantity"
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="e.g., 10.5"
                                        />
                                    </div>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Issuing...' : 'Issue Material'}
                                    </Button>
                                </form>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>You do not have permission to issue materials.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Issuance History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Issued By</TableHead>
                                        <TableHead>Unit Cost</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {issues.map((issue) => (
                                        <TableRow key={issue.id}>
                                            <TableCell>{issue.material_name}</TableCell>
                                            <TableCell>{issue.quantity_issued}</TableCell>
                                            <TableCell>{issue.issued_by}</TableCell>
                                            <TableCell>{issue.unit_cost_at_issue}</TableCell>
                                            <TableCell>{new Date(issue.issue_date).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default IssueMaterialPage;
