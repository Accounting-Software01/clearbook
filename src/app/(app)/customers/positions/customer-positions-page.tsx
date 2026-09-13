'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ArrowLeft, Download, FileText, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = 'https://hariindustries.net/api/clearbook/get-customer-positions.php';

interface CustomerPosition {
  customer_id: string;
  customer_name: string;
  ar_balance: number;
  advance_balance: number;
  net_position: number;
  position_type: 'Debit' | 'Credit';
  position_label: string;
}

interface Summary {
  total_customers_with_balance: number;
  total_debit_balance: number;
  total_credit_balance: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Math.abs(amount));

// ─── CSV / Excel Export ─────────────────────────────────────────────────────
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function exportToExcel(positions: CustomerPosition[]) {
  const headers = ['Customer Code', 'Customer Name', 'AR Balance', 'Advance Balance', 'Net Position', 'Type'];
  const rows = positions.map(p => [
    p.customer_id,
    p.customer_name,
    p.ar_balance.toFixed(2),
    p.advance_balance.toFixed(2),
    Math.abs(p.net_position).toFixed(2),
    p.position_label,
  ].map(escapeCsvField).join(','));

  const blob = new Blob([headers.join(',') + '\n' + rows.join('\n') + '\n'], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customer_positions_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ──────────────────────────────────────────────────────────────
function exportToPDF(positions: CustomerPosition[], summary: Summary | null, companyName: string) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  doc.setFontSize(16); doc.setTextColor(40, 40, 40);
  doc.text((companyName || 'Company Name Not Set').toUpperCase(), pw / 2, 15, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(100, 100, 100);
  doc.text('Customer Positions — Outstanding Balances', pw / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pw - 10, 15, { align: 'right' });
  doc.setDrawColor(200, 200, 200);
  doc.line(10, 28, pw - 10, 28);

  autoTable(doc, {
    startY: 34,
    head: [['Customer', 'AR Balance', 'Advance Balance', 'Net Position', 'Type']],
    body: positions.map(p => [
      p.customer_name,
      formatCurrency(p.ar_balance),
      formatCurrency(p.advance_balance),
      formatCurrency(p.net_position),
      p.position_label,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [40, 40, 40] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });

  if (summary) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    doc.text(`Total customers with a balance: ${summary.total_customers_with_balance}`, 14, finalY);
    doc.text(`Total owed to us (Debit): ${formatCurrency(summary.total_debit_balance)}`, 14, finalY + 6);
    doc.text(`Total owed to customers (Credit): ${formatCurrency(summary.total_credit_balance)}`, 14, finalY + 12);
  }

  doc.save(`customer_positions_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const CustomerPositionsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [positions, setPositions] = useState<CustomerPosition[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!user?.company_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}?company_id=${user.company_id}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch customer positions.');
      setPositions(result.data || []);
      setSummary(result.summary || null);
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error fetching customer positions', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [user?.company_id, toast]);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/customers" className="text-sm text-muted-foreground hover:text-primary flex items-center">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Customers
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Customer Positions</h1>
          <p className="text-muted-foreground text-sm">
            Customers with an outstanding balance — either they owe us, or we hold an unused advance for them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPositions} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(positions)}
            disabled={positions.length === 0}
          >
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF(positions, summary, user?.company_name || '')}
            disabled={positions.length === 0}
          >
            <FileText className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-slate-400">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Customers with a balance</p>
              <p className="text-2xl font-bold mt-1">{summary.total_customers_with_balance}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total owed to us (Debit)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.total_debit_balance)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total owed to customers (Credit)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.total_credit_balance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customers with Non-Zero Balance</CardTitle>
          <CardDescription>Sorted by largest balance first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-destructive text-center py-12">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              <p className="font-medium">Failed to load customer positions</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPositions} className="mt-4">Try Again</Button>
            </div>
          ) : positions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No customers currently have an outstanding balance.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">AR Balance</TableHead>
                    <TableHead className="text-right">Advance Balance</TableHead>
                    <TableHead className="text-right">Net Position</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map(p => (
                    <TableRow key={p.customer_id}>
                      <TableCell className="font-medium">
                        <Link href={`/customers/${p.customer_id}`} className="hover:underline">
                          {p.customer_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(p.ar_balance)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(p.advance_balance)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCurrency(p.net_position)}</TableCell>
                      <TableCell>
                        <Badge variant={p.position_type === 'Debit' ? 'destructive' : 'default'}>
                          {p.position_label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerPositionsPage;
