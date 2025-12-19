
'use client';
import React from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import {
    updateJournalStatus,
    updateJournalSettings,
    type JournalVoucher
} from '@/lib/api';

interface JournalActionsProps {
    selectedVoucher: any;
    companyId: number;
    userId: number;
    settings: any;
    printRef: React.RefObject<HTMLDivElement>;
    onVoucherUpdate: (voucherId: number, newStatus: 'approved' | 'rejected') => void;
    onSettingsUpdate: (newSettings: any) => void;
}

export const JournalActions: React.FC<JournalActionsProps> = ({ selectedVoucher, companyId, userId, settings, printRef, onVoucherUpdate, onSettingsUpdate }) => {
    const { toast } = useToast();

    const handleDownloadPdf = async () => {
        if (!printRef.current) return toast({ variant: 'destructive', title: 'Error', description: 'Preview content not available.' });
        try {
            const canvas = await html2canvas(printRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`voucher-${selectedVoucher?.voucher_number || 'download'}.pdf`);
        } catch (error) {
            toast({ variant: 'destructive', title: 'PDF Error', description: 'Failed to generate PDF.' });
        }
    };

    const handleDownloadExcel = () => {
        if (!selectedVoucher) return toast({ variant: 'destructive', title: 'Error', description: 'Voucher data not available.' });
        const accountsMap = new Map(allAccounts.map(acc => [acc.code, acc.name]));
        const header = [
            ['Voucher No', selectedVoucher.voucher_number],
            ['Date', selectedVoucher.entry_date],
            ['Narration', selectedVoucher.narration],
            [],
            ['Account ID', 'Account Name', 'Debit', 'Credit']
        ];
        const linesData = selectedVoucher.lines.map((line: any) => [
            line.account_id,
            accountsMap.get(line.account_id) || 'Not Found',
            line.debit,
            line.credit
        ]);
        const footer = [
            ['Total', '', selectedVoucher.total_debits, selectedVoucher.total_credits]
        ];
        const worksheet = XLSX.utils.aoa_to_sheet([...header, ...linesData, ...footer]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Voucher');
        XLSX.writeFile(workbook, `voucher-${selectedVoucher.voucher_number}.xlsx`);
    };

    const handleApprovalAction = async (voucherId: number, newStatus: 'approved' | 'rejected') => {
        try {
            await updateJournalStatus(voucherId, newStatus, companyId, userId);
            toast({ title: 'Success', description: `Voucher has been ${newStatus}.` });
            onVoucherUpdate(voucherId, newStatus);
        } catch (error: any) {
            toast({ variant: 'destructive', title: `Failed to ${newStatus} voucher.`, description: error.message });
        }
    };

    const handleToggleLock = async () => {
        if (settings === null) return;
        try {
            const newLockState = !settings.manualJournalsEnabled;
            await updateJournalSettings(companyId, userId, { manualJournalsEnabled: newLockState });
            onSettingsUpdate({ ...settings, manualJournalsEnabled: newLockState });
            toast({ title: 'Success', description: `Manual entries are now ${newLockState ? 'ENABLED' : 'DISABLED'}.` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button><Download className="mr-2 h-4 w-4" /> Download</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleDownloadPdf}>Download as PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadExcel}>Download as Excel</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant={!settings?.manualJournalsEnabled ? "secondary" : "destructive"} onClick={handleToggleLock}>
                {!settings?.manualJournalsEnabled ? <Unlock className="mr-2 h-4 w-4"/> : <Lock className="mr-2 h-4 w-4"/>} {!settings?.manualJournalsEnabled ? 'Enable Entries' : 'Disable Entries'}
            </Button>
        </div>
    );
};
