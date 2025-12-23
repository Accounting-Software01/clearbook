'use client';
import React, { useState } from 'react';
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';

const ChartOfAccounts = () => {
    const [accounts, setAccounts] = useState<Account[]>(chartOfAccounts);
    const [newAccount, setNewAccount] = useState({ code: '', name: '', type: '' });
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddAccount = () => {
        if (newAccount.code && newAccount.name && newAccount.type) {
            const updatedAccounts = [...accounts, newAccount as Account];
            setAccounts(updatedAccounts);
            setIsDirty(true);
            toast({ title: "Account Added", description: "The new account has been added to the table. Click 'Save Changes' to make it permanent." });
            setNewAccount({ code: '', name: '', type: '' });
        } else {
            toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
        }
    };

    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,code,name,type\n";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "chart_of_accounts_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json<any>(worksheet);

            const validAccountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Other'];
            const isValid = json.length > 0 && json.every(
                (row: any) =>
                    row.code &&
                    row.name &&
                    row.type &&
                    validAccountTypes.includes(row.type)
            );

            if (!isValid) {
                toast({
                    title: "Invalid File Format",
                    description: "The file must have columns 'code', 'name', and a valid 'type' for each row.",
                    variant: "destructive",
                });
                return;
            }
            
            const newAccounts: Account[] = json.map(row => ({
                code: String(row.code),
                name: String(row.name),
                type: row.type
            }));
            
            setAccounts(newAccounts);
            setIsDirty(true);

            toast({
                title: "Data Loaded",
                description: "The new chart of accounts has been loaded into the table. Review and save your changes.",
            });
        };
        reader.readAsArrayBuffer(file);
        event.target.value = ''; // Reset file input
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/chart-of-accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accounts }),
            });

            if (!response.ok) {
                throw new Error('Failed to save changes');
            }

            toast({
                title: "Changes Saved",
                description: "Your chart of accounts has been updated successfully.",
            });
            setIsDirty(false);
        } catch (error) {
            toast({
                title: "Error Saving Changes",
                description: "Could not update the chart of accounts. Please check the console for details.",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Chart of Accounts</CardTitle>
                        <CardDescription>Manage your ledger accounts.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleDownloadTemplate} variant="outline">Download Template</Button>
                        <Button asChild variant="outline">
                           <label htmlFor="upload-csv">Upload CSV</label>
                        </Button>
                        <Input id="upload-csv" type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="hidden"/>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts.map((account) => (
                            <TableRow key={account.code}>
                                <TableCell>{account.code}</TableCell>
                                <TableCell>{account.name}</TableCell>
                                <TableCell>{account.type}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="flex gap-2 mt-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>Add New Account</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Account</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <Input
                                    placeholder="Account Code"
                                    value={newAccount.code}
                                    onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                                />
                                <Input
                                    placeholder="Account Name"
                                    value={newAccount.name}
                                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                />
                                <Select onValueChange={(value) => setNewAccount({ ...newAccount, type: value })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Asset">Asset</SelectItem>
                                        <SelectItem value="Liability">Liability</SelectItem>
                                        <SelectItem value="Equity">Equity</SelectItem>
                                        <SelectItem value="Revenue">Revenue</SelectItem>
                                        <SelectItem value="Expense">Expense</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                     <Button onClick={handleAddAccount}>Add Account</Button>
                                </DialogClose>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={handleSaveChanges} disabled={!isDirty || isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ChartOfAccounts;
