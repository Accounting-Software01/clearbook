'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, RefreshCw, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLanguage } from '@/contexts/LanguageContext';
import { RegisterCustomerDialog } from '@/components/RegisterCustomerDialog';
import { RecordOpeningBalanceDialog } from '@/components/RecordOpeningBalanceDialog';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoints } from '@/lib/apiEndpoints';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CustomersTrailTabProps {
  onRefresh: () => void;
}

export const CustomersTrailTab = ({ onRefresh }: CustomersTrailTabProps) => {
    const { language } = useLanguage();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegisterDialogOpen, setRegisterDialogOpen] = useState(false);
    const [isOpeningBalanceDialogOpen, setOpeningBalanceDialogOpen] = useState(false);
    const [showOpeningBalancePrompt, setShowOpeningBalancePrompt] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<{id: string, name: string} | null>(null);

    const fetchCustomers = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const res = await fetch(apiEndpoints.getCustomers(user.company_id));
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                 const mappedCustomers = data.data.map((c: any) => ({
                    id: c.customer_id,
                    name: c.customer_name,
                    email: c.email_address,
                    phone: c.primary_phone_number,
                }));
                setCustomers(mappedCustomers);
            } else {
                setCustomers([]);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error fetching customers', description: error.message });
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleCustomerRegistered = (customer: { id: string; name: string; }) => {
        fetchCustomers();
        onRefresh(); 
        setSelectedCustomer(customer);
        setShowOpeningBalancePrompt(true);
    };

    const handleAddOpeningBalance = () => {
        setShowOpeningBalancePrompt(false);
        setOpeningBalanceDialogOpen(true);
    };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
          <p className="text-muted-foreground">{`A list of all your company's ${language?.customers.toLowerCase() || 'customers'}.`}</p>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={fetchCustomers} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}/>Refresh
            </Button>
            <Button onClick={() => setRegisterDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {`Add New ${language?.customer || 'Customer'}`}
            </Button>
          </div>
      </div>
      
      {isLoading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : customers.length === 0 ? (
          <div className="flex justify-center items-center h-40 text-muted-foreground">
            <p>{`No ${language?.customers.toLowerCase() || 'customers'} found.`}</p>
        </div>
      ) : (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{`${language?.customer || 'Customer'} ID`}</TableHead>
                    <TableHead>{`${language?.customer || 'Customer'} Name`}</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {customers.map((customer) => (
                <TableRow key={customer.id}>
                    <TableCell className="font-mono">{customer.id}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                </TableRow>
                ))}
            </TableBody>
        </Table>
      )}

      <RegisterCustomerDialog 
        isOpen={isRegisterDialogOpen}
        onClose={() => setRegisterDialogOpen(false)}
        onCustomerRegistered={handleCustomerRegistered}
      />

      <AlertDialog open={showOpeningBalancePrompt} onOpenChange={setShowOpeningBalancePrompt}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Customer Successfully Created</AlertDialogTitle>
                <AlertDialogDescription>
                    Does customer "{selectedCustomer?.name}" have an opening balance that you want to record?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>No, Finish Process</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddOpeningBalance}>Yes, Add Opening Balance</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

      <RecordOpeningBalanceDialog
        isOpen={isOpeningBalanceDialogOpen}
        onClose={() => setOpeningBalanceDialogOpen(false)}
        customer={selectedCustomer}
      />
    </>
  );
};