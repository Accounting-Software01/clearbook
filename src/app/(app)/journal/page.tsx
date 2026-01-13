'use client';

import { useState, Fragment, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, ArrowLeft, Edit, Trash2, CheckCircle } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from 'date-fns';

// Define the types for a journal entry
interface JournalEntryLine {
  account_name: string;
  account_code: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: number;
  date: string;
  voucher_id: string;
  narration: string;
  total_debit: number;
  total_credit: number;
  status: 'Draft' | 'Posted';
  created_by: string;
  lines: JournalEntryLine[];
}

// Mock data for journal entries
const mockJournalEntries: JournalEntry[] = [
  {
    id: 1,
    date: "2026-01-15",
    voucher_id: "JV-2026-0001",
    narration: "To record depreciation for the month of January",
    total_debit: 2500.00,
    total_credit: 2500.00,
    status: "Posted",
    created_by: "finance@example.com",
    lines: [
        { account_name: 'Depreciation Expense', account_code: '605010', debit: 2500.00, credit: 0 },
        { account_name: 'Accumulated Depreciation - Machinery', account_code: '102111', debit: 0, credit: 2500.00 },
    ]
  },
  {
    id: 2,
    date: "2026-01-14",
    voucher_id: "JV-2026-0002",
    narration: "To correct salary expense entry",
    total_debit: 500.00,
    total_credit: 500.00,
    status: "Draft",
    created_by: "finance@example.com",
    lines: [
        { account_name: 'Salaries & Wages', account_code: '601010', debit: 500.00, credit: 0 },
        { account_name: 'Cash on Hand', account_code: '101010', debit: 0, credit: 500.00 },
    ]
  },
];

const JournalDetailView = ({ entry, onBack }: { entry: JournalEntry; onBack: () => void; }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Voucher - {entry.voucher_id}</CardTitle>
                        <CardDescription>{entry.narration}</CardDescription>
                    </div>
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                    <div><strong>Date:</strong> {format(new Date(entry.date), 'dd MMM yyyy')}</div>
                    <div><strong>Status:</strong> <Badge variant={entry.status === 'Draft' ? 'outline' : 'default'}  className={entry.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{entry.status}</Badge></div>
                    <div><strong>Created By:</strong> {entry.created_by}</div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Account</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {entry.lines.map((line, index) => (
                            <TableRow key={index}>
                                <TableCell>{line.account_code} - {line.account_name}</TableCell>
                                <TableCell className="text-right font-mono">{line.debit > 0 ? line.debit.toFixed(2) : '-'}</TableCell>
                                <TableCell className="text-right font-mono">{line.credit > 0 ? line.credit.toFixed(2) : '-'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableRow className="font-bold bg-muted/50">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right font-mono">{entry.total_debit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{entry.total_credit.toFixed(2)}</TableCell>
                    </TableRow>
                </Table>
            </CardContent>
        </Card>
    );
}

const JournalPage = () => {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setJournalEntries(mockJournalEntries);
  }, []);

  const handleView = (entry: JournalEntry) => {
      setSelectedEntry(entry);
      setViewMode('view');
  };

  const handlePost = (id: number) => {
      toast({ title: "Posting Entry..." });
      new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
        setJournalEntries(journalEntries.map(entry => entry.id === id ? { ...entry, status: 'Posted' } : entry));
        toast({ title: "Success!", description: "Journal entry has been posted." });
      });
  };

  const handleDelete = (id: number) => {
      if (confirm("Are you sure you want to delete this journal entry? This action cannot be undone.")) {
        toast({ title: "Deleting Journal Entry..." });
        new Promise(resolve => setTimeout(resolve, 1000)).then(() => {
            setJournalEntries(journalEntries.filter(entry => entry.id !== id));
            toast({ title: "Success!", description: "Journal entry has been deleted." });
        });
    }
  }

  const handleBackToList = () => {
      setViewMode('list');
      setSelectedEntry(null);
  }

  if (viewMode === 'view' && selectedEntry) {
      return <JournalDetailView entry={selectedEntry} onBack={handleBackToList} />;
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Journal Vouchers</CardTitle>
                <CardDescription>A record of all manual journal entries.</CardDescription>
            </div>
            <Link href="/journal/new" passHref>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Journal Entry</Button>
            </Link>
        </CardHeader>
        <CardContent>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Voucher ID</TableHead>
                            <TableHead>Narration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {journalEntries.length > 0 ? journalEntries.map(entry => (
                            <TableRow key={entry.id}>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Actions</Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleView(entry)}>View Details</DropdownMenuItem>
                                            <Link href="/journal/new" passHref>
                                                <DropdownMenuItem disabled={entry.status === 'Posted'}>Edit</DropdownMenuItem>
                                            </Link>
                                            <DropdownMenuItem onClick={() => handlePost(entry.id)} disabled={entry.status === 'Posted'}><CheckCircle className="mr-2 h-4 w-4 text-green-500"/>Post Entry</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(entry.id)} disabled={entry.status === 'Posted'}><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                <TableCell>{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                                <TableCell>{entry.voucher_id}</TableCell>
                                <TableCell>{entry.narration}</TableCell>
                                <TableCell><Badge variant={entry.status === 'Draft' ? 'outline' : 'default'} className={entry.status === 'Posted' ? 'bg-green-500 text-white' : ''}>{entry.status}</Badge></TableCell>
                                <TableCell className="text-right font-medium">{entry.total_debit.toFixed(2)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No journal entries found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">Showing 1 to {journalEntries.length} of {journalEntries.length} entries</p>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                        <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
                        <PaginationItem><PaginationNext href="#" /></PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </CardContent>
    </Card>
  );
};

export default JournalPage;
