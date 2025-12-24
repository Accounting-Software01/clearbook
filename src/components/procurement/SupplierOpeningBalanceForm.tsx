'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

// Match the full supplier type definition
interface Supplier {
  id: string;
  name: string;
  ap_account_id: string;
  company_id: string;
}

interface SupplierOpeningBalanceFormProps {
    supplier: { id: string, name: string }; // Initially we only get id and name
    onComplete: () => void;
}

export function SupplierOpeningBalanceForm({ supplier, onComplete }: SupplierOpeningBalanceFormProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingSupplier, setIsFetchingSupplier] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [supplierDetails, setSupplierDetails] = useState<Supplier | null>(null);
    const [openingBalanceAmount, setOpeningBalanceAmount] = useState(0);
    const [openingBalanceDate, setOpeningBalanceDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        if (!user || !supplier.id) return;

        const fetchSupplierDetails = async () => {
            setIsFetchingSupplier(true);
            try {
                // CORRECTED: Manually construct the query string for the GET request
                const endpoint = `supplier.php?id=${supplier.id}&company_id=${user.company_id}`;
                const details = await api<Supplier>(endpoint);
                setSupplierDetails(details);
            } catch (e: any) {
                setError(`Failed to fetch supplier details: ${e.message}`);
            } finally {
                setIsFetchingSupplier(false);
            }
        };

        fetchSupplierDetails();
    }, [supplier.id, user]);

    const handleSubmit = async () => {
        if (!user || !supplierDetails || !openingBalanceDate || openingBalanceAmount <= 0) {
            toast({
                title: "Validation Error",
                description: "Please fill in all fields and ensure the balance is positive.",
                variant: "destructive"
            });
            return;
        }
        setIsLoading(true);

        const payload = {
            company_id: user.company_id,
            user_id: user.uid,
            supplier_id: parseInt(supplierDetails.id, 10),
            ap_account_id: supplierDetails.ap_account_id,
            opening_balance_amount: openingBalanceAmount,
            opening_balance_date: openingBalanceDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
            notes: `Opening Balance for ${supplierDetails.name}`,
            entries: [
              {
                account_id: '300999', // Opening Balance Suspense Account
                debit: openingBalanceAmount,
                credit: 0,
                description: 'Supplier Opening Balance Offset'
              },
              {
                account_id: supplierDetails.ap_account_id,
                debit: 0,
                credit: openingBalanceAmount,
                description: `Opening Balance for Supplier #${supplierDetails.id}`,
                payee_id: parseInt(supplierDetails.id, 10),
                payee_type: 'supplier'
              }
            ]
        };

        try {
            await api('supplier-opening-balance.php', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            toast({ title: "Success", description: `Opening balance for ${supplier.name} posted successfully.` });
            onComplete();
        } catch (error: any) {
            toast({ title: "Error Posting Balance", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    if (isFetchingSupplier) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/> <span className='ml-2'>Loading supplier details...</span></div>;
    }

    if (error) {
        return <div className="flex flex-col items-center justify-center p-8 text-destructive"><AlertCircle className="h-8 w-8 mb-2" /><p>{error}</p></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add Opening Balance for {supplier.name}</CardTitle>
                <CardDescription>
                    Enter the outstanding amount owed to this supplier as of your accounting start date. This will create a journal entry crediting their Accounts Payable account.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="opening_balance_date">Opening Balance Date</Label>
                        <DatePicker date={openingBalanceDate} setDate={setOpeningBalanceDate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="opening_balance_amount">Opening Balance (Credit)</Label>
                        <Input id="opening_balance_amount" type="number" value={openingBalanceAmount} onChange={(e) => setOpeningBalanceAmount(Number(e.target.value))} />
                    </div>
                </div>
                <Button onClick={handleSubmit} disabled={isLoading || isFetchingSupplier}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post Opening Balance
                </Button>
            </CardContent>
        </Card>
    );
}
