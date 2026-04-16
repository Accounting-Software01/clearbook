'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isValid } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Loader2, AlertCircle, FileText, Download, Printer, ClipboardList, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import useSWR from 'swr';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─── Brand palette ────────────────────────────────────────────────────────────
const BRAND = {
    green:      '#28a745',
    greenLight: '#d4edda',
    orange:     '#e05030',
    blue:       '#2563c0',
    blueLight:  '#bfdbfe',
} as const;

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface GLAccount {
    id: number;
    account_code: string;
    account_name: string;
}

interface Transaction {
    date: string;
    description: string;
    debit: number;
    credit: number;
}

interface StatementData {
    openingBalance: number;
    transactions: Transaction[];
    closingBalance: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then(res => res.json());

const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
};

/**
 * Safe wrapper around date-fns format().
 * Returns `fallback` if date is undefined, null, or not a valid Date.
 */
const safeFormat = (date: Date | undefined | null, fmt: string, fallback = '—'): string => {
    if (!date || !isValid(date)) return fallback;
    try { return format(date, fmt); } catch { return fallback; }
};

// ─── DateRangePicker ──────────────────────────────────────────────────────────

interface DateRangePickerProps {
    value: DateRange | undefined;
    onChange: (range: DateRange | undefined) => void;
    disabled?: boolean;
}

