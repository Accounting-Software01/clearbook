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
import { UserPlus, MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import ManageUserPermissionsDialog from './ManageUserPermissionsDialog';

interface User {
    uid: string;
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
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('');
    const { toast } = useToast();

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isPermissionsDialogOpen, setPermissionsDialogOpen] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!currentUser?.company_id) return;

            setIsLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get_users.php?company_id=${currentUser.company_id}`);
                
                const responseText = await response.text();

                if (!response.ok) {
                    let errorMsg = `HTTP error! Status: ${response.status}`;
                    try {
                        const errorJson = JSON.parse(responseText);
                        errorMsg = errorJson.error || errorJson.message || errorMsg;
                    } catch(e) {
                        errorMsg = responseText.substring(0, 100) || errorMsg;
                    }
                    throw new Error(errorMsg);
                }

                const data = JSON.parse(responseText);

                if (data.success && Array.isArray(data.users)) {
                    setUsers(data.users);
                } else {
                    throw new Error(data.error || 'Received invalid data from server.');
                }
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error Fetching Users", description: error.message });
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [toast, currentUser]);

    const handleInviteUser = async (e: FormEvent) => {
        e.preventDefault();
        if (!currentUser?.company_id) return;

        setIsSendingInvite(true);
        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/invite_user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole, company_id: currentUser.company_id }),
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to send invitation.');
            }

            // Refetch users to show the new invitation
            const fetchUsersResponse = await fetch(`https://hariindustries.net/api/clearbook/get_users.php?company_id=${currentUser.company_id}`);
            const data = await fetchUsersResponse.json();
            if (data.success) {
                setUsers(data.users);
            }

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
    
    const handleUserUpdate = (updatedUser: User) => {
        setUsers(currentUsers =>
            currentUsers.map(u => (u.uid === updatedUser.uid ? updatedUser : u))
        );
    };

    const allRoles = [
        { value: "admin", label: "Admin" },
        { value: "accountant", label: "Accountant" },
        { value: "production_manager", label: "Production Manager" },
        { value: "store_manager", label: "Store Manager" },
        { value: "procurement_manager", label: "Procurement Manager" },
        { value: "sales_manager", label: "Sales Manager" },
        { value: "staff", label: "Staff" },
    ];

    const availableRoles = currentUser?.company_type === 'manufacturing'
        ? allRoles
        : allRoles.filter(r => ['admin', 'accountant', 'staff'].includes(r.value));


    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>Invite users and manage their roles & permissions.</CardDescription>
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
                                                {availableRoles.map(role => (
                                                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                                                ))}
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
                                    <TableRow key={user.uid}>
                                        <TableCell>
                                            <div className="font-medium">{user.full_name || 'Invited User'}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </TableCell>
                                        <TableCell>{user.role}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[user.status] || 'default'}>{user.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={user.role === 'admin'}>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedUser(user);
                                                        setPermissionsDialogOpen(true);
                                                    }}>
                                                        Manage Access
                                                    </DropdownMenuItem>
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

            <ManageUserPermissionsDialog
                user={selectedUser}
                open={isPermissionsDialogOpen}
                onOpenChange={setPermissionsDialogOpen}
                availableRoles={availableRoles}
                onUserUpdate={handleUserUpdate}
            />
        </>
    );
};

export default UsersAndAccessControl;
