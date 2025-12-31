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
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';

interface TaxAuthority {
    id: string;
    name: string;
    short_name?: string;
    authority_type: 'Federal' | 'State' | 'Local' | 'Regulatory' | 'Other';
    jurisdiction: 'Federal' | 'State' | 'Local';
    tax_id?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    default_tax_rate?: number;
    status: 'active' | 'inactive';
    notes?: string;
}

const TaxAuthorities = () => {
    const { user } = useAuth();
    const [authorities, setAuthorities] = useState<TaxAuthority[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingAuthority, setEditingAuthority] = useState<TaxAuthority | null>(null);

    // Form state
    const [formState, setFormState] = useState<Partial<TaxAuthority>>({
        name: '',
        short_name: '',
        authority_type: 'Federal',
        jurisdiction: 'Federal',
        tax_id: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        default_tax_rate: 0,
        status: 'active',
        notes: ''
    });

    const { toast } = useToast();

    useEffect(() => {
        const fetchAuthorities = async () => {
            if (!user?.company_id) return;
            setIsLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get_tax_authorities.php?company_id=${user.company_id}`);
                if (!response.ok) throw new Error('Failed to fetch tax authorities.');
                const data = await response.json();
                setAuthorities(data.tax_authorities || []);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error", description: error.message });
                setAuthorities([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAuthorities();
    }, [user, toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = (authority: TaxAuthority) => {
        setEditingAuthority(authority);
        setFormState(authority);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setEditingAuthority(null);
        setFormState({
            name: '',
            short_name: '',
            authority_type: 'Federal',
            jurisdiction: 'Federal',
            status: 'active',
        });
        setDialogOpen(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSaving(true);

        const authorityData = {
            ...formState,
            company_id: user.company_id,
            id: editingAuthority?.id
        };

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/save_tax_authority.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authorityData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save authority.');
            
            if (editingAuthority) {
                setAuthorities(authorities.map(auth => auth.id === editingAuthority.id ? { ...auth, ...formState } as TaxAuthority : auth));
            } else {
                setAuthorities([...authorities, { ...formState, id: result.newId } as TaxAuthority]);
            }
            toast({ title: "Success!", description: `Tax authority has been ${editingAuthority ? 'updated' : 'added'}.` });
            handleCloseDialog();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Tax Authorities</CardTitle>
                    <CardDescription>Manage regulatory bodies and government agencies.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" />Add Authority</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader><DialogTitle>{editingAuthority ? 'Edit' : 'Add'} Tax Authority</DialogTitle></DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input id="name" name="name" value={formState.name} onChange={handleInputChange} className="col-span-3" required />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="short_name" className="text-right">Short Name</Label>
                                    <Input id="short_name" name="short_name" value={formState.short_name} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="authority_type" className="text-right">Authority Type</Label>
                                    <Select name="authority_type" onValueChange={(v) => handleSelectChange('authority_type', v)} value={formState.authority_type}>
                                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Federal">Federal</SelectItem>
                                            <SelectItem value="State">State</SelectItem>
                                            <SelectItem value="Local">Local</SelectItem>
                                            <SelectItem value="Regulatory">Regulatory</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="jurisdiction" className="text-right">Jurisdiction</Label>
                                    <Select name="jurisdiction" onValueChange={(v) => handleSelectChange('jurisdiction', v)} value={formState.jurisdiction}>
                                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Federal">Federal</SelectItem>
                                            <SelectItem value="State">State</SelectItem>
                                            <SelectItem value="Local">Local</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="tax_id" className="text-right">Tax ID</Label>
                                    <Input id="tax_id" name="tax_id" value={formState.tax_id} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="default_tax_rate" className="text-right">Default Rate (%)</Label>
                                    <Input id="default_tax_rate" name="default_tax_rate" type="number" value={formState.default_tax_rate} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="status" className="text-right">Status</Label>
                                    <Select name="status" onValueChange={(v) => handleSelectChange('status', v)} value={formState.status}>
                                        <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">Email</Label>
                                    <Input id="email" name="email" type="email" value={formState.email} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="phone" className="text-right">Phone</Label>
                                    <Input id="phone" name="phone" value={formState.phone} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="address" className="text-right pt-2">Address</Label>
                                    <Textarea id="address" name="address" value={formState.address} onChange={handleInputChange} className="col-span-3" />
                                </div>
                                <div className="grid grid-cols-4 items-start gap-4">
                                    <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                                    <Textarea id="notes" name="notes" value={formState.notes} onChange={handleInputChange} className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter className="pt-4">
                                <DialogClose asChild><Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Authority'}</Button>
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
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Jurisdiction</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {authorities.map((auth) => (
                                <TableRow key={auth.id}>
                                    <TableCell>{auth.name} {auth.short_name && `(${auth.short_name})`}</TableCell>
                                    <TableCell>{auth.authority_type}</TableCell>
                                    <TableCell>{auth.jurisdiction}</TableCell>
                                    <TableCell>{auth.status}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(auth)}><MoreHorizontal className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default TaxAuthorities;
