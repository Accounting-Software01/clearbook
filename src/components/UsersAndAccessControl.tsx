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
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// This should come from your user context or session
const MOCK_COMPANY_ID = 'CBI12345';

interface User {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
}

const statusVariant: { [key: string]: 'secondary' | 'outline' | 'destructive' | 'default' } = {
    Active: 'secondary',
    Pending: 'outline',
    Inactive: 'destructive',
};

const UsersAndAccessControl = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://your-api-domain.com/get_users.php?company_id=${MOCK_COMPANY_ID}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch users.');
                }
                const data = await response.json();
                setUsers(data);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error", description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [toast]);

    const handleInviteUser = async (e: FormEvent) => {
        e.preventDefault();
        setIsSendingInvite(true);
        try {
            const response = await fetch('http://your-api-domain.com/invite_user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole, company_id: MOCK_COMPANY_ID }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send invitation.');
            }

            setUsers(prevUsers => [...prevUsers, result.newUser]);
            toast({ title: "Success!", description: result.message });
            setInviteEmail('');
            setInviteRole('');
            setInviteDialogOpen(false);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Invite Failed", description: error.message });
        } finally {
            setIsSendingInvite(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Users & Roles</CardTitle>
                        <CardDescription>Invite and manage user access.</CardDescription>
                    </div>
                     <Dialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><UserPlus className="mr-2 h-4 w-4" />Invite User</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <form onSubmit={handleInviteUser}>
                                <DialogHeader>
                                    <DialogTitle>Invite a new user</DialogTitle>
                                    <DialogDescription>
                                        Enter the email and assign a role. They will get an email to set up their account.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="email" className="text-right">Email</Label>
                                        <Input id="email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" className="col-span-3" required />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="role" className="text-right">Role</Label>
                                        <Select value={inviteRole} onValueChange={setInviteRole} required>
                                            <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a role" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Admin">Admin</SelectItem>
                                                <SelectItem value="Manager">Manager</SelectItem>
                                                <SelectItem value="Accountant">Accountant</SelectItem>
                                                <SelectItem value="Staff">Staff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={isSendingInvite}>
                                        {isSendingInvite ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : 'Send Invitation'}
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
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.user_id}>
                                        <TableCell>
                                            <div className="font-medium">{user.full_name || 'Invited User'}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </TableCell>
                                        <TableCell>{user.role}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[user.status] || 'default'}>{user.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
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

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Roles & Permissions</CardTitle>
                    <CardDescription>Define roles and control what users can see or do.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">In-depth role and permission customization will be available here in a future update.</p>
                </CardContent>
            </Card>
        </>
    );
};

export default UsersAndAccessControl;
