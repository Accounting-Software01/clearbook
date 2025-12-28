'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRange } from 'react-day-picker';
import { format, parseISO, isValid } from 'date-fns';
import { Loader2, AlertCircle, Download, Printer, PlusSquare, MinusSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

interface Transaction {
    date: string;
    accountCode: string;
    accountName: string;
    description: string;
    openingBalance: number;
    debit: number | null;
    credit: number | null;
    balance: number;
}

interface HierarchicalAccountEntry extends Account {
    transactions: Transaction[];
    children: HierarchicalAccountEntry[];
    opening: number;
    debit: number;
    credit: number;
    closing: number;
}

const formatCurrency = (amount: number | null | undefined, indicateCr = false) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '-';
    }
    const value = Math.abs(amount);
    const formattedValue = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
    if (indicateCr && amount < 0) {
        return `${formattedValue} CR`;
    }
    return formattedValue;
};

const GeneralLedgerPage = () => {
    const { language } = useLanguage();
    const { user } = useAuth();

    const [hierarchicalData, setHierarchicalData] = useState<HierarchicalAccountEntry[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [reportType, setReportType] = useState('trial_balance');
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const accountMap = useMemo(() => {
        const map = new Map<string, Account>();
        chartOfAccounts.forEach(acc => map.set(acc.code, acc));
        return map;
    }, []);

    const buildHierarchy = (transactions: Transaction[]): HierarchicalAccountEntry[] => {
        const accountNodeMap: Map<string, HierarchicalAccountEntry> = new Map();
        
        chartOfAccounts.forEach(acc => {
            accountNodeMap.set(acc.code, { ...acc, transactions: [], children: [], opening: 0, debit: 0, credit: 0, closing: 0 });
        });

        transactions.forEach(tx => {
            const node = accountNodeMap.get(tx.accountCode);
            if (node) {
                node.transactions.push(tx);
            }
        });
        
        accountNodeMap.forEach(node => {
            if (node.transactions.length > 0) {
                node.opening = node.transactions[0].openingBalance;
                node.debit = node.transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
                node.credit = node.transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
                node.closing = node.transactions[node.transactions.length - 1].balance;
            }
        });

        const hierarchy: HierarchicalAccountEntry[] = [];
        accountNodeMap.forEach(node => {
            if (node.parent) {
                const parent = accountNodeMap.get(node.parent);
                if (parent) parent.children.push(node);
            } else {
                hierarchy.push(node);
            }
        });

        const aggregateParent = (node: HierarchicalAccountEntry) => {
            if (node.children.length === 0) return;
            
            node.children.forEach(aggregateParent);

            node.opening = node.children.reduce((sum, child) => sum + child.opening, 0);
            node.debit = node.children.reduce((sum, child) => sum + child.debit, 0);
            node.credit = node.children.reduce((sum, child) => sum + child.credit, 0);
            node.closing = node.children.reduce((sum, child) => sum + child.closing, 0);
        }

        hierarchy.forEach(aggregateParent);

        return hierarchy.filter(node => node.transactions.length > 0 || node.children.length > 0);
    };

    const fetchData = useCallback(async () => {
        if (!dateRange?.from || !dateRange?.to || !user?.company_id) {
            setError("Company and date range are required.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setHierarchicalData([]);

        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');

        const url = new URL('https://hariindustries.net/api/clearbook/general-ledger.php');
        url.searchParams.append('company_id', user.company_id);
        url.searchParams.append('fromDate', fromDate);
        url.searchParams.append('toDate', toDate);
        url.searchParams.append('accountId', 'all');

        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                const errorJson = await response.json();
                throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();
            if (responseData.error) throw new Error(responseData.error);

            if (Array.isArray(responseData)) {
                const transactions: Transaction[] = responseData.map((entry: any) => ({
                    date: entry.date,
                    accountCode: entry.account_code,
                    accountName: entry.account_name,
                    description: entry.description,
                    openingBalance: parseFloat(entry.opening_balance),
                    debit: entry.debit ? parseFloat(entry.debit) : null,
                    credit: entry.credit ? parseFloat(entry.credit) : null,
                    balance: parseFloat(entry.balance),
                }));
                
                const hierarchy = buildHierarchy(transactions);
                setHierarchicalData(hierarchy);
                setExpandedRows(new Set(hierarchy.map(h => h.code))); // Expand top level by default
            }
        } catch (e: any) {
            console.error("Failed to fetch data:", e);
            setError(`Failed to load data: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, user]);

    const filteredData = useMemo(() => {
        if (reportType === 'account_ledger') {
            let allTransactions: Transaction[] = [];
            const collectTransactions = (nodes: HierarchicalAccountEntry[]) => {
                nodes.forEach(node => {
                    if (selectedAccount === 'all' || node.code === selectedAccount || node.parent === selectedAccount) {
                         if(node.children.length === 0) allTransactions.push(...node.transactions)
                    }
                    if(node.children) collectTransactions(node.children);
                });
            }
            collectTransactions(hierarchicalData);
            return allTransactions;
        }
        return [];
    }, [reportType, selectedAccount, hierarchicalData]);

    const toggleRow = (code: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(code)) {
            newExpanded.delete(code);
        } else {
            newExpanded.add(code);
        }
        setExpandedRows(newExpanded);
    };
    
    const formatDateSafe = (dateString: string | undefined | null) => {
        if (!dateString) return 'N/A';
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'dd-MM-yyyy') : 'Invalid Date';
    };

    const getReportTitle = () => {
        return reportType === 'trial_balance' ? 'Trial Balance' : `Account Ledger: ${accountMap.get(selectedAccount)?.name || ''}`;
    }

    const renderTrialBalanceRow = (node: HierarchicalAccountEntry, level = 0) => {
        const isExpanded = expandedRows.has(node.code);
        return (
            <React.Fragment key={node.code}>
                <TableRow>
                    <TableCell style={{ paddingLeft: `${level * 20 + 5}px` }}>
                       <div style={{display: 'flex', alignItems: 'center'}}>
                        {node.children.length > 0 && (
                            <button onClick={() => toggleRow(node.code)} className="mr-2">
                                {isExpanded ? <MinusSquare size={16}/> : <PlusSquare size={16}/>}
                            </button>
                        )}
                         <span>{node.code} - {node.name}</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(node.opening)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(node.debit)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(node.credit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(node.closing)}</TableCell>
                </TableRow>
                {isExpanded && node.children.map(child => renderTrialBalanceRow(child, level + 1))}
            </React.Fragment>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg items-end bg-card print-hidden">
                 <div className="space-y-2">
                    <label className="font-semibold text-sm">Report Type</label>
                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="trial_balance">Trial Balance</SelectItem>
                            <SelectItem value="account_ledger">Account Ledger</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {reportType === 'account_ledger' && (
                    <div className="space-y-2">
                        <label htmlFor="account-select" className="font-semibold text-sm">Account</label>
                        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                            <SelectTrigger id="account-select"><SelectValue placeholder="Select an account..." /></SelectTrigger>
                            <SelectContent>
                                 <SelectItem value="all">All Accounts</SelectItem>
                                 {chartOfAccounts.map(account => (
                                    <SelectItem key={account.code} value={account.code} disabled={account.name.includes('(AUTO)') && chartOfAccounts.some(c => c.parent === account.code)}>{account.code} - {account.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-2">
                        <label htmlFor="date-range" className="font-semibold text-sm">Date Range</label>
                        <DateRangePicker date={dateRange} onDateChange={setDateRange} id="date-range"/>
                </div>
                 <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button onClick={fetchData} disabled={isLoading} className="w-full md:col-span-3">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Report
                    </Button>
                </div>
            </div>

             <Card id="print-section">
                <CardHeader>
                    <CardTitle>{getReportTitle()}</CardTitle>
                    <CardDescription>{`Report from ${dateRange?.from ? format(dateRange.from, 'LLL dd, y') : 'start'} to ${dateRange?.to ? format(dateRange.to, 'LLL dd, y') : 'end'}`}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
                    {error && <div className="text-destructive p-4">{error}</div>}
                    {!isLoading && !error && (
                         reportType === 'trial_balance' ? (
                             <Table>
                                <TableHeader><TableRow>
                                    <TableHead className="w-2/5">Account</TableHead>
                                    <TableHead className="text-right">Opening</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Closing</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {hierarchicalData.map(node => renderTrialBalanceRow(node))}
                                </TableBody>
                            </Table>
                         ) : (
                             <Table>
                                <TableHeader><TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {filteredData.map((tx, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{formatDateSafe(tx.date)}</TableCell>
                                            <TableCell>{tx.accountCode} - {tx.accountName}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(tx.debit)}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(tx.credit)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(tx.balance)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         )
                    )}
                 </CardContent>
            </Card>
        </div>
    );
};

export default GeneralLedgerPage;
