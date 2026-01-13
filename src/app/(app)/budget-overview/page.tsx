'use client';

import { BarChart, CircleDollarSign, PiggyBank, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

const topCategories = [
    { category: 'HR Department', budgeted: 500000, actual: 0, variance: 500000, status: 'On Track' },
    { category: 'IT & Technology', budgeted: 50000, actual: 0, variance: 50000, status: 'On Track' },
];

const monthlyTrend = [
    { month: 'Jan', budgeted: 213888.89, actual: 0, variance: 213888.89 },
    { month: 'Feb', budgeted: 213888.89, actual: 0, variance: 213888.89 },
    { month: 'Mar', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Apr', budgeted: 0, actual: 0, variance: 0 },
    { month: 'May', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Jun', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Jul', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Aug', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Sep', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Oct', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Nov', budgeted: 0, actual: 0, variance: 0 },
    { month: 'Dec', budgeted: 0, actual: 0, variance: 0 },
];

const BudgetOverviewPage = () => {
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                 <h1 className="text-2xl font-bold">Budget Overview</h1>
                 <div className="text-sm text-muted-foreground">
                     <Link href="/dashboard" className="hover:text-primary">Dashboard</Link> / <Link href="/all-budgets" className="hover:text-primary">Budget</Link> / Overview
                 </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                        <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(550000.00)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(0.00)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Variance</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(550000.00)}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Utilization</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Budgets</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                         <p className="text-xs text-muted-foreground">Budgets &gt;90% utilization</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                 {/* Top 10 Categories */}
                <Card>
                    <CardHeader><CardTitle>Top 10 Categories - Budget vs Actual</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Budgeted</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Variance</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topCategories.map(cat => (
                                    <TableRow key={cat.category}>
                                        <TableCell>{cat.category}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(cat.budgeted)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(cat.actual)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(cat.variance)}</TableCell>
                                        <TableCell><Badge variant="outline" className="bg-green-100 text-green-800">{cat.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Monthly Trend */}
                <Card>
                    <CardHeader><CardTitle>Monthly Trend - Budget vs Actual</CardTitle></CardHeader>
                    <CardContent>
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead className="text-right">Budgeted</TableHead>
                                    <TableHead className="text-right">Actual</TableHead>
                                    <TableHead className="text-right">Variance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthlyTrend.map(m => (
                                    <TableRow key={m.month}>
                                        <TableCell>{m.month}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(m.budgeted)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(m.actual)}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(m.variance)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            {/* Quick Actions */}
            <Card>
                <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
                <CardContent className="flex gap-4">
                    <Link href="/all-budgets/new" passHref><Button>Create New Budget</Button></Link>
                    <Link href="/budget-vs-actual" passHref><Button variant="outline">View Budget vs Actual</Button></Link>
                    <Link href="/budget-categories" passHref><Button variant="outline">Manage Categories</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
}

export default BudgetOverviewPage;
