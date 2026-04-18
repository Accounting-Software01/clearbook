'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge }    from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow, TableFooter as TFoot,
} from "@/components/ui/table";
import {
    PlusCircle, Trash2, AlertTriangle, CheckCircle, Loader2,
    ArrowLeft, CalendarDays, History, CalendarCheck, Info,
    ChevronDown,
} from 'lucide-react';
import { useToast }  from '@/hooks/use-toast';
import { useAuth }   from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
    format, isValid, isBefore, isAfter, startOfDay,
    differenceInCalendarDays, subDays, subMonths,
} from 'date-fns';
import type { Account } from '@/lib/chart-of-accounts';
import type { Payee }   from '@/types/payee';

/* ─── Brand palette ─────────────────────────────────────────────────────────── */
const BRAND = {
    green:      '#28a745',
    greenLight: '#d4edda',
    greenMuted: '#f0faf2',
    orange:     '#e05030',
    blue:       '#2563c0',
    blueLight:  '#eff6ff',
    amber:      '#d97706',
    amberLight: '#fffbeb',
    amberBorder:'#fcd34d',
} as const;

/* ─── Types ──────────────────────────────────────────────────────────────────── */
interface JournalEntryLine {
    id:          number;
    accountId:   string;
    debit:       number;
    credit:      number;
    description?: string;
    payeeId?:    string;
    payees?:     Payee[];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   JOURNAL DATE PICKER
   A self-contained date-picker with built-in backdating awareness.

   States:
     "today"     → date === today               → green  "Today"
     "backdate"  → date < today, ≤ 90 days ago  → amber  "Backdated · X days ago"
     "old"       → date > 90 days ago            → orange "Far backdated · X days ago" + warn
     "future"    → date > today (blocked)        → grey   (disallowed)
═══════════════════════════════════════════════════════════════════════════════ */

type DateState = 'today' | 'backdate' | 'old' | 'future';

const classifyDate = (d: Date): DateState => {
    const today = startOfDay(new Date());
    const sd    = startOfDay(d);
    const diff  = differenceInCalendarDays(today, sd);    // positive = past

    if (diff === 0)        return 'today';
    if (diff > 0 && diff <= 90) return 'backdate';
    if (diff > 90)         return 'old';
    return 'future';                                       // diff < 0
};

const DATE_PRESETS: { label: string; days: number }[] = [
    { label: 'Today',        days: 0 },
    { label: 'Yesterday',    days: 1 },
    { label: '7 days ago',   days: 7 },
    { label: '30 days ago',  days: 30 },
    { label: '3 months ago', days: 90 },
];

interface JournalDatePickerProps {
    date:      Date | undefined;
    onChange:  (d: Date) => void;
}

const JournalDatePicker: React.FC<JournalDatePickerProps> = ({ date, onChange }) => {
    const [open, setOpen] = useState(false);

    const today    = startOfDay(new Date());
    const state    = date && isValid(date) ? classifyDate(date) : null;
    const diffDays = date && isValid(date) ? differenceInCalendarDays(today, startOfDay(date)) : 0;

    /* Colour / label by state */
    const stateConfig: Record<DateState, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
        today: {
            label:  'Today',
            color:  BRAND.green,
            bg:     BRAND.greenMuted,
            border: BRAND.greenLight,
            icon:   CalendarCheck,
        },
        backdate: {
            label:  `Backdated · ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`,
            color:  BRAND.amber,
            bg:     BRAND.amberLight,
            border: BRAND.amberBorder,
            icon:   History,
        },
        old: {
            label:  `Far backdated · ${diffDays} days ago`,
            color:  BRAND.orange,
            bg:     '#fff5f5',
            border: '#fca5a5',
            icon:   AlertTriangle,
        },
        future: {
            label:  'Future date (not allowed)',
            color:  '#6b7280',
            bg:     '#f9fafb',
            border: '#e5e7eb',
            icon:   CalendarDays,
        },
    };

    const cfg = state ? stateConfig[state] : null;
    const Icon = cfg?.icon ?? CalendarDays;

