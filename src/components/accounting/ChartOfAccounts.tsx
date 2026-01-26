'use client';
import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Upload, Download, Save, AlertTriangle } from 'lucide-react';
import { defaultChartOfAccounts, defaultInventoryCategoryMap } from '@/lib/default-accounting-data';

// Types based on the new schema
interface Account {
    account_code: string;
    account_name: string;
    account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'COGS';
    system_role?: string | null;
    parent_account_code?: string | null;
    is_control_account: boolean;
    is_active: boolean;
}

interface InventoryMap {
    category_name: string;
    system_role: string;
}

// Helper to convert array of arrays to array of objects
const arrayToObject = (data: any[], keys: string[]) => {
    return data.map(row => {
        const obj: any = {};
        keys.forEach((key, i) => {
            obj[key] = row[i] !== undefined ? row[i] : null;
            // Convert boolean-like values
            if (obj[key] === '1' || obj[key] === 'TRUE') obj[key] = true;
            if (obj[key] === '0' || obj[key] === 'FALSE') obj[key] = false;
        });
        return obj;
    });
};

const ChartOfAccounts = () => {
    const { toast } = useToast();
    const { user } = useAuth();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [inventoryMap, setInventoryMap] = useState<InventoryMap[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [activeCoaTab, setActiveCoaTab] = useState('chartOfAccounts');

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [coaRes, invMapRes] = await Promise.all([
                fetch(`https://hariindustries.net/api/clearbook/coa.php?company_id=${user.company_id}`),
                fetch(`https://hariindustries.net/api/clearbook/inventory-map.php?company_id=${user.company_id}`)
            ]);

            const coaData = await coaRes.json();
            const invMapData = await invMapRes.json();

            if (coaData && coaData.length > 0) {
                setAccounts(coaData);
            } else {
                setAccounts(defaultChartOfAccounts);
            }

            if (invMapData && invMapData.length > 0) {
                setInventoryMap(invMapData);
            } else {
                setInventoryMap(defaultInventoryCategoryMap);
            }

        } catch (error) {
            toast({ title: "Error Fetching Data", description: "Could not load accounting settings. Displaying default templates.", variant: "destructive" });
            setAccounts(defaultChartOfAccounts);
            setInventoryMap(defaultInventoryCategoryMap);
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDownloadTemplate = (type: 'coa' | 'inventory') => {
        if (!user) return;

        let data, filename, headers;

        if (type === 'coa') {
            data = defaultChartOfAccounts.map(a => ({...a, company_id: user.company_id }));
            filename = "clearbook_coa_template.xlsx";
            headers = ['company_id', 'account_code', 'account_name', 'account_type', 'system_role', 'parent_account_code', 'is_control_account', 'is_active'];
        } else {
            data = defaultInventoryCategoryMap.map(m => ({...m, company_id: user.company_id }));
            filename = "clearbook_inventory_map_template.xlsx";
            headers = ['company_id', 'category_name', 'system_role'];
        }

        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, filename);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'coa' | 'inventory') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Remove header row
            json.shift();

            try {
                if (type === 'coa') {
                    const coaKeys = ['company_id', 'account_code', 'account_name', 'account_type', 'system_role', 'parent_account_code', 'is_control_account', 'is_active'];
                    const newAccounts = arrayToObject(json, coaKeys) as Account[];
                    setAccounts(newAccounts);
                } else {
                    const invKeys = ['company_id', 'category_name', 'system_role'];
                    const newMappings = arrayToObject(json, invKeys) as InventoryMap[];
                    setInventoryMap(newMappings);
                }
                toast({ title: "Upload Successful", description: "Data has been loaded into the table. Review and save your changes." });
            } catch (error) {
                toast({ title: "Upload Failed", description: "The file format is incorrect. Please use the template.", variant: "destructive" });
            }
        };
        reader.readAsBinaryString(file);
        event.target.value = ''; // Reset file input
    };
    
    const handleSaveChanges = async () => {
        if (!user) return;
        setIsSaving(true);

        const payload = activeCoaTab === 'chartOfAccounts' 
            ? { accounts: accounts }
            : { mappings: inventoryMap };
        
        const endpoint = activeCoaTab === 'chartOfAccounts'
            ? `https://hariindustries.net/api/clearbook/coa.php?company_id=${user.company_id}`
            : `https://hariindustries.net/api/clearbook/inventory-map.php?company_id=${user.company_id}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'An unknown error occurred.');
            }

            toast({ title: "Save Successful", description: "Your changes have been saved to the database." });
        } catch (error: any) {
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/> <span className='ml-2'>Loading accounting settings...</span></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Accounting Setup</CardTitle>
                        <CardDescription>Manage your Chart of Accounts and Inventory Category Mappings.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleSaveChanges} disabled={isSaving}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : `Save ${activeCoaTab === 'chartOfAccounts' ? 'COA' : 'Map'}`}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="flex border-b mb-4">
                    <button 
                        className={`px-4 py-2 text-sm font-medium ${activeCoaTab === 'chartOfAccounts' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveCoaTab('chartOfAccounts')}>
                        Chart of Accounts
                    </button>
                    <button 
                        className={`px-4 py-2 text-sm font-medium ${activeCoaTab === 'inventoryCategory' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setActiveCoaTab('inventoryCategory')}>
                        Inventory Category Map
                    </button>
                </div>

                {activeCoaTab === 'chartOfAccounts' ? (
                    <CoaTable 
                        accounts={accounts} 
                        onUpload={(e) => handleFileUpload(e, 'coa')} 
                        onDownload={() => handleDownloadTemplate('coa')} 
                    />
                ) : (
                    <InventoryMapTable 
                        mappings={inventoryMap} 
                        onUpload={(e) => handleFileUpload(e, 'inventory')} 
                        onDownload={() => handleDownloadTemplate('inventory')} 
                    />
                )}
            </CardContent>
        </Card>
    );
};

// Sub-component for COA Table
const CoaTable = ({ accounts, onUpload, onDownload }: any) => (
    <div>
        <div className="flex justify-end gap-2 mb-4">
            <Button onClick={onDownload} variant="outline"><Download className="h-4 w-4 mr-2"/>Download Template</Button>
            <Button asChild variant="outline">
                <label htmlFor="coa-upload"><Upload className="h-4 w-4 mr-2"/>Upload XLSX</label>
            </Button>
            <Input id="coa-upload" type="file" accept=".xlsx" onChange={onUpload} className="hidden"/>
        </div>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Parent Account</TableHead>
                        <TableHead>System Role</TableHead>
                        <TableHead>Control Acc</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {accounts.map((acc: Account) => (
                        <TableRow key={acc.account_code}>
                            <TableCell className="font-mono text-xs">{acc.account_code}</TableCell>
                            <TableCell>{acc.account_name}</TableCell>
                            <TableCell>{acc.account_type}</TableCell>
                            <TableCell className="font-mono text-xs">{acc.parent_account_code}</TableCell>
                            <TableCell>{acc.system_role}</TableCell>
                            <TableCell>{acc.is_control_account ? 'Yes' : 'No'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
);

// Sub-component for Inventory Map Table
const InventoryMapTable = ({ mappings, onUpload, onDownload }: any) => (
    <div>
        <div className="flex justify-end gap-2 mb-4">
            <Button onClick={onDownload} variant="outline"><Download className="h-4 w-4 mr-2"/>Download Template</Button>
            <Button asChild variant="outline">
                <label htmlFor="inv-map-upload"><Upload className="h-4 w-4 mr-2"/>Upload XLSX</label>
            </Button>
            <Input id="inv-map-upload" type="file" accept=".xlsx" onChange={onUpload} className="hidden"/>
        </div>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>System Role</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mappings.map((map: InventoryMap, index: number) => (
                    <TableRow key={index}>
                        <TableCell>{map.category_name}</TableCell>
                        <TableCell>{map.system_role}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);


export default ChartOfAccounts;
