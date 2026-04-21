'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Loader2, AlertCircle, RefreshCw, Plus, Pencil, Trash2, ArrowDownCircle, PackageX,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const API = 'https://hariindustries.net/api/clearbook/manage-obsolete-scrap.php';

const REASONS   = ['Expired', 'Damaged', 'Obsolete', 'Contaminated', 'Overstocked', 'Quality Rejected', 'Other'] as const;
const UOM_LIST  = ['KG', 'PCS', 'Litres', 'Tons', 'Cartons', 'Bags', 'Units', 'Rolls', 'Metres'] as const;
const ISSUE_TYPES = [
    { value: 'wastage',    label: 'Wastage / Disposal' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'other',      label: 'Other' },
] as const;

type Reason    = typeof REASONS[number];
type UOM       = typeof UOM_LIST[number];
type IssueType = 'wastage' | 'adjustment' | 'other';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ObsoleteScrap {
    id: number;
    name: string;
    sku: string;
    unit_of_measure: string;
    quantity_on_hand: number;
    average_unit_cost: number;
    reorder_level: number;
    inventory_account_id: number;
    date_classified: string;
    total_value: number;
    reason: string | null;
}

interface RegisterForm {
    name: string;
    sku: string;
    unit_of_measure: UOM | '';
    quantity_on_hand: string;
    average_unit_cost: string;
    reorder_level: string;
    inventory_account_id: string;
    reason: Reason | '';
}

interface IssueForm {
    quantity_issued: string;
    expense_account_id: string;
    issue_type: IssueType;
    notes: string;
}

const emptyRegister = (): RegisterForm => ({
    name: '', sku: '', unit_of_measure: '', quantity_on_hand: '',
    average_unit_cost: '', reorder_level: '0', inventory_account_id: '', reason: '',
});

