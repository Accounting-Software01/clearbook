'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Reconciliation {
  id: string;
  reconciliation_date: string;
  statement_date: string;
  account_name: string;
  account_code: string;
  status: 'Draft' | 'Completed';
  difference: number;
}

const ReconciliationListPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReconciliations = async () => {
      if (!user?.company_id) return;
      setIsLoading(true);
      try {
        const response = await fetch(`https://hariindustries.net/api/clearbook/reconciliation.php?company_id=${user.company_id}`);
        const data = await response.json();
        if (response.ok) {
          setReconciliations(data);
        } else {
          throw new Error(data.error || 'Failed to fetch reconciliations.');
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to load data', description: error.message });
      } finally {
        setIsLoading(false);
      }
    };
    fetchReconciliations();
  }, [user?.company_id, toast]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Bank Reconciliations</CardTitle>
          <CardDescription>A list of all your bank reconciliations.</CardDescription>
        </div>
        <Link href="/reconciliation/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Start New Bank Reconciliation
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reconciliation Date</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Statement Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Difference</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : reconciliations.length > 0 ? reconciliations.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>{format(new Date(rec.reconciliation_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{rec.account_name} ({rec.account_code})</TableCell>
                  <TableCell>{format(new Date(rec.statement_date), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={rec.status.toLowerCase() === 'draft' ? 'outline' : 'default'} className={rec.status.toLowerCase() === 'completed' ? 'bg-green-500 text-white' : ''}>
                      {rec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono ${rec.difference != 0 ? 'text-red-600' : ''}`}>
                    {Number(rec.difference).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/reconciliation/${rec.id}`} passHref>
                           <DropdownMenuItem>{rec.status.toLowerCase() === 'draft' ? 'Continue Reconciliation' : 'View Details'}</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="text-red-500" disabled={rec.status.toLowerCase() === 'completed'}>Delete Draft</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No reconciliations found. Start by creating a new one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReconciliationListPage;
