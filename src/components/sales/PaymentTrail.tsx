'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Search, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface PaymentTrailItem {
    id: number;
    invoice_date: string;
    invoice_number: string;
    total_amount: string | number;
    status: string;
    created_at: string;
    customer_name: string;
    // Add other fields that might be needed for the receipt
}

interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable?: {
        finalY?: number;
    };
    autoTable: (options: any) => jsPDF;
}


const formatNaira = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num || 0);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
};

const generateReceipt = (invoice: PaymentTrailItem) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;

    // Colors and Fonts from blueprint.md
    const primaryColor = '#1A237E';
    const accentColor = '#FFB300';
    const backgroundColor = '#F0F4FF'; // Not directly used in PDF, but good to know

    // 1. HEADER
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor);
    doc.text('PAYMENT RECEIPT', 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Receipt for Invoice: ${invoice.invoice_number}`, 14, 32);
    doc.text(`Date Paid: ${formatDate(invoice.created_at)}`, 14, 40);


    // 2. BODY (using autotable)
    const tableColumn = ["Description", "Amount"];
    const tableRows = [
        ["Invoice Total", formatNaira(invoice.total_amount)],
        ["Status", invoice.status]
    ];

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        headStyles: { fillColor: primaryColor },
        didDrawCell: (data) => {
            if (data.row.index >= 0) { // Style all rows
                if(data.cell.styles) {
                     data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    const finalY = doc.lastAutoTable?.finalY || 80;

    // 3. FOOTER
    let currentY = finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank You!', 14, currentY);

    doc.save(`Receipt-${invoice.invoice_number}.pdf`);
};


export function PaymentTrail() {
    const { user } = useAuth();
    const [trailData, setTrailData] = useState<PaymentTrailItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('paid'); // Default to 'paid'
    const [visibleColumns, setVisibleColumns] = useState({ id: true, invoice_date: true, created_at: true, invoice_number: true, customer_name: true, total_amount: true, status: true, actions: true });

    const fetchTrailData = useCallback(async () => {
        if (!user?.company_id) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await api<{ sales_trail: PaymentTrailItem[] }>(`get-sales-trail.php?company_id=${user.company_id}&status=paid`);
            setTrailData(response.sales_trail || []);
        } catch (e) {
            setError('Failed to load payment trail.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchTrailData();
    }, [fetchTrailData]);

    const statuses = useMemo(() => ['all', 'paid', 'unpaid', 'void'], []);

    const filteredData = useMemo(() => {
        return trailData.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.customer_name.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [trailData, searchTerm, statusFilter]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-destructive text-center"><AlertCircle className="mx-auto mb-2" />{error}</div>;
    }

    return (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold">Payment Trail</h2>

            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by invoice # or customer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
                <div className="flex items-center space-x-4">
                    <Select value={statusFilter} onValueChange={(value) => {
                        setStatusFilter(value);
                        // Refetch data when status changes
                        if(user?.company_id) {
                            setIsLoading(true);
                            setError(null);
                            let url = `get-sales-trail.php?company_id=${user.company_id}`;
                            if(value !== 'all') {
                                url += `&status=${value}`;
                            }
                            api<{ sales_trail: PaymentTrailItem[] }>(url)
                                .then(response => setTrailData(response.sales_trail || []))
                                .catch(e => setError('Failed to load payment trail.'))
                                .finally(() => setIsLoading(false));
                        }
                    }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            {statuses.map(status => (
                                <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">Columns</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {Object.keys(visibleColumns).map((key) => (
                                <DropdownMenuCheckboxItem
                                    key={key}
                                    className="capitalize"
                                    checked={visibleColumns[key]}
                                    onCheckedChange={(value) => setVisibleColumns(prev => ({ ...prev, [key]: !!value }))}
                                >
                                    {key.replace(/_/g, ' ')}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {visibleColumns.id && <TableHead>ID</TableHead>}
                            {visibleColumns.created_at && <TableHead>Payment Date</TableHead>}
                            {visibleColumns.invoice_date && <TableHead>Invoice Date</TableHead>}
                            {visibleColumns.invoice_number && <TableHead>Invoice #</TableHead>}
                            {visibleColumns.customer_name && <TableHead>Customer</TableHead>}
                            {visibleColumns.total_amount && <TableHead className="text-right">Amount</TableHead>}
                            {visibleColumns.status && <TableHead>Status</TableHead>}
                            {visibleColumns.actions && <TableHead>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length > 0 ? (
                            filteredData.map(item => (
                                <TableRow key={item.id}>
                                    {visibleColumns.id && <TableCell className="font-mono text-xs">{item.id}</TableCell>}
                                    {visibleColumns.created_at && <TableCell>{formatDate(item.created_at)}</TableCell>}
                                    {visibleColumns.invoice_date && <TableCell>{new Date(item.invoice_date).toLocaleDateString()}</TableCell>}
                                    {visibleColumns.invoice_number && <TableCell className="font-medium">{item.invoice_number}</TableCell>}
                                    {visibleColumns.customer_name && <TableCell>{item.customer_name}</TableCell>}
                                    {visibleColumns.total_amount && <TableCell className="text-right font-semibold">{formatNaira(item.total_amount)}</TableCell>}
                                    {visibleColumns.status && <TableCell><span className={`px-2 py-1 text-xs font-bold rounded-full ${item.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{item.status}</span></TableCell>}
                                    {visibleColumns.actions && <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => generateReceipt(item)}>
                                            <Printer className="h-4 w-4 mr-2" />
                                            Receipt
                                        </Button>
                                    </TableCell>}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length} className="text-center h-24">
                                    No results found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
