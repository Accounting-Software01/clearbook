"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

// NEW: Define interfaces for our data structures for type safety
interface RawMaterial {
    id: number;
    name: string;
    quantity: number; // The API uses 'quantity'
    unit_cost: number;
}

interface GLAccount {
    account_code: string;
    account_name: string;
}


interface MaterialIssue {
    id: number;
    issue_date: string;
    material_name: string;
    quantity_issued: number;
    total_cost: number;
    reference?: string;
}

const IssueMaterialPage = () => {
    const { user } = useAuth();
    // This is the missing line
const { toast } = useToast();

    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
    const [issues, setIssues] = useState<MaterialIssue[]>([]);
    
    // NEW: State for form fields
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
    const [quantity, setQuantity] = useState<string>('');
    const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [reference, setReference] = useState<string>('');
    const [selectedGlAccount, setSelectedGlAccount] = useState<string>('');

    // NEW: State for calculated values
    const [unitCost, setUnitCost] = useState<number>(0);
    const [totalValue, setTotalValue] = useState<number>(0);

    const [isLoading, setIsLoading] = useState(false);

    // Fetch Raw Materials
    const fetchMaterials = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}`);
            const data = await response.json();
            if (data.raw_materials) {
                // NEW: Ensure we only show materials with stock
                setMaterials(data.raw_materials.filter((m: RawMaterial) => m.quantity > 0));
            }
        } catch (error) {
            console.error("Failed to fetch raw materials:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch raw materials.' });
        }
    }, [user?.company_id, toast]);

    // Fetch past material issues
    const fetchMaterialIssues = useCallback(async () => {
        if (!user?.company_id) return;
        // This endpoint needs to be created, for now, we just mock the fetch
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-material-issues.php?company_id=${user.company_id}`);
            const data = await response.json();
            if (data.success) {
                setIssues(data.issues);
            }
        } catch (error) {
            console.error("Failed to fetch material issues:", error);
            // toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch material issues.' });
        }
    }, [user?.company_id, toast]);

    // Fetch GL Accounts (Expense type)
    const fetchGlAccounts = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-gl-accounts.php?company_id=${user.company_id}`);
            const data = await response.json();
            if (data.success && Array.isArray(data.accounts)) {
                setGlAccounts(data.accounts);
            }
            
        } catch (error) {
            console.error("Failed to fetch GL accounts:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch expense accounts.' });
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        fetchMaterials();
        fetchMaterialIssues();
        fetchGlAccounts();
    }, [fetchMaterials, fetchMaterialIssues, fetchGlAccounts]);

    // NEW: Effect to calculate cost and total value dynamically
    useEffect(() => {
        const material = materials.find(m => m.id === parseInt(selectedMaterialId));
        const currentQuantity = parseFloat(quantity);

        if (material) {
            setUnitCost(material.unit_cost);
            if (!isNaN(currentQuantity) && currentQuantity > 0) {
                setTotalValue(material.unit_cost * currentQuantity);
            } else {
                setTotalValue(0);
            }
        } else {
            setUnitCost(0);
            setTotalValue(0);
        }
    }, [selectedMaterialId, quantity, materials]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const material = materials.find(m => m.id === parseInt(selectedMaterialId));
        const qty = parseFloat(quantity);

        // NEW: Comprehensive validation
        if (!material || !selectedGlAccount || isNaN(qty) || qty <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please select a material, an expense account, and enter a valid quantity.' });
            setIsLoading(false);
            return;
        }

        if (qty > material.quantity) {
            toast({ variant: 'destructive', title: 'Insufficient Stock', description: `Cannot issue ${qty}. Only ${material.quantity} available.` });
            setIsLoading(false);
            return;
        }
        
        try {
            // NEW: API endpoint for issuing material. This needs to be created.
            const response = await fetch('https://hariindustries.net/api/clearbook/create-material-issuance.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user?.company_id,
                    user_id: user?.uid,
                    raw_material_id: material.id,
                    quantity_issued: qty,
                    unit_cost: material.unit_cost,
                    expense_account_code: selectedGlAccount,
                    issue_date: issueDate,
                    reference: reference,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({ title: 'Success', description: 'Material issued successfully.' });
                // Reset form and refetch data
                setSelectedMaterialId('');
                setQuantity('');
                setReference('');
                setSelectedGlAccount('');
                fetchMaterials();
                fetchMaterialIssues();
            } else {
                throw new Error(result.message || 'An unknown error occurred.');
            }
        } catch (error: any) {
            console.error("Failed to issue material:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Issue Raw Material</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Issue Form</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <Label htmlFor="material">Raw Material</Label>
                                    <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a material" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {materials.map((material) => (
                                                <SelectItem key={material.id} value={String(material.id)}>
                                                    {material.name} (Stock: {material.quantity})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* NEW: Display for Unit Cost */}
                                <div className="p-2 bg-gray-100 rounded-md">
                                    <p className="text-sm font-medium text-gray-600">Unit Cost</p>
                                    <p className="text-lg font-semibold">
                                        {unitCost.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="quantity">Quantity to Issue</Label>
                                    <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 10" />
                                </div>
                                
                                {/* NEW: Display for Total Value */}
                                <div className="p-2 bg-green-100 rounded-md">
                                    <p className="text-sm font-medium text-green-700">Total Issue Value</p>
                                    <p className="text-lg font-semibold text-green-800">
                                        {totalValue.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                    </p>
                                </div>

                                {/* NEW: GL Account Selector */}
                                <div>
                                    <Label htmlFor="gl-account">Charge to Expense Account</Label>
                                    <Select value={selectedGlAccount} onValueChange={setSelectedGlAccount}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an expense account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {glAccounts.map((acc) => (
                                                <SelectItem key={acc.account_code} value={acc.account_code}>
                                                    {acc.account_name} ({acc.account_code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="issueDate">Issue Date</Label>
                                    <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                                </div>

                                <div>
                                    <Label htmlFor="reference">Reference / Reason</Label>
                                    <Textarea id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g., For testing purposes" />
                                </div>

                                <Button type="submit" disabled={isLoading} className="w-full">
                                    {isLoading ? 'Issuing...' : 'Issue Material'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Issues</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                        <TableHead>Reference</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {issues.length > 0 ? (
                                        issues.map((issue) => (
                                            <TableRow key={issue.id}>
                                                <TableCell>{new Date(issue.issue_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{issue.material_name}</TableCell>
                                                <TableCell>{issue.quantity_issued}</TableCell>
                                                <TableCell>{issue.total_cost.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</TableCell>
                                                <TableCell>{issue.reference}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center">No recent issues found.</TableCell>
                                        </TableRow>
                                    )}
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
