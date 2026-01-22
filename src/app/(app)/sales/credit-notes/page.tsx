'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

import { CreditNote, columns } from './columns'; // We created this file in the previous step
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table"; // This is the reusable component we are trying to create
import { Loader2 } from 'lucide-react';

export default function CreditNotesPage() {
  const { user } = useAuth();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.company_id) return;

    const fetchCreditNotes = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://hariindustries.net/api/clearbook/credit-notes/get-credit-notes.php?company_id=${user.company_id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch credit notes');
        }
        const data = await response.json();
        setCreditNotes(data);
        setError(null);
      } catch (error: any) {
        setError(error.message || 'An unexpected error occurred.');
        console.error("Error fetching credit notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCreditNotes();
  }, [user?.company_id]);

  return (
    <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Credit Notes</h1>
            <Link href="/sales/credit-notes/new" passHref>
                 <Button>
                     <PlusCircle className="mr-2 h-4 w-4" />
                     Create Credit Note
                 </Button>
            </Link>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>All Credit Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
             <div className="text-center py-10 text-red-500">
                 <p>Error: {error}</p>
                 <p>Please try again later.</p>
             </div>
          ) : (
            <DataTable columns={columns} data={creditNotes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
