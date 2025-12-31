'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";

interface User {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
}

interface Module {
    permission: string;
    name: string;
}

interface ManageUserPermissionsDialogProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ManageUserPermissionsDialog = ({ user, open, onOpenChange }: ManageUserPermissionsDialogProps) => {
    const { user: currentUser } = useAuth();
    const [modules, setModules] = useState<Module[]>([]);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchModulesAndPermissions = async () => {
            if (!user || !currentUser?.company_id) return;

            setIsLoading(true);
            try {
                const [modulesRes, permissionsRes] = await Promise.all([
                    fetch(`/busa-api/database/get_modules.php`),
                    fetch(`/busa-api/database/get_user_permissions.php?user_id=${user.user_id}&company_id=${currentUser.company_id}`)
                ]);

                const modulesData = await modulesRes.json();
                const permissionsData = await permissionsRes.json();

                if (modulesData.success) setModules(modulesData.modules);
                if (permissionsData.success) {
                    setRolePermissions(permissionsData.role_permissions);
                    setUserPermissions(permissionsData.user_permissions);
                }

            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Failed to fetch permissions data." });
            } finally {
                setIsLoading(false);
            }
        };

        if (open) {
            fetchModulesAndPermissions();
        }
    }, [user, open, currentUser, toast]);

    const handlePermissionChange = (permission: string) => {
        setUserPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const handleSavePermissions = async () => {
        if (!user || !currentUser?.company_id) return;

        setIsSaving(true);
        try {
            const response = await fetch('/busa-api/database/manage_user_permissions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.user_id,
                    permissions: userPermissions,
                    company_id: currentUser.company_id
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({ title: "Success!", description: "User permissions updated successfully." });
                onOpenChange(false);
            } else {
                throw new Error(result.error || "Failed to save permissions.");
            }

        } catch (error: any) {
            toast({ variant: "destructive", title: "Save Failed", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Permissions for {user?.full_name}</DialogTitle>
                    <DialogDescription>
                        Assign or revoke permissions for this user. Permissions granted by the user's role cannot be changed here.
                    </DialogDescription>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {modules.map(module => {
                            const hasRolePermission = rolePermissions.includes(module.permission);
                            const hasUserPermission = userPermissions.includes(module.permission);
                            const isChecked = hasRolePermission || hasUserPermission;

                            return (
                                <div key={module.permission} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={module.permission}
                                        checked={isChecked}
                                        onCheckedChange={() => handlePermissionChange(module.permission)}
                                        disabled={hasRolePermission}
                                    />
                                    <Label htmlFor={module.permission} className={cn("font-normal", hasRolePermission && "text-muted-foreground")}>
                                        {module.name}
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSavePermissions} disabled={isSaving || isLoading}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ManageUserPermissionsDialog;
