'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";

interface Role {
    role: string;
}

interface Module {
    permission: string;
    name: string;
}

const roleLabels: { [key: string]: string } = {
    admin: "Admin",
    accountant: "Accountant",
    production_manager: "Production Manager",
    store_manager: "Store Manager",
    procurement_manager: "Procurement Manager",
    sales_manager: "Sales Manager",
    staff: "Staff",
};

const RolesAndPermissions = () => {
    const { user: currentUser } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const isRoleAdmin = selectedRole === 'admin';

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser?.company_id) return;

            setIsLoading(true);
            try {
                const [rolesRes, modulesRes] = await Promise.all([
                    fetch(`https://hariindustries.net/api/clearbook/get_roles.php?company_type=${currentUser.company_type}`),
                    fetch(`https://hariindustries.net/api/clearbook/get_modules.php`)
                ]);

                const rolesData = await rolesRes.json();
                const modulesData = await modulesRes.json();

                if (rolesData.success) setRoles(rolesData.roles);
                if (modulesData.success) setModules(modulesData.modules);

            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Failed to fetch roles or modules." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentUser, toast]);

    useEffect(() => {
        // When the selected role is 'admin', automatically grant all permissions.
        if (isRoleAdmin) {
            setPermissions(modules.map(m => m.permission));
            return;
        }

        const fetchPermissions = async () => {
            if (!selectedRole || !currentUser?.company_id) return;

            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get_role_permissions.php?role=${selectedRole}&company_type=${currentUser.company_type}`);
                const data = await response.json();
                if (data.success) {
                    setPermissions(data.permissions.map((p: any) => p.permission));
                } else {
                    setPermissions([]); // Clear permissions if fetching fails or role has none
                }
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Failed to fetch permissions for the selected role." });
            }
        };

        fetchPermissions();
    }, [selectedRole, currentUser, toast, modules, isRoleAdmin]);

    const handlePermissionChange = (permission: string) => {
        // Prevent changes if the role is admin
        if (isRoleAdmin) return;

        setPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const handleSavePermissions = async () => {
        if (!selectedRole || !currentUser?.company_id || isRoleAdmin) return;

        setIsSaving(true);
        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/manage_role_permissions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: selectedRole,
                    permissions: permissions,
                    company_type: currentUser.company_type
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({ title: "Success!", description: "Permissions updated successfully." });
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
        <Card>
            <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>Define roles and control what users can see or do. The admin role has full access and cannot be edited.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                            <Label htmlFor="role-select" className="min-w-max">Select a role to manage:</Label>
                            <Select onValueChange={setSelectedRole} value={selectedRole}>
                                <SelectTrigger id="role-select" className="w-full max-w-xs">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role.role} value={role.role}>{roleLabels[role.role] || role.role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedRole && (
                            <div className="space-y-4 pt-4">
                                <h3 className="text-lg font-medium">Assign Modules to {selectedRole}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {modules.map(module => (
                                        <div key={module.permission} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={module.permission}
                                                checked={permissions.includes(module.permission)}
                                                onCheckedChange={() => handlePermissionChange(module.permission)}
                                                disabled={isRoleAdmin} // Disable checkbox for admin role
                                            />
                                            <Label htmlFor={module.permission} className={cn("font-normal", isRoleAdmin && "text-muted-foreground")}>{module.name}</Label>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button onClick={handleSavePermissions} disabled={isSaving || isRoleAdmin}>
                                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Permissions
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RolesAndPermissions;
