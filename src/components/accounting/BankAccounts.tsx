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

interface BankAccount {
    id: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    currency: string;
    gl_account_name: string;
    gl_account_code: string;
}

// Filter for cash and bank accounts
const bankAndCashAccounts = chartOfAccounts.filter(account => 
    account.type === 'Asset' && (account.name.includes('Cash at Bank') || account.name.includes('Cash at Hand'))
);

const BankAccounts = () => {
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

    const [bankName, setBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [currency, setCurrency] = useState('');
    const [glAccount, setGlAccount] = useState('');

    const { toast } = useToast();

    useEffect(() => {
        const fetchBankAccounts = async () => {
            if (!user?.company_id) return;
            setIsLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get_bank_accounts.php?company_id=${user.company_id}`);
                if (!response.ok) throw new Error('Failed to fetch bank accounts.');
                const data = await response.json();
                if (data && Array.isArray(data.bank_accounts)) {
                    const accountsWithNames = data.bank_accounts.map((acc: any) => ({
                        ...acc,
                        gl_account_name: bankAndCashAccounts.find(coa => coa.code === acc.gl_account_code)?.name || 'N/A'
                    }));
                    setAccounts(accountsWithNames);
                } else {
                    setAccounts([]);
                }
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error", description: error.message });
                 setAccounts([]); // Set to empty array on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchBankAccounts();
    }, [user, toast]);

    const handleEdit = (account: BankAccount) => {
        setEditingAccount(account);
        setBankName(account.bank_name);
        setAccountName(account.account_name);
        setAccountNumber(account.account_number);
        setCurrency(account.currency);
        setGlAccount(account.gl_account_code);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setEditingAccount(null);
        setBankName('');
        setAccountName('');
        setAccountNumber('');
        setCurrency('');
        setGlAccount('');
        setDialogOpen(false);
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !glAccount) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select a GL Account." });
            return;
        }

        setIsSaving(true);
        const accountData = {
            company_id: user.company_id,
            bank_name: bankName,
            account_name: accountName,
            account_number: accountNumber,
            currency,
            gl_account_code: glAccount,
            id: editingAccount?.id
        };

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/save_bank_account.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accountData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save bank account.');
            }
            
            const glAccountName = bankAndCashAccounts.find(acc => acc.code === glAccount)?.name || '';

            if (editingAccount) {
                setAccounts(accounts.map(acc => acc.id === editingAccount.id ? { ...acc, ...accountData, gl_account_name: glAccountName } : acc));
            } else {
                setAccounts([...accounts, { ...accountData, id: result.newId, gl_account_name: glAccountName }]);
            }

            toast({ title: "Success!", description: `Bank account has been ${editingAccount ? 'updated' : 'added'}.` });
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
                        <CardTitle>Bank Accounts</CardTitle>
                        <CardDescription>Manage your company's bank accounts.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Add Bank Account</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>{editingAccount ? 'Edit' : 'Add'} Bank Account</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="bankName" className="text-right">Bank Name</Label>
                                        <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="accountName" className="text-right">Account Name</Label>
                                        <Input id="accountName" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="accountNumber" className="text-right">Account Number</Label>
                                        <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="col-span-3" required />
                                    </div>
                                     <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="currency" className="text-right">Currency</Label>
                                        <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="glAccount" className="text-right">GL Account</Label>
                                        <Select onValueChange={setGlAccount} value={glAccount}>
                                            <SelectTrigger className="col-span-3">
                                                <SelectValue placeholder="Select a GL account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {bankAndCashAccounts.map(account => (
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
                                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Account'}
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
                                    <TableHead>Bank Name</TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Account Number</TableHead>
                                    <TableHead>Currency</TableHead>
                                    <TableHead>GL Account</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell>{account.bank_name}</TableCell>
                                        <TableCell>{account.account_name}</TableCell>
                                        <TableCell>{account.account_number}</TableCell>
                                        <TableCell>{account.currency}</TableCell>
                                        <TableCell>{account.gl_account_name} ({account.gl_account_code})</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
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

export default BankAccounts;
