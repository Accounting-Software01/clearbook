'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const staticModules = [
  { permission: 'view_dashboard', name: 'Dashboard' },
  { permission: 'manage_users', name: 'Users & Roles' },
  { permission: 'view_accounting', name: 'Accounting' },
  { permission: 'manage_settings', name: 'Settings' },
  { permission: 'view_production', name: 'Production' },
  { permission: 'view_inventory', name: 'Inventory' },
  { permission: 'view_procurement', name: 'Procurement' },
  { permission: 'view_sales', name: 'Sales' },
];

interface User {
  uid: string;
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

const areArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

const ManageUserPermissionsDialog = ({
  user,
  open,
  onOpenChange,
}: ManageUserPermissionsDialogProps) => {
  const { user: currentUser } = useAuth();
  const [modules] = useState<Module[]>(staticModules);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  const initialUserPermissions = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const userId = user?.uid;
  const companyId = currentUser?.company_id;

  useEffect(() => {
    let isCancelled = false;

    const fetchPermissions = async () => {
      if (!userId || !companyId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const permissionsRes = await fetch(
          `https://hariindustries.net/api/clearbook/get_user_permissions.php?user_id=${userId}&company_id=${companyId}`
        );
        if (!permissionsRes.ok) {
          throw new Error(`Server responded with status: ${permissionsRes.status}`);
        }
        const permissionsData = await permissionsRes.json();

        if (isCancelled) return;

        if (permissionsData.success) {
          const fetchedUserPermissions = permissionsData.user_permissions || [];
          const fetchedRolePermissions = permissionsData.role_permissions || [];
          
          // ✅ FINAL FIX: Create separate copies for state and the initial snapshot.
          setRolePermissions([...fetchedRolePermissions]);
          setUserPermissions([...fetchedUserPermissions]);
          initialUserPermissions.current = [...fetchedUserPermissions];

        } else {
          throw new Error(
            permissionsData.error || 'An unknown error occurred while fetching permissions.'
          );
        }
      } catch (error: any) { 
        if (isCancelled) return;
        toast({ variant: 'destructive', title: 'Error Loading Data', description: error.message });
        setRolePermissions([]);
        setUserPermissions([]);
        initialUserPermissions.current = [];
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    if (open) {
      fetchPermissions();
    } else {
      setRolePermissions([]);
      setUserPermissions([]);
      initialUserPermissions.current = [];
      setIsLoading(false);
      setIsSaving(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [userId, companyId, open, toast]);

  const handlePermissionChange = (permission: string) => {
    setUserPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };
  
  const hasChanges = useMemo(() => !areArraysEqual(initialUserPermissions.current, userPermissions), [
    userPermissions,
  ]);

  const effectivePermissions = useMemo(
    () => new Set([...rolePermissions, ...userPermissions]),
    [rolePermissions, userPermissions]
  );

  const handleSavePermissions = async () => {
    if (!userId || !companyId) return;
    if (!hasChanges) {
      toast({ title: 'No changes to save', description: "You haven't made any changes to the user's permissions." });
      return;
    }

    setIsSaving(true);
    try {
      const url = `https://hariindustries.net/api/clearbook/manage_user_permissions.php?user_id=${userId}&company_id=${companyId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: userPermissions,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Success!', description: 'User permissions updated successfully.' });
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to save permissions.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {user?.full_name || 'User'}</DialogTitle>
          <DialogDescription>
            Assign or revoke permissions. Role permissions are fixed.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 py-4">
            {modules.map((module) => {
              const hasRolePermission = rolePermissions.includes(module.permission);
              const isChecked = effectivePermissions.has(module.permission);

              return (
                <div key={module.permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={module.permission}
                    checked={isChecked}
                    onCheckedChange={() => handlePermissionChange(module.permission)}
                    disabled={hasRolePermission}
                  />
                  <Label
                    htmlFor={module.permission}
                    className={cn('font-normal', hasRolePermission && 'text-muted-foreground')}
                  >
                    {module.name}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSavePermissions} disabled={!hasChanges || isSaving || isLoading}>
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageUserPermissionsDialog;
