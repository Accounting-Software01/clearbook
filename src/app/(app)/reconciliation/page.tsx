'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';

interface Reconciliation {
  id: string;
  reconciliationDate: string;
  statementDate: string;
  accountName: string;
  accountCode: string;
  status: 'Draft' | 'Completed';
  difference: number;
}

const mockReconciliations: Reconciliation[] = [
  {
    id: 'rec_1',
    reconciliationDate: '2026-01-20',
    statementDate: '2025-12-31',
    accountName: 'Main Bank Account',
    accountCode: 'A10-1010',
    status: 'Completed',
    difference: 0.00,
  },
  {
    id: 'rec_2',
    reconciliationDate: '2026-02-05',
    statementDate: '2026-01-31',
    accountName: 'Main Bank Account',
    accountCode: 'A10-1010',
    status: 'Draft',
    difference: -150.75,
  },
];

const ReconciliationListPage = () => {
  const [reconciliations, setReconciliations] = useState(mockReconciliations);

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
              {reconciliations.length > 0 ? reconciliations.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell>{format(new Date(rec.reconciliationDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>{rec.accountName} ({rec.accountCode})</TableCell>
                  <TableCell>{format(new Date(rec.statementDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={rec.status === 'Draft' ? 'outline' : 'default'} className={rec.status === 'Completed' ? 'bg-green-500 text-white' : ''}>
                      {rec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono ${rec.difference !== 0 ? 'text-red-600' : ''}`}>
                    {rec.difference.toFixed(2)}
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
                           <DropdownMenuItem>{rec.status === 'Draft' ? 'Continue Reconciliation' : 'View Details'}</DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="text-red-500" disabled={rec.status === 'Completed'}>Delete Draft</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No reconciliations found.
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
