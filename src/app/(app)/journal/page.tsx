'use client';

import { useState, Fragment, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, ArrowLeft, Edit, Trash2, CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

// Corrected types to match the new API response
interface JournalEntryLine {
  account_id: string; // Changed from account_code
  account_name: string;
  description: string | null;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: number;
  entry_date: string; 
  voucher_number: string; 
  narration: string;
  total_debits: number; 
  total_credits: number; 
  status: 'Draft' | 'Posted';
  created_by: string;
  lines: JournalEntryLine[]; // Now always present
}

// A small component to render the action buttons
const EntryActions = ({ entry, onPost, onDelete }: { entry: JournalEntry, onPost: (id: number) => void, onDelete: (id: number) => void }) => {
    if (entry.status === 'Posted') {
        return <span className="text-xs text-muted-foreground">Posted</span>;
    }
    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPost(entry.id)}>
                <CheckCircle className="h-4 w-4 mr-1 text-green-500" /> Post
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(entry.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
        </div>
    );
};

// The main page component
const JournalPage = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const companyId = user?.company_id;
  const userId = user?.uid;

  const fetchJournalEntries = useCallback(async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
          // Corrected API endpoint name
          const response = await fetch(`https://hariindustries.net/api/clearbook/get_journal_vouchers.php?company_id=${companyId}`);
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          if (data.error) throw new Error(data.error);
          setJournalEntries(data);
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Failed to Load Entries', description: error.message });
      } finally {
          setIsLoading(false);
      }
  }, [companyId, toast]);

  useEffect(() => {
    fetchJournalEntries();
  }, [fetchJournalEntries]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  const handlePost = async (id: number) => {
      if (!companyId || !userId) return;
      toast({ title: "Posting Entry...", description: "Please wait while the entry is being posted." });
      try {
        const response = await fetch(`https://hariindustries.net/api/clearbook/journal-entry.php?action=post&id=${id}&company_id=${companyId}&user_id=${userId}`, { method: 'POST' });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || 'Failed to post entry');
        
        toast({ variant: 'success', title: "Success!", description: "Journal entry has been posted to the general ledger." });
        fetchJournalEntries(); // Refresh data
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Posting Failed', description: error.message });
      }
  };

  const handleDelete = async (id: number) => {
      if (confirm("Are you sure you want to delete this DRAFT journal entry? This action cannot be undone.")) {
        if (!companyId) return;
        toast({ title: "Deleting Entry..." });
        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/journal-entry.php?id=${id}&company_id=${companyId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.error || 'Failed to delete entry');

            toast({ variant: 'success', title: "Success!", description: "The draft journal entry has been deleted." });
            fetchJournalEntries(); // Refresh data
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
        }
    }
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Journal Vouchers</CardTitle>
                <CardDescription>A record of all manual journal entries. Drafts can be posted or deleted.</CardDescription>
            </div>
            <Link href="/journal/new" passHref>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Entry</Button>
            </Link>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Voucher #</TableHead>
                            <TableHead>Narration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[200px] text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /><p>Loading entries...</p></TableCell></TableRow>
                        ) : journalEntries.length > 0 ? journalEntries.map(entry => (
                            <Fragment key={entry.id}>
                                <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => toggleRow(entry.id)}>
                                    <TableCell>
                                        {expandedRows.has(entry.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </TableCell>
                                    <TableCell>{format(new Date(entry.entry_date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell className="font-medium">{entry.voucher_number}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs" title={entry.narration}>{entry.narration}</TableCell>
                                    <TableCell><Badge variant={entry.status === 'Draft' ? 'secondary' : 'success'}>{entry.status}</Badge></TableCell>
                                    <TableCell className="text-right font-mono">{Number(entry.total_debits).toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        <EntryActions entry={entry} onPost={handlePost} onDelete={handleDelete} />
                                    </TableCell>
                                </TableRow>
                                {expandedRows.has(entry.id) && (
                                    <TableRow className="bg-muted/20 hover:bg-muted/40">
                                        <TableCell colSpan={7} className="p-0">
                                            <div className="p-4">
                                                <h4 className="font-semibold mb-2">Entry Details:</h4>
                                                <Table size="sm">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Account</TableHead>
                                                            <TableHead>Line Description</TableHead>
                                                            <TableHead className="text-right">Debit</TableHead>
                                                            <TableHead className="text-right">Credit</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {entry.lines.map((line, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>{line.account_id} - {line.account_name}</TableCell>
                                                                <TableCell className="text-muted-foreground text-xs">{line.description || '-'}</TableCell>
                                                                <TableCell className="text-right font-mono">{Number(line.debit) > 0 ? Number(line.debit).toFixed(2) : '-'}</TableCell>
                                                                <TableCell className="text-right font-mono">{Number(line.credit) > 0 ? Number(line.credit).toFixed(2) : '-'}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">No journal entries found. Get started by creating one.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
  );
};

export default JournalPage;
