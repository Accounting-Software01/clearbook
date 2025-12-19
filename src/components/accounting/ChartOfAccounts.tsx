'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, MoreHorizontal, Loader2, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';

const statusVariant: { [key: string]: 'secondary' | 'destructive' } = {
    Active: 'secondary',
    Inactive: 'destructive',
};

const ChartOfAccounts = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isDeactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    
    const [currentAccount, setCurrentAccount] = useState<Partial<Account>>({});

    useEffect(() => {
        const fetchAccounts = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // Simulate fetching from a static list
                setAccounts(chartOfAccounts.sort((a, b) => a.code.localeCompare(b.code)));
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error Loading Accounts", description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchAccounts();
    }, [user, toast]);

    const resetCurrentAccount = () => setCurrentAccount({});

    const handleAddOrUpdateAccount = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
            return;
        }
        setIsSaving(true);
        const isUpdate = !!(currentAccount as any).account_id;
        const url = isUpdate ? 'https://hariindustries.net/clearbook/update_ledger_account.php' : 'https://hariindustries.net/clearbook/add_account.php';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...currentAccount, company_id: user.company_id, user_id: user.uid }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save account.');
            
            toast({ title: "Success!", description: `Account ${isUpdate ? 'updated' : 'created'} successfully.` });
            // await fetchAccounts();
            if (isUpdate) setEditDialogOpen(false); else setAddDialogOpen(false);
            resetCurrentAccount();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeactivateConfirm = async () => {
        if (!user || !(currentAccount as any).account_id) return;
        setIsSaving(true);
        try {
            const response = await fetch('https://hariindustries.net/clearbook/update_ledger_account.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_id: (currentAccount as any).account_id, company_id: user.company_id, status: 'Inactive', user_id: user.uid }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to deactivate account.');

            toast({ title: "Success!", description: "Account has been deactivated." });
            // await fetchAccounts();
            setDeactivateDialogOpen(false);
            resetCurrentAccount();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Deactivation Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const openEditDialog = (account: Account) => { setCurrentAccount(account); setEditDialogOpen(true); };
    const openDeactivateDialog = (account: Account) => { setCurrentAccount(account); setDeactivateDialogOpen(true); };

    const totalLoading = isLoading || isAuthLoading;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Chart of Accounts</CardTitle>
                        <CardDescription>Manage your company's ledger accounts.</CardDescription>
                    </div>
                     <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { setAddDialogOpen(isOpen); if (!isOpen) resetCurrentAccount(); }}>
                        <DialogTrigger asChild>
                             <Button disabled={totalLoading}><PlusCircle className="mr-2 h-4 w-4" />Add Account</Button>
                        </DialogTrigger>
                        <AccountFormDialog title="Create New Account" account={currentAccount} setAccount={setCurrentAccount} onSubmit={handleAddOrUpdateAccount} isSaving={isSaving} onClose={() => setAddDialogOpen(false)} />
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {totalLoading ? (
                        <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Number</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {accounts.map((account) => (
                                    <TableRow key={account.code}>
                                        <TableCell className="font-mono">{account.code}</TableCell>
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell>{account.type}</TableCell>
                                        <TableCell><Badge variant={statusVariant[('Active' as string)]}>Active</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(account)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openDeactivateDialog(account)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4"/>Deactivate</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setEditDialogOpen(isOpen); if (!isOpen) resetCurrentAccount(); }}>
                <AccountFormDialog title="Edit Account" account={currentAccount} setAccount={setCurrentAccount} onSubmit={handleAddOrUpdateAccount} isSaving={isSaving} onClose={() => setEditDialogOpen(false)} />
            </Dialog>

            <Dialog open={isDeactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                 <DialogContent>
                    <DialogHeader><DialogTitle>Are you sure?</DialogTitle></DialogHeader>
                    <p>Deactivating account "{currentAccount.name}" ({currentAccount.code}) is irreversible. Please confirm.</p>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button variant="destructive" onClick={handleDeactivateConfirm} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Deactivate'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

const AccountFormDialog = ({ title, account, setAccount, onSubmit, isSaving, onClose }: { title: string, account: Partial<Account>, setAccount: (a: Partial<Account>) => void, onSubmit: (e: FormEvent) => void, isSaving: boolean, onClose: () => void }) => {
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setAccount({ ...account, [e.target.id]: e.target.value });
    const handleSelectChange = (value: string) => setAccount({ ...account, type: value as any });

    return (
        <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={onSubmit}>
                <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Name</Label><Input id="name" value={account.name || ''} onChange={handleInputChange} className="col-span-3" required /></div>
                    <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="code" className="text-right">Number</Label><Input id="code" value={account.code || ''} onChange={handleInputChange} className="col-span-3" required /></div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Type</Label>
                        <Select value={account.type || ''} onValueChange={handleSelectChange} required>
                            <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Asset">Asset</SelectItem>
                                <SelectItem value="Liability">Liability</SelectItem>
                                <SelectItem value="Equity">Equity</SelectItem>
                                <SelectItem value="Revenue">Revenue</SelectItem>
                                <SelectItem value="Expense">Expense</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save'}</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

export default ChartOfAccounts;
