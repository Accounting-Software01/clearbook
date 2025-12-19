'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { useLanguage } from '@/contexts/LanguageContext';

interface Customer {
  id: string;
  name: string;
}

const CustomersPage = () => {
    const { language } = useLanguage();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        try {
            // This is a simulation. In a real app, you would fetch from your backend API.
            const customerAccounts = chartOfAccounts
                .filter(acc => acc.type === 'Asset' && acc.name.toLowerCase().includes(language.customer.toLowerCase()))
                .map(acc => ({ id: acc.code, name: acc.name }));
            
            setCustomers(customerAccounts);
        } catch (e: any) {
            setError(`Failed to load ${language.customers.toLowerCase()}.`);
        } finally {
            setIsLoading(false);
        }
    }, [language]);

  return (
    <>
      <p className="text-muted-foreground mb-6">{`Manage your list of ${language.customers.toLowerCase()} and their contact information.`}</p>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>{`All ${language.customers}`}</CardTitle>
                <CardDescription>{`A list of all your company's ${language.customers.toLowerCase()}.`}</CardDescription>
            </div>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              {`Add New ${language.customer}`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
           {isLoading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="flex flex-col justify-center items-center h-40 text-destructive">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>{error}</p>
                </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{`${language.customer} ID`}</TableHead>
                    <TableHead>{`${language.customer} Name`}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono">{customer.id}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          )}
           { !isLoading && !error && customers.length === 0 && (
                <div className="flex justify-center items-center h-40 text-muted-foreground">
                    <p>{`No ${language.customers.toLowerCase()} found in the chart of accounts.`}</p>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
};

export default CustomersPage;