    const displayLabel = date && isValid(date)
        ? format(date, 'EEE, dd MMM yyyy')
        : 'Select entry date…';

    return (
        <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" style={{ color: BRAND.green }} />
                Entry Date
                <span style={{ color: BRAND.orange }} className="text-xs">*</span>
            </label>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full justify-between h-10 px-3 font-normal text-sm"
                        style={cfg ? { borderColor: cfg.border, boxShadow: `0 0 0 1px ${cfg.border}` } : undefined}
                    >
                        <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: cfg?.color ?? '#9ca3af' }} />
                            <span className={date ? 'text-gray-800' : 'text-gray-400'}>{displayLabel}</span>
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0 shadow-xl" align="start" sideOffset={6}>
                    {/* Quick presets */}
                    <div className="p-3 border-b bg-gray-50">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick select</p>
                        <div className="flex flex-wrap gap-1.5">
                            {DATE_PRESETS.map(p => {
                                const d     = subDays(today, p.days);
                                const isSel = date && isValid(date) && format(date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
                                return (
                                    <button
                                        key={p.label}
                                        type="button"
                                        onClick={() => { onChange(d); setOpen(false); }}
                                        className="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors"
                                        style={isSel
                                            ? { backgroundColor: BRAND.green, color: '#fff', borderColor: BRAND.green }
                                            : { borderColor: '#d1d5db', color: '#374151', backgroundColor: '#fff' }}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Calendar — future dates disabled */}
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={d => { if (d && !isAfter(startOfDay(d), today)) { onChange(d); setOpen(false); } }}
                        disabled={d => isAfter(startOfDay(d), today)}
                        defaultMonth={date ?? today}
                        className="p-3"
                        initialFocus
                    />

                    {/* Backdating info footer */}
                    <div className="p-3 border-t bg-gray-50 text-[11px] text-gray-500 flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                        Future dates are disabled. Backdated entries are allowed and will be flagged for audit.
                    </div>
                </PopoverContent>
            </Popover>

            {/* Contextual badge below the trigger */}
            {cfg && (
                <div
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border w-fit"
                    style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                </div>
            )}

            {/* Extra warning for very old backdates */}
            {state === 'old' && (
                <div
                    className="flex items-start gap-2 text-xs rounded-lg border p-2.5 mt-1"
                    style={{ backgroundColor: '#fff5f5', borderColor: '#fca5a5', color: BRAND.orange }}
                >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                        <strong>Far backdated entry ({diffDays} days).</strong> Entries older than 90 days
                        may affect closed periods. Ensure this is intentional and approved.
                    </span>
                </div>
            )}

            {/* Backdate advisory (mild) */}
            {state === 'backdate' && diffDays > 7 && (
                <div
                    className="flex items-start gap-2 text-xs rounded-lg border p-2.5 mt-1"
                    style={{ backgroundColor: BRAND.amberLight, borderColor: BRAND.amberBorder, color: BRAND.amber }}
                >
                    <History className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                        Backdated entry. This will be recorded against <strong>{format(date!, 'dd MMM yyyy')}</strong>.
                        A backdating note will be attached to the voucher automatically.
                    </span>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   BALANCE INDICATOR
═══════════════════════════════════════════════════════════════════════════════ */
const BalanceIndicator = ({
    totalDebits,
    totalCredits,
    isBalanced,
}: {
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
}) => {
    const diff = Math.abs(totalDebits - totalCredits);

    if (totalDebits === 0 && totalCredits === 0) return null;

    return (
        <div
            className="flex items-center justify-between rounded-xl px-4 py-3 border text-sm font-medium transition-all"
            style={isBalanced
                ? { backgroundColor: BRAND.greenMuted, borderColor: BRAND.greenLight, color: BRAND.green }
                : { backgroundColor: '#fff5f5', borderColor: '#fca5a5', color: BRAND.orange }}
        >
            <div className="flex items-center gap-2">
                {isBalanced
                    ? <><CheckCircle className="h-4 w-4" /> Entry is balanced — ready to save</>
                    : <><AlertTriangle className="h-4 w-4" /> Unbalanced by{' '}
                        <span className="font-mono font-bold">
                            ₦{diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </>
                }
            </div>

            {/* Mini DR/CR summary */}
            <div className="flex items-center gap-4 text-xs font-mono">
                <span>
                    DR <span className="font-bold">
                        ₦{totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </span>
                <span className="text-gray-400">·</span>
                <span>
                    CR <span className="font-bold">
                        ₦{totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </span>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════════════════ */
const NewJournalEntryPage = () => {
    const { toast }  = useToast();
    const { user }   = useAuth();
    const router     = useRouter();

    const [entryDate,  setEntryDate]  = useState<Date | undefined>(new Date());
    const [narration,  setNarration]  = useState('');
    const [lines, setLines] = useState<JournalEntryLine[]>([
        { id: 1, accountId: '', debit: 0, credit: 0, description: '' },
        { id: 2, accountId: '', debit: 0, credit: 0, description: '' },
    ]);
    const [isLoading,        setIsLoading]        = useState(false);
    const [accounts,         setAccounts]         = useState<Account[]>([]);
    const [allPayees,        setAllPayees]        = useState<Payee[]>([]);
    const [isOpeningEntry,   setIsOpeningEntry]   = useState(false);

    /* ── Data fetch ── */
    useEffect(() => {
        if (!user?.company_id) return;
        (async () => {
            try {
                const res  = await fetch(`https://hariindustries.net/api/clearbook/get-chart-of-accounts.php?company_id=${user.company_id}`);
                const data = await res.json();
                const arr  = Array.isArray(data) ? data : data.accounts ?? [];
                setAccounts(arr);
            } catch (e: any) {
                toast({ variant: 'destructive', title: 'Failed to load Chart of Accounts', description: e.message });
            }
        })();
    }, [user, toast]);

    useEffect(() => {
        if (!user?.company_id) return;
        (async () => {
            try {
                const res  = await fetch(`https://hariindustries.net/api/clearbook/get-payees.php?company_id=${user.company_id}`);
                const data: Payee[] = await res.json();
                setAllPayees(data);
            } catch {
                toast({ variant: 'destructive', title: 'Failed to load payees.' });
            }
        })();
    }, [user, toast]);

    /* ── Control accounts ── */
    const controlAccounts = useMemo(() => ({
        customer: accounts.find(a => a.is_control_account && a.account_type === 'Customer')?.account_code,
        supplier: accounts.find(a => a.is_control_account && a.account_type === 'Supplier')?.account_code,
    }), [accounts]);

    /* ── Line handlers ── */
    const handleAddLine = () =>
        setLines(prev => [...prev, { id: Date.now(), accountId: '', debit: 0, credit: 0, description: '' }]);

    const handleRemoveLine = (id: number) => {
        if (lines.length <= 2) {
            toast({ variant: 'destructive', title: 'Minimum two lines required.' });
            return;
        }
        setLines(prev => prev.filter(l => l.id !== id));
    };

    const handleLineChange = (id: number, field: keyof JournalEntryLine, value: string | number) => {
        setLines(prev => prev.map(line => {
            if (line.id !== id) return line;
            const updated = { ...line, [field]: value };

            if (field === 'accountId') {
                updated.payeeId = undefined;
                updated.payees  = [];
                if (value === controlAccounts.customer) updated.payees = allPayees.filter(p => p.type === 'Customer');
                if (value === controlAccounts.supplier) updated.payees = allPayees.filter(p => p.type === 'Supplier');
            } else if (field === 'debit')  { updated.credit = 0; }
              else if (field === 'credit') { updated.debit  = 0; }

            return updated;
        }));
    };

    /* ── Totals ── */
    const { totalDebits, totalCredits, isBalanced } = useMemo(() => {
        const dr = lines.reduce((s, l) => s + (parseFloat(String(l.debit))  || 0), 0);
        const cr = lines.reduce((s, l) => s + (parseFloat(String(l.credit)) || 0), 0);
        return { totalDebits: dr, totalCredits: cr, isBalanced: Math.abs(dr - cr) < 0.01 && dr > 0 };
    }, [lines]);

    /* ── Backdating flag ── */
    const isBackdated = useMemo(() => {
        if (!entryDate || !isValid(entryDate)) return false;
        return isBefore(startOfDay(entryDate), startOfDay(new Date()));
    }, [entryDate]);

    /* ── Save ── */
    const handleSaveAsDraft = async () => {
        if (!entryDate || !narration.trim()) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a date and narration.' });
            return;
        }
        if (!isBalanced) {
            toast({ variant: 'destructive', title: 'Unbalanced Entry', description: 'Debits and credits must be equal.' });
            return;
        }

        setIsLoading(true);
        const dateState = classifyDate(entryDate);

        const payload = {
            entryDate:        format(entryDate, 'yyyy-MM-dd'),
            narration:        isBackdated
                ? `[BACKDATED ${format(entryDate, 'dd-MMM-yyyy')}] ${narration}`
                : narration,
            lines: lines.map(l => {
                const acc = accounts.find(a => a.account_code === l.accountId);
                return {
                    debit:        l.debit,
                    credit:       l.credit,
                    description:  l.description,
                    payeeId:      l.payeeId,
                    account_code: acc?.account_code,
                    account_name: acc?.account_name,
                    account_type: acc?.account_type,
                };
            }),
            totalDebits,
            totalCredits,
            user_id:           user?.uid,
            company_id:        user?.company_id,
            status:            'Draft',
            is_opening_entry:  isOpeningEntry,
            is_backdated:      isBackdated,
            backdated_by_days: isBackdated ? differenceInCalendarDays(startOfDay(new Date()), startOfDay(entryDate)) : 0,
        };

        try {
            const res    = await fetch('https://hariindustries.net/api/clearbook/journal-entry.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();

            if (!res.ok || !result.success) throw new Error(result.error || 'Unknown server error');

            toast({
                title:       '✓ Draft saved',
                description: `Voucher #${result.journalVoucherId}${isBackdated ? ' (backdated)' : ''} saved.`,
            });
            router.push('/journal');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed to save draft', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Render ── */
    return (
        <div className="space-y-6">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Create Journal Entry
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Record a manual accounting entry. All entries are saved as drafts first.
                    </p>
                </div>
                <Link href="/journal" passHref>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Journal
                    </Button>
                </Link>
            </div>

            {/* ── Main card ── */}
            <Card className="border border-gray-200 border-t-4" style={{ borderTopColor: BRAND.green }}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold" style={{ color: BRAND.green }}>
                        Journal Voucher Details
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">

                    {/* ── Entry metadata row ── */}
                    <div className="grid md:grid-cols-3 gap-6 pb-6 border-b border-gray-100">

                        {/* DATE PICKER — the main enhancement */}
                        <div>
                            <JournalDatePicker date={entryDate} onChange={setEntryDate} />
                        </div>

                        {/* Narration */}
                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                Main Narration
                                <span style={{ color: BRAND.orange }} className="text-xs">*</span>
                            </label>
                            <Textarea
                                placeholder="e.g. To record office supply expenses for July"
                                value={narration}
                                rows={3}
                                onChange={e => setNarration(e.target.value)}
                                className="resize-none text-sm"
                            />
                            {isBackdated && narration && (
                                <p className="text-[11px] text-amber-600 flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    A "[BACKDATED …]" prefix will be automatically prepended to the saved narration.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Journal lines table ── */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50">
                                    <TableHead className="w-1/2">Account &amp; Line Description</TableHead>
                                    <TableHead className="text-right">Debit (DR)</TableHead>
                                    <TableHead className="text-right">Credit (CR)</TableHead>
                                    <TableHead className="w-[48px]" />
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {lines.map((line, idx) => (
                                    <TableRow key={line.id} className="group">
                                        <TableCell className="align-top space-y-2 py-3">
                                            {/* Row number */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-mono w-4 text-right shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <Select
                                                    value={line.accountId}
                                                    onValueChange={v => handleLineChange(line.id, 'accountId', v)}
                                                >
                                                    <SelectTrigger className="text-sm">
                                                        <SelectValue placeholder="Select account…" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {accounts
                                                            .filter(a => a?.account_code)
                                                            .map(a => (
                                                                <SelectItem key={a.account_code} value={String(a.account_code)}>
                                                                    <span className="font-mono text-xs text-gray-400 mr-1">{a.account_code}</span>
                                                                    {a.account_name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Payee sub-select */}
                                            {line.payees && line.payees.length > 0 && (
                                                <div className="pl-6 border-l-2" style={{ borderColor: BRAND.blue }}>
                                                    <Select
                                                        value={line.payeeId}
                                                        onValueChange={v => handleLineChange(line.id, 'payeeId', v)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder={`Select ${line.accountId === controlAccounts.customer ? 'Customer' : 'Supplier'}…`} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {line.payees.map(p => (
                                                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {/* Line description */}
                                            <div className="pl-6">
                                                <Input
                                                    className="text-xs h-7"
                                                    placeholder="Optional line description…"
                                                    value={line.description || ''}
                                                    onChange={e => handleLineChange(line.id, 'description', e.target.value)}
                                                />
                                            </div>
                                        </TableCell>

                                        {/* Debit */}
                                        <TableCell className="align-top py-3">
                                            <Input
                                                type="number"
                                                className="text-right font-mono h-9"
                                                placeholder="0.00"
                                                value={line.debit || ''}
                                                onChange={e => handleLineChange(line.id, 'debit', e.target.value)}
                                                onFocus={e => e.target.select()}
                                                style={line.debit > 0 ? { borderColor: BRAND.blue, color: BRAND.blue } : undefined}
                                            />
                                        </TableCell>

                                        {/* Credit */}
                                        <TableCell className="align-top py-3">
                                            <Input
                                                type="number"
                                                className="text-right font-mono h-9"
                                                placeholder="0.00"
                                                value={line.credit || ''}
                                                onChange={e => handleLineChange(line.id, 'credit', e.target.value)}
                                                onFocus={e => e.target.select()}
                                                style={line.credit > 0 ? { borderColor: BRAND.green, color: BRAND.green } : undefined}
                                            />
                                        </TableCell>

                                        {/* Remove */}
                                        <TableCell className="align-top py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleRemoveLine(line.id)}
                                            >
                                                <Trash2 className="h-4 w-4" style={{ color: BRAND.orange }} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>

                            <TFoot>
                                <TableRow className="bg-gray-50 font-semibold">
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={handleAddLine}
                                            style={{ borderColor: BRAND.green, color: BRAND.green }}
                                            className="hover:bg-green-50">
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Line
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-base" style={{ color: BRAND.blue }}>
                                        ₦{totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-base" style={{ color: BRAND.green }}>
                                        ₦{totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TFoot>
                        </Table>
                    </div>

                    {/* ── Balance indicator ── */}
                    <BalanceIndicator
                        totalDebits={totalDebits}
                        totalCredits={totalCredits}
                        isBalanced={isBalanced}
                    />
                </CardContent>

                <CardFooter className="border-t justify-between items-center gap-4 flex-wrap">
                    {/* Backdating audit trail note */}
                    {isBackdated && (
                        <p className="text-xs flex items-center gap-1.5" style={{ color: BRAND.amber }}>
                            <History className="h-3.5 w-3.5" />
                            This entry will be flagged as backdated in the audit trail.
                        </p>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                        <Link href="/journal" passHref>
                            <Button variant="outline" size="sm" disabled={isLoading}>Cancel</Button>
                        </Link>
                        <Button
                            size="sm"
                            onClick={handleSaveAsDraft}
                            disabled={!isBalanced || isLoading}
                            className="min-w-[160px] text-white font-semibold"
                            style={{ backgroundColor: BRAND.green }}
                        >
                            {isLoading
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                                : isBackdated
                                    ? <><History className="mr-2 h-4 w-4" /> Save Backdated Draft</>
                                    : <><CheckCircle className="mr-2 h-4 w-4" /> Save as Draft</>
                            }
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
};

export default NewJournalEntryPage;
