'use client';
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Download, Printer, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JournalVoucher { 
    id: number; 
    voucher_number: string; 
    entry_date: string; 
    narration: string; 
    total_debits: number; 
    status: string; 
}

interface RecentVouchersTableProps {
    vouchers: JournalVoucher[];
    showActions: boolean;
    onApprove?: (id: number, status: string) => void;
    onPrint: (voucher: any) => void;
    companyId: string;
}

const RecentVouchersTable: React.FC<RecentVouchersTableProps> = ({ vouchers, showActions, onApprove, onPrint, companyId }) => {
    const [isPrinting, setIsPrinting] = useState<number | null>(null);
    const isAccountantView = showActions && !onApprove;

    const handlePrintClick = (voucher: any) => {
        setIsPrinting(voucher.id);
        onPrint(voucher);
        setTimeout(() => setIsPrinting(null), 2000);
    };

    const handleDownloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(vouchers.map(v => ({
            'Date': format(new Date(v.entry_date), "dd-MMM-yy"),
            'Voucher #': v.voucher_number,
            'Narration': v.narration,
            'Amount': v.total_debits,
            'Status': v.status,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vouchers");
        XLSX.writeFile(workbook, "vouchers.xlsx");
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
                        <TableHead>Voucher #</TableHead>
                        <TableHead>Narration</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        {showActions && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {vouchers.length > 0 ? vouchers.map(v => {
                        const currentStatus = statusConfig[v.status as keyof typeof statusConfig] || statusConfig.pending;
                        const StatusIcon = currentStatus.icon;

                        return (
                            <TableRow key={v.id}>
                                <TableCell>{format(new Date(v.entry_date), "dd-MMM-yy")}</TableCell>
                                <TableCell className="font-medium">{v.voucher_number}</TableCell>
                                <TableCell>{v.narration}</TableCell>
                                <TableCell>{v.total_debits.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</TableCell>
                                <TableCell>
                                    {isAccountantView ? (
                                        <div className={cn("flex items-center space-x-2", currentStatus.className)}>
                                            <StatusIcon className="h-4 w-4" />
                                            <span className="font-medium">{currentStatus.text}</span>
                                        </div>
                                    ) : (
                                        <Badge variant={currentStatus.badgeVariant as any}>{v.status}</Badge>
                                    )}
                                </TableCell>
                                {showActions && (
                                    <TableCell className="text-right space-x-1">
                                        {v.status === 'pending' && onApprove && (
                                            <>
                                                <Button size="sm" onClick={() => onApprove(v.id, 'approved')}>Approve</Button>
                                                <Button size="sm" variant="outline" onClick={() => onApprove(v.id, 'rejected')}>Reject</Button>
                                            </>
                                        )}
                                        <Button size="icon" variant="ghost" onClick={() => handlePrintClick(v)} disabled={isPrinting === v.id}>
                                            {isPrinting === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    }) : <TableRow><TableCell colSpan={showActions ? 6 : 5} className="text-center h-24">No vouchers found.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </>
    );
};

export default RecentVouchersTable;