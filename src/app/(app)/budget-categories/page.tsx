'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";

const categories = [
    { code: 'REV-001', name: 'Product Sales', type: 'Revenue', parent: '—' },
    { code: 'REV-002', name: 'Service Revenue', type: 'Revenue', parent: '—' },
    { code: 'REV-003', name: 'Other Income', type: 'Revenue', parent: '—' },
    { code: 'EXP-001', name: 'Payroll & Benefits', type: 'Expense', parent: '—' },
    { code: 'EXP-002', name: 'Rent & Utilities', type: 'Expense', parent: '—' },
    { code: 'EXP-003', name: 'Marketing & Advertising', type: 'Expense', parent: '—' },
    { code: 'EXP-004', name: 'IT & Technology', type: 'Expense', parent: '—' },
    { code: 'EXP-005', name: 'Professional Services', type: 'Expense', parent: '—' },
    { code: 'EXP-006', name: 'Travel & Entertainment', type: 'Expense', parent: '—' },
    { code: 'EXP-007', name: 'Office Supplies', type: 'Expense', parent: '—' },
    { code: 'EXP-008', name: 'Insurance', type: 'Expense', parent: '—' },
    { code: 'EXP-009', name: 'Maintenance & Repairs', type: 'Expense', parent: '—' },
    { code: 'DEPT-001', name: 'Sales Department', type: 'Department', parent: '—' },
    { code: 'DEPT-002', name: 'Marketing Department', type: 'Department', parent: '—' },
    { code: 'DEPT-003', name: 'Operations Department', type: 'Department', parent: '—' },
    { code: 'DEPT-004', name: 'Finance Department', type: 'Department', parent: '—' },
    { code: 'DEPT-005', name: 'HR Department', type: 'Department', parent: '—' },
    { code: 'DEPT-006', name: 'IT Department', type: 'Department', parent: '—' },
];

const BudgetCategoriesPage = () => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Budget Categories</CardTitle>
                    <CardDescription>{categories.length} Categories</CardDescription>
                </div>
                <Button><PlusCircle className="mr-2 h-4 w-4"/>Add New Category</Button>
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
                                <TableHead>Action</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Parent Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map(cat => (
                                <TableRow key={cat.code}>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                                <DropdownMenuItem>View</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell>{cat.code}</TableCell>
                                    <TableCell>{cat.name}</TableCell>
                                    <TableCell>{cat.type}</TableCell>
                                    <TableCell>{cat.parent}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export default BudgetCategoriesPage;