const PRESETS: { label: string; range: () => DateRange }[] = [
    {
        label: 'This month',
        range: () => {
            const n = new Date();
            return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: new Date(n.getFullYear(), n.getMonth() + 1, 0) };
        },
    },
    {
        label: 'Last month',
        range: () => {
            const n = new Date();
            return { from: new Date(n.getFullYear(), n.getMonth() - 1, 1), to: new Date(n.getFullYear(), n.getMonth(), 0) };
        },
    },
    {
        label: 'Last 30 days',
        range: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 29); return { from, to }; },
    },
    {
        label: 'Last 90 days',
        range: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 89); return { from, to }; },
    },
    {
        label: 'This year',
        range: () => { const y = new Date().getFullYear(); return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) }; },
    },
    {
        label: 'Last year',
        range: () => { const y = new Date().getFullYear() - 1; return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) }; },
    },
];

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, disabled }) => {
    const [open, setOpen] = useState(false);

    const displayLabel = useMemo(() => {
        if (value?.from && isValid(value.from) && value?.to && isValid(value.to)) {
            return `${safeFormat(value.from, 'MMM dd, yyyy')}  →  ${safeFormat(value.to, 'MMM dd, yyyy')}`;
        }
        if (value?.from && isValid(value.from)) return `${safeFormat(value.from, 'MMM dd, yyyy')}  →  Pick end date`;
        return 'Select date range';
    }, [value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn('w-full justify-start text-left font-normal h-10 px-3 gap-2', !value?.from && 'text-muted-foreground')}
                >
                    <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{displayLabel}</span>
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0 shadow-xl" align="start" sideOffset={8}>
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 p-3 border-b bg-gray-50 dark:bg-gray-900">
                    {PRESETS.map(preset => (
                        <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-full px-3"
                            style={{ borderColor: BRAND.green, color: BRAND.green }}
                            onClick={() => { onChange(preset.range()); setOpen(false); }}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>

                {/* Two-month calendar */}
                <Calendar
                    mode="range"
                    selected={value}
                    onSelect={onChange}
                    numberOfMonths={2}
                    defaultMonth={value?.from}
                    className="p-3"
                    initialFocus
                />

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 p-3 border-t bg-gray-50 dark:bg-gray-900">
                    <Button variant="ghost" size="sm" onClick={() => onChange(undefined)} className="text-muted-foreground hover:text-destructive">
                        Clear
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setOpen(false)}
                        disabled={!value?.from || !value?.to}
                        className="text-white"
                        style={{ backgroundColor: BRAND.green }}
                    >
                        Apply Range
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AccountStatementPage = () => {
    const { user }  = useAuth();
    const { toast } = useToast();

    const { data: accountsResponse, error: accountsError, isLoading: isAccountsLoading } = useSWR(
        user?.company_id ? `https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${user.company_id}` : null,
        fetcher,
    );

    const [selectedAccount, setSelectedAccount] = useState<string | undefined>();

    // Live picker state
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to:   new Date(),
    });

    // ────────────────────────────────────────────────────────────────────────
    // KEY FIX: `reportRange` is a snapshot of the range used for the LAST
    // successful fetch. Using it in the results section means it can never
    // become invalid when the user later changes the picker — which was the
    // cause of the "Invalid time value" RangeError on line 477.
    // ────────────────────────────────────────────────────────────────────────
    const [reportRange, setReportRange] = useState<{ from: Date; to: Date } | null>(null);

    const [data, setData]           = useState<StatementData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState<string | null>(null);
    const [chartData, setChartData] = useState<{ date: string; balance: number }[]>([]);

    const accounts: GLAccount[] = accountsResponse || [];

    const generateReport = useCallback(async () => {
        const from = dateRange?.from;
        const to   = dateRange?.to;

        if (!from || !to || !isValid(from) || !isValid(to) || !selectedAccount || !user?.company_id) {
            setError('Please select an account and a complete, valid date range.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setData(null);

        const fromDate = format(from, 'yyyy-MM-dd');
        const toDate   = format(to,   'yyyy-MM-dd');
        const url = `https://hariindustries.net/api/clearbook/account-statement.php?company_id=${user.company_id}&account_id=${selectedAccount}&fromDate=${fromDate}&toDate=${toDate}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'An API error occurred.');

            const statement = result.statement;

            if (statement.transactions.length > 0 && statement.openingBalance === 0) {
                const firstTx = statement.transactions[0];
                if (firstTx.description === '' || firstTx.description.toLowerCase() === 'opening balance') {
                    statement.openingBalance += firstTx.debit - firstTx.credit;
                    statement.transactions.shift();
                }
            }

            setData(statement);
            // Snapshot valid dates at the moment of successful generation
            setReportRange({ from, to });

            let balance = statement.openingBalance;
            setChartData([
                { date: format(from, 'yyyy-MM-dd'), balance: statement.openingBalance },
                ...statement.transactions.map((tx: Transaction) => {
                    balance += tx.debit - tx.credit;
                    return { date: tx.date, balance };
                }),
            ]);

            if (statement.transactions.length === 0) {
                toast({ title: 'No Transactions', description: 'No transactions found for this account in the selected period.' });
            }
        } catch (e: any) {
            setError(`Failed to generate statement: ${e.message}`);
            toast({ title: 'Error Generating Report', description: e.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, selectedAccount, user, toast]);

    const runningBalance = useMemo(() => {
        if (!data) return [];
        let cur = data.openingBalance;
        return data.transactions.map(tx => { cur += tx.debit - tx.credit; return cur; });
    }, [data]);

    const handlePrint = () => window.print();

    const handleExport = (formatType: 'excel' | 'pdf') => {
        if (!data || !selectedAccount || !reportRange) return;
        const accountName = accounts.find(a => a.account_code === selectedAccount)?.account_name || 'Selected Account';
        const title = `Account Statement for ${accountName}`;
        const head  = [['Date', 'Description', 'Debit', 'Credit', 'Balance']];
        const body  = data.transactions.map((t, i) => [
            t.date, t.description,
            t.debit  > 0 ? formatCurrency(t.debit)  : '-',
            t.credit > 0 ? formatCurrency(t.credit) : '-',
            formatCurrency(runningBalance[i]),
        ]);

        if (formatType === 'pdf') {
            const doc = new jsPDF();
            doc.text(title, 14, 15);
            (doc as any).autoTable({
                startY: 25, head, theme: 'striped',
                body: [
                    [{ content: 'Opening Balance', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: formatCurrency(data.openingBalance), styles: { halign: 'right', fontStyle: 'bold' } }],
                    ...body,
                    [{ content: 'Closing Balance', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: formatCurrency(data.closingBalance), styles: { halign: 'right', fontStyle: 'bold' } }],
                ],
            });
            doc.save(`${accountName}_Statement.pdf`);
        } else {
            const ws = XLSX.utils.aoa_to_sheet([
                [title],
                [`Period: ${safeFormat(reportRange.from, 'MMM dd, yyyy')} to ${safeFormat(reportRange.to, 'MMM dd, yyyy')}`],
                [],
                ['', '', '', 'Opening Balance', formatCurrency(data.openingBalance)],
                ...head, ...body,
                ['', '', '', 'Closing Balance', formatCurrency(data.closingBalance)],
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Account Statement');
            XLSX.writeFile(wb, `${accountName}_Statement.xlsx`);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">

            {/* Page header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight flex items-center">
                    <ClipboardList className="mr-3 h-8 w-8" style={{ color: BRAND.green }} />
                    Account Statement
                </h1>
                {data && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleExport('excel')}
                            style={{ borderColor: BRAND.green, color: BRAND.green }} className="hover:bg-green-50">
                            <Download className="mr-2 h-4 w-4" /> Excel
                        </Button>
                        <Button variant="outline" onClick={() => handleExport('pdf')}
                            style={{ borderColor: BRAND.orange, color: BRAND.orange }} className="hover:bg-orange-50">
                            <FileText className="mr-2 h-4 w-4" /> PDF
                        </Button>
                        <Button variant="outline" onClick={handlePrint}
                            style={{ borderColor: BRAND.blue, color: BRAND.blue }} className="hover:bg-blue-50">
                            <Printer className="mr-2 h-4 w-4" /> Print
                        </Button>
                    </div>
                )}
            </div>

            {/* Controls card */}
            <Card className="border-t-4" style={{ borderTopColor: BRAND.green }}>
                <CardHeader>
                    <CardTitle className="text-base font-semibold" style={{ color: BRAND.green }}>
                        Report Controls
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Account</label>
                        <Select onValueChange={setSelectedAccount} value={selectedAccount} disabled={isAccountsLoading}>
                            <SelectTrigger><SelectValue placeholder={isAccountsLoading ? 'Loading accounts…' : 'Select an account'} /></SelectTrigger>
                            <SelectContent>
                                {accountsError && <SelectItem value="error" disabled>Failed to load accounts</SelectItem>}
                                {accounts.map(acc => (
                                    <SelectItem key={acc.account_code} value={acc.account_code}>{acc.account_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium flex items-center gap-1.5">
                            <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" /> Date Range
                        </label>
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                    </div>

                    <Button
                        onClick={generateReport}
                        disabled={isLoading || !selectedAccount || !dateRange?.from || !dateRange?.to}
                        className="w-full md:col-span-3 text-white font-semibold"
                        style={{ backgroundColor: BRAND.green }}
                    >
                        {isLoading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
                            : <><FileText className="mr-2 h-4 w-4" /> Generate Statement</>}
                    </Button>
                </CardContent>
            </Card>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center items-center h-60">
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND.green }} />
                    <span className="ml-4 text-muted-foreground">Generating statement…</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex flex-col justify-center items-center h-40 rounded-lg border border-red-200 bg-red-50 text-red-600 gap-2">
                    <AlertCircle className="h-8 w-8" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Results — uses reportRange (snapshot), never the live dateRange */}
            {data && reportRange && (
                <div className="space-y-6">

                    {/* Trend chart */}
                    <Card className="border-t-4" style={{ borderTopColor: BRAND.blue }}>
                        <CardHeader>
                            <CardTitle className="text-base font-semibold" style={{ color: BRAND.blue }}>Balance Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] w-full">
                            <ResponsiveContainer>
                                <ChartContainer config={{}}>
                                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="date" tickFormatter={str => { const d = new Date(str); return isValid(d) ? format(d, 'MMM d') : str; }} />
                                        <YAxis width={80} tickFormatter={val => `₦${(val / 1000).toFixed(0)}k`} />
                                        <ChartTooltip cursor={false} content={
                                            <ChartTooltipContent
                                                labelFormatter={label => { const d = new Date(label); return isValid(d) ? format(d, 'MMM dd, yyyy') : label; }}
                                                formatter={value => formatCurrency(value as number)}
                                            />
                                        } />
                                        <Area type="monotone" dataKey="balance" stroke={BRAND.blue} fill={BRAND.blueLight} strokeWidth={2} />
                                    </AreaChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Statement table */}
                    <Card className="border-t-4" style={{ borderTopColor: BRAND.green }}>
                        <CardHeader>
                            <CardTitle>
                                Statement for:{' '}
                                <span style={{ color: BRAND.green }}>
                                    {accounts.find(a => a.account_code === selectedAccount!)?.account_name}
                                </span>
                            </CardTitle>
                            {/* safeFormat used on reportRange — always valid Date objects */}
                            <p className="text-sm text-muted-foreground">
                                Period: <strong>{safeFormat(reportRange.from, 'MMM dd, yyyy')}</strong>
                                {' → '}
                                <strong>{safeFormat(reportRange.to, 'MMM dd, yyyy')}</strong>
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow style={{ backgroundColor: BRAND.greenLight }}>
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Description</TableHead>
                                        <TableHead className="text-right font-semibold">Debit</TableHead>
                                        <TableHead className="text-right font-semibold">Credit</TableHead>
                                        <TableHead className="text-right font-semibold">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-gray-50 dark:bg-gray-800 font-semibold">
                                        <TableCell>{safeFormat(reportRange.from, 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>Opening Balance</TableCell>
                                        <TableCell className="text-right font-mono">-</TableCell>
                                        <TableCell className="text-right font-mono">-</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(data.openingBalance)}</TableCell>
                                    </TableRow>

                                    {data.transactions.length > 0 ? data.transactions.map((tx, index) => {
                                        const txDate = new Date(tx.date);
                                        return (
                                            <TableRow key={index} className="hover:bg-gray-50/50">
                                                <TableCell>{isValid(txDate) ? format(txDate, 'yyyy-MM-dd') : tx.date}</TableCell>
                                                <TableCell>{tx.description}</TableCell>
                                                <TableCell className="text-right font-mono" style={{ color: tx.debit  > 0 ? BRAND.green  : undefined }}>
                                                    {tx.debit  > 0 ? formatCurrency(tx.debit)  : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono" style={{ color: tx.credit > 0 ? BRAND.orange : undefined }}>
                                                    {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(runningBalance[index])}</TableCell>
                                            </TableRow>
                                        );
                                    }) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                No transactions found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="font-extrabold text-base" style={{ backgroundColor: BRAND.greenLight }}>
                                        <TableCell colSpan={4} style={{ color: BRAND.green }}>Closing Balance</TableCell>
                                        <TableCell className="text-right font-mono" style={{ color: BRAND.green }}>
                                            {formatCurrency(data.closingBalance)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>

                </div>
            )}
        </div>
    );
};

export default AccountStatementPage;
