'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface JournalEntry {
  id: number;
  entryDate: string;
  narration: string;
  totalDebits: number;
  status: string;
}

export const JournalApprovals = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingEntries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/journal-approvals?status=pending_approval');
      if (!response.ok) {
        throw new Error('Failed to fetch pending entries');
      }
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load pending journal entries.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEntries();
  }, []);

  const handleApproval = async (id: number, newStatus: 'posted' | 'rejected') => {
    try {
      const response = await fetch(`/api/journal-approvals/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${newStatus === 'posted' ? 'approve' : 'reject'} the entry`);
      }

      toast({
        title: `Entry ${newStatus === 'posted' ? 'Approved' : 'Rejected'}`,
      });
      fetchPendingEntries(); // Refresh the list
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Journal Approvals</CardTitle>
          <CardDescription>Review and approve pending journal entries.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal Approvals</CardTitle>
        <CardDescription>Review and approve pending journal entries.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  No pending entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.entryDate), 'PPP')}</TableCell>
                  <TableCell>{entry.narration}</TableCell>
                  <TableCell className="text-right font-mono">{entry.totalDebits.toFixed(2)}</TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleApproval(entry.id, 'posted')}>
                      <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleApproval(entry.id, 'rejected')}>
                      <X className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
