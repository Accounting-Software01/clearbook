'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Trash2, PlusCircle, TrendingUp } from 'lucide-react';

// --- DATA INTERFACES ---
interface InventoryItem {
    id: number;
    name: string;
    uom: string;
    cost: number;
}

interface GlAccount {
    account_code: string;
    account_name: string;
}

interface BomComponent {
    item_id: number;
    item_name: string;
    component_type: 'raw-material' | 'packaging' | 'semi-finished';
    quantity: string; // Represents 'Consumption / Unit'
    uom: string;
    waste_percentage: string;
}

interface Operation {
    sequence: number;
    operation_name: string;
    notes: string;
}

interface OverheadComponent {
    overhead_name: string;
    cost_category: 'Direct Labor' | 'Manufacturing Overhead' | 'Other';
    cost_method: 'per_unit' | 'per_batch' | 'percentage_of_material';
    cost: string;
    gl_account: string;
}

interface StandardCost {
    materialCost: number;
    overheadCost: number;
    scrapCost: number;
    totalCost: number;
}

// --- PREDEFINED LISTS ---
const overheadOptions = [
    'Direct Labor', 'Indirect Labor', 'Factory Rent', 'Utilities (Electricity, Water)',
    'Machine Depreciation', 'Machine Maintenance', 'Supervisory Salaries',
    'Quality Control', 'Insurance', 'Safety and Security'
];
const costCategories = ['Direct Labor', 'Manufacturing Overhead', 'Other'];
const bomTypes = ['Standard', 'Production', 'Engineering', 'Trial'];

