'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoints } from '@/lib/apiEndpoints';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from './columns'; // We will create this file next
import { Loader2 } from 'lucide-react';

export default function PendingInvoicesPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.company_id) {
            setIsLoading(false);
            return;
        }

        const fetchPendingInvoices = async () => {
            setIsLoading(true);
            try {
                
                const response = await fetch(`https://hariindustries.net/api/clearbook/get-pending-invoices.php?company_id=${user.company_id}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch pending invoices.');
                }
                const data = await response.json();
                setInvoices(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPendingInvoices();
    }, [user?.company_id]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /><p className='ml-4 text-lg'>Loading invoices...</p></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader>
                    <CardTitle>Pending Invoices</CardTitle>
                    <p className="text-sm text-muted-foreground">A list of all invoices that are not yet fully paid.</p>
                </CardHeader>
                <CardContent>
                    <DataTable columns={columns} data={invoices} />
                </CardContent>
            </Card>
        </div>
    );
}
