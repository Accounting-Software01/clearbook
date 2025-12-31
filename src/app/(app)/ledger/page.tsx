'use client';
import React, { useState, useMemo, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Loader2, BookOpen, MinusSquare, PlusSquare } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { chartOfAccounts, Account } from '@/lib/chart-of-accounts';
import { useAuth } from '@/hooks/useAuth';
import { cn } from "@/lib/utils";
import { DateRange } from 'react-day-picker';

// === TYPES ===
interface Transaction {
  date: string;
  reference_number?: string;
  description: string;
  debit: number | null;
  credit: number | null;
  running_balance: number;
  account_code: string;
  account_name: string;
}
interface HierarchicalAccount extends Account {
    children: HierarchicalAccount[];
    transactions: Transaction[];
    opening: number;
    debit: number;
    credit: number;
    closing: number;
}
interface SingleLedgerData {
  account: Account;
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[];
  totalDebits: number;
  totalCredits: number;
}

// === UTILS ===
const formatMoney = (val?: number | null) =>
  val == null ? '-' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const formatDateSafe = (date?: string) =>
  date && isValid(parseISO(date)) ? format(parseISO(date), 'dd-MMM-yyyy') : '-';

// === MAIN COMPONENT ===
export default function GeneralLedgerPage() {
  const { user } = useAuth();

  // --- STATE ---
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });

  const [singleLedger, setSingleLedger] = useState<SingleLedgerData | null>(null);
  const [hierarchicalData, setHierarchicalData] = useState<HierarchicalAccount[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- MEMOIZED DATA ---
  const leafAccounts = useMemo(
    () => chartOfAccounts.filter(a => !chartOfAccounts.some(c => c.parent === a.code)),
    []
  );

  const filteredHierarchicalData = useMemo(() => {
    if (!searchTerm) return hierarchicalData;
    const lowercasedFilter = searchTerm.toLowerCase();

    const filterAccounts = (accounts: HierarchicalAccount[]): HierarchicalAccount[] => {
        return accounts.map(account => ({ ...account })).filter(account => {
            const children = filterAccounts(account.children);
            if (children.length > 0) {
                account.children = children;
                return true;
            }
            return account.name.toLowerCase().includes(lowercasedFilter) ||
                   account.code.toLowerCase().includes(lowercasedFilter);
        });
    };

    return filterAccounts(hierarchicalData);
  }, [searchTerm, hierarchicalData]);

  // --- DATA FETCHING ---
  const fetchLedger = useCallback(async () => {
    if (!dateRange?.from || !dateRange?.to || !user?.company_id) {
      setError('Please select a valid date range.');
      return;
    }
    if (viewMode === 'single' && !selectedAccount) {
      setError('Please select an account.');
      return;
    }

    setLoading(true);
    setError(null);
    setSingleLedger(null);
    setHierarchicalData([]);

    try {
        if (viewMode === 'single') {
            const url = new URL('https://hariindustries.net/api/clearbook/general-ledger.php');
            url.searchParams.set('company_id', user.company_id);
            url.searchParams.set('accountId', selectedAccount);
            url.searchParams.set('fromDate', format(dateRange.from, 'yyyy-MM-dd'));
            url.searchParams.set('toDate', format(dateRange.to, 'yyyy-MM-dd'));
            const res = await fetch(url.toString());
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to load ledger for ' + selectedAccount);
            processSingleLedger(data, selectedAccount);
        } else {
            const fromDate = format(dateRange.from, 'yyyy-MM-dd');
            const toDate = format(dateRange.to, 'yyyy-MM-dd');

            // Fire off all requests concurrently
            const allPromises = leafAccounts.map(account => {
                const url = new URL('https://hariindustries.net/api/clearbook/general-ledger.php');
                url.searchParams.set('company_id', user.company_id!);
                url.searchParams.set('accountId', account.code);
                url.searchParams.set('fromDate', fromDate);
                url.searchParams.set('toDate', toDate);
                return fetch(url.toString()).then(res => res.json()).then(data => {
                    // Add account info to each transaction
                    return data.map((tx: any) => ({ ...tx, account_code: account.code, account_name: account.name }));
                });
            });

            const allResults = await Promise.all(allPromises);
            const flatTransactions = allResults.flat();
            processAllAccountsLedger(flatTransactions);
        }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange, user, viewMode, leafAccounts]);

  // --- DATA PROCESSING ---
  const processSingleLedger = (data: any[], accountCode: string) => {
      const account = chartOfAccounts.find(a => a.code === accountCode)!;
      const opening = data[0]?.description === 'Opening Balance' ? Number(data[0].balance) : 0;
      const transactions = data
        .filter((r: any) => r.description !== 'Opening Balance')
        .map((r: any) => ({
          ...r,
          debit: r.debit ? Number(r.debit) : null,
          credit: r.credit ? Number(r.credit) : null,
          running_balance: Number(r.balance)
        }));
      const totalDebits = transactions.reduce((s, t) => s + (t.debit ?? 0), 0);
      const totalCredits = transactions.reduce((s, t) => s + (t.credit ?? 0), 0);
      setSingleLedger({
        account,
        openingBalance: opening,
        closingBalance: data.at(-1)?.balance ?? opening,
        transactions,
        totalDebits,
        totalCredits
      });
  }

  const processAllAccountsLedger = (data: Transaction[]) => {
      const accountMap: Map<string, HierarchicalAccount> = new Map();
      chartOfAccounts.forEach(acc => {
          accountMap.set(acc.code, { ...acc, children: [], transactions: [], opening: 0, debit: 0, credit: 0, closing: 0 });
      });

      data.forEach(tx => {
          const node = accountMap.get(tx.account_code);
          if (node) node.transactions.push(tx);
      });

      accountMap.forEach(node => {
          if (node.transactions.length > 0) {
              // Sort transactions by date just in case they are not ordered
              node.transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              const openingTx = node.transactions[0];
              node.opening = openingTx.description === 'Opening Balance' ? openingTx.running_balance : 0;
              
              const operatingTxs = node.transactions.filter(tx => tx.description !== 'Opening Balance');
              node.debit = operatingTxs.reduce((sum, tx) => sum + (tx.debit || 0), 0);
              node.credit = operatingTxs.reduce((sum, tx) => sum + (tx.credit || 0), 0);
              node.closing = node.transactions.at(-1)?.running_balance ?? node.opening;
          }
      });
      
      const hierarchy: HierarchicalAccount[] = [];
      accountMap.forEach(node => {
          if (node.parent && accountMap.has(node.parent)) {
              accountMap.get(node.parent)!.children.push(node);
          } else {
              hierarchy.push(node);
          }
      });

      const aggregateUp = (node: HierarchicalAccount): void => {
          if (node.children.length > 0) {
              node.children.forEach(aggregateUp);
              node.opening = node.children.reduce((sum, child) => sum + child.opening, 0);
              node.debit = node.children.reduce((sum, child) => sum + child.debit, 0);
              node.credit = node.children.reduce((sum, child) => sum + child.credit, 0);
              node.closing = node.children.reduce((sum, child) => sum + child.closing, 0);
          }
      };
      hierarchy.forEach(aggregateUp);

      setHierarchicalData(hierarchy);
      setExpandedRows(new Set(hierarchy.map(h => h.code)));
  }

  // --- RENDER HELPERS ---
  const toggleRow = (code: string) => setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
  });

  const renderTrialBalanceRow = (node: HierarchicalAccount, level = 0) => {
    const isExpanded = expandedRows.has(node.code);
    const hasActivity = node.opening !== 0 || node.debit !== 0 || node.credit !== 0 || node.closing !== 0;
    if(!hasActivity && level > 0) return null; // Don't render empty children

    return (
        <React.Fragment key={node.code}>
            <TableRow className={cn(!hasActivity && 'text-muted-foreground')}>
                <TableCell style={{ paddingLeft: `${level * 20 + 5}px` }}>
                   <div className="flex items-center">
                    {node.children.length > 0 && (
                        <Button variant="ghost" size="icon" className="mr-2 h-6 w-6" onClick={() => toggleRow(node.code)}>
                           {isExpanded ? <MinusSquare size={14}/> : <PlusSquare size={14}/>}
                        </Button>
                    )}
                     <span className={cn(!node.children.length ? "font-normal" : "font-semibold")}>{node.code} - {node.name}</span>
                   </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatMoney(node.opening)}</TableCell>
                <TableCell className="text-right font-mono text-green-600">{formatMoney(node.debit)}</TableCell>
                <TableCell className="text-right font-mono text-red-600">{formatMoney(node.credit)}</TableCell>
                <TableCell className="text-right font-mono">{formatMoney(node.closing)}</TableCell>
            </TableRow>
            {isExpanded && node.children.map(child => renderTrialBalanceRow(child, level + 1))}
        </React.Fragment>
    )
  }

  // --- RENDER ---
  return (
    <div className="space-y-4 p-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className='space-y-1'>
                <CardTitle>General Ledger</CardTitle>
                <CardDescription>
                    {`Report from ${dateRange?.from ? format(dateRange.from, 'LLL dd, y') : 'start'} to ${dateRange?.to ? format(dateRange.to, 'LLL dd, y') : 'end'}`}
                </CardDescription>
            </div>
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => { if(v) setViewMode(v as any)}}>
                <ToggleGroupItem value="single">Single Account</ToggleGroupItem>
                <ToggleGroupItem value="all">All Accounts</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="grid md:grid-cols-3 gap-4 pt-4">
              {viewMode === 'single' ? (
                  <div>
                      <label className="text-sm font-medium">Account</label>
                      <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                          <SelectContent>{leafAccounts.map(acc => <SelectItem key={acc.code} value={acc.code}>{acc.code} – {acc.name}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
              ) : (
                  <div>
                      <label className="text-sm font-medium">Search Account</label>
                      <Input placeholder="Filter by code or name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
              )}
              <div>
                  <label className="text-sm font-medium">Date Range</label>
                  <DateRangePicker date={dateRange} onDateChange={setDateRange} />
              </div>
              <div className="flex items-end">
                  <Button onClick={fetchLedger} disabled={loading} className="w-full">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generate
                  </Button>
              </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && <Card className="bg-destructive/10 text-destructive text-center p-4">{error}</Card>}
      
      {/* Empty State */}
      {!loading && !error && singleLedger === null && hierarchicalData.length === 0 && (
        <div className="text-center text-muted-foreground py-16">
          <BookOpen className="mx-auto mb-3 h-10 w-10" />
          <p>Select a view, account/date range, and click Generate.</p>
        </div>
      )}

      {/* Loading State */}
      {loading && <div className="flex justify-center py-16"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}

      {/* Single Account View */}
      {viewMode === 'single' && singleLedger && (
        <Card>
          <CardHeader>
            <CardTitle>{singleLedger.account.name}</CardTitle>
            <CardDescription>Account Code: {singleLedger.account.code}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ref</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow className="font-semibold"><TableCell colSpan={5}>Opening Balance</TableCell><TableCell className="text-right">{formatMoney(singleLedger.openingBalance)}</TableCell></TableRow>
                {singleLedger.transactions.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{formatDateSafe(t.date)}</TableCell><TableCell>{t.reference_number}</TableCell><TableCell>{t.description}</TableCell>
                    <TableCell className="text-right text-green-600">{t.debit ? formatMoney(t.debit) : '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{t.credit ? formatMoney(t.credit) : '-'}</TableCell>
                    <TableCell className="text-right">{formatMoney(t.running_balance)}</TableCell>
                  </TableRow>
                ))}
                 {singleLedger.transactions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No transactions found for this period.</TableCell></TableRow>}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold">
                  <TableCell colSpan={3}>Period Totals</TableCell>
                  <TableCell className="text-right text-green-600">{formatMoney(singleLedger.totalDebits)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatMoney(singleLedger.totalCredits)}</TableCell>
                  <TableCell className="text-right">{formatMoney(singleLedger.closingBalance)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Accounts (Trial Balance) View */}
      {viewMode === 'all' && filteredHierarchicalData.length > 0 && (
        <Card>
            <CardHeader><CardTitle>All Accounts Summary</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead className="w-2/5">Account</TableHead><TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Closing</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredHierarchicalData.map(node => renderTrialBalanceRow(node))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