const MasterBomSetup = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    const getInitialBomIdentity = useCallback(() => ({
        finished_good_id: '',
        bom_code: '',
        bom_version: '1.0',
        status: 'Active',
        uom: '',
        batch_size: '1',
        effective_from: new Date().toISOString().split('T')[0],
        notes: '',
        scrap_percentage: '0',
        prepared_by: user?.displayName || '',
        approved_by: '',
        bom_type: 'Standard' as const,
    }), [user]);

    // --- STATE MANAGEMENT ---
    const [inventoryItems, setInventoryItems] = useState<{ products: InventoryItem[], raw_materials: InventoryItem[] }>({ products: [], raw_materials: [] });
    const [glAccounts, setGlAccounts] = useState<GlAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [bomIdentity, setBomIdentity] = useState(getInitialBomIdentity());
    const [bomComponents, setBomComponents] = useState<BomComponent[]>([]);
    const [operations, setOperations] = useState<Operation[]>([]);
    const [overheadComponents, setOverheadComponents] = useState<OverheadComponent[]>([]);
    const [standardCost, setStandardCost] = useState<StandardCost>({ materialCost: 0, overheadCost: 0, scrapCost: 0, totalCost: 0 });

    // --- DATA FETCHING ---
    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const [itemsResponse, glResponse] = await Promise.all([
                fetch(`https://hariindustries.net/api/clearbook/get-items.php?company_id=${user.company_id}&include_costs=true`),
                fetch(`https://hariindustries.net/api/clearbook/get-gl-accounts.php?company_id=${user.company_id}`)
            ]);

            const itemsData = await itemsResponse.json();
            if (!itemsResponse.ok) throw new Error(itemsData.message || 'Failed to fetch inventory items');
            const withCosts = (items: any[]) => items.map(item => ({...item, cost: item.cost || 10, uom: item.uom || item.unit_of_measure}));
            setInventoryItems({ products: withCosts(itemsData.products || []), raw_materials: withCosts(itemsData.raw_materials || []) });

            const glData = await glResponse.json();
            if (!glResponse.ok || !glData.success) throw new Error(glData.error || 'Failed to fetch GL accounts');
            setGlAccounts(glData.accounts || []);

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- COST CALCULATION ---
    useEffect(() => {
        const batchSize = parseFloat(bomIdentity.batch_size) || 1;

        const totalMaterialCostPerUnit = bomComponents.reduce((acc, comp) => {
            const material = inventoryItems.raw_materials.find(m => m.id === comp.item_id);
            const costOfMaterialUOM = material?.cost || 0;
            const consumptionPerUnit = parseFloat(comp.quantity) || 0;
            const waste = parseFloat(comp.waste_percentage) || 0;
            const totalConsumptionPerUnit = consumptionPerUnit * (1 + waste / 100);
            return acc + (totalConsumptionPerUnit * costOfMaterialUOM);
        }, 0);

        const totalOverheadCostPerUnit = overheadComponents.reduce((acc, overhead) => {
            const cost = parseFloat(overhead.cost) || 0;
            if (overhead.cost_method === 'per_unit') return acc + cost;
            if (overhead.cost_method === 'per_batch') return acc + (cost / batchSize);
            if (overhead.cost_method === 'percentage_of_material') return acc + (totalMaterialCostPerUnit * (cost / 100));
            return acc;
        }, 0);

        const bomScrapPercentage = parseFloat(bomIdentity.scrap_percentage) || 0;
        const totalPreScrapCost = totalMaterialCostPerUnit + totalOverheadCostPerUnit;
        const bomScrapCost = totalPreScrapCost * (bomScrapPercentage / 100);

        const finalTotalCost = totalPreScrapCost + bomScrapCost;

        setStandardCost({
            materialCost: totalMaterialCostPerUnit,
            overheadCost: totalOverheadCostPerUnit,
            scrapCost: bomScrapCost,
            totalCost: finalTotalCost
        });

    }, [bomComponents, overheadComponents, bomIdentity.batch_size, bomIdentity.scrap_percentage, inventoryItems.raw_materials]);

    // --- HANDLER FUNCTIONS ---
    const handleIdentityChange = (field: string, value: string) => {
        setBomIdentity(prev => ({ ...prev, [field]: value }));
        if (field === 'finished_good_id') {
            const product = inventoryItems.products.find(p => p.id.toString() === value);
            if (product) {
                setBomIdentity(prev => ({ ...prev, uom: product.uom, bom_code: `BOM-${product.name.replace(/\s+/g, '-').toUpperCase()}` }));
            }
        }
    };

    const handleAddComponent = () => setBomComponents(prev => [...prev, { item_id: 0, item_name: '', component_type: 'raw-material', quantity: '1', uom: '', waste_percentage: '0' }]);
    const handleRemoveComponent = (index: number) => setBomComponents(prev => prev.filter((_, i) => i !== index));
    const handleComponentChange = (index: number, field: keyof BomComponent, value: any) => {
        const newComponents = [...bomComponents];
        const component = newComponents[index];
        (component[field] as any) = value;

        if (field === 'item_id') {
            const material = inventoryItems.raw_materials.find(m => m.id === value);
            if (material) {
                component.item_name = material.name;
                component.uom = material.uom;
            }
        }
        setBomComponents(newComponents);
    };

    const handleAddOperation = () => setOperations(prev => [...prev, { sequence: (prev.length + 1) * 10, operation_name: '', notes: '' }]);
    const handleRemoveOperation = (index: number) => setOperations(prev => prev.filter((_, i) => i !== index));
    const handleOperationChange = (index: number, field: keyof Operation, value: any) => {
        const newOps = [...operations];
        (newOps[index][field] as any) = value;
        setOperations(newOps);
    };

    const handleAddOverhead = () => setOverheadComponents(prev => [...prev, { overhead_name: '', cost_category: 'Manufacturing Overhead', cost_method: 'per_unit', cost: '0', gl_account: '' }]);
    const handleRemoveOverhead = (index: number) => setOverheadComponents(prev => prev.filter((_, i) => i !== index));
    const handleOverheadChange = (index: number, field: keyof OverheadComponent, value: any) => {
        const newOverheads = [...overheadComponents];
        (newOverheads[index][field] as any) = value;
        setOverheadComponents(newOverheads);
    };

    const handleCancel = () => {
        setBomIdentity(getInitialBomIdentity());
        setBomComponents([]);
        setOperations([]);
        setOverheadComponents([]);
        toast({ title: "Form Cleared", description: "All fields have been reset." });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !bomIdentity.finished_good_id || bomComponents.length === 0) {
            toast({ title: "Validation Error", description: "Please select a finished good and add at least one material component.", variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                ...bomIdentity,
                company_id: user.company_id,
                user_id: user.uid,
                finished_good_id: parseInt(bomIdentity.finished_good_id),
                batch_size: parseInt(bomIdentity.batch_size),
                scrap_percentage: parseFloat(bomIdentity.scrap_percentage),
                components: bomComponents.map(c => ({...c, item_id: c.item_id, quantity: parseFloat(c.quantity), waste_percentage: parseFloat(c.waste_percentage)})),
                overheads: overheadComponents.filter(o => o.overhead_name && parseFloat(o.cost) > 0).map(o => ({...o, cost: parseFloat(o.cost)})),
                operations: operations.filter(op => op.operation_name),
            };

            const response = await fetch('https://hariindustries.net/api/clearbook/create-bom.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message);

            toast({ title: "Success", description: "Master BOM has been created successfully." });

        } catch (error: any) {
            toast({ title: "Submission Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 md:p-8 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Create Enterprise BOM</h1>
                    <p className="text-muted-foreground">Build a comprehensive Bill of Materials with routing, overheads, and waste control.</p>
                </div>
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center"><TrendingUp className="mr-2" />Standard Cost Summary</CardTitle>
                        <CardDescription>Live cost per unit of the finished good.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                        <div className="flex justify-between"><span>Material Cost:</span> <span className="font-medium">{standardCost.materialCost.toFixed(4)}</span></div>
                        <div className="flex justify-between"><span>Overhead Cost:</span> <span className="font-medium">{standardCost.overheadCost.toFixed(4)}</span></div>
                        <div className="flex justify-between"><span>Scrap/Yield Cost:</span> <span className="font-medium">{standardCost.scrapCost.toFixed(4)}</span></div>
                        <hr className="my-1" />
                        <div className="flex justify-between font-bold text-base"><span>Total Standard Cost:</span> <span>{standardCost.totalCost.toFixed(4)}</span></div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>BOM Identity & Control</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label htmlFor="finished-good">Finished Good *</Label><Select value={bomIdentity.finished_good_id} onValueChange={(value) => handleIdentityChange('finished_good_id', value)} required><SelectTrigger id="finished-good"><SelectValue placeholder="Select a product..." /></SelectTrigger><SelectContent>{inventoryItems.products.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="bom-code">BOM Code</Label><Input id="bom-code" value={bomIdentity.bom_code} onChange={e => handleIdentityChange('bom_code', e.target.value)} placeholder="Auto-generated code" /></div>
                    <div className="space-y-2"><Label htmlFor="bom-type">BOM Type</Label><Select value={bomIdentity.bom_type} onValueChange={(v) => handleIdentityChange('bom_type', v)}><SelectTrigger id="bom-type"><SelectValue/></SelectTrigger><SelectContent>{bomTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="batch-size">Standard Batch Size</Label><Input id="batch-size" type="number" min="1" value={bomIdentity.batch_size} onChange={e => handleIdentityChange('batch_size', e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="scrap_percentage">Overall Scrap %</Label><Input id="scrap_percentage" type="number" min="0" value={bomIdentity.scrap_percentage} onChange={e => handleIdentityChange('scrap_percentage', e.target.value)} placeholder="e.g., 1.5" /></div>
                    <div className="space-y-2"><Label htmlFor="prepared_by">Prepared By</Label><Input id="prepared_by" value={bomIdentity.prepared_by} onChange={e => handleIdentityChange('prepared_by', e.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="approved_by">Approved By</Label><Input id="approved_by" value={bomIdentity.approved_by} onChange={e => handleIdentityChange('approved_by', e.target.value)} placeholder="Pending approval" /></div>
                    <div className="space-y-2"><Label htmlFor="effective-from">Effective From</Label><Input id="effective-from" type="date" value={bomIdentity.effective_from} onChange={e => handleIdentityChange('effective_from', e.target.value)} /></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className='flex-row items-center justify-between'><CardTitle>Manufacturing Routing</CardTitle><Button type="button" variant="outline" onClick={handleAddOperation}><PlusCircle className="h-4 w-4 mr-2" />Add Stage</Button></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead className="w-24">Seq.</TableHead><TableHead>Operation / Stage Name *</TableHead><TableHead>Notes</TableHead><TableHead className="w-16">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {operations.length > 0 ? operations.map((op, i) => (
                                <TableRow key={i}>
                                    <TableCell><Input type="number" value={op.sequence} onChange={e => handleOperationChange(i, 'sequence', parseInt(e.target.value))} className="text-center" /></TableCell>
                                    <TableCell><Input value={op.operation_name} onChange={e => handleOperationChange(i, 'operation_name', e.target.value)} placeholder="e.g., Mixing, Molding, Packaging" required /></TableCell>
                                    <TableCell><Input value={op.notes} onChange={e => handleOperationChange(i, 'notes', e.target.value)} placeholder="Optional details..." /></TableCell>
                                    <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOperation(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={4} className="text-center py-8">No manufacturing stages defined. Add one to begin.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className='flex-row items-center justify-between'><CardTitle>Material Consumption (BOM)</CardTitle><Button type="button" variant="outline" onClick={handleAddComponent}><PlusCircle className="h-4 w-4 mr-2" />Add Material</Button></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Item *</TableHead><TableHead>Type</TableHead><TableHead>Consumption / Unit *</TableHead><TableHead>UOM</TableHead><TableHead>Waste %</TableHead><TableHead>Est. Batch Consumption</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {bomComponents.length > 0 ? bomComponents.map((c, i) => {
                                const batchConsumption = (parseFloat(c.quantity) || 0) * (parseFloat(bomIdentity.batch_size) || 1);
                                return (
                                <TableRow key={i}>
                                    <TableCell><Select value={c.item_id.toString()} onValueChange={v => handleComponentChange(i, 'item_id', parseInt(v))} required><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{inventoryItems.raw_materials.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}</SelectContent></Select></TableCell>
                                    <TableCell><Select value={c.component_type} onValueChange={v => handleComponentChange(i, 'component_type', v)} required><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="raw-material">Raw Material</SelectItem><SelectItem value="packaging">Packaging</SelectItem><SelectItem value="semi-finished">Semi-Finished</SelectItem></SelectContent></Select></TableCell>
                                    <TableCell><Input type="number" min="0.00000001"  step="any" value={c.quantity} onChange={e => handleComponentChange(i, 'quantity', e.target.value)} required placeholder="e.g., 0.01" /></TableCell>
                                    <TableCell><Input value={c.uom || 'N/A'} readOnly className="border-none bg-transparent px-0 w-20" /></TableCell>
                                    <TableCell><Input type="number" min="0.00000001" step="any" value={c.waste_percentage} onChange={e => handleComponentChange(i, 'waste_percentage', e.target.value)} className="w-24" placeholder="e.g., 3" /></TableCell>
                                    <TableCell><Input value={batchConsumption.toString()} readOnly className="border-none bg-transparent font-medium" /></TableCell>
                                    <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveComponent(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                                </TableRow>
                            );})
                             : <TableRow><TableCell colSpan={7} className="text-center py-8">No material components added.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

             <Card>
                <CardHeader className='flex-row items-center justify-between'><CardTitle>Overhead & Production Costs</CardTitle><Button type="button" variant="outline" onClick={handleAddOverhead}><PlusCircle className="h-4 w-4 mr-2" />Add Cost</Button></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader><TableRow><TableHead>Overhead Name</TableHead><TableHead>Cost Category</TableHead><TableHead>Cost Method</TableHead><TableHead>Cost</TableHead><TableHead>GL Account</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {overheadComponents.length > 0 ? overheadComponents.map((o, i) => (
                                <TableRow key={i}>
                                    <TableCell><Select value={o.overhead_name} onValueChange={v => handleOverheadChange(i, 'overhead_name', v)}><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger><SelectContent>{overheadOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent></Select></TableCell>
                                    <TableCell><Select value={o.cost_category} onValueChange={v => handleOverheadChange(i, 'cost_category', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{costCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></TableCell>
                                    <TableCell><Select value={o.cost_method} onValueChange={v => handleOverheadChange(i, 'cost_method', v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="per_unit">Per Unit</SelectItem><SelectItem value="per_batch">Per Batch</SelectItem><SelectItem value="percentage_of_material">% of Material Cost</SelectItem></SelectContent></Select></TableCell>
                                    <TableCell><Input type="number" min="0.01" step="any" value={o.cost} onChange={e => handleOverheadChange(i, 'cost', e.target.value)} /></TableCell>
                                    <TableCell>
                                        <Select value={o.gl_account} onValueChange={v => handleOverheadChange(i, 'gl_account', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select account..."/></SelectTrigger>
                                            <SelectContent>
                                                {glAccounts.map(acc => <SelectItem key={acc.account_code} value={acc.account_code}>{acc.account_code} - {acc.account_name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOverhead(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="text-center py-8">No overhead costs added.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 mt-8">
                <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving BOM...</> : 'Save and Activate BOM'}</Button>
            </div>
        </form>
    );
};

export default MasterBomSetup;
