'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  PlusCircle, 
  AlertTriangle, 
  X, 
  Eye, 
  Pencil, 
  Trash2,
  Calculator,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";

// ============== TYPES ==============
interface FixedAsset {
    id: string;
    asset_code: string;
    asset_name: string;
    category: string;
    acquisition_date: string;
    acquisition_cost: number;
    salvage_value: number;
    useful_life_months: number;
    depreciation_method: 'straight_line' | 'reducing_balance' | 'units_of_production';
    reducing_balance_rate?: number;
    total_units_capacity?: number;
    units_produced_to_date?: number;
    current_book_value: number;
    accumulated_depreciation: number;
    status: 'active' | 'fully_depreciated' | 'disposed';
    location?: string;
    supplier?: string;
    serial_number?: string;
    notes?: string;
    asset_account_code?: string;
    accumulated_depreciation_account_code?: string;
    depreciation_expense_account_code?: string;
}

interface DepreciationEntry {
    id: string;
    asset_id: string;
    asset_name?: string;
    period_date: string;
    period_type: 'monthly' | 'yearly';
    depreciation_amount: number;
    accumulated_depreciation: number;
    book_value_after: number;
    units_produced_this_period?: number;
}

interface AssetCategory {
    id: string;
    name: string;
    default_useful_life_months: number;
    default_method: string;
}

interface ChartAccount {
    account_code: string;
    account_name: string;
}

// ============== HELPER FUNCTIONS ==============
const calculateDepreciation = (
    asset: FixedAsset,
    period_type: 'monthly' | 'yearly',
    units_produced?: number
): number => {
    const { 
        acquisition_cost, 
        salvage_value, 
        useful_life_months, 
        depreciation_method,
        reducing_balance_rate,
        total_units_capacity,
        accumulated_depreciation = 0
    } = asset;

    const depreciable_amount = acquisition_cost - salvage_value;
    
    if (depreciable_amount <= 0) return 0;
    
    switch (depreciation_method) {
        case 'straight_line':
            if (period_type === 'monthly') {
                return depreciable_amount / useful_life_months;
            } else {
                return depreciable_amount / (useful_life_months / 12);
            }
            
        case 'reducing_balance':
            const rate = reducing_balance_rate || 200;
            const annual_rate = rate / 100;
            const current_book_value = acquisition_cost - accumulated_depreciation;
            
            if (current_book_value <= salvage_value) return 0;
            
            if (period_type === 'monthly') {
                const monthly_rate = annual_rate / 12;
                let depreciation = current_book_value * monthly_rate;
                if (current_book_value - depreciation < salvage_value) {
                    depreciation = current_book_value - salvage_value;
                }
                return depreciation;
            } else {
                let depreciation = current_book_value * annual_rate;
                if (current_book_value - depreciation < salvage_value) {
                    depreciation = current_book_value - salvage_value;
                }
                return depreciation;
            }
            
        case 'units_of_production':
            if (!total_units_capacity || total_units_capacity === 0) return 0;
            const depreciation_per_unit = depreciable_amount / total_units_capacity;
            return depreciation_per_unit * (units_produced || 0);
            
        default:
            return 0;
    }
};

