'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';




type Bill = {
    id: number;
    bill_date: string;
    due_date: string;
    total_amount: number;
    supplier_name: string;
};


const AllBillsPage = () => {
    const router = useRouter();
    const { user } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchBills = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const res = await fetch(
                    `https://hariindustries.net/api/clearbook/get_bills.php?company_id=${user.company_id}`,
                    { credentials: 'include' }
                  );
                  
                  const data = await res.json();
                  
                  if (res.ok && data.success) {
                      setBills(data.data);
                  } else {
                      console.error(data.message);
                  }
                  
            } catch (error) {
                console.error('Failed to fetch bills', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchBills();
        }
    }, [user]);

    const filteredBills = bills.filter(bill =>
        `BILL-${bill.id}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">All Bills</h1>
                <Button onClick={() => router.push('/bills/new')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Bill
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between">
                        <Input
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Bill Date</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                                </TableRow>
                            ) : filteredBills.length > 0 ? (
                                filteredBills.map((bill) => (
                                    <TableRow key={bill.id}>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    
                                                    <DropdownMenuItem onClick={() => router.push(`/bills/${bill.id}`)}>View Details</DropdownMenuItem>
                                                    
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                                        <TableCell>BILL-{bill.id}</TableCell>
<TableCell>{bill.supplier_name}</TableCell>

                                        <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">{bill.total_amount}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        No bills found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default AllBillsPage;
