'use client';
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Download, Printer, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalEntry { 
    id: number; 
    entry_number: string; 
    entry_date: string; 
    narration: string; 
    total_debits: number; 
    status: string; 
}

interface RecentEntriesTableProps {
    entries: JournalEntry[];
    showActions: boolean;
    onApprove?: (id: number, status: string) => void;
    onPrint: (entry: any) => void;
    companyId: string;
}

const RecentEntriesTable: React.FC<RecentEntriesTableProps> = ({ entries, showActions, onApprove, onPrint, companyId }) => {
    const [isPrinting, setIsPrinting] = useState<number | null>(null);
    const isAccountantView = showActions && !onApprove;

    const handlePrintClick = (entry: any) => {
        setIsPrinting(entry.id);
        onPrint(entry);
        setTimeout(() => setIsPrinting(null), 2000);
    };

    const handleDownloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(entries.map(e => ({
            'Date': format(new Date(e.entry_date), "dd-MMM-yy"),
            'Entry #': e.entry_number,
            'Narration': e.narration,
            'Amount': e.total_debits,
            'Status': e.status,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Entries");
        XLSX.writeFile(workbook, "entries.xlsx");
    };

    const statusConfig = {
        approved: { icon: CheckCircle2, text: 'Approved', className: 'text-green-600', badgeVariant: 'default' },
        pending: { icon: Clock, text: 'Pending', className: 'text-amber-600', badgeVariant: 'secondary' },
        rejected: { icon: XCircle, text: 'Rejected', className: 'text-red-600', badgeVariant: 'destructive' },
    } as const;

    return (
        <>
            <div className="flex justify-end space-x-2 mb-4">
                <Button onClick={handleDownloadExcel} size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download as Excel
                </Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Narration</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        {showActions && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.length > 0 ? entries.map(e => {
                        const currentStatus = statusConfig[e.status as keyof typeof statusConfig] || statusConfig.pending;
                        const StatusIcon = currentStatus.icon;

                        return (
                            <TableRow key={e.id}>
                                <TableCell>{format(new Date(e.entry_date), "dd-MMM-yy")}</TableCell>
                                <TableCell className="font-medium">{e.entry_number}</TableCell>
                                <TableCell>{e.narration}</TableCell>
                                <TableCell>{e.total_debits.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</TableCell>
                                <TableCell>
                                    {isAccountantView ? (
                                        <div className={cn("flex items-center space-x-2", currentStatus.className)}>
                                            <StatusIcon className="h-4 w-4" />
                                            <span className="font-medium">{currentStatus.text}</span>
                                        </div>
                                    ) : (
                                        <Badge variant={currentStatus.badgeVariant as any}>{e.status}</Badge>
                                    )}
                                </TableCell>
                                {showActions && (
                                    <TableCell className="text-right space-x-1">
                                        {e.status === 'pending' && onApprove && (
                                            <>
                                                <Button size="sm" onClick={() => onApprove(e.id, 'approved')}>Approve</Button>
                                                <Button size="sm" variant="outline" onClick={() => onApprove(e.id, 'rejected')}>Reject</Button>
                                            </>
                                        )}
                                        <Button size="icon" variant="ghost" onClick={() => handlePrintClick(e)} disabled={isPrinting === e.id}>
                                            {isPrinting === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    }) : <TableRow><TableCell colSpan={showActions ? 6 : 5} className="text-center h-24">No entries found.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </>
    );
};

export default RecentEntriesTable;