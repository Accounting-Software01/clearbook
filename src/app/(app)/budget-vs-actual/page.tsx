'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const budgetData = [
    { accountNumber: 'I10-4000', accountName: 'Sales Revenue', accountClass: 'Revenue', category: 'IT & Technology', budgeted: 50000.00, actual: 0.00, variance: 50000.00, variancePercent: 0 },
    { accountNumber: 'X50-5600', accountName: 'Office Supplies', accountClass: 'Expenses', category: 'HR Department', budgeted: 500000.00, actual: 0.00, variance: 500000.00, variancePercent: 0 },
];

const BudgetVsActualPage = () => {
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    
    const totalBudgeted = budgetData.reduce((sum, item) => sum + item.budgeted, 0);
    const totalActual = budgetData.reduce((sum, item) => sum + item.actual, 0);
    const totalVariance = budgetData.reduce((sum, item) => sum + item.variance, 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Budget vs Actual</h1>
            
            <Card>
                 <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Select defaultValue="2026">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="2026">Fiscal Year: 2026</SelectItem></SelectContent>
                        </Select>
                         <Select defaultValue="cost-budget">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="cost-budget">Budget: cost budget</SelectItem></SelectContent>
                        </Select>
                         <Select defaultValue="all">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="all">Category: All Categories</SelectItem></SelectContent>
                        </Select>
                         <Select defaultValue="full-year">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="full-year">Month: Full Year</SelectItem></SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader><CardTitle>Total Budgeted</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Total Actual</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(totalActual)}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Total Variance</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(totalVariance)}</p></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>cost budget</CardTitle>
                    <CardDescription>Jan 12, 2026 - Feb 28, 2026 | Project Active</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <label>Show</label>
                            <Select defaultValue="25">
                                <SelectTrigger className="w-20"><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="25">25</SelectItem></SelectContent>
                            </Select>
                            <label>entries</label>
                        </div>
                        <Input placeholder="Search..." className="max-w-xs"/>
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Number</TableHead>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Account Class</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Budgeted</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Variance</TableHead>
                                    <TableHead className="text-right">Variance %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {budgetData.map(item => (
                                    <TableRow key={item.accountNumber}>
                                        <TableCell>{item.accountNumber}</TableCell>
                                        <TableCell>{item.accountName}</TableCell>
                                        <TableCell>{item.accountClass}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.budgeted)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.actual)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(item.variance)}</TableCell>
                                        <TableCell className="text-right font-mono">{item.variancePercent.toFixed(1)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold">
                                    <TableCell colSpan={4}>TOTAL:</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totalBudgeted)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totalActual)}</TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(totalVariance)}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                     <div className="flex items-center justify-between mt-4 text-sm">
                        <p className="text-muted-foreground">Showing 1 to 2 of 2 entries</p>
                        <div className="flex gap-1">
                           <Button variant="outline" size="sm">First</Button>
                           <Button variant="outline" size="sm">Previous</Button>
                           <Button variant="outline" size="sm">1</Button>
                           <Button variant="outline" size="sm">Next</Button>
                           <Button variant="outline" size="sm">Last</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Status Legend</CardTitle></CardHeader>
                <CardContent className="flex gap-6">
                    <div className="flex items-center gap-2"><Badge className="bg-green-500 w-4 h-4 p-0"/> On Track <span className="text-muted-foreground text-xs">&lt;90% utilized</span></div>
                    <div className="flex items-center gap-2"><Badge className="bg-yellow-500 w-4 h-4 p-0"/> Warning <span className="text-muted-foreground text-xs">90-100% utilized</span></div>
                    <div className="flex items-center gap-2"><Badge className="bg-red-500 w-4 h-4 p-0"/> Over Budget <span className="text-muted-foreground text-xs">&gt;100% utilized</span></div>
                </CardContent>
            </Card>

        </div>
    )
}

export default BudgetVsActualPage;
