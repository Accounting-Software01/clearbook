'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash, Lock, Unlock, Bell, FileText, Shield, Briefcase, Banknote, History, Loader2, AlertTriangle, Printer, X, Download, FileDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { createPaymentVoucher, getJournalVouchers, updateVoucherStatus, getVoucherOverview, setGlobalLock } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import RecentVouchersTable from '@/components/ui/RecentVouchersTable';
import IndividualVoucherPrint from '@/components/IndividualVoucherPrint';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// Interfaces
interface VoucherLine { id: number; accountId: string; amount: number; type: 'debit' | 'credit'; }
interface JournalVoucher { id: number; voucher_number: string; entry_date: string; narration: string; total_debits: number; status: string; user_id: string;}
interface VoucherOverview { pending_count: number; is_locked: boolean; }

const NewPaymentVoucherPage = () => {
    // Hooks
    const { toast } = useToast();
    const { user, isLoading: userLoading } = useAuth();
    const printRef = useRef<HTMLDivElement>(null);

    // State
    const [view, setView] = useState('form');
    const [voucherDate, setVoucherDate] = useState<Date | undefined>(new Date());
    const [narration, setNarration] = useState('');
    const [lines, setLines] = useState<VoucherLine[]>([
        { id: 1, accountId: '', amount: 0, type: 'debit' },
        { id: 2, accountId: '', amount: 0, type: 'credit' }
    ]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [journalVouchers, setJournalVouchers] = useState<JournalVoucher[]>([]);
    const [overview, setOverview] = useState<VoucherOverview>({ pending_count: 0, is_locked: true });
    const [selectedVoucher, setSelectedVoucher] = useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isFetchingPreview, setIsFetchingPreview] = useState(false);

    // Roles & Permissions
    const isAdmin = user?.role === 'admin';
    const isAccountant = user?.role === 'accountant';

    // Download Handlers
    const handleDownloadPdf = async () => {
        if (!printRef.current) {
            toast({ variant: 'destructive', title: 'Error', description: 'Preview content not available.' });
            return;
        }

        try {
            const canvas = await html2canvas(printRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`voucher-${selectedVoucher?.voucher_number || 'download'}.pdf`);
        } catch (error) {
            toast({ variant: 'destructive', title: 'PDF Error', description: 'Failed to generate PDF.' });
        }
    };

    const handleDownloadExcel = () => {
        if (!selectedVoucher) {
            toast({ variant: 'destructive', title: 'Error', description: 'Voucher data not available.' });
            return;
        }

        const accountsMap = new Map(chartOfAccounts.map(acc => [acc.code, acc.name]));
        const header = [
            ['Voucher No', selectedVoucher.voucher_number],
            ['Date', selectedVoucher.entry_date],
            ['Company', selectedVoucher.company_name],
            ['Narration', selectedVoucher.narration],
            [], // Spacer
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


    // Show Print Preview
    const handleShowPrintPreview = async (voucher: JournalVoucher) => {
        if (!user?.company_id) return;
        setIsFetchingPreview(true);
        try {
            const baseUrl = 'https://hariindustries.net/clearbook//get_voucher_details.php';
            const params = new URLSearchParams({ voucher_id: String(voucher.id), company_id: user.company_id });
            const response = await fetch(`${baseUrl}?${params.toString()}`);
            if (!response.ok) throw new Error(`Server responded with status ${response.status}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Could not fetch voucher details.');
            setSelectedVoucher(data.voucher);
            setIsPreviewOpen(true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Fetch Error', description: error.message });
        } finally {
            setIsFetchingPreview(false);
        }
    };

    // Data Fetching
    const fetchLockStatus = useCallback(async (companyId: string) => {
        try {
            const fetchedOverview = await getVoucherOverview(companyId);
            setOverview(fetchedOverview);
        } catch (error) {
            setOverview({ pending_count: 0, is_locked: true });
            toast({ title: "Security Alert", description: "Could not verify form status. New entries disabled.", variant: "destructive" });
        }
    }, [toast]);

    const fetchVoucherList = useCallback(async (companyId: string) => {
        try {
            const fetchedVouchers = await getJournalVouchers(companyId);
            setJournalVouchers(fetchedVouchers);
        } catch (error) {
            toast({ title: "Warning", description: "Could not fetch recent vouchers.", variant: "destructive" });
        }
    }, [toast]);

    useEffect(() => {
        if (user?.company_id && !userLoading) {
            const loadInitialData = async () => {
                setInitialLoading(true);
                await Promise.all([fetchLockStatus(user.company_id), fetchVoucherList(user.company_id)]);
                setInitialLoading(false);
            };
            loadInitialData();
        }
    }, [user, userLoading, fetchLockStatus, fetchVoucherList]);

    // Memoized Values
    const allAccounts = useMemo(() => chartOfAccounts, []);
    const totalDebits = useMemo(() => lines.reduce((acc, line) => line.type === 'debit' ? acc + line.amount : acc, 0), [lines]);
    const totalCredits = useMemo(() => lines.reduce((acc, line) => line.type === 'credit' ? acc + line.amount : acc, 0), [lines]);
    const isBalanced = useMemo(() => totalDebits > 0 && totalDebits === totalCredits, [totalDebits, totalCredits]);
    const isFormSubmittable = useMemo(() => isBalanced && !isSubmitting && !overview.is_locked, [isBalanced, isSubmitting, overview.is_locked]);

    // Form Handlers
    const handleLineChange = (id: number, field: keyof VoucherLine, value: any) => setLines(lines.map(line => line.id === id ? { ...line, [field]: value } : line));
    const addLine = () => setLines([...lines, { id: Date.now(), accountId: '', amount: 0, type: 'debit' }]);
    const removeLine = (id: number) => lines.length > 2 && setLines(lines.filter(line => line.id !== id));
    const resetForm = () => {
        setVoucherDate(new Date());
        setNarration('');
        setLines([{ id: 1, accountId: '', amount: 0, type: 'debit' }, { id: 2, accountId: '', amount: 0, type: 'credit' }]);
    };

    // Main Actions
    const handleSubmit = async () => {
        if (!user || !user.uid || !user.company_id) return toast({ title: "Authentication Error", variant: "destructive" });
        if (overview.is_locked) return toast({ title: "Form Locked", description: "New entries are disabled.", variant: "destructive" });
        if (!isFormSubmittable) return toast({ title: "Incomplete or Unbalanced", variant: "destructive" });

        setIsSubmitting(true);
        try {
            await createPaymentVoucher({
                voucher_date: voucherDate!.toISOString().split('T')[0],
                narration: narration,
                company_id: user.company_id,
                user_id: user.uid, 
                lines: lines.map(l => ({ account_id: l.accountId, amount: l.amount, type: l.type }))
            });
            toast({ title: "Success!", description: "Voucher created successfully." });
            resetForm();
            await fetchVoucherList(user.company_id);
            setView(isAdmin ? 'trail' : (isAccountant ? 'recent' : 'form'));
        } catch (error: any) {
            toast({ title: "Submission Error", description: error.message, variant: "destructive"});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleGlobalLock = async (lockState: boolean) => {
        if (!user?.company_id) return;
        try {
            await setGlobalLock(user.company_id, lockState);
            setOverview(prev => ({ ...prev, is_locked: lockState }));
            toast({ title: "Success", description: `Form is now ${lockState ? 'LOCKED' : 'UNLOCKED'}.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update lock state.", variant: "destructive" });
        }
    };

    const handleApproveVoucher = async (id: number, status: string) => {
        if (!user?.company_id) return;
        try {
            await updateVoucherStatus(String(id), { status });
            await Promise.all([fetchLockStatus(user.company_id), fetchVoucherList(user.company_id)]);
            toast({ title: "Success", description: `Voucher status updated.` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update voucher status.", variant: "destructive" });
        }
    };

    // Navigation
    const navTabs = useMemo(() => {
        const tabs = ['form'];
        if (isAdmin) tabs.push('trail');
        if (isAccountant) tabs.push('recent');
        return tabs;
    }, [isAdmin, isAccountant]);

    const activeTabIndex = navTabs.indexOf(view);
    const underlineStyle = { width: `${100 / navTabs.length}%`, left: `${(100 / navTabs.length) * activeTabIndex}%` };

    // Renderers
    if (userLoading || initialLoading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin mr-3"/> Loading...</div>;
    }

    const renderForm = () => (
        <Card className="relative overflow-hidden">
             {overview.is_locked && (
                <div className="absolute inset-0 bg-slate-200/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-10">
                    <div className="p-5 bg-white rounded-full shadow-lg mb-6"><Lock className="h-12 w-12 text-destructive"/></div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Form Locked</h2>
                    <p className="text-slate-600 max-w-sm">New entries are disabled by an administrator.</p>
                </div>
            )}
            <CardHeader>
                <CardTitle>New Journal Voucher</CardTitle>
                <CardDescription>Create a balanced debit/credit entry to submit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="voucher-date">Voucher Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left", !voucherDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {voucherDate ? format(voucherDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={voucherDate} onSelect={setVoucherDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="narration">Narration</Label>
                        <Input id="narration" value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="e.g., Office rent for May"/>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Voucher Lines</h3>
                    <div className="space-y-4">
                        {lines.map(line => (
                            <div key={line.id} className="grid grid-cols-12 gap-x-4 items-end p-3 bg-gray-50/80 rounded-lg border">
                                <div className="col-span-12 md:col-span-5"><Label>Account</Label><Select value={line.accountId} onValueChange={(v) => handleLineChange(line.id, 'accountId', v)}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{allAccounts.map(a => <SelectItem key={a.code} value={a.code}>{a.code} - {a.name}</SelectItem>)}</SelectContent></Select></div>
                                <div className="col-span-6 md:col-span-3"><Label>Type</Label><Select value={line.type} onValueChange={(v) => handleLineChange(line.id, 'type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="debit">Debit</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent></Select></div>
                                <div className="col-span-6 md:col-span-3"><Label>Amount</Label><Input type="number" value={line.amount} onChange={(e) => handleLineChange(line.id, 'amount', parseFloat(e.target.value) || 0)} /></div>
                                <div className="col-span-12 md:col-span-1"><Button variant="ghost" size="icon" onClick={() => removeLine(line.id)} disabled={lines.length <= 2}><Trash className="h-4 w-4" /></Button></div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addLine} className="mt-4"><Plus className="mr-2 h-4 w-4" /> Add Line</Button>
                </div>
            </CardContent>
            <CardFooter className="bg-gray-50/80 border-t p-6 flex justify-between items-center">
                <div className="grid grid-cols-2 gap-x-6 text-center">
                     <div><p className="text-sm">Total Debits</p><p className="font-bold">{totalDebits.toLocaleString(undefined, {style: 'currency', currency: 'NGN'})}</p></div>
                    <div><p className="text-sm">Total Credits</p><p className={cn("font-bold", !isBalanced ? 'text-destructive' : 'text-green-600')}>{totalCredits.toLocaleString(undefined, {style: 'currency', currency: 'NGN'})}</p></div>
                </div>
                 <div className="flex items-center gap-4">
                    {!isBalanced && totalDebits > 0 && <div className="flex items-center text-amber-600"><AlertTriangle className="mr-2 h-4 w-4" />Unbalanced</div>}
                    <Button onClick={handleSubmit} disabled={!isFormSubmittable} size="lg">{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Submitting...</> : 'Submit'}</Button>
                 </div>
            </CardFooter>
        </Card>
    );

    const renderApprovalControls = () => (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Access Control</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold">{overview.is_locked ? 'Locked' : 'Unlocked'}</div>
                         <p className="text-xs text-muted-foreground mb-4">{overview.is_locked ? 'New entries disabled' : 'New entries enabled'}</p>
                        <Button variant={overview.is_locked ? "secondary" : "destructive"} onClick={() => handleGlobalLock(!overview.is_locked)} className="w-full">
                            {overview.is_locked ? <Unlock className="mr-2 h-4 w-4"/> : <Lock className="mr-2 h-4 w-4"/>} {overview.is_locked ? 'Unlock' : 'Lock'}
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle><Bell className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-amber-600">{overview.pending_count}</div><p className="text-xs text-muted-foreground">vouchers require attention</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Vouchers Today</CardTitle><Banknote className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{journalVouchers.filter(v => format(new Date(v.entry_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}</div><p className="text-xs text-muted-foreground">vouchers created today</p></CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle>Voucher Approval Queue</CardTitle><CardDescription>Review, approve, or reject vouchers.</CardDescription></CardHeader>
                <CardContent><RecentVouchersTable vouchers={journalVouchers} showActions={true} onApprove={handleApproveVoucher} onPrint={handleShowPrintPreview} companyId={user!.company_id!} /></CardContent>
            </Card>
        </div>
    );
    
    const renderAccountantView = () => (
        <Card>
            <CardHeader>
                <CardTitle>Recent Vouchers</CardTitle>
                <CardDescription>A view of all recent vouchers and their approval status.</CardDescription>
            </CardHeader>
            <CardContent>
                <RecentVouchersTable vouchers={journalVouchers} showActions={true} onPrint={handleShowPrintPreview} companyId={user!.company_id!} />
            </CardContent>
        </Card>
    );

    const renderPermissionDenied = () => (
         <Card className="w-full max-w-4xl mx-auto">
             <CardHeader className="text-center"><CardTitle className="text-2xl text-destructive">Access Denied</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center p-16 space-y-4"><div className="p-4 bg-destructive/10 rounded-full"><Shield className="h-16 w-16 text-destructive" /></div><p>You do not have permission to view this section.</p></CardContent>
        </Card>
    );

    return (
        <div className="bg-gray-50/50 min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                 <div className="w-full flex justify-center">
                    <div className="relative flex border-b-2 border-gray-200">
                        {navTabs.map(tab => (
                            <button key={tab} onClick={() => setView(tab)} className={cn("flex items-center px-8 py-3 text-sm font-medium transition-colors", view === tab ? 'text-green-600' : 'text-gray-500 hover:text-gray-700')}>
                                {tab === 'form' && <FileText className="mr-2 h-4 w-4"/>}
                                {tab === 'trail' && <Shield className="mr-2 h-4 w-4"/>}
                                {tab === 'recent' && <History className="mr-2 h-4 w-4"/>}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                        <div className="absolute bottom-[-2px] h-0.5 bg-green-600 transition-all" style={underlineStyle} />
                    </div>
                </div>
                <div>
                    {view === 'form' && renderForm()}
                    {view === 'trail' && (isAdmin ? renderApprovalControls() : renderPermissionDenied())}
                    {view === 'recent' && (isAccountant || isAdmin ? renderAccountantView() : renderPermissionDenied())}
                </div>
                
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0">
                        <DialogHeader className="flex-row items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
                            <DialogTitle>Voucher Preview</DialogTitle>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button disabled={isFetchingPreview || !selectedVoucher}><Download className="mr-2 h-4 w-4" /> Download</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={handleDownloadPdf}>Download as PDF</DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDownloadExcel}>Download as Excel</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                           <div ref={printRef} className="max-w-4xl mx-auto bg-white shadow-lg rounded-sm">
                             {isFetchingPreview ? (
                                <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin"/></div>
                             ) : selectedVoucher ? (
                                <IndividualVoucherPrint voucher={selectedVoucher} chartOfAccounts={allAccounts} />
                             ) : (
                                <div className="text-center p-8">Could not load voucher preview.</div>
                             )}
                           </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default NewPaymentVoucherPage;
