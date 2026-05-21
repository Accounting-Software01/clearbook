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
import { Switch } from "@/components/ui/switch";
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
  RefreshCw,
  Download,
  Upload,
  QrCode,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Building2,
  Hash,
  Calendar as CalendarIcon,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from "@/components/ui/badge";
import QRCode from 'qrcode.react';

// ============== TYPES ==============
interface FixedAsset {
    id: string;
    asset_code: string;
    unique_identifier: string;
    asset_name: string;
    category: string;
    acquisition_date: string;
    commencement_date: string;
    acquisition_cost: number;
    salvage_value: number;
    useful_life_months: number;
    depreciation_method: 'straight_line' | 'reducing_balance' | 'units_of_production';
    reducing_balance_rate?: number;
    total_units_capacity?: number;
    units_produced_to_date?: number;
    current_book_value: number;
    accumulated_depreciation: number;
    status: 'active' | 'fully_depreciated' | 'disposed' | 'inactive';
    location_state?: string;
    location_lga?: string;
    location_ward?: string;
    department_id?: string;
    department_name?: string;
    supplier?: string;
    serial_number?: string;
    notes?: string;
    qr_code_url?: string;
    asset_account_code?: string;
    accumulated_depreciation_account_code?: string;
    depreciation_expense_account_code?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
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

interface Department {
    id: string;
    dept_code: string;
    dept_name: string;
    company_id: string;
}

interface Company {
    id: string;
    company_id: string;
    company_name: string;
    abbreviation?: string;
}

interface Location {
    state: string;
    lga: string;
    ward: string;
}

// Nigerian States and LGAs
const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa',
    'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger',
    'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT Abuja'
];

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

const generateUniqueIdentifier = (
    companyAbbr: string,
    locationState: string,
    locationLGA: string,
    departmentCode: string,
    sequence: number
): string => {
    // Format: CO-ABBR-LOCATION-DEPT-000001
    const stateCode = locationState.substring(0, 3).toUpperCase();
    const lgaCode = locationLGA.substring(0, 3).toUpperCase();
    const seqNum = sequence.toString().padStart(6, '0');
    return `${companyAbbr}-${stateCode}${lgaCode}-${departmentCode}-${seqNum}`;
};

