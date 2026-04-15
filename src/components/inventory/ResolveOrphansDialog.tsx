'use client';

import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // CORRECT: Use the project's toast hook

export interface OrphanItem {
  id: string; 
  name: string; 
  item_type: 'product' | 'raw_material';
  account_code: string;
}

interface OrphanInputState {
  id: string;
  sku: string;
  unit_of_measure: string;
}

interface ResolveOrphansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orphans: OrphanItem[];
  companyId: string;
  onSuccess: () => void; 
}

export function ResolveOrphansDialog({
  open,
  onOpenChange,
  orphans,
  companyId,
  onSuccess,
}: ResolveOrphansDialogProps) {
  const { toast } = useToast(); // CORRECT: Instantiate the hook
  const [inputs, setInputs] = useState<Record<string, OrphanInputState>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (orphans) {
      const initialInputs = orphans.reduce((acc, orphan) => {
        acc[orphan.id] = {
          id: orphan.id,
          sku: '',
          unit_of_measure: '',
        };
        return acc;
      }, {} as Record<string, OrphanInputState>);
      setInputs(initialInputs);
    }
  }, [orphans]);

  const handleInputChange = (id: string, field: keyof Omit<OrphanInputState, 'id'>, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    // Basic validation
    for (const orphan of orphans) {
      const input = inputs[orphan.id];
      if (!input.sku || !input.unit_of_measure) {
        // CORRECT: Use the project's toast for errors
        toast({ variant: 'destructive', title: 'Missing Information', description: `Please fill in all fields for "${orphan.name.replace('[ORPHAN] ', '')}".` });
        return;
      }
    }

    setIsRegistering(true);

    const payload = {
        company_id: companyId,
        orphans_to_register: orphans.map(orphan => ({
            ...orphan,
            ...inputs[orphan.id],
            name: orphan.name.replace('[ORPHAN] ', '').replace(/Inventory - (Finished Goods )?/, ''),
        }))
    };
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bulk-register-orphans.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
          throw new Error(result.error || 'Failed to register items.');
      }

      // CORRECT: Use the project's toast for success
      toast({ title: 'Success', description: 'Orphaned items successfully registered!' });
      onSuccess();
      onOpenChange(false);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        // CORRECT: Use the project's toast for registration failures
        toast({ variant: 'destructive', title: 'Registration Failed', description: errorMessage });
    } finally {
        setIsRegistering(false);
    }
  };

  const finishedGoodsOrphans = orphans.filter((o) => o.item_type === 'product');
  const rawMaterialsOrphans = orphans.filter((o) => o.item_type === 'raw_material');
  
  const renderOrphanList = (list: OrphanItem[]) => (
    <div className="space-y-4">
      {list.map((orphan) => (
        <div key={orphan.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div className="sm:col-span-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {orphan.name.replace('[ORPHAN] ', '')}
            </label>
          </div>
          <Input
            placeholder="SKU"
            value={inputs[orphan.id]?.sku || ''}
            onChange={(e) => handleInputChange(orphan.id, 'sku', e.target.value)}
            disabled={isRegistering}
          />
          <Input
            placeholder="Unit of Measure (e.g., pcs, kg)"
            value={inputs[orphan.id]?.unit_of_measure || ''}
            onChange={(e) => handleInputChange(orphan.id, 'unit_of_measure', e.target.value)}
            disabled={isRegistering}
          />
        </div>
      ))}
    </div>
  );


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-amber-500" />
            Resolve Orphaned Accounts
          </DialogTitle>
          <DialogDescription>
            These accounts exist in your ledger but aren't registered as inventory items. 
            Provide the missing details to complete their registration.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 px-1 max-h-[60vh] overflow-y-auto">
          {finishedGoodsOrphans.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Finished Goods</CardTitle>
              </CardHeader>
              <CardContent>{renderOrphanList(finishedGoodsOrphans)}</CardContent>
            </Card>
          )}

          {rawMaterialsOrphans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Raw Materials</CardTitle>
              </CardHeader>
              <CardContent>{renderOrphanList(rawMaterialsOrphans)}</CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isRegistering}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isRegistering || orphans.length === 0}>
            {isRegistering ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering... </>
            ) : (
              'Register All Items'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