// ============== MAIN COMPONENT ==============
const DepreciationModule = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data states
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [depreciationEntries, setDepreciationEntries] = useState<DepreciationEntry[]>([]);
    const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([
        { id: '1', name: 'Machinery', default_useful_life_months: 120, default_method: 'straight_line' },
        { id: '2', name: 'Equipment', default_useful_life_months: 60, default_method: 'straight_line' },
        { id: '3', name: 'Vehicles', default_useful_life_months: 60, default_method: 'reducing_balance' },
        { id: '4', name: 'Furniture', default_useful_life_months: 60, default_method: 'straight_line' },
        { id: '5', name: 'Computers', default_useful_life_months: 36, default_method: 'straight_line' },
        { id: '6', name: 'Buildings', default_useful_life_months: 240, default_method: 'straight_line' }
    ]);

    // Chart of Accounts data
    const [assetAccounts, setAssetAccounts] = useState<ChartAccount[]>([]);
    const [accumulatedAccounts, setAccumulatedAccounts] = useState<ChartAccount[]>([]);
    const [expenseAccounts, setExpenseAccounts] = useState<ChartAccount[]>([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

    // Dialog states
    const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
    const [isViewAssetDialogOpen, setIsViewAssetDialogOpen] = useState(false);
    const [isEditAssetDialogOpen, setIsEditAssetDialogOpen] = useState(false);
    const [isDeleteAssetDialogOpen, setIsDeleteAssetDialogOpen] = useState(false);
    const [isRunDepreciationDialogOpen, setIsRunDepreciationDialogOpen] = useState(false);

    // Form states
    const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
    const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<FixedAsset | null>(null);
    const [createdAsset, setCreatedAsset] = useState<{ asset_code: string; asset_name: string } | null>(null);
    
    // New Asset Form (with account codes)
    const [newAsset, setNewAsset] = useState({
        asset_name: '',
        category: 'Equipment',
        acquisition_date: new Date().toISOString().split('T')[0],
        acquisition_cost: 0,
        salvage_value: 0,
        useful_life_months: 60,
        depreciation_method: 'straight_line' as const,
        reducing_balance_rate: 200,
        total_units_capacity: 0,
        location: '',
        supplier: '',
        serial_number: '',
        notes: '',
        asset_account_code: '',
        accumulated_depreciation_account_code: '',
        depreciation_expense_account_code: ''
    });

    // Depreciation run form
    const [runPeriodType, setRunPeriodType] = useState<'monthly' | 'yearly'>('monthly');
    const [runPeriodDate, setRunPeriodDate] = useState(new Date().toISOString().split('T')[0]);
    const [runAssetIds, setRunAssetIds] = useState<string[]>([]);
    const [runSelectAll, setRunSelectAll] = useState(true);
    const [runUnitsProduction, setRunUnitsProduction] = useState<Record<string, number>>({});

    // Fetch Chart of Accounts
    const fetchChartOfAccounts = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoadingAccounts(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-asset-accounts.php?company_id=${user.company_id}`);
            const data = await response.json();
            
            if (data.success) {
                setAssetAccounts(data.asset_accounts || []);
                setAccumulatedAccounts(data.accumulated_depreciation_accounts || []);
                setExpenseAccounts(data.depreciation_expense_accounts || []);
            }
        } catch (error: any) {
            console.error("Failed to fetch chart of accounts:", error);
        } finally {
            setIsLoadingAccounts(false);
        }
    }, [user?.company_id]);

    // Fetch assets data
    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-fixed-assets.php?company_id=${user.company_id}`);
            const data = await response.json();
            
            if (data.success) {
                setAssets(data.assets || []);
                setDepreciationEntries(data.depreciation_entries || []);
                if (data.categories && data.categories.length > 0) {
                    setAssetCategories(data.categories);
                }
            } else {
                throw new Error(data.message || "Failed to fetch assets.");
            }
        } catch (error: any) {
            toast({ title: "Error Loading Data", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        fetchData();
        fetchChartOfAccounts();
    }, [fetchData, fetchChartOfAccounts]);

    // Auto-fill account codes when category changes
    useEffect(() => {
        if (newAsset.category && assetAccounts.length > 0) {
            // Try to find matching accounts based on category
            const categoryLower = newAsset.category.toLowerCase();
            
            // Find asset account
            const matchingAsset = assetAccounts.find(acc => 
                acc.account_name.toLowerCase().includes(categoryLower) ||
                (categoryLower === 'computers' && acc.account_name.toLowerCase().includes('office')) ||
                (categoryLower === 'equipment' && acc.account_name.toLowerCase().includes('office'))
            );
            
            // Find accumulated account
            const matchingAccum = accumulatedAccounts.find(acc => 
                acc.account_name.toLowerCase().includes(categoryLower) ||
                (categoryLower === 'computers' && acc.account_name.toLowerCase().includes('office')) ||
                (categoryLower === 'equipment' && acc.account_name.toLowerCase().includes('office'))
            );
            
            // Find expense account
            const matchingExpense = expenseAccounts.find(acc => 
                acc.account_name.toLowerCase().includes(categoryLower) ||
                (categoryLower === 'computers' && acc.account_name.toLowerCase().includes('office')) ||
                (categoryLower === 'equipment' && acc.account_name.toLowerCase().includes('office'))
            );
            
            setNewAsset(prev => ({
                ...prev,
                asset_account_code: matchingAsset?.account_code || prev.asset_account_code,
                accumulated_depreciation_account_code: matchingAccum?.account_code || prev.accumulated_depreciation_account_code,
                depreciation_expense_account_code: matchingExpense?.account_code || prev.depreciation_expense_account_code
            }));
        }
    }, [newAsset.category, assetAccounts, accumulatedAccounts, expenseAccounts]);

    const handleSaveAsset = async () => {
        if (!newAsset.asset_name || newAsset.acquisition_cost <= 0 || newAsset.useful_life_months <= 0) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        if (!newAsset.asset_account_code || !newAsset.accumulated_depreciation_account_code || !newAsset.depreciation_expense_account_code) {
            toast({ title: "Validation Error", description: "Please select all Chart of Accounts for this asset.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/create-fixed-asset.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user?.company_id,
                    user_id: user?.id,
                    ...newAsset
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            
            toast({ title: "Asset Created", description: `Asset "${newAsset.asset_name}" created with code: ${result.asset_code}` });
            setCreatedAsset({ asset_code: result.asset_code, asset_name: newAsset.asset_name });
            fetchData();
            
            setTimeout(() => {
                setCreatedAsset(null);
                setIsAssetDialogOpen(false);
                resetAssetForm();
            }, 2000);
        } catch (error: any) {
            toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateAsset = async () => {
        if (!editingAsset) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/update-fixed-asset.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user?.company_id,
                    asset_id: editingAsset.id,
                    ...editingAsset
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            
            toast({ title: "Asset Updated", description: "Fixed asset has been updated successfully." });
            fetchData();
            setIsEditAssetDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAsset = async () => {
        if (!deletingAsset) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/delete-fixed-asset.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user?.company_id,
                    asset_id: deletingAsset.id
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            
            toast({ title: "Asset Deleted", description: "Fixed asset has been removed." });
            fetchData();
            setIsDeleteAssetDialogOpen(false);
        } catch (error: any) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRunDepreciation = async () => {
        if (!runPeriodDate) {
            toast({ title: "Validation Error", description: "Please select a period date.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        const assetIdsToProcess = runSelectAll ? [] : runAssetIds;
        
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/run-depreciation.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user?.company_id,
                    user_id: user?.id,
                    period_type: runPeriodType,
                    period_date: runPeriodDate,
                    asset_ids: assetIdsToProcess,
                    units_production: runUnitsProduction
                })
            });
            const result = await response.json();
            
            if (result.success) {
                toast({ 
                    title: "Depreciation Complete", 
                    description: result.message 
                });
                fetchData();
                setIsRunDepreciationDialogOpen(false);
                resetDepreciationForm();
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: "Depreciation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetAssetForm = () => {
        setNewAsset({
            asset_name: '',
            category: 'Equipment',
            acquisition_date: new Date().toISOString().split('T')[0],
            acquisition_cost: 0,
            salvage_value: 0,
            useful_life_months: 60,
            depreciation_method: 'straight_line',
            reducing_balance_rate: 200,
            total_units_capacity: 0,
            location: '',
            supplier: '',
            serial_number: '',
            notes: '',
            asset_account_code: '',
            accumulated_depreciation_account_code: '',
            depreciation_expense_account_code: ''
        });
        setCreatedAsset(null);
    };

    const resetDepreciationForm = () => {
        setRunPeriodType('monthly');
        setRunPeriodDate(new Date().toISOString().split('T')[0]);
        setRunAssetIds([]);
        setRunSelectAll(true);
        setRunUnitsProduction({});
    };

    const getDepreciationMethodLabel = (method: string) => {
        switch (method) {
            case 'straight_line': return 'Straight Line';
            case 'reducing_balance': return 'Reducing Balance';
            case 'units_of_production': return 'Units of Production';
            default: return method;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-500">Active</Badge>;
            case 'fully_depreciated': return <Badge className="bg-blue-500">Fully Depreciated</Badge>;
            case 'disposed': return <Badge className="bg-red-500">Disposed</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const activeAssets = assets.filter(a => a.status === 'active');

    const getPreviewDepreciation = (asset: FixedAsset): number => {
        if (runPeriodType === 'monthly') {
            if (asset.depreciation_method === 'straight_line') {
                return (asset.acquisition_cost - asset.salvage_value) / asset.useful_life_months;
            } else if (asset.depreciation_method === 'reducing_balance') {
                const rate = (asset.reducing_balance_rate || 200) / 100 / 12;
                return asset.current_book_value * rate;
            }
        } else {
            if (asset.depreciation_method === 'straight_line') {
                return ((asset.acquisition_cost - asset.salvage_value) / asset.useful_life_months) * 12;
            } else if (asset.depreciation_method === 'reducing_balance') {
                const rate = (asset.reducing_balance_rate || 200) / 100;
                return asset.current_book_value * rate;
            }
        }
        return 0;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* PAGE HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fixed Assets & Depreciation</h1>
                    <p className="text-muted-foreground">Manage your company's fixed assets and calculate depreciation.</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setIsRunDepreciationDialogOpen(true)}
                        disabled={activeAssets.length === 0}
                    >
                        <Calculator className="mr-2 h-4 w-4" />
                        Run Depreciation
                    </Button>
                    <Button onClick={() => setIsAssetDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Asset
                    </Button>
                </div>
            </div>

           {/* ==================== SUMMARY CARDS - COMPACT VERSION ==================== */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
        <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Assets</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground">
                Active: {activeAssets.length}
            </p>
        </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
        <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Acquisition Cost</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
            <div className="text-sm font-bold truncate" title={assets.reduce((sum, a) => sum + a.acquisition_cost, 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}>
                {assets.reduce((sum, a) => sum + a.acquisition_cost, 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0, notation: 'compact' })}
            </div>
        </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
        <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Accumulated Depreciation</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
            <div className="text-sm font-bold text-red-600 truncate" title={assets.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}>
                {assets.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0, notation: 'compact' })}
            </div>
        </CardContent>
    </Card>
    
    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
        <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Current Book Value</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
            <div className="text-sm font-bold text-green-600 truncate" title={assets.reduce((sum, a) => sum + (a.current_book_value || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}>
                {assets.reduce((sum, a) => sum + (a.current_book_value || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0, notation: 'compact' })}
            </div>
        </CardContent>
    </Card>
</div>

            {/* MAIN TABS */}
            <Tabs defaultValue="assets" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="assets">Asset Register</TabsTrigger>
                    <TabsTrigger value="depreciation">Depreciation History</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* ASSET REGISTER TAB */}
                <TabsContent value="assets" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fixed Asset Register</CardTitle>
                            <CardDescription>View and manage all fixed assets.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset Code</TableHead>
                                        <TableHead>Asset Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Acquisition Cost</TableHead>
                                        <TableHead>Current Book Value</TableHead>
                                        <TableHead>Depreciation Method</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assets.map(asset => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-mono text-xs">{asset.asset_code || '-'}</TableCell>
                                            <TableCell className="font-medium">{asset.asset_name}</TableCell>
                                            <TableCell>{asset.category || '-'}</TableCell>
                                            <TableCell>{asset.acquisition_cost.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</TableCell>
                                            <TableCell>{asset.current_book_value.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</TableCell>
                                            <TableCell>{getDepreciationMethodLabel(asset.depreciation_method)}</TableCell>
                                            <TableCell>{getStatusBadge(asset.status)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => { setSelectedAsset(asset); setIsViewAssetDialogOpen(true); }}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => { setEditingAsset(asset); setIsEditAssetDialogOpen(true); }}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => { setDeletingAsset(asset); setIsDeleteAssetDialogOpen(true); }}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {assets.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24">
                                                No assets found. Click "Add Asset" to get started.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DEPRECIATION HISTORY TAB */}
                <TabsContent value="depreciation" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Depreciation History</CardTitle>
                            <CardDescription>View all depreciation entries posted.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Asset</TableHead>
                                        <TableHead>Period Type</TableHead>
                                        <TableHead>Depreciation Amount</TableHead>
                                        <TableHead>Accumulated</TableHead>
                                        <TableHead>Book Value After</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {depreciationEntries.map(entry => {
                                        const asset = assets.find(a => a.id === entry.asset_id);
                                        return (
                                            <TableRow key={entry.id}>
                                                <TableCell>{new Date(entry.period_date).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium">{asset?.asset_name || 'Unknown'}</TableCell>
                                                <TableCell className="capitalize">{entry.period_type}</TableCell>
                                                <TableCell className="text-red-600">
                                                    {entry.depreciation_amount.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                                </TableCell>
                                                <TableCell>{entry.accumulated_depreciation.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</TableCell>
                                                <TableCell>{entry.book_value_after.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {depreciationEntries.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                No depreciation entries found. Run depreciation to create entries.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* REPORTS TAB */}
                <TabsContent value="reports" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Depreciation Forecast</CardTitle>
                                <CardDescription>Next 12 months depreciation projection.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {activeAssets.map(asset => {
                                        const monthlyDep = calculateDepreciation(asset, 'monthly');
                                        const remainingValue = asset.current_book_value - asset.salvage_value;
                                        const remainingMonths = Math.ceil(remainingValue / monthlyDep);
                                        return (
                                            <div key={asset.id} className="flex justify-between text-sm">
                                                <span>{asset.asset_name}</span>
                                                <span className="font-semibold">
                                                    {monthlyDep.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}/month
                                                    {remainingMonths > 0 && remainingMonths < 1200 && ` (${Math.ceil(remainingMonths)} months remaining)`}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {activeAssets.length === 0 && (
                                        <p className="text-center text-muted-foreground py-4">No active assets found.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Asset Category Summary</CardTitle>
                                <CardDescription>Breakdown by asset category.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {Object.entries(
                                        assets.reduce((acc, asset) => {
                                            const category = asset.category || 'Uncategorized';
                                            if (!acc[category]) acc[category] = { cost: 0, bookValue: 0 };
                                            acc[category].cost += asset.acquisition_cost;
                                            acc[category].bookValue += asset.current_book_value;
                                            return acc;
                                        }, {} as Record<string, { cost: number; bookValue: number }>)
                                    ).map(([category, values]) => (
                                        <div key={category} className="flex justify-between text-sm">
                                            <span>{category}</span>
                                            <div className="text-right">
                                                <div>{values.cost.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Book Value: {values.bookValue.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ADD ASSET DIALOG WITH CHART OF ACCOUNTS SELECTION */}
            <Dialog open={isAssetDialogOpen} onOpenChange={(open) => {
                setIsAssetDialogOpen(open);
                if (!open) resetAssetForm();
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Fixed Asset</DialogTitle>
                        <DialogDescription>Enter the asset details and select the Chart of Accounts for this asset.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Asset Name *</Label>
                                <Input 
                                    placeholder="e.g., Top Cylinder"
                                    value={newAsset.asset_name}
                                    onChange={e => setNewAsset({...newAsset, asset_name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select value={newAsset.category} onValueChange={v => setNewAsset({...newAsset, category: v})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assetCategories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Acquisition Date *</Label>
                                <Input 
                                    type="date"
                                    value={newAsset.acquisition_date}
                                    onChange={e => setNewAsset({...newAsset, acquisition_date: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Acquisition Cost (NGN) *</Label>
                                <Input 
                                    type="number"
                                    placeholder="0.00"
                                    value={newAsset.acquisition_cost}
                                    onChange={e => setNewAsset({...newAsset, acquisition_cost: parseFloat(e.target.value) || 0})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Salvage Value (NGN)</Label>
                                <Input 
                                    type="number"
                                    placeholder="0.00"
                                    value={newAsset.salvage_value}
                                    onChange={e => setNewAsset({...newAsset, salvage_value: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Useful Life (months) *</Label>
                                <Input 
                                    type="number"
                                    placeholder="60"
                                    value={newAsset.useful_life_months}
                                    onChange={e => setNewAsset({...newAsset, useful_life_months: parseInt(e.target.value) || 0})}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">e.g., 60 months = 5 years</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Depreciation Method *</Label>
                                <Select value={newAsset.depreciation_method} onValueChange={(v: any) => setNewAsset({...newAsset, depreciation_method: v})}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="straight_line">Straight Line</SelectItem>
                                        <SelectItem value="reducing_balance">Reducing Balance (Declining)</SelectItem>
                                        <SelectItem value="units_of_production">Units of Production</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {newAsset.depreciation_method === 'reducing_balance' && (
                            <div className="space-y-2">
                                <Label>Reducing Balance Rate (%)</Label>
                                <Input 
                                    type="number"
                                    placeholder="200"
                                    value={newAsset.reducing_balance_rate}
                                    onChange={e => setNewAsset({...newAsset, reducing_balance_rate: parseFloat(e.target.value) || 200})}
                                />
                                <p className="text-xs text-muted-foreground">200% = Double Declining Balance</p>
                            </div>
                        )}

                        {newAsset.depreciation_method === 'units_of_production' && (
                            <div className="space-y-2">
                                <Label>Total Units Capacity</Label>
                                <Input 
                                    type="number"
                                    placeholder="e.g., 1000000 units"
                                    value={newAsset.total_units_capacity}
                                    onChange={e => setNewAsset({...newAsset, total_units_capacity: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                        )}

                        {/* Chart of Accounts Selection */}
                        <div className="border-t pt-4 mt-2">
                            <h3 className="font-semibold text-md mb-3">Chart of Accounts Mapping</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Asset Account *</Label>
                                    <Select 
                                        value={newAsset.asset_account_code} 
                                        onValueChange={v => setNewAsset({...newAsset, asset_account_code: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select asset account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isLoadingAccounts ? (
                                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                                            ) : (
                                                assetAccounts.map(acc => (
                                                    <SelectItem key={acc.account_code} value={acc.account_code}>
                                                        {acc.account_code} - {acc.account_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Fixed asset account (104xxx series)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Accumulated Depreciation Account *</Label>
                                    <Select 
                                        value={newAsset.accumulated_depreciation_account_code} 
                                        onValueChange={v => setNewAsset({...newAsset, accumulated_depreciation_account_code: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select accumulated depreciation account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {accumulatedAccounts.map(acc => (
                                                <SelectItem key={acc.account_code} value={acc.account_code}>
                                                    {acc.account_code} - {acc.account_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Accumulated depreciation account (1052xx series)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Depreciation Expense Account *</Label>
                                    <Select 
                                        value={newAsset.depreciation_expense_account_code} 
                                        onValueChange={v => setNewAsset({...newAsset, depreciation_expense_account_code: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select expense account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {expenseAccounts.map(acc => (
                                                <SelectItem key={acc.account_code} value={acc.account_code}>
                                                    {acc.account_code} - {acc.account_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Depreciation expense account (506xxx series)</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input 
                                    placeholder="e.g., Floor A"
                                    value={newAsset.location}
                                    onChange={e => setNewAsset({...newAsset, location: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Serial Number</Label>
                                <Input 
                                    placeholder="Serial number"
                                    value={newAsset.serial_number}
                                    onChange={e => setNewAsset({...newAsset, serial_number: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Supplier/Vendor</Label>
                            <Input 
                                placeholder="Supplier name"
                                value={newAsset.supplier}
                                onChange={e => setNewAsset({...newAsset, supplier: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <textarea 
                                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Additional notes about the asset..."
                                value={newAsset.notes}
                                onChange={e => setNewAsset({...newAsset, notes: e.target.value})}
                            />
                        </div>

                        {createdAsset && (
                            <Alert className="bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription>
                                    Asset created successfully!<br />
                                    <strong>Asset Code: {createdAsset.asset_code}</strong>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleSaveAsset} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Save Asset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RUN DEPRECIATION DIALOG */}
            <Dialog open={isRunDepreciationDialogOpen} onOpenChange={setIsRunDepreciationDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Run Depreciation</DialogTitle>
                        <DialogDescription>Calculate and post depreciation for selected assets.</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Period Type</Label>
                                <Select value={runPeriodType} onValueChange={(v: any) => setRunPeriodType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Period Date</Label>
                                <Input 
                                    type="date" 
                                    value={runPeriodDate}
                                    onChange={e => setRunPeriodDate(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {runPeriodType === 'monthly' 
                                        ? 'Last day of the month is recommended' 
                                        : 'Year end date'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Select Assets</Label>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center space-x-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={runSelectAll}
                                            onChange={(e) => {
                                                setRunSelectAll(e.target.checked);
                                                if (e.target.checked) {
                                                    setRunAssetIds([]);
                                                }
                                            }}
                                            className="rounded border-gray-300"
                                        />
                                        <span>Select All Active Assets</span>
                                    </label>
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => {
                                            fetchData();
                                            toast({ title: "Refreshed", description: "Asset list updated." });
                                        }}
                                    >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Refresh
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                {activeAssets.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-4">
                                        No active assets found. Please add assets first.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {activeAssets.map(asset => (
                                            <div key={asset.id} className="flex items-center space-x-3 py-2 border-b last:border-0">
                                                <input
                                                    type="checkbox"
                                                    id={`asset-${asset.id}`}
                                                    checked={runSelectAll || runAssetIds.includes(asset.id)}
                                                    onChange={(e) => {
                                                        if (runSelectAll) {
                                                            setRunSelectAll(false);
                                                            setRunAssetIds([asset.id]);
                                                        } else {
                                                            const newAssetIds = e.target.checked
                                                                ? [...runAssetIds, asset.id]
                                                                : runAssetIds.filter(id => id !== asset.id);
                                                            setRunAssetIds(newAssetIds);
                                                        }
                                                    }}
                                                    className="rounded border-gray-300"
                                                />
                                                <Label htmlFor={`asset-${asset.id}`} className="text-sm flex-1 cursor-pointer">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <span className="font-medium">{asset.asset_name}</span>
                                                            <span className="text-xs text-muted-foreground ml-2">({asset.asset_code})</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm">
                                                                Book Value: {asset.current_book_value.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                Method: {getDepreciationMethodLabel(asset.depreciation_method)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {runSelectAll 
                                    ? "All active assets will be processed" 
                                    : `${runAssetIds.length} asset(s) selected`}
                            </p>
                        </div>

                        {/* Units Production for units_of_production method */}
                        {!runSelectAll && runAssetIds.some(id => {
                            const asset = assets.find(a => a.id === id);
                            return asset?.depreciation_method === 'units_of_production';
                        }) && (
                            <div className="space-y-2">
                                <Label>Units Produced This Period</Label>
                                {runAssetIds.map(id => {
                                    const asset = assets.find(a => a.id === id);
                                    if (asset?.depreciation_method !== 'units_of_production') return null;
                                    return (
                                        <div key={id} className="grid grid-cols-2 gap-2 items-center">
                                            <Label className="text-sm">{asset.asset_name}</Label>
                                            <Input 
                                                type="number"
                                                placeholder="Units produced"
                                                value={runUnitsProduction[id] || ''}
                                                onChange={e => setRunUnitsProduction({
                                                    ...runUnitsProduction,
                                                    [id]: parseFloat(e.target.value) || 0
                                                })}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Preview Depreciation */}
                        {(runSelectAll || runAssetIds.length > 0) && activeAssets.length > 0 && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold text-sm mb-3">Depreciation Preview</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {(runSelectAll ? activeAssets : activeAssets.filter(a => runAssetIds.includes(a.id))).map(asset => {
                                        const previewAmount = getPreviewDepreciation(asset);
                                        if (previewAmount <= 0) return null;
                                        return (
                                            <div key={asset.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                                                <span>{asset.asset_name}</span>
                                                <span className="font-semibold text-red-600">
                                                    {previewAmount.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                    <span>Total Depreciation</span>
                                    <span className="text-red-600">
                                        {(runSelectAll ? activeAssets : activeAssets.filter(a => runAssetIds.includes(a.id)))
                                            .reduce((total, asset) => total + getPreviewDepreciation(asset), 0)
                                            .toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRunDepreciationDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleRunDepreciation} 
                            disabled={isSubmitting || activeAssets.length === 0}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            <Calculator className="mr-2 h-4 w-4" />
                            Calculate & Post Depreciation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* VIEW ASSET DIALOG */}
            <Dialog open={isViewAssetDialogOpen} onOpenChange={setIsViewAssetDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedAsset?.asset_name}</DialogTitle>
                        <DialogDescription>Asset details and depreciation information.</DialogDescription>
                    </DialogHeader>
                    {selectedAsset && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Asset Code</Label>
                                    <p className="font-mono">{selectedAsset.asset_code || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <p>{getStatusBadge(selectedAsset.status)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Acquisition Date</Label>
                                    <p>{new Date(selectedAsset.acquisition_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Useful Life</Label>
                                    <p>{selectedAsset.useful_life_months} months ({Math.floor(selectedAsset.useful_life_months / 12)} years)</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Acquisition Cost</Label>
                                    <p className="font-semibold">{selectedAsset.acquisition_cost.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Salvage Value</Label>
                                    <p>{selectedAsset.salvage_value.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Accumulated Depreciation</Label>
                                    <p className="text-red-600">{selectedAsset.accumulated_depreciation?.toLocaleString('en-US', { style: 'currency', currency: 'NGN' }) || '0'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Current Book Value</Label>
                                    <p className="text-green-600 font-bold">{selectedAsset.current_book_value?.toLocaleString('en-US', { style: 'currency', currency: 'NGN' })}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Depreciation Method</Label>
                                    <p>{getDepreciationMethodLabel(selectedAsset.depreciation_method)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Asset Account</Label>
                                    <p className="font-mono text-xs">{selectedAsset.asset_account_code || '-'}</p>
                                </div>
                                {selectedAsset.location && (
                                    <div>
                                        <Label className="text-muted-foreground">Location</Label>
                                        <p>{selectedAsset.location}</p>
                                    </div>
                                )}
                                {selectedAsset.supplier && (
                                    <div>
                                        <Label className="text-muted-foreground">Supplier</Label>
                                        <p>{selectedAsset.supplier}</p>
                                    </div>
                                )}
                                {selectedAsset.serial_number && (
                                    <div>
                                        <Label className="text-muted-foreground">Serial Number</Label>
                                        <p>{selectedAsset.serial_number}</p>
                                    </div>
                                )}
                            </div>
                            {selectedAsset.notes && (
                                <div>
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <p className="text-sm">{selectedAsset.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild><Button>Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* EDIT ASSET DIALOG */}
            <Dialog open={isEditAssetDialogOpen} onOpenChange={setIsEditAssetDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Fixed Asset</DialogTitle>
                        <DialogDescription>Update asset information.</DialogDescription>
                    </DialogHeader>
                    {editingAsset && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Asset Name</Label>
                                    <Input 
                                        value={editingAsset.asset_name}
                                        onChange={e => setEditingAsset({ ...editingAsset, asset_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Asset Code</Label>
                                    <Input 
                                        value={editingAsset.asset_code || ''}
                                        onChange={e => setEditingAsset({ ...editingAsset, asset_code: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Acquisition Cost</Label>
                                    <Input 
                                        type="number"
                                        value={editingAsset.acquisition_cost}
                                        onChange={e => setEditingAsset({ ...editingAsset, acquisition_cost: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Salvage Value</Label>
                                    <Input 
                                        type="number"
                                        value={editingAsset.salvage_value}
                                        onChange={e => setEditingAsset({ ...editingAsset, salvage_value: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={editingAsset.status} onValueChange={(v: any) => setEditingAsset({ ...editingAsset, status: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="fully_depreciated">Fully Depreciated</SelectItem>
                                            <SelectItem value="disposed">Disposed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <textarea 
                                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editingAsset.notes || ''}
                                    onChange={e => setEditingAsset({ ...editingAsset, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleUpdateAsset} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Update Asset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE ASSET DIALOG */}
            <Dialog open={isDeleteAssetDialogOpen} onOpenChange={setIsDeleteAssetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Fixed Asset</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{deletingAsset?.asset_name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Deleting this asset will remove all associated depreciation history.
                        </AlertDescription>
                    </Alert>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteAssetDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteAsset} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Delete Asset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DepreciationModule;