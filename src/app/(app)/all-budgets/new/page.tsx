'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, Trash2, Info, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface BudgetLine {
    id: number;
    accountId: string;
    categoryId: string;
    amount: string;
    periodType: 'Annual' | 'Monthly';
    description: string;
}

const NewBudgetPage = () => {
    const { toast } = useToast();
    const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([{ id: 1, accountId: '', categoryId: '', amount: '', periodType: 'Annual', description: '' }]);

    const addLine = () => {
        setBudgetLines([...budgetLines, { id: Date.now(), accountId: '', categoryId: '', amount: '', periodType: 'Annual', description: '' }]);
    };

    const removeLine = (id: number) => {
        if (budgetLines.length > 1) {
            setBudgetLines(budgetLines.filter(line => line.id !== id));
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Create New Budget</h1>
                <Link href="/budget-overview"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Overview</Button></Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Budget Information</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="font-semibold text-sm">Budget Name *</label>
                                <Input placeholder="e.g., Q1 2025 Operating Budget" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="font-semibold text-sm">Fiscal Year *</label>
                                    <Select defaultValue="2026">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="2026">2026</SelectItem><SelectItem value="2025">2025</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="font-semibold text-sm">Budget Type *</label>
                                    <Select><SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger><SelectContent><SelectItem value="operational">Operational</SelectItem><SelectItem value="capital">Capital</SelectItem></SelectContent></Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="font-semibold text-sm">Start Date *</label>
                                    <DatePicker />
                                </div>
                                <div className="space-y-2">
                                    <label className="font-semibold text-sm">End Date *</label>
                                    <DatePicker />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <label className="font-semibold text-sm">Status *</label>
                                <Input value="Draft" disabled />
                                <p className="text-xs text-muted-foreground">Start as draft to review before activating.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="font-semibold text-sm">Description</label>
                                <Textarea placeholder="Optional budget description" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Budget Lines</CardTitle><CardDescription>{budgetLines.length} Line{budgetLines.length > 1 && 's'}</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            {budgetLines.map((line, index) => (
                                <div key={line.id} className="p-4 border rounded-lg space-y-4 relative">
                                     <p className="font-semibold text-sm">Budget Line {index + 1}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                             <label className="font-semibold text-sm">Account *</label>
                                             <Select><SelectTrigger><SelectValue placeholder="Select Account"/></SelectTrigger><SelectContent><SelectItem value="X50-5600">X50-5600 - Office Supplies</SelectItem></SelectContent></Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="font-semibold text-sm">Category</label>
                                            <Select><SelectTrigger><SelectValue placeholder="Optional"/></SelectTrigger><SelectContent><SelectItem value="HR">HR Department</SelectItem></SelectContent></Select>
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="font-semibold text-sm">Budgeted Amount *</label>
                                            <Input type="number" placeholder="0.00" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="font-semibold text-sm">Period Type *</label>
                                            <Select defaultValue="Annual"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Annual">Annual</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent></Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-semibold text-sm">Description</label>
                                        <Textarea placeholder="Optional line description"/>
                                    </div>
                                    {budgetLines.length > 1 && <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removeLine(line.id)}><Trash2 className="h-4 w-4"/></Button>}
                                </div>
                            ))}
                             <Button variant="outline" onClick={addLine}><PlusCircle className="mr-2 h-4 w-4"/>Add Budget Line</Button>
                        </CardContent>
                         <CardFooter className="justify-end bg-muted/30 py-4 px-6 rounded-b-lg">
                            <Button>Save Budget</Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                     <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700/50 dark:text-blue-300">
                        <Info className="h-4 w-4" />
                        <AlertTitle className="font-bold">Creating a Budget</AlertTitle>
                        <AlertDescription className="mt-2 space-y-3">
                           <div>
                                <p className="font-semibold">Budget Lines:</p>
                                <p>Add budget lines by selecting accounts from your Chart of Accounts and assigning budgeted amounts.</p>
                           </div>
                           <div>
                               <p className="font-semibold">Period Types:</p>
                               <ul className="list-disc list-inside pl-2">
                                   <li><span className="font-medium">Annual:</span> Single amount for the year.</li>
                                   <li><span className="font-medium">Monthly:</span> Distributes evenly across months.</li>
                               </ul>
                           </div>
                           <div>
                               <p className="font-semibold">Categories:</p>
                               <p>Assign categories to group budget lines for better reporting and analysis.</p>
                           </div>
                           <div>
                               <p className="font-semibold">Status:</p>
                                <p><span className="font-medium">Draft:</span> Can be edited and reviewed before it becomes active and impacts reporting.</p>
                           </div>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </div>
    );
}

export default NewBudgetPage;
