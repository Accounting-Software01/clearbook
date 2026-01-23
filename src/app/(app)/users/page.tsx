'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, UserCog } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import ManageUserPermissionsDialog from '@/components/ManageUserPermissionsDialog';

interface User {
    uid: string;
    full_name: string;
    email: string;
    role: string;
}

const UsersPage = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUsers = async () => {
            if (!currentUser?.company_id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get_users.php?company_id=${currentUser.company_id}`);

                if (!response.ok) {
                    let errorText = `HTTP error! status: ${response.status}`;
                    try {
                        const errorData = await response.json();
                        errorText = errorData.error || errorData.message || JSON.stringify(errorData);
                    } catch (jsonError) {
                        errorText = response.statusText;
                    }
                    throw new Error(errorText);
                }
                
                const data = await response.json();

                if (data.success && Array.isArray(data.users)) {
                    setUsers(data.users);
                } else {
                    throw new Error(data.error || "Failed to process user data.");
                }
            } catch (error: any) {
                toast({ variant: "destructive", title: "Error Fetching Users", description: error.message });
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [currentUser, toast]);

    const openDialog = (user: User) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    };

    return (
        <div className="p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Users</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="space-y-4">
                            {users.map(user => (
                                <div key={user.uid} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <p className="font-semibold">{user.full_name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                        <p className="text-sm text-muted-foreground">Role: {user.role}</p>
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => openDialog(user)}>
                                        <UserCog className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            {selectedUser && (
                <ManageUserPermissionsDialog
                    user={selectedUser}
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                />
            )}
        </div>
    );
};

export default UsersPage;
