'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { DateRange } from 'react-day-picker';
import { format, parseISO, isValid } from 'date-fns';
import { Loader2, AlertCircle } from 'lucide-react';
import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';

interface LedgerEntry {
    date: string;
    description: string;
    debit: number | null;
    credit: number | null;
    balance?: number;
}

const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '-';
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};


const GeneralLedgerPage = () => {
  const { language } = useLanguage();
  const { user } = useAuth(); // Get the user from the context
  const [fetchedEntries, setFetchedEntries] = useState<LedgerEntry[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('101200');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date(),
  })
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLedgerEntries = useCallback(async () => {
    if (!selectedAccount || !dateRange?.from || !dateRange?.to || !user?.company_id) { // Check for company_id
        setFetchedEntries([]);
        if (!user?.company_id) {
            setError("Could not determine company. Please ensure you are logged in correctly.");
        }
        return;
    }

    setIsLoading(true);
    setError(null);
    
    const fromDate = format(dateRange.from, 'yyyy-MM-dd');
    const toDate = format(dateRange.to, 'yyyy-MM-dd');
    
    const url = new URL('https://hariindustries.net/clearbook/general-ledger.php');
    url.searchParams.append('company_id', user.company_id); // Add company_id to the request
    url.searchParams.append('accountId', selectedAccount);
    url.searchParams.append('fromDate', fromDate);
    url.searchParams.append('toDate', toDate);

    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            let errorText;
            try {
                const errorJson = await response.json();
                errorText = errorJson.error || `HTTP error! status: ${response.status}`;
            } catch (e) {
                errorText = `HTTP error! status: ${response.status}`;
            }
            throw new Error(errorText);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        setFetchedEntries(data);

    } catch (e: any) {
        console.error("Failed to fetch ledger entries:", e);
        setError(`Failed to load data: ${e.message}. Please check the API script and server logs.`);
        setFetchedEntries([]);
    } finally {
        setIsLoading(false);
    }
  }, [selectedAccount, dateRange, user]); // Add user to the dependency array

  const { openingBalance, endingBalance, entriesWithBalance } = useMemo(() => {
    if (fetchedEntries.length === 0) {
      return { openingBalance: 0, endingBalance: 0, entriesWithBalance: [] };
    }
    const obEntry = fetchedEntries[0];
    const ob = obEntry.description === 'Opening Balance' ? obEntry.balance ?? 0 : 0;
    const transactions = obEntry.description === 'Opening Balance' ? fetchedEntries.slice(1) : fetchedEntries;

    return {
        openingBalance: ob,
        endingBalance: fetchedEntries[fetchedEntries.length - 1]?.balance ?? 0,
        entriesWithBalance: transactions,
    };
  }, [fetchedEntries]);

  const selectedAccountName = chartOfAccounts.find(acc => acc.code === selectedAccount)?.name || '';

  const formatDateSafe = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
        const date = parseISO(dateString);
        return isValid(date) ? format(date, 'dd-MM-yyyy') : 'Invalid Date';
    } catch {
        return 'Invalid Date';
    }
  }

  return (
    <>
        <p className="text-muted-foreground mb-6">{`View the detailed transaction history for any account in the system.`}</p>
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg items-end bg-card">
                <div className="md:col-span-2 space-y-2">
                    <label htmlFor="account-select" className="font-semibold text-sm">Account</label>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger id="account-select">
                            <SelectValue placeholder="Select an account..." />
                        </SelectTrigger>
                        <SelectContent>
                            {chartOfAccounts.map(account => (
                                <SelectItem key={account.code} value={account.code}>
                                    {account.code} - {account.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                     <label htmlFor="date-range" className="font-semibold text-sm">Date Range</label>
                     <DateRangePicker date={dateRange} onDateChange={setDateRange} id="date-range"/>
                </div>
                <div className="md:col-start-3">
                    <Button onClick={fetchLedgerEntries} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {`View ${language.ledger}`}
                    </Button>
                </div>
            </div>

            <Card className="bg-card">
                <CardHeader>
                    <CardTitle>{`Account: ${selectedAccount} - ${selectedAccountName}`}</CardTitle>
                    <CardDescription>
                        {`Transactions from ${dateRange?.from ? format(dateRange.from, 'LLL dd, y') : ''} to ${dateRange?.to ? format(dateRange.to, 'LLL dd, y') : ''}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col justify-center items-center h-40 text-destructive">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p className="font-semibold">Error</p>
                            <p>{error}</p>
                        </div>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>{dateRange?.from ? formatDateSafe(dateRange.from.toISOString()) : '-'}</TableCell>
                                <TableCell className="font-semibold">Opening Balance</TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-mono font-semibold">{formatCurrency(openingBalance)}</TableCell>
                            </TableRow>
                            {entriesWithBalance.map((entry, index) => (
                                <TableRow key={index}>
                                    <TableCell>{formatDateSafe(entry.date)}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(entry.debit)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(entry.credit)}</TableCell>
                                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(entry.balance)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="text-right font-bold">Ending Balance</TableCell>
                                <TableCell className="text-right font-bold font-mono">{formatCurrency(endingBalance)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    )}
                     { !isLoading && !error && fetchedEntries.length === 0 && (
                         <div className="flex justify-center items-center h-40 text-muted-foreground">
                            <p>No transactions found for the selected criteria.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </>
  );
};

export default GeneralLedgerPage;
