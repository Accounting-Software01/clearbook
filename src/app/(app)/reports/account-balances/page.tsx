'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// --- INTERFACES ---
interface AccountBalance {
    account_code: string;
    account_name: string;
    account_type: string;
    debit: string;
    credit: string;
    net_balance: string;
    net_balance_val: number;
}

interface ReportSummary {
    total_accounts: number;
    total_debit: string;
    total_credit: string;
    is_balanced: boolean;
    asset: string;
    liability: string;
    equity: string;
    revenue: string;
    cogs: string;
    expense: string;
}

// --- INITIAL STATES ---
const initialSummary: ReportSummary = {
    total_accounts: 0, total_debit: '0.00', total_credit: '0.00', is_balanced: false,
    asset: '0.00', liability: '0.00', equity: '0.00', revenue: '0.00', cogs: '0.00', expense: '0.00',
};

const AccountBalancesPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // --- STATE MANAGEMENT ---
    const [asOfDate, setAsOfDate] = useState<Date | undefined>(new Date());
    const [accountClass, setAccountClass] = useState('all');
    const [hideZeroBalances, setHideZeroBalances] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [balances, setBalances] = useState<AccountBalance[]>([]);
    const [summary, setSummary] = useState<ReportSummary>(initialSummary);
    const [isLoading, setIsLoading] = useState(true); // Start with loading true for initial fetch
    const [lastFilters, setLastFilters] = useState<any>(null);

    // --- DATA FETCHING --- 
    const fetchBalances = useCallback(async (filters: any) => {
        if (!user?.company_id || !filters.asOfDate) return;
        
        setIsLoading(true);
        setLastFilters(filters);

        const params = new URLSearchParams({
            company_id: user.company_id,
            as_of_date: filters.asOfDate.toISOString().split('T')[0],
            account_class: filters.accountClass,
        });

        try {
            const response = await fetch(`https://hariindustries.net/api/clearbook/get-account-balances.php?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to fetch account balances.');
            }
            
            setBalances(data.accounts || []);
            setSummary(data.summary || initialSummary);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            setBalances([]);
            setSummary(initialSummary);
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    // --- EFFECTS ---
    useEffect(() => {
        // Auto-fetch data on initial load when user is available
        fetchBalances({ asOfDate: new Date(), accountClass: 'all' });
    }, [fetchBalances]); // useCallback dependency ensures this runs once on mount

    // --- HANDLERS ---
    const handleGenerateReport = () => {
        if (!asOfDate) {
            toast({ title: "Invalid Date", description: "Please select a valid date.", variant: "destructive" });
            return;
        }
        fetchBalances({ asOfDate, accountClass });
    };

    const handleReset = () => {
        setAsOfDate(new Date());
        setAccountClass('all');
        setHideZeroBalances(true);
        setSearchTerm('');
        fetchBalances({ asOfDate: new Date(), accountClass: 'all' });
    };

    const handleExport = () => {
        if (!user?.company_id || !lastFilters) {
            toast({ title: "Cannot Export", description: "Report data is not available for export.", variant: "destructive"});
            return;
        }
        
        const params = new URLSearchParams({
            company_id: user.company_id,
            as_of_date: lastFilters.asOfDate.toISOString().split('T')[0],
            account_class: lastFilters.accountClass,
        });

        const exportUrl = `https://hariindustries.net/api/clearbook/export-account-balances.php?${params.toString()}`;
        window.open(exportUrl, '_blank');
        toast({ title: "Export Started", description: "Your download will begin shortly." });
    };

    const handleViewLedger = (accountCode: string) => {
        router.push(`/reports/general-ledger?account_code=${accountCode}`);
    };

    const filteredBalances = balances
        .filter(b => !hideZeroBalances || b.net_balance_val !== 0)
        .filter(b => 
            b.account_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            b.account_code.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Account Balances Report</h1>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="space-y-2"><Label>As of Date</Label><DatePicker date={asOfDate} setDate={setAsOfDate} /></div>
                        <div className="space-y-2"><Label>Account Class</Label><Select value={accountClass} onValueChange={setAccountClass}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="all">All Classes</SelectItem><SelectItem value="Asset">Assets</SelectItem><SelectItem value="Liability">Liabilities</SelectItem><SelectItem value="Equity">Equity</SelectItem><SelectItem value="Revenue">Revenue</SelectItem><SelectItem value="Expense">Expenses</SelectItem></SelectContent></Select></div>
                        <div className="flex items-center space-x-2 pt-6"><Checkbox id="hide-zero" checked={hideZeroBalances} onCheckedChange={(c) => setHideZeroBalances(c === true)} /><Label htmlFor="hide-zero">Hide Zero Balances</Label></div>
                        <div className="flex items-center space-x-2 pt-6">
                            <Button onClick={handleGenerateReport} disabled={isLoading}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 'Generate Report'}</Button>
                            <Button variant="outline" onClick={handleReset}>Reset</Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>
            
            {isLoading && !balances.length ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin" /><p className="ml-4 text-muted-foreground">Loading initial report...</p></div>
            ) : balances.length > 0 && (
                <>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Accounts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total_accounts}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Debit</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total_debit}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Credit</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{summary.total_credit}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Balanced</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${summary.is_balanced ? 'text-green-500' : 'text-red-500'}`}>{summary.is_balanced ? '✓' : '✗'}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Assets</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.asset}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Liabilities</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.liability}</div></CardContent></Card>
                   </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Equity</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.equity}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.revenue}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">COGS</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.cogs}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expenses</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{summary.expense}</div></CardContent></Card>
                   </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Account Balances</CardTitle><CardDescription>As of: {lastFilters ? new Date(lastFilters.asOfDate).toLocaleDateString() : 'N/A'}</CardDescription></div>
                            <div className="flex items-center space-x-2"><Button onClick={handleExport}>Export Excel</Button><Button variant="outline">Print</Button></div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-end items-center mb-4"><Input placeholder="Search by name or code..." className="max-w-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Account #</TableHead><TableHead>Account Name</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Net Balance</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
                                    ) : filteredBalances.length > 0 ? (
                                        filteredBalances.map((account) => (
                                            <TableRow key={account.account_code}>
                                                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm">Actions</Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleViewLedger(account.account_code)}>View Ledger</DropdownMenuItem></DropdownMenuContent>
                                                </DropdownMenu></TableCell>
                                                <TableCell>{account.account_code}</TableCell>
                                                <TableCell>{account.account_name}</TableCell>
                                                <TableCell><Badge variant="outline">{account.account_type}</Badge></TableCell>
                                                <TableCell className="text-right">{account.debit}</TableCell>
                                                <TableCell className="text-right">{account.credit}</TableCell>
                                                <TableCell className="text-right font-medium">{account.net_balance}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={7} className="text-center py-12">No accounts to display for the selected filters.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default AccountBalancesPage;
