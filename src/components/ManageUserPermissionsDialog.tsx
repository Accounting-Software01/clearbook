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
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { allNavItems } from '@/lib/nav-items';

const extractPermissions = (items: any[]) => {
    let permissions: { permission: string; name: string; }[] = [];
    items.forEach(item => {
        if (item.permission && item.label) {
            if (!permissions.some(p => p.permission === item.permission)) {
                 permissions.push({ permission: item.permission, name: item.label });
            }
        }
        if (item.subItems) {
            permissions = permissions.concat(extractPermissions(item.subItems));
        }
    });
    return [...new Map(permissions.map(item => [item['permission'], item])).values()];
};


interface User {
  uid: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
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
  const modules = useMemo(() => extractPermissions(allNavItems), []);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const initialUserPermissions = useRef<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const userId = user?.uid;
  const companyId = currentUser?.company_id;
  const [selectedRole, setSelectedRole] = useState('');

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
          const fetchedUserPermissions = permissionsData.permissions || [];
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
        setUserPermissions([]);
        initialUserPermissions.current = [];
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    if (open && user) { // Check for user here
      setSelectedRole(user.role); // Set the role when the dialog opens
      fetchPermissions();
    } else {
      setUserPermissions([]);
      setSelectedRole('');
      initialUserPermissions.current = [];
      setIsLoading(false);
  setIsSaving(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [userId, companyId, open, toast, user]); // Add 'user' to the dependency array

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

  const handleSavePermissions = async () => {
    if (!user || !currentUser?.company_id) {
        toast({ variant: 'destructive', title: 'Error', description: 'User or Company ID is missing. Cannot save.' });
        return;
    }
    
    if (!hasChanges) {
      toast({ title: 'No changes to save', description: "You haven't made any changes to the user's permissions." });
      return;
    }

    setIsSaving(true);
    try {
      const url = `https://hariindustries.net/api/clearbook/manage_user_permissions.php`;
      
      const payload = {
        user_id: user.uid,
        company_id: currentUser.company_id,
        permissions: userPermissions,
        role: selectedRole,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: 'Success!', description: 'User details updated successfully.' });
        // The ...user spread will now correctly include the status
        onUserUpdate({ ...user, role: selectedRole });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Permissions for {user?.full_name || 'User'}</DialogTitle>
          <DialogDescription>
            Select the modules this user has access to.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
            <ScrollArea className="h-72 w-full rounded-md border">
                 <div className="grid grid-cols-2 gap-4 p-4">
                    {modules.map((module) => (
                        <div key={module.permission} className="flex items-center space-x-2">
                        <Checkbox
                            id={module.permission}
                            checked={userPermissions.includes(module.permission)}
                            onCheckedChange={() => handlePermissionChange(module.permission)}
                        />
                        <Label
                            htmlFor={module.permission}
                            className={cn('font-normal')}
                        >
                            {module.name}
                        </Label>
                        </div>
                    ))}
                </div>
            </ScrollArea>
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
