
'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, Loader2, ShieldX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, isBefore, startOfDay, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { postJournalEntry } from '@/lib/api';
import type { JournalSettings, JournalVoucher } from '@/lib/api';
import type { Payee } from '@/types/payee';
import { chartOfAccounts as allAccounts } from '@/lib/chart-of-accounts';

interface JournalEntryLine {
    id: number;
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    payeeId?: string;
    payees?: Payee[];
}

interface JournalFormProps {
    settings: JournalSettings | null;
    allPayees: Payee[];
    companyId: number;
    userId: number;
    onEntryPosted: () => void;
}

export const JournalForm: React.FC<JournalFormProps> = ({ settings, allPayees, companyId, userId, onEntryPosted }) => {
    const { language } = useLanguage();
    const { toast } = useToast();
    const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
    const [narration, setNarration] = useState('');
    const [lines, setLines] = useState<JournalEntryLine[]>([{ id: 1, accountId: '', debit: 0, credit: 0 }, { id: 2, accountId: '', debit: 0, credit: 0 }]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const chartOfAccounts = useMemo(() => {
        if (!settings) return [];
        const restricted = (settings.restrictedAccounts || '').split(',').map(s => s.trim());
        return allAccounts.filter(acc => !restricted.includes(acc.code));
    }, [settings, allAccounts]);

    const handleAddLine = () => setLines([...lines, { id: Date.now(), accountId: '', debit: 0, credit: 0 }]);
    const handleRemoveLine = (id: number) => lines.length > 2 ? setLines(lines.filter(line => line.id !== id)) : toast({ variant: 'destructive', title: 'Minimum two lines required.' });

    const handleLineChange = (id: number, field: keyof Omit<JournalEntryLine, 'payees'>, value: string | number) => {
        setLines(lines.map(line => {
            if (line.id !== id) return line;
            const updatedLine = { ...line };
            switch (field) {
                case 'accountId':
                    updatedLine.accountId = value as string;
                    updatedLine.payeeId = undefined;
                    updatedLine.payees = (value === '101200') ? allPayees.filter(p => p.type === language.customer) : (value === '201020') ? allPayees.filter(p => p.type === language.supplier) : [];
                    break;
                case 'debit':
                    updatedLine.debit = parseFloat(value as string) || 0;
                    if (updatedLine.debit > 0) updatedLine.credit = 0;
                    break;
                case 'credit':
                    updatedLine.credit = parseFloat(value as string) || 0;
                    if (updatedLine.credit > 0) updatedLine.debit = 0;
                    break;
                default:
                    // @ts-ignore
                    updatedLine[field] = value;
            }
            return updatedLine;
        }));
    };

    const { totalDebits, totalCredits, isBalanced } = useMemo(() => {
        const debits = lines.reduce((acc, line) => acc + line.debit, 0);
        const credits = lines.reduce((acc, line) => acc + line.credit, 0);
        return { totalDebits: debits, totalCredits: credits, isBalanced: Math.abs(debits - credits) < 0.01 && debits > 0 };
    }, [lines]);

    const resetForm = useCallback(() => {
        setEntryDate(new Date());
        setNarration('');
        setLines([{ id: 1, accountId: '', debit: 0, credit: 0 }, { id: 2, accountId: '', debit: 0, credit: 0 }]);
    }, []);

    const handlePostEntry = async () => {
        if (!entryDate || !narration.trim() || !isBalanced) return toast({ variant: 'destructive', title: 'Incomplete Data', description: 'Please fill all fields and ensure the entry is balanced.' });
        if (!settings?.manualJournalsEnabled) return toast({ variant: 'destructive', title: 'Submission Error', description: 'Cannot submit. Entries may be disabled.' });
    
        setIsSubmitting(true);
        const payload = { entryDate: format(entryDate, 'yyyy-MM-dd'), narration, lines: lines.map(({ id, payees, ...rest }) => rest), company_id: companyId, user_id: userId };
    
        try {
            const result = await postJournalEntry(payload);
            toast({ title: result.status === 'posted' ? 'Journal Posted!' : 'Journal Submitted', description: `Voucher #${result.voucher_number} recorded.` });
            resetForm();
            onEntryPosted();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDateDisabled = useCallback((date: Date): boolean => {
        if (!settings) return true;
        const today = startOfDay(new Date());
        const checkDate = startOfDay(date);
        if (settings.yearEndLockDate && checkDate <= startOfDay(parseISO(settings.yearEndLockDate))) return true;
        if (settings.periodLockDate && checkDate <= startOfDay(parseISO(settings.periodLockDate))) return true;
        if (isBefore(checkDate, today)) {
            if (!settings.allowBackdating) return true;
            if (settings.backdatingLimitDays > 0) return isBefore(checkDate, subDays(today, settings.backdatingLimitDays));
        }
        return false;
    }, [settings]);

    return (
        <Card className="relative overflow-hidden">
             {settings && !settings.manualJournalsEnabled && (
                <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-10">
                     <div className="p-5 bg-white rounded-full shadow-lg mb-6"><ShieldX className="h-12 w-12 text-destructive"/></div>
                     <h2 className="text-2xl font-bold text-slate-800 mb-2">Manual Entries Disabled</h2>
                     <p className="text-slate-600 max-w-sm">An administrator has disabled manual journal entries.</p>
                 </div>
             )}
            <CardHeader>
                <CardTitle>Journal Entry Voucher</CardTitle>
                <CardDescription>Record a new manual journal entry, following all administrative rules and period locks.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                    <div className="space-y-2"><label className="font-semibold text-sm">Entry Date</label><DatePicker date={entryDate} onDateChange={setEntryDate} disabled={isDateDisabled} /></div>
                    <div className="md:col-span-2 space-y-2"><label className="font-semibold text-sm">Narration / Description</label><Textarea placeholder="e.g., To record office supply expenses for July" value={narration} onChange={(e) => setNarration(e.target.value)} /></div>
                </div>
                <div className="overflow-x-auto">
                    {/* Table Component would go here */}
                </div>
            </CardContent>
            <CardFooter className="justify-end bg-slate-50 py-4 px-6">
                <Button size="lg" onClick={handlePostEntry} disabled={!isBalanced || isSubmitting || !settings?.manualJournalsEnabled}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {settings?.requireApproval ? 'Submit for Approval' : `Post ${language.journalEntry}`}
                </Button>
            </CardFooter>
        </Card>
    );
};