// ============== MAIN COMPONENT ==============
const DepreciationModule = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Loading states
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Data states
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [depreciationEntries, setDepreciationEntries] = useState<DepreciationEntry[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [company, setCompany] = useState<Company | null>(null);
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
    const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

    // Form states
    const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
    const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<FixedAsset | null>(null);
    const [qrCodeAsset, setQrCodeAsset] = useState<FixedAsset | null>(null);
    const [createdAsset, setCreatedAsset] = useState<{ asset_code: string; unique_identifier: string; asset_name: string } | null>(null);
    
    // Location and Department data
    const [availableLGAs, setAvailableLGAs] = useState<string[]>([]);
    const [availableWards, setAvailableWards] = useState<string[]>([]);
    
    // New Asset Form
    const [newAsset, setNewAsset] = useState({
        asset_name: '',
        category: 'Equipment',
        acquisition_date: new Date().toISOString().split('T')[0],
        commencement_date: new Date().toISOString().split('T')[0],
        acquisition_cost: 0,
        salvage_value: 0,
        useful_life_months: 60,
        depreciation_method: 'straight_line' as const,
        reducing_balance_rate: 200,
        total_units_capacity: 0,
        location_state: '',
        location_lga: '',
        location_ward: '',
        department_id: '',
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

    // Preview unique identifier
    const [previewIdentifier, setPreviewIdentifier] = useState('');

    // Fetch data
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
            }
        } catch (error: any) {
            toast({ title: "Error Loading Data", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    const fetchDepartments = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-departments.php?company_id=${user.company_id}`);
            const data = await response.json();
            if (data.success) {
                setDepartments(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        }
    }, [user?.company_id]);

    const fetchCompany = useCallback(async () => {
        if (!user?.company_id) return;
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-company.php?company_id=${user.company_id}`);
            const data = await response.json();
            if (data.success) {
                setCompany(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch company:", error);
        }
    }, [user?.company_id]);

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

    useEffect(() => {
        fetchData();
        fetchDepartments();
        fetchCompany();
        fetchChartOfAccounts();
    }, [fetchData, fetchDepartments, fetchCompany, fetchChartOfAccounts]);

    // Update LGAs when state changes
    useEffect(() => {
        if (newAsset.location_state) {
            // In a real implementation, you would fetch LGAs from an API
            // This is a simplified version
            setAvailableLGAs(['Ikeja', 'Agege', 'Alimosho', 'Oshodi', 'Surulere']);
            setAvailableWards([]);
        }
    }, [newAsset.location_state]);

    // Generate preview unique identifier
    useEffect(() => {
        if (company?.abbreviation && newAsset.location_state && newAsset.location_lga && newAsset.department_id) {
            const department = departments.find(d => d.id === newAsset.department_id);
            const nextSequence = assets.length + 1;
            const identifier = generateUniqueIdentifier(
                company.abbreviation,
                newAsset.location_state,
                newAsset.location_lga,
                department?.dept_code || 'GEN',
                nextSequence
            );
            setPreviewIdentifier(identifier);
        } else {
            setPreviewIdentifier('');
        }
    }, [company, newAsset.location_state, newAsset.location_lga, newAsset.department_id, departments, assets.length]);

    const handleSaveAsset = async () => {
        if (!newAsset.asset_name || newAsset.acquisition_cost <= 0 || newAsset.useful_life_months <= 0) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        if (!newAsset.asset_account_code || !newAsset.accumulated_depreciation_account_code || !newAsset.depreciation_expense_account_code) {
            toast({ title: "Validation Error", description: "Please select all Chart of Accounts for this asset.", variant: "destructive" });
            return;
        }

        if (!newAsset.location_state || !newAsset.location_lga || !newAsset.department_id) {
            toast({ title: "Validation Error", description: "Please select location (State/LGA) and department.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const department = departments.find(d => d.id === newAsset.department_id);
            const nextSequence = assets.length + 1;
            const uniqueIdentifier = generateUniqueIdentifier(
                company?.abbreviation || 'CLR',
                newAsset.location_state,
                newAsset.location_lga,
                department?.dept_code || 'GEN',
                nextSequence
            );

            const response = await fetch(`https://hariindustries.net/api/clearbook/create-fixed-asset.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user?.company_id,
                    user_id: user?.id,
                    ...newAsset,
                    unique_identifier: uniqueIdentifier,
                    location_state: newAsset.location_state,
                    location_lga: newAsset.location_lga,
                    location_ward: newAsset.location_ward,
                    department_id: newAsset.department_id
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            
            toast({ title: "Asset Created", description: `Asset "${newAsset.asset_name}" created with code: ${result.asset_code} and ID: ${uniqueIdentifier}` });
            setCreatedAsset({ asset_code: result.asset_code, unique_identifier: uniqueIdentifier, asset_name: newAsset.asset_name });
            fetchData();
            
            setTimeout(() => {
                setCreatedAsset(null);
                setIsAssetDialogOpen(false);
                resetAssetForm();
            }, 3000);
        } catch (error: any) {
            toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (asset: FixedAsset) => {
        setIsSubmitting(true);
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/toggle-asset-active.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: user?.company_id,
                    asset_id: asset.id,
                    is_active: !asset.is_active
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
            
            toast({ 
                title: asset.is_active ? "Asset Deactivated" : "Asset Activated", 
                description: `Asset "${asset.asset_name}" has been ${asset.is_active ? 'deactivated' : 'activated'}.` 
            });
            fetchData();
        } catch (error: any) {
            toast({ title: "Action Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExportTemplate = async () => {
        setIsExporting(true);
        try {
            // Template headers for import
            const headers = [
                'Asset Name', 'Category', 'Acquisition Date', 'Commencement Date', 
                'Acquisition Cost', 'Salvage Value', 'Useful Life (months)', 
                'Depreciation Method', 'Location State', 'Location LGA', 
                'Location Ward', 'Department', 'Supplier', 'Serial Number', 'Notes'
            ];
            
            const sampleRow = [
                'Sample Asset', 'Equipment', '2024-01-01', '2024-01-01',
                '1000000', '50000', '60',
                'straight_line', 'Lagos', 'Ikeja',
                '', 'IT', 'Supplier Name', 'SN123456', 'Sample notes'
            ];
            
            const csvContent = [headers, sampleRow].map(row => row.join(',')).join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `asset_import_template_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            toast({ title: "Template Downloaded", description: "Use this template to bulk import assets." });
        } catch (error: any) {
            toast({ title: "Export Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportAssets = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('company_id', user?.company_id || '');
        
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/import-assets.php`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (result.success) {
                toast({ 
                    title: "Import Successful", 
                    description: `${result.imported_count} assets imported successfully. ${result.skipped_count || 0} skipped.` 
                });
                fetchData();
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({ title: "Import Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsImporting(false);
            setIsImportDialogOpen(false);
            event.target.value = '';
        }
    };

    const handleExportAssets = async () => {
        setIsExporting(true);
        try {
            const headers = [
                'Asset Code', 'Unique Identifier', 'Asset Name', 'Category', 
                'Acquisition Date', 'Commencement Date', 'Acquisition Cost', 
                'Salvage Value', 'Useful Life (months)', 'Depreciation Method',
                'Current Book Value', 'Accumulated Depreciation', 'Status',
                'Location State', 'Location LGA', 'Location Ward', 'Department',
                'Supplier', 'Serial Number', 'Is Active', 'Notes'
            ];
            
            const rows = assets.map(asset => [
                asset.asset_code,
                asset.unique_identifier,
                asset.asset_name,
                asset.category,
                asset.acquisition_date,
                asset.commencement_date,
                asset.acquisition_cost,
                asset.salvage_value,
                asset.useful_life_months,
                asset.depreciation_method,
                asset.current_book_value,
                asset.accumulated_depreciation,
                asset.status,
                asset.location_state || '',
                asset.location_lga || '',
                asset.location_ward || '',
                asset.department_name || '',
                asset.supplier || '',
                asset.serial_number || '',
                asset.is_active ? 'Yes' : 'No',
                asset.notes || ''
            ]);
            
            const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `assets_export_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            
            toast({ title: "Export Successful", description: `${assets.length} assets exported.` });
        } catch (error: any) {
            toast({ title: "Export Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const resetAssetForm = () => {
        setNewAsset({
            asset_name: '',
            category: 'Equipment',
            acquisition_date: new Date().toISOString().split('T')[0],
            commencement_date: new Date().toISOString().split('T')[0],
            acquisition_cost: 0,
            salvage_value: 0,
            useful_life_months: 60,
            depreciation_method: 'straight_line',
            reducing_balance_rate: 200,
            total_units_capacity: 0,
            location_state: '',
            location_lga: '',
            location_ward: '',
            department_id: '',
            supplier: '',
            serial_number: '',
            notes: '',
            asset_account_code: '',
            accumulated_depreciation_account_code: '',
            depreciation_expense_account_code: ''
        });
        setCreatedAsset(null);
        setPreviewIdentifier('');
    };

    const getDepreciationMethodLabel = (method: string) => {
        switch (method) {
            case 'straight_line': return 'Straight Line';
            case 'reducing_balance': return 'Reducing Balance';
            case 'units_of_production': return 'Units of Production';
            default: return method;
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
        setEditingAsset(null);
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
        setDeletingAsset(null);
    } catch (error: any) {
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
};
    const getStatusBadge = (status: string, isActive: boolean) => {
        if (!isActive) return <Badge className="bg-gray-500">Inactive</Badge>;
        switch (status) {
            case 'active': return <Badge className="bg-green-500">Active</Badge>;
            case 'fully_depreciated': return <Badge className="bg-blue-500">Fully Depreciated</Badge>;
            case 'disposed': return <Badge className="bg-red-500">Disposed</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const activeAssets = assets.filter(a => a.status === 'active' && a.is_active === true);

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
                    <p className="text-muted-foreground">Manage your company's fixed assets, track depreciation, and generate QR codes.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={handleExportTemplate} disabled={isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Export Template'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} disabled={isImporting}>
                        <Upload className="mr-2 h-4 w-4" />
                        {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import Assets'}
                    </Button>
                    <Button variant="outline" onClick={handleExportAssets} disabled={isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Export Assets'}
                    </Button>
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

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                    <CardHeader className="pb-1 pt-3">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Total Assets</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">{assets.length}</div>
                        <p className="text-xs text-muted-foreground">Active: {activeAssets.length}</p>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                    <CardHeader className="pb-1 pt-3">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Total Cost</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-sm font-bold truncate">
                            ₦{assets.reduce((sum, a) => sum + a.acquisition_cost, 0).toLocaleString('en-NG')}
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                    <CardHeader className="pb-1 pt-3">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Accumulated Depreciation</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-sm font-bold text-red-600 truncate">
                            ₦{assets.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0).toLocaleString('en-NG')}
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                    <CardHeader className="pb-1 pt-3">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Current Book Value</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-sm font-bold text-green-600 truncate">
                            ₦{assets.reduce((sum, a) => sum + (a.current_book_value || 0), 0).toLocaleString('en-NG')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                    <CardHeader className="pb-1 pt-3">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Active QR Codes</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="text-2xl font-bold">{assets.filter(a => a.is_active).length}</div>
                        <p className="text-xs text-muted-foreground">Assets with QR</p>
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
                            <CardDescription>View and manage all fixed assets. Toggle active status, view QR codes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset Code</TableHead>
                                        <TableHead>Unique ID</TableHead>
                                        <TableHead>Asset Name</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Acquisition Cost</TableHead>
                                        <TableHead>Current Book Value</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Active</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assets.map(asset => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-mono text-xs">{asset.asset_code || '-'}</TableCell>
                                            <TableCell className="font-mono text-xs">{asset.unique_identifier || '-'}</TableCell>
                                            <TableCell className="font-medium">{asset.asset_name}</TableCell>
                                            <TableCell>{asset.location_state || '-'}{asset.location_lga ? `, ${asset.location_lga}` : ''}</TableCell>
                                            <TableCell>{asset.department_name || '-'}</TableCell>
                                            <TableCell>₦{asset.acquisition_cost.toLocaleString('en-NG')}</TableCell>
                                            <TableCell>₦{asset.current_book_value.toLocaleString('en-NG')}</TableCell>
                                            <TableCell>{getStatusBadge(asset.status, asset.is_active)}</TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleToggleActive(asset)}
                                                    className={asset.is_active ? 'text-green-600' : 'text-gray-400'}
                                                >
                                                    {asset.is_active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => { setQrCodeAsset(asset); setIsQRCodeDialogOpen(true); }}>
                                                    <QrCode className="h-4 w-4" />
                                                </Button>
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
                                            <TableCell colSpan={10} className="text-center h-24">
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
                                        <TableHead>Unique ID</TableHead>
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
                                                <TableCell className="font-mono text-xs">{asset?.unique_identifier || '-'}</TableCell>
                                                <TableCell className="capitalize">{entry.period_type}</TableCell>
                                                <TableCell className="text-red-600">₦{entry.depreciation_amount.toLocaleString('en-NG')}</TableCell>
                                                <TableCell>₦{entry.accumulated_depreciation.toLocaleString('en-NG')}</TableCell>
                                                <TableCell>₦{entry.book_value_after.toLocaleString('en-NG')}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {depreciationEntries.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
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
                                                    ₦{monthlyDep.toLocaleString('en-NG')}/month
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
                                            if (!acc[category]) acc[category] = { cost: 0, bookValue: 0, count: 0 };
                                            acc[category].cost += asset.acquisition_cost;
                                            acc[category].bookValue += asset.current_book_value;
                                            acc[category].count++;
                                            return acc;
                                        }, {} as Record<string, { cost: number; bookValue: number; count: number }>)
                                    ).map(([category, values]) => (
                                        <div key={category} className="flex justify-between text-sm">
                                            <span>{category} ({values.count})</span>
                                            <div className="text-right">
                                                <div>₦{values.cost.toLocaleString('en-NG')}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Book: ₦{values.bookValue.toLocaleString('en-NG')}
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

            {/* ADD ASSET DIALOG */}
            <Dialog open={isAssetDialogOpen} onOpenChange={(open) => {
                setIsAssetDialogOpen(open);
                if (!open) resetAssetForm();
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Fixed Asset</DialogTitle>
                        <DialogDescription>Enter asset details. Location and Department will generate a unique identifier.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Asset Name *</Label>
                                <Input 
                                    placeholder="e.g., Toyota Camry 2024"
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

                        {/* Location Section */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold text-md mb-3 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Asset Location
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>State *</Label>
                                    <Select 
                                        value={newAsset.location_state} 
                                        onValueChange={v => setNewAsset({...newAsset, location_state: v, location_lga: '', location_ward: ''})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select State" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {NIGERIAN_STATES.map(state => (
                                                <SelectItem key={state} value={state}>{state}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>LGA *</Label>
                                    <Select 
                                        value={newAsset.location_lga} 
                                        onValueChange={v => setNewAsset({...newAsset, location_lga: v})}
                                        disabled={!newAsset.location_state}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select LGA" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableLGAs.map(lga => (
                                                <SelectItem key={lga} value={lga}>{lga}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ward</Label>
                                    <Input 
                                        placeholder="Ward (optional)"
                                        value={newAsset.location_ward}
                                        onChange={e => setNewAsset({...newAsset, location_ward: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Department Selection */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Department / Unit *
                            </Label>
                            <Select 
                                value={newAsset.department_id} 
                                onValueChange={v => setNewAsset({...newAsset, department_id: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(dept => (
                                        <SelectItem key={dept.id} value={dept.id}>{dept.dept_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preview Unique Identifier */}
                        {previewIdentifier && (
                            <Alert className="bg-blue-50 border-blue-200">
                                <Hash className="h-4 w-4 text-blue-600" />
                                <AlertDescription className="text-blue-800">
                                    <strong>Preview Unique Identifier:</strong> {previewIdentifier}
                                    <p className="text-xs mt-1">Format: COMPANY-STATE-LGA-DEPT-000001</p>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Acquisition Date *
                                </Label>
                                <Input 
                                    type="date"
                                    value={newAsset.acquisition_date}
                                    onChange={e => setNewAsset({...newAsset, acquisition_date: e.target.value})}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Date of purchase/invoice</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <CalendarIcon className="h-4 w-4" />
                                    Commencement Date *
                                </Label>
                                <Input 
                                    type="date"
                                    value={newAsset.commencement_date}
                                    onChange={e => setNewAsset({...newAsset, commencement_date: e.target.value})}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Date asset started being used</p>
                            </div>
                        </div>

                        {/* Financial Information */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Acquisition Cost (₦) *</Label>
                                <Input 
                                    type="number"
                                    placeholder="0.00"
                                    value={newAsset.acquisition_cost}
                                    onChange={e => setNewAsset({...newAsset, acquisition_cost: parseFloat(e.target.value) || 0})}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Salvage Value (₦)</Label>
                                <Input 
                                    type="number"
                                    placeholder="0.00"
                                    value={newAsset.salvage_value}
                                    onChange={e => setNewAsset({...newAsset, salvage_value: parseFloat(e.target.value) || 0})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Useful Life (months) *</Label>
                                <Input 
                                    type="number"
                                    placeholder="60"
                                    value={newAsset.useful_life_months}
                                    onChange={e => setNewAsset({...newAsset, useful_life_months: parseInt(e.target.value) || 0})}
                                    required
                                />
                            </div>
                        </div>

                        {/* Depreciation Method */}
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

                        {/* Chart of Accounts Selection */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold text-md mb-3">Chart of Accounts Mapping</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Asset Account *</Label>
                                    <Select 
                                        value={newAsset.asset_account_code} 
                                        onValueChange={v => setNewAsset({...newAsset, asset_account_code: v})}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select asset account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assetAccounts.map(acc => (
                                                <SelectItem key={acc.account_code} value={acc.account_code}>
                                                    {acc.account_code} - {acc.account_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Accumulated Depreciation Account *</Label>
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
                                </div>
                                <div className="space-y-2">
                                    <Label>Depreciation Expense Account *</Label>
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
                                </div>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Supplier/Vendor</Label>
                                <Input 
                                    placeholder="Supplier name"
                                    value={newAsset.supplier}
                                    onChange={e => setNewAsset({...newAsset, supplier: e.target.value})}
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
                                    <strong>Asset Code:</strong> {createdAsset.asset_code}<br />
                                    <strong>Unique Identifier:</strong> {createdAsset.unique_identifier}
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

            {/* QR CODE DIALOG */}
            <Dialog open={isQRCodeDialogOpen} onOpenChange={setIsQRCodeDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Asset QR Code</DialogTitle>
                        <DialogDescription>Scan this QR code to view asset details.</DialogDescription>
                    </DialogHeader>
                    {qrCodeAsset && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <div className="bg-white p-4 rounded-lg">
                                <QRCode 
                                    value={`https://my.clearbook.africa/assets/${qrCodeAsset.id}`}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <div className="text-center">
                                <p className="font-bold">{qrCodeAsset.asset_name}</p>
                                <p className="text-sm text-muted-foreground font-mono">{qrCodeAsset.unique_identifier}</p>
                                <p className="text-xs text-muted-foreground mt-2">Scan to view asset details and depreciation schedule</p>
                            </div>
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    const canvas = document.querySelector('canvas');
                                    if (canvas) {
                                        const link = document.createElement('a');
                                        link.download = `qr_${qrCodeAsset.asset_code}.png`;
                                        link.href = canvas.toDataURL();
                                        link.click();
                                    }
                                }}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download QR Code
                            </Button>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild><Button>Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* IMPORT DIALOG */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Assets</DialogTitle>
                        <DialogDescription>Upload a CSV file to bulk import assets.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Please use the template format. First download the template using "Export Template" button.
                            </AlertDescription>
                        </Alert>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>CSV File</Label>
                            <Input 
                                type="file" 
                                accept=".csv"
                                onChange={handleImportAssets}
                                disabled={isImporting}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
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
                    {/* ... keep existing run depreciation content ... */}
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
                                    <Label className="text-muted-foreground">Unique Identifier</Label>
                                    <p className="font-mono">{selectedAsset.unique_identifier || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <p>{getStatusBadge(selectedAsset.status, selectedAsset.is_active)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Active</Label>
                                    <p>{selectedAsset.is_active ? 'Yes' : 'No'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Location</Label>
                                    <p>{selectedAsset.location_state || '-'}{selectedAsset.location_lga ? `, ${selectedAsset.location_lga}` : ''}{selectedAsset.location_ward ? `, ${selectedAsset.location_ward}` : ''}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Department</Label>
                                    <p>{selectedAsset.department_name || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Acquisition Date</Label>
                                    <p>{new Date(selectedAsset.acquisition_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Commencement Date</Label>
                                    <p>{new Date(selectedAsset.commencement_date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Acquisition Cost</Label>
                                    <p className="font-semibold">₦{selectedAsset.acquisition_cost.toLocaleString('en-NG')}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Salvage Value</Label>
                                    <p>₦{selectedAsset.salvage_value.toLocaleString('en-NG')}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Useful Life</Label>
                                    <p>{selectedAsset.useful_life_months} months ({Math.floor(selectedAsset.useful_life_months / 12)} years)</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Depreciation Method</Label>
                                    <p>{getDepreciationMethodLabel(selectedAsset.depreciation_method)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Accumulated Depreciation</Label>
                                    <p className="text-red-600">₦{selectedAsset.accumulated_depreciation?.toLocaleString('en-NG') || '0'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Current Book Value</Label>
                                    <p className="text-green-600 font-bold">₦{selectedAsset.current_book_value?.toLocaleString('en-NG')}</p>
                                </div>
                            </div>
                            {selectedAsset.notes && (
                                <div>
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <p className="text-sm">{selectedAsset.notes}</p>
                                </div>
                            )}
                            {selectedAsset.qr_code_url && (
                                <div className="flex justify-center pt-4">
                                    <img src={selectedAsset.qr_code_url} alt="QR Code" className="w-32 h-32" />
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
                                            <SelectItem value="inactive">Inactive</SelectItem>
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
