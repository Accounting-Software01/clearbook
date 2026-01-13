'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Info, ArrowLeft } from 'lucide-react';

const NewReconciliationPage = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [accountId, setAccountId] = useState<string>('');
    const [statementDate, setStatementDate] = useState<Date | undefined>(new Date("2026-01-13"));
    const [statementBalance, setStatementBalance] = useState<string>('');
    const [notes, setNotes] = useState('');

    const handleStart = () => {
        if (!accountId || !statementDate || !statementBalance) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select an account, date, and enter the statement balance.' });
            return;
        }
        // In a real app, you would save this initial setup and then navigate
        // to the detailed reconciliation page, e.g., /reconciliation/[id]
        toast({ title: 'Starting Reconciliation...' });
        // Mock navigation to a dynamic route
        const newReconciliationId = `rec_${Date.now()}`;
        router.push(`/reconciliation/${newReconciliationId}`);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Start New Bank Reconciliation</h1>
                <Link href="/reconciliation" passHref>
                    <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/> Back to List</Button>
                </Link>
            </div>

            <Card>
                 <CardContent className="pt-6 space-y-6">
                    <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300">
                        <Info className="h-4 w-4" />
                        <AlertTitle className="font-bold">Bank Reconciliation Process:</AlertTitle>
                        <AlertDescription>
                            <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
                                <li>Select the bank or cash account you want to reconcile.</li>
                                <li>Enter the ending balance from your bank statement.</li>
                                <li>Enter the statement date.</li>
                                <li>In the next step, mark transactions that appear on the statement as cleared.</li>
                                <li>Review and complete the reconciliation.</li>
                            </ul>
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="font-semibold text-sm">Bank/Cash Account *</label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger><SelectValue placeholder="Select an option..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A10-1010">A10-1010 - Main Bank Account</SelectItem>
                                    <SelectItem value="A10-1020">A10-1020 - Savings Account</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Select the account to reconcile.</p>
                        </div>
                         <div className="space-y-2">
                            <label className="font-semibold text-sm">Statement Date *</label>
                            <DatePicker date={statementDate} onDateChange={setStatementDate} />
                             <p className="text-xs text-muted-foreground">The ending date on your bank statement.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="font-semibold text-sm">Ending Statement Balance *</label>
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={statementBalance} 
                            onChange={e => setStatementBalance(e.target.value)} 
                        />
                        <p className="text-xs text-muted-foreground">Enter the ending balance shown on your bank statement.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="font-semibold text-sm">Notes</label>
                        <Textarea
                            placeholder="Enter any notes about this reconciliation (optional)"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="h-24"
                        />
                         <p className="text-xs text-muted-foreground">Optional notes or remarks.</p>
                    </div>
                 </CardContent>
                 <CardFooter className="justify-end space-x-2 bg-muted/30 py-4 px-6 rounded-b-lg">
                     <Link href="/reconciliation" passHref><Button variant="outline">Cancel</Button></Link>
                    <Button onClick={handleStart}>Start Reconciliation</Button>
                 </CardFooter>
            </Card>
        </div>
    );
};

export default NewReconciliationPage;
