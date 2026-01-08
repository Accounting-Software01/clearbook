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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { apiEndpoints } from '@/lib/apiEndpoints';

interface RawMaterial {
    id: number;
    name: string;
    quantity_on_hand: number;
    unit_cost: number;
}

interface MaterialIssue {
    id: number;
    raw_material_id: number;
    material_name: string; // Display name for history
    quantity_issued: number;
    unit_cost: number;
    issue_type: string;
    expense_account_id: number;
    expense_account_name: string; // Display name for history
    reference?: string;
    notes?: string;
    issued_by: string; // User name
    issue_date: string; // Date of issuance
    created_at: string; // Timestamp of record creation
}

interface GLAccount {
    id: number;
    name: string;
    account_code: string;
    account_type: string;
}

const IssueMaterialPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);
    const [issues, setIssues] = useState<MaterialIssue[]>([]);
    const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
    const [isLoadingGlAccounts, setIsLoadingGlAccounts] = useState(false);

    // Form states
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | undefined>(undefined);
    const [quantity, setQuantity] = useState<string>('');
    const [unitCost, setUnitCost] = useState<string>('');
    const [issueType, setIssueType] = useState<string | undefined>(undefined);
    const [expenseAccountId, setExpenseAccountId] = useState<string | undefined>(undefined);
    const [reference, setReference] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [issueDate, setIssueDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);

    const canIssueMaterials = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'accountant';
    const canSeeUnitCost = user?.role === 'admin' || user?.role === 'accountant';


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
                const mappedIssues: MaterialIssue[] = data.issues.map((issue: any) => ({
                    id: issue.id,
                    raw_material_id: issue.raw_material_id,
                    material_name: issue.material_name,
                    quantity_issued: parseFloat(issue.quantity_issued),
                    unit_cost: parseFloat(issue.unit_cost),
                    issue_type: issue.issue_type,
                    expense_account_id: issue.expense_account_id,
                    expense_account_name: issue.expense_account_name, // Assuming API returns this
                    reference: issue.reference,
                    notes: issue.notes,
                    issued_by: issue.issued_by_name, // Assuming API returns user name as issued_by_name
                    issue_date: issue.issue_date,
                    created_at: issue.created_at,
                }));
                setIssues(mappedIssues);
            }
        } catch (error) {
            console.error("Failed to fetch material issues:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch material issues.' });
        }
    }, [user?.company_id, toast]);

    const fetchGlAccounts = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoadingGlAccounts(true);
        try {
            const response = await fetch(`${apiEndpoints.baseUrl}/api/gl/get-chart-of-accounts.php?company_id=${user.company_id}`);
            const data = await response.json();
            if (data && data.success && Array.isArray(data.accounts)) {
                const expenseAccounts = data.accounts.filter((acc: GLAccount) => acc.account_type === 'Expense');
                setGlAccounts(expenseAccounts);
            } else {
                setGlAccounts([]);
            }
        } catch (error) {
            console.error("Failed to fetch GL accounts:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch GL accounts.' });
        } finally {
            setIsLoadingGlAccounts(false);
        }
    }, [user?.company_id, toast, apiEndpoints.baseUrl]);


    useEffect(() => {
        if (user) {
            fetchRawMaterials();
            fetchMaterialIssues();
            fetchGlAccounts();
        }
    }, [user, fetchRawMaterials, fetchMaterialIssues, fetchGlAccounts]);

    const handleMaterialSelect = (materialId: string) => {
        setSelectedMaterialId(materialId);
        const material = materials.find(m => String(m.id) === materialId);
        if (material) {
            setUnitCost(String(material.unit_cost));
        } else {
            setUnitCost('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canIssueMaterials) {
            toast({ variant: 'destructive', title: 'Error', description: 'You are not authorized to perform this action.' });
            return;
        }

        if (!selectedMaterialId || !quantity || !issueType || !expenseAccountId || !issueDate) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill in all required fields: Material, Quantity, Issue Type, Expense Account, and Issue Date.' });
            return;
        }
        // Unit Cost is mandatory for admins/accountants if they can see it
        if (canSeeUnitCost && !unitCost) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Unit Cost is required.' });
            return;
        }


        const quantityParsed = parseFloat(quantity);
        const unitCostParsed = parseFloat(unitCost); // Even if hidden, this value needs to be valid if available
        const selectedMaterial = materials.find(m => String(m.id) === selectedMaterialId);

        if (isNaN(quantityParsed) || quantityParsed <= 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Quantity must be a positive number.' });
            return;
        }
        if (selectedMaterial && quantityParsed > selectedMaterial.quantity_on_hand) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Quantity to issue cannot exceed quantity on hand.' });
            return;
        }
        if (canSeeUnitCost && (isNaN(unitCostParsed) || unitCostParsed <= 0)) { // Only validate if visible/editable
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Unit Cost must be a positive number.' });
            return;
        }


        setIsLoading(true);

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/issue-material.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    raw_material_id: parseInt(selectedMaterialId),
                    quantity_issued: quantityParsed,
                    unit_cost: unitCostParsed, // Sent regardless, but validated conditionally
                    issue_type: issueType,
                    expense_account_id: parseInt(expenseAccountId),
                    reference: reference || null,
                    notes: notes || null,
                    issued_by: user?.id,
                    issue_date: issueDate ? format(issueDate, 'yyyy-MM-dd') : null,
                    company_id: user?.company_id,
                }),
            });

            const data = await response.json();

            if (data.status === 'success') {
                toast({ title: 'Success', description: 'Material issued successfully.' });
                setSelectedMaterialId(undefined);
                setQuantity('');
                setUnitCost('');
                setIssueType(undefined);
                setExpenseAccountId(undefined);
                setReference('');
                setNotes('');
                setIssueDate(new Date()); // Reset to current date
                fetchRawMaterials(); // Refresh the list
                fetchMaterialIssues(); // Refresh the issues history
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.message || 'Failed to issue material.' });
            }
        } catch (error) {
            console.error("API call failed:", error);
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
                                        <Select onValueChange={handleMaterialSelect} value={selectedMaterialId}>
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
                                    {/* Conditional rendering for Unit Cost */}
                                    {canSeeUnitCost && (
                                        <div>
                                            <Label htmlFor="unitCost">Unit Cost at Issue</Label>
                                            <Input
                                                id="unitCost"
                                                type="number"
                                                value={unitCost}
                                                onChange={(e) => setUnitCost(e.target.value)}
                                                placeholder="e.g., 50.00"
                                                // Removed disabled, as admins/accountants can edit it
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <Label htmlFor="issueType">Issue Type</Label>
                                        <Select onValueChange={setIssueType} value={issueType}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select issue type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                                <SelectItem value="admin">Administration</SelectItem>
                                                <SelectItem value="wastage">Wastage</SelectItem>
                                                <SelectItem value="adjustment">Adjustment</SelectItem>
                                                <SelectItem value="transfer">Transfer</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="expenseAccount">Expense Account</Label>
                                        <Select onValueChange={setExpenseAccountId} value={expenseAccountId}>
                                            <SelectTrigger disabled={isLoadingGlAccounts}>
                                                <SelectValue placeholder={isLoadingGlAccounts ? "Loading accounts..." : "Select expense account"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {glAccounts.map((account) => (
                                                    <SelectItem key={account.id} value={String(account.id)}>
                                                        {account.name} ({account.account_code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="reference">Reference (Optional)</Label>
                                        <Input
                                            id="reference"
                                            type="text"
                                            value={reference}
                                            onChange={(e) => setReference(e.target.value)}
                                            placeholder="e.g., Project X, Job 123"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="notes">Notes (Optional)</Label>
                                        <Textarea
                                            id="notes"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Any additional notes about this issuance."
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="issueDate">Issue Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !issueDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {issueDate ? format(issueDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={issueDate}
                                                    onSelect={setIssueDate}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
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
                                        <TableHead>Unit Cost</TableHead>
                                        <TableHead>Issue Type</TableHead>
                                        <TableHead>Expense Account</TableHead>
                                        <TableHead>Reference</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead>Issued By</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {issues.map((issue) => (
                                        <TableRow key={issue.id}>
                                            <TableCell>{issue.material_name}</TableCell>
                                            <TableCell>{issue.quantity_issued}</TableCell>
                                            <TableCell>{issue.unit_cost}</TableCell>
                                            <TableCell>{issue.issue_type}</TableCell>
                                            <TableCell>{issue.expense_account_name}</TableCell>
                                            <TableCell>{issue.reference || '-'}</TableCell>
                                            <TableCell>{issue.notes || '-'}</TableCell>
                                            <TableCell>{issue.issued_by}</TableCell>
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
