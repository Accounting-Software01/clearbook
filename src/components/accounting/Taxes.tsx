'use client';

import { useState, useEffect, FormEvent } from 'react';
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { chartOfAccounts } from '@/lib/chart-of-accounts';

interface TaxConfig {
    id: string;
    tax_name: string;
    tax_rate: number;
    tax_type: 'VAT' | 'WHT';
    payable_account_code: string;
    payable_account_name: string;
}

// Filter for liability accounts for tax payables
const liabilityAccounts = chartOfAccounts.filter(account => account.type === 'Liability');

const Taxes = () => {
    const { user } = useAuth();
    const [configs, setConfigs] = useState<TaxConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<TaxConfig | null>(null);

    const [taxName, setTaxName] = useState('');
    const [taxRate, setTaxRate] = useState(0);
    const [taxType, setTaxType] = useState<'VAT' | 'WHT'>('VAT');
    const [payableAccount, setPayableAccount] = useState('');

    const { toast } = useToast();

    useEffect(() => {
        const fetchTaxConfigs = async () => {
            if (!user?.company_id) return;
            setIsLoading(true);
            try {
                // This endpoint needs to be created.
                const response = await fetch(`https://hariindustries.net/api/get_tax_configs.php?company_id=${user.company_id}`);
                if (!response.ok) throw new Error('Failed to fetch tax configurations.');
                const data = await response.json();
                setConfigs(data);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error", description: error.message });
                setConfigs([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTaxConfigs();
    }, [user, toast]);

    const handleEdit = (config: TaxConfig) => {
        setEditingConfig(config);
        setTaxName(config.tax_name);
        setTaxRate(config.tax_rate);
        setTaxType(config.tax_type);
        setPayableAccount(config.payable_account_code);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setEditingConfig(null);
        setTaxName('');
        setTaxRate(0);
        setTaxType('VAT');
        setPayableAccount('');
        setDialogOpen(false);
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !payableAccount) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select a Payable Account." });
            return;
        }

        setIsSaving(true);
        const configData = {
            company_id: user.company_id,
            tax_name: taxName,
            tax_rate: taxRate,
            tax_type: taxType,
            payable_account_code: payableAccount,
            id: editingConfig?.id
        };

        try {
            // This endpoint needs to be created for create/update
            const response = await fetch('https://hariindustries.net/api/save_tax_config.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save tax configuration.');
            }
            
            const accountName = liabilityAccounts.find(acc => acc.code === payableAccount)?.name || '';

            if (editingConfig) {
                setConfigs(configs.map(conf => conf.id === editingConfig.id ? { ...conf, ...configData, payable_account_name: accountName } : conf));
            } else {
                setConfigs([...configs, { ...configData, id: result.newId, payable_account_name: accountName }]);
            }

            toast({ title: "Success!", description: `Tax configuration has been ${editingConfig ? 'updated' : 'added'}.` });
            handleCloseDialog();

        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Tax Settings</CardTitle>
                        <CardDescription>Configure VAT, withholding tax, and other tax settings.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add Tax Config</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>{editingConfig ? 'Edit' : 'Add'} Tax Configuration</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="taxName" className="text-right">Tax Name</Label>
                                        <Input id="taxName" value={taxName} onChange={(e) => setTaxName(e.target.value)} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="taxRate" className="text-right">Tax Rate (%)</Label>
                                        <Input id="taxRate" type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="taxType" className="text-right">Tax Type</Label>
                                        <Select onValueChange={(value: 'VAT' | 'WHT') => setTaxType(value)} value={taxType}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select a type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VAT">VAT (Value Added Tax)</SelectItem>
                                                <SelectItem value="WHT">WHT (Withholding Tax)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="payableAccount" className="text-right">Payable Account</Label>
                                        <Select onValueChange={setPayableAccount} value={payableAccount}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select a liability account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {liabilityAccounts.map(account => (
                                                    <SelectItem key={account.code} value={account.code}>
                                                        {account.name} ({account.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Config'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tax Name</TableHead>
                                    <TableHead>Tax Rate</TableHead>
                                    <TableHead>Tax Type</TableHead>
                                    <TableHead>Payable Account</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {configs.map((config) => (
                                    <TableRow key={config.id}>
                                        <TableCell>{config.tax_name}</TableCell>
                                        <TableCell>{config.tax_rate}%</TableCell>
                                        <TableCell>{config.tax_type}</TableCell>
                                        <TableCell>{config.payable_account_name} ({config.payable_account_code})</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(config)}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default Taxes;
