'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Loader2, FileWarning } from 'lucide-react';
import { format } from 'date-fns';

// --- Data Interfaces (assuming this API response structure) ---
interface Reconciliation {
    id: string;
    account_name: string;
    account_code: string;
    statement_date: string;
    statement_balance: string;
    status: 'draft' | 'completed';
    notes: string;
}

interface Transaction {
    id: string;
    entry_date: string;
    entry_no: string;
    narration: string;
    debit: string;
    credit: string;
}

interface ReconciliationData {
    reconciliation: Reconciliation;
    ledger_balance: string;
    transactions: Transaction[];
    cleared_transaction_ids?: string[];
}

const ReconciliationPage = () => {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user } = useAuth();
    const reconciliationId = params.id as string;

    const [data, setData] = useState<ReconciliationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clearedItems, setClearedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!reconciliationId || !user?.company_id) return;
        
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`https://hariindustries.net/api/clearbook/get_reconciliation.php?id=${reconciliationId}&company_id=${user.company_id}`);
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'API request failed');
                }

                if (!result.reconciliation || !Array.isArray(result.transactions)) {
                    console.error("Invalid data structure received:", result);
                    throw new Error('Invalid data format from server. Expected an object with reconciliation and transactions properties.');
                }
                
                setData(result);
                setClearedItems(new Set(result.cleared_transaction_ids || []));

            } catch (err: any) {
                setError(err.message);
                toast({ variant: 'destructive', title: 'Error Loading Data', description: err.message });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [reconciliationId, user, toast]);

    const { cleared_balance, difference } = useMemo(() => {
        if (!data || !data.reconciliation) return { cleared_balance: 0, difference: 0 }; // Guard clause

        const statement_balance = parseFloat(data.reconciliation.statement_balance);

        let cleared_tx_sum = 0;
        data.transactions.forEach(tx => {
            if (clearedItems.has(tx.id)) {
                cleared_tx_sum += parseFloat(tx.debit || '0') - parseFloat(tx.credit || '0');
            }
        });

        const cleared_balance = cleared_tx_sum;
        const difference = statement_balance - cleared_balance;

        return { cleared_balance, difference };
    }, [data, clearedItems]);


    const handleToggleCleared = (txId: string) => {
        setClearedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(txId)) {
                newSet.delete(txId);
            } else {
                newSet.add(txId);
            }
            return newSet;
        });
    };
    
    const handleSubmit = async (finish: boolean) => {
        if (!user?.company_id || !user?.uid) {
            toast({ variant: 'destructive', title: 'Authentication Error', description: 'User information is missing.' });
            return;
        }

        setIsSubmitting(true);
        toast({ title: 'Saving...' });

        try {
            const response = await fetch('https://hariindustries.net/api/clearbook/get_reconciliation.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reconciliation_id: reconciliationId,
                    company_id: user.company_id,
                    user_id: user.uid,
                    cleared_transaction_ids: Array.from(clearedItems),
                    finish: finish,
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to save.');

            toast({ variant: 'success', title: 'Success!', description: `Reconciliation has been ${finish ? 'completed' : 'saved'}.` });
            if (finish) {
                router.push('/reconciliation');
            } else {
                 router.refresh();
            }

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Save Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };


    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    if (error || !data || !data.reconciliation) { // Added check for data.reconciliation
        return (
            <div className="max-w-4xl mx-auto text-center">
                 <Card className="mt-8">
                    <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center space-y-4">
                        <FileWarning className="w-16 h-16 text-destructive"/>
                        <p className="text-lg">Could not load reconciliation data.</p>
                        <Alert variant="destructive">
                            <AlertTitle>Error Message</AlertTitle>
                            <AlertDescription>{error || 'The requested resource was not found or the data is invalid.'}</AlertDescription>
                        </Alert>
                        <Link href="/reconciliation" passHref>
                            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    const { reconciliation, transactions } = data;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Reconcile: {reconciliation.account_name}</h1>
                    <p className="text-muted-foreground">Reconciliation for statement ending {format(new Date(reconciliation.statement_date), 'PPP')}</p>
                </div>
                <Link href="/reconciliation" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Reconciliation Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Statement Balance</p>
                        <p className="text-2xl font-semibold">{new Intl.NumberFormat().format(parseFloat(reconciliation.statement_balance))}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Cleared Balance</p>
                        <p className="text-2xl font-semibold">{new Intl.NumberFormat().format(cleared_balance)}</p>
                    </div>
                     <div className={`p-4 rounded-lg ${difference.toFixed(2) !== '0.00' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        <p className={`text-sm ${difference.toFixed(2) !== '0.00' ? 'text-orange-600 dark:text-orange-300' : 'text-green-600 dark:text-green-300'}`}>Difference</p>
                        <p className={`text-2xl font-semibold ${difference.toFixed(2) !== '0.00' ? 'text-orange-700 dark:text-orange-200' : 'text-green-700 dark:text-green-200'}`}>{new Intl.NumberFormat().format(difference)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                    <CardDescription>Select the transactions that have cleared in your bank account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Cleared</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Ref</TableHead>
                                    <TableHead>Narration</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length > 0 ? transactions.map(tx => (
                                    <TableRow key={tx.id} data-state={clearedItems.has(tx.id) ? 'selected' : ''}>
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={clearedItems.has(tx.id)}
                                                onCheckedChange={() => handleToggleCleared(tx.id)}
                                                aria-label={`Select transaction ${tx.id}`}
                                            />
                                        </TableCell>
                                        <TableCell>{format(new Date(tx.entry_date), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{tx.entry_no}</TableCell>
                                        <TableCell>{tx.narration}</TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat().format(parseFloat(tx.debit || '0'))}</TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat().format(parseFloat(tx.credit || '0'))}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No transactions for this period.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="justify-end space-x-2 bg-muted/30 py-4 px-6 rounded-b-lg">
                    <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Draft
                    </Button>
                    <Button 
                        onClick={() => handleSubmit(true)} 
                        disabled={isSubmitting || difference.toFixed(2) !== '0.00'}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Finish Reconciliation
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ReconciliationPage;