const emptyIssue = (): IssueForm => ({
    quantity_issued: '', expense_account_id: '', issue_type: 'wastage', notes: 'Scrap/Obsolete write-off',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const reasonBadge = (r: string | null) => {
    if (!r) return 'bg-gray-100 text-gray-600';
    const rLow = r.toLowerCase();
    if (rLow.includes('expired'))    return 'bg-orange-100 text-orange-700';
    if (rLow.includes('damaged'))    return 'bg-red-100 text-red-700';
    if (rLow.includes('obsolete'))   return 'bg-purple-100 text-purple-700';
    if (rLow.includes('contaminated')) return 'bg-rose-100 text-rose-700';
    if (rLow.includes('quality'))    return 'bg-yellow-100 text-yellow-700';
    if (rLow.includes('overstocked')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
};

// Strip the prefix added by the PHP ("Initial classification: " / "Updated classification reason: ")
const cleanReason = (raw: string | null): string => {
    if (!raw) return '—';
    return raw
        .replace(/^Initial classification:\s*/i, '')
        .replace(/^Updated classification reason:\s*/i, '');
};

// ─── Main component ───────────────────────────────────────────────────────────

const ObsoleteScrapPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // ── State ─────────────────────────────────────────────────────────────────
    const [items, setItems]           = useState<ObsoleteScrap[]>([]);
    const [totalValue, setTotalValue] = useState(0);
    const [isLoading, setIsLoading]   = useState(true);
    const [error, setError]           = useState<string | null>(null);
    const [isSaving, setIsSaving]     = useState(false);

    // Dialog visibility
    const [showRegister, setShowRegister] = useState(false);
    const [showEdit, setShowEdit]         = useState(false);
    const [showIssue, setShowIssue]       = useState(false);
    const [showDelete, setShowDelete]     = useState(false);

    // Selected item (for edit / issue / delete)
    const [selected, setSelected] = useState<ObsoleteScrap | null>(null);

    // Form state
    const [regForm, setRegForm]     = useState<RegisterForm>(emptyRegister());
    const [issueForm, setIssueForm] = useState<IssueForm>(emptyIssue());

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchItems = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const res  = await fetch(`${API}?action=list&company_id=${user.company_id}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error ?? 'Unknown error');
            setItems(json.data?.obsolete_scrap ?? []);
            setTotalValue(json.data?.total_value ?? 0);
        } catch (e: any) {
            setError(e.message);
            toast({ variant: 'destructive', title: 'Load Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        if (user) fetchItems();
    }, [user, fetchItems]);

    // ── Generic POST helper ───────────────────────────────────────────────────
    const postAction = async (body: Record<string, unknown>) => {
        const res  = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...body, company_id: user!.company_id, user_id: user!.id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? 'Operation failed');
        return json;
    };

    // ── Register ──────────────────────────────────────────────────────────────
    const openRegister = () => { setRegForm(emptyRegister()); setShowRegister(true); };

    const handleRegister = async () => {
        const { name, sku, unit_of_measure, quantity_on_hand, average_unit_cost,
                reorder_level, inventory_account_id, reason } = regForm;
        if (!name || !sku || !unit_of_measure || !quantity_on_hand || !average_unit_cost
            || !inventory_account_id || !reason) {
            toast({ variant: 'destructive', title: 'Validation', description: 'Please fill all required fields.' });
            return;
        }
        setIsSaving(true);
        try {
            await postAction({
                action: 'register', name, sku, unit_of_measure,
                quantity_on_hand: parseFloat(quantity_on_hand),
                average_unit_cost: parseFloat(average_unit_cost),
                reorder_level: parseFloat(reorder_level || '0'),
                inventory_account_id: parseInt(inventory_account_id),
                reason,
            });
            toast({ title: 'Registered', description: `${name} added to obsolete & scrap.` });
            setShowRegister(false);
            fetchItems();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Register Error', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Edit ──────────────────────────────────────────────────────────────────
    const openEdit = (item: ObsoleteScrap) => {
        setSelected(item);
        setRegForm({
            name: item.name,
            sku: item.sku,
            unit_of_measure: item.unit_of_measure as UOM,
            quantity_on_hand: String(item.quantity_on_hand),
            average_unit_cost: String(item.average_unit_cost),
            reorder_level: String(item.reorder_level),
            inventory_account_id: String(item.inventory_account_id),
            reason: (cleanReason(item.reason) as Reason) ?? '',
        });
        setShowEdit(true);
    };

    const handleEdit = async () => {
        if (!selected) return;
        const { name, sku, unit_of_measure, quantity_on_hand, average_unit_cost,
                reorder_level, inventory_account_id, reason } = regForm;
        if (!name || !sku || !unit_of_measure || !quantity_on_hand || !average_unit_cost
            || !inventory_account_id || !reason) {
            toast({ variant: 'destructive', title: 'Validation', description: 'Please fill all required fields.' });
            return;
        }
        setIsSaving(true);
        try {
            await postAction({
                action: 'edit', id: selected.id, name, sku, unit_of_measure,
                quantity_on_hand: parseFloat(quantity_on_hand),
                average_unit_cost: parseFloat(average_unit_cost),
                reorder_level: parseFloat(reorder_level || '0'),
                inventory_account_id: parseInt(inventory_account_id),
                reason,
            });
            toast({ title: 'Updated', description: `${name} updated successfully.` });
            setShowEdit(false);
            fetchItems();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Update Error', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Issue / Write-off ─────────────────────────────────────────────────────
    const openIssue = (item: ObsoleteScrap) => {
        setSelected(item);
        setIssueForm(emptyIssue());
        setShowIssue(true);
    };

    const handleIssue = async () => {
        if (!selected) return;
        const { quantity_issued, expense_account_id, issue_type, notes } = issueForm;
        if (!quantity_issued || !expense_account_id) {
            toast({ variant: 'destructive', title: 'Validation', description: 'Quantity and expense account are required.' });
            return;
        }
        const qty = parseFloat(quantity_issued);
        if (isNaN(qty) || qty <= 0) {
            toast({ variant: 'destructive', title: 'Validation', description: 'Enter a valid positive quantity.' });
            return;
        }
        setIsSaving(true);
        try {
            const res = await postAction({
                action: 'issue', id: selected.id,
                quantity_issued: qty,
                expense_account_id: parseInt(expense_account_id),
                issue_type, notes,
            });
            toast({
                title: 'Write-Off Posted',
                description: `${qty} ${selected.unit_of_measure} written off. ${res.data?.voucher_number ? `JV: ${res.data.voucher_number}` : ''}`,
            });
            setShowIssue(false);
            fetchItems();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Issue Error', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const openDelete = (item: ObsoleteScrap) => { setSelected(item); setShowDelete(true); };

    const handleDelete = async () => {
        if (!selected) return;
        setIsSaving(true);
        try {
            await postAction({ action: 'delete', id: selected.id });
            toast({ title: 'Deleted', description: `${selected.name} has been removed.` });
            setShowDelete(false);
            fetchItems();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Delete Error', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Form field helpers ────────────────────────────────────────────────────
    const setReg   = (k: keyof RegisterForm, v: string) => setRegForm(p => ({ ...p, [k]: v }));
    const setIssue = (k: keyof IssueForm,   v: string) => setIssueForm(p => ({ ...p, [k]: v }));

    // ─── Shared form body (register + edit) ──────────────────────────────────
    const RegistrationFields = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label>Item Name <span className="text-red-500">*</span></Label>
                <Input value={regForm.name} onChange={e => setReg('name', e.target.value)} placeholder="e.g. Expired Labels" />
            </div>
            <div className="space-y-1">
                <Label>SKU <span className="text-red-500">*</span></Label>
                <Input value={regForm.sku} onChange={e => setReg('sku', e.target.value)} placeholder="e.g. SCR-001" />
            </div>
            <div className="space-y-1">
                <Label>Unit of Measure <span className="text-red-500">*</span></Label>
                <Select value={regForm.unit_of_measure} onValueChange={v => setReg('unit_of_measure', v)}>
                    <SelectTrigger><SelectValue placeholder="Select UOM" /></SelectTrigger>
                    <SelectContent>
                        {UOM_LIST.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label>Reason / Classification <span className="text-red-500">*</span></Label>
                <Select value={regForm.reason} onValueChange={v => setReg('reason', v)}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                        {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label>Quantity on Hand <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" value={regForm.quantity_on_hand}
                    onChange={e => setReg('quantity_on_hand', e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
                <Label>Average Unit Cost (₦) <span className="text-red-500">*</span></Label>
                <Input type="number" min="0" step="0.01" value={regForm.average_unit_cost}
                    onChange={e => setReg('average_unit_cost', e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
                <Label>Inventory Account ID <span className="text-red-500">*</span></Label>
                <Input type="number" value={regForm.inventory_account_id}
                    onChange={e => setReg('inventory_account_id', e.target.value)}
                    placeholder="e.g. 103108 (from chart of accounts)" />
                <p className="text-xs text-muted-foreground">Enter the chart-of-accounts row ID for this inventory GL.</p>
            </div>
            <div className="space-y-1">
                <Label>Reorder Level</Label>
                <Input type="number" min="0" value={regForm.reorder_level}
                    onChange={e => setReg('reorder_level', e.target.value)} placeholder="0" />
            </div>
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Page header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <PackageX className="h-6 w-6 text-red-500" />
                        Obsolete & Scrap Inventory
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Track, write-off, and manage all obsolete, expired, and scrap inventory.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchItems} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={openRegister}>
                        <Plus className="mr-2 h-4 w-4" /> Register Item
                    </Button>
                </div>
            </div>

            {/* ── Total value card ── */}
            <Card className="mb-5 border-l-4 border-l-red-400">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Obsolete & Scrap Value</p>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
                            ) : error ? (
                                <p className="text-destructive text-sm mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" /> Could not load value
                                </p>
                            ) : (
                                <p className="text-3xl font-bold text-red-600 mt-1">{fmt(totalValue)}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {items.length} item{items.length !== 1 ? 's' : ''} classified
                            </p>
                        </div>
                        <PackageX className="h-10 w-10 text-red-200" />
                    </div>
                </CardContent>
            </Card>

            {/* ── Table ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Obsolete & Scrap Items</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-destructive text-center py-12">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p className="font-medium">Failed to load items</p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <PackageX className="mx-auto h-10 w-10 mb-3 opacity-30" />
                            <p className="font-medium">No obsolete or scrap items found</p>
                            <p className="text-sm mt-1">Register an item to begin tracking.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>UOM</TableHead>
                                        <TableHead className="text-right">Qty on Hand</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Value</TableHead>
                                        <TableHead>Classification</TableHead>
                                        <TableHead>Date Classified</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                                            <TableCell>{item.unit_of_measure}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className={item.quantity_on_hand === 0 ? 'text-muted-foreground' : ''}>
                                                    {item.quantity_on_hand.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{fmt(item.average_unit_cost)}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-red-600">
                                                {fmt(item.total_value)}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reasonBadge(item.reason)}`}>
                                                    {cleanReason(item.reason)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {fmtDate(item.date_classified)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                                        title="Edit" onClick={() => openEdit(item)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700"
                                                        title="Issue / Write-off" onClick={() => openIssue(item)}
                                                        disabled={item.quantity_on_hand === 0}>
                                                        <ArrowDownCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-red-700"
                                                        title="Delete" onClick={() => openDelete(item)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ══════════════════════════════════════════════════════════════
                REGISTER DIALOG
            ══════════════════════════════════════════════════════════════ */}
            <Dialog open={showRegister} onOpenChange={setShowRegister}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Register Obsolete / Scrap Item</DialogTitle>
                        <DialogDescription>
                            Add a new item to the Obsolete, Expired &amp; Scrap inventory category.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <RegistrationFields />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRegister(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleRegister} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Register Item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════
                EDIT DIALOG
            ══════════════════════════════════════════════════════════════ */}
            <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Item — {selected?.name}</DialogTitle>
                        <DialogDescription>
                            Update the item details. A new classification note will be logged.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <RegistrationFields />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEdit(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleEdit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════
                ISSUE / WRITE-OFF DIALOG
            ══════════════════════════════════════════════════════════════ */}
            <Dialog open={showIssue} onOpenChange={setShowIssue}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-700">
                            <ArrowDownCircle className="h-5 w-5" /> Write-Off — {selected?.name}
                        </DialogTitle>
                        <DialogDescription>
                            This will reduce inventory on hand and post a journal entry
                            (DR Expense / CR Inventory).
                            Available: <strong>{selected?.quantity_on_hand} {selected?.unit_of_measure}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label>Quantity to Write-Off <span className="text-red-500">*</span></Label>
                            <Input type="number" min="0.01" step="0.01"
                                max={selected?.quantity_on_hand}
                                value={issueForm.quantity_issued}
                                onChange={e => setIssue('quantity_issued', e.target.value)}
                                placeholder={`Max: ${selected?.quantity_on_hand}`} />
                        </div>
                        <div className="space-y-1">
                            <Label>Expense / Write-Off GL Account ID <span className="text-red-500">*</span></Label>
                            <Input type="number" value={issueForm.expense_account_id}
                                onChange={e => setIssue('expense_account_id', e.target.value)}
                                placeholder="e.g. chart_of_accounts row ID" />
                            <p className="text-xs text-muted-foreground">
                                Enter the chart-of-accounts row ID for the expense account to debit (e.g. Miscellaneous Expenses).
                            </p>
                        </div>
                        <div className="space-y-1">
                            <Label>Issue Type</Label>
                            <Select value={issueForm.issue_type}
                                onValueChange={v => setIssue('issue_type', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ISSUE_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Notes / Reference</Label>
                            <Input value={issueForm.notes}
                                onChange={e => setIssue('notes', e.target.value)}
                                placeholder="e.g. Disposed of expired labels batch 2024-01" />
                        </div>

                        {/* Cost preview */}
                        {issueForm.quantity_issued && selected && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                <div className="flex justify-between text-amber-800">
                                    <span>Estimated write-off value:</span>
                                    <span className="font-bold">
                                        {fmt(parseFloat(issueForm.quantity_issued || '0') * selected.average_unit_cost)}
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-1">
                                    Journal entry will post automatically on save.
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowIssue(false)} disabled={isSaving}>Cancel</Button>
                        <Button variant="destructive" onClick={handleIssue} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Write-Off
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════════════════════════
                DELETE CONFIRMATION
            ══════════════════════════════════════════════════════════════ */}
            <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete "{selected?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selected && selected.quantity_on_hand > 0 ? (
                                <span className="text-destructive font-medium">
                                    This item still has {selected.quantity_on_hand} {selected.unit_of_measure} on hand.
                                    Please issue the remaining quantity before deleting.
                                </span>
                            ) : (
                                'This action cannot be undone. The item record will be permanently removed.'
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isSaving || (selected?.quantity_on_hand ?? 0) > 0}
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-red-700">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default ObsoleteScrapPage;
