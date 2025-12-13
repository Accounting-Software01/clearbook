'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, Printer, PlusCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CurrentUser {
    uid: string;
    email: string;
    full_name: string;
    role: string;
    user_type: string;
    company_type: string;
    company_id: string;
}

interface SalesOrder {
    id: string;
    customerName: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected' | 'invoiced';
}

export default function SalesPage() {
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [amount, setAmount] = useState('');
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

    // Sales orders state
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);

    useEffect(() => {
        const fetchUserAndSales = async () => {
            try {
                const user = await getCurrentUser();
                if (user && (user.role === 'admin_manager' || user.role === 'sales_manager') && user.company_type === 'manufacturing') {
                    setCurrentUser(user as CurrentUser);
                    fetchSalesOrders(user.company_id);
                } else {
                    setCurrentUser(null);
                }
            } catch (error) {
                console.error("Failed to fetch user or sales orders", error);
                setCurrentUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserAndSales();
    }, [router]);

    const fetchSalesOrders = async (companyId: string) => {
        // Mocked sales orders for demonstration
        const mockSales: SalesOrder[] = [
            { id: 'SO-001', customerName: 'Customer A', amount: 1500, status: 'pending' },
            { id: 'SO-002', customerName: 'Customer B', amount: 2500, status: 'approved' },
            { id: 'SO-003', customerName: 'Customer C', amount: 500, status: 'invoiced' },
            { id: 'SO-004', customerName: 'Customer D', amount: 5500, status: 'rejected' },
        ];
        setSalesOrders(mockSales);
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName || !amount) {
            toast({ title: "Validation Error", description: "Please fill all fields.", variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            const newOrder: SalesOrder = {
                id: `SO-00${salesOrders.length + 1}`,
                customerName,
                amount: parseFloat(amount),
                status: 'pending',
            };
            setSalesOrders([newOrder, ...salesOrders]);
            toast({ title: "Success!", description: "New sales order created and is pending approval." });
            setCustomerName('');
            setAmount('');
            setIsSubmitting(false);
            setIsCreateOrderOpen(false); // Close dialog on success
        }, 1000);
    };

    const canApprove = currentUser?.role === 'accountant' || currentUser?.role === 'admin_manager';

    const handleApprove = (id: string) => {
        setSalesOrders(salesOrders.map(order => 
            order.id === id ? { ...order, status: 'approved' } : order
        ));
        toast({ title: "Approved!", description: `Sales order ${id} has been approved.` });
    };
    
    const handleGenerateInvoice = (id: string) => {
        setSalesOrders(salesOrders.map(order => 
            order.id === id ? { ...order, status: 'invoiced' } : order
        ));
        toast({ title: "Invoiced!", description: `Invoice for ${id} has been generated.` });
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    if (!currentUser) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-red-50 text-red-800">
                <ShieldAlert className="h-16 w-16 mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Sales Management</h1>
                {currentUser.role === 'sales_manager' && (
                    <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create New Order
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create Sales Order</DialogTitle>
                                <DialogDescription>
                                    Fill in the details below to create a new sales order.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateOrder} className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="customerName">Customer Name</Label>
                                    <Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter customer name" required />
                                </div>
                                <div>
                                    <Label htmlFor="amount">Amount (₦)</Label>
                                    <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" required />
                                </div>
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                                    Create Order
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>Sales Orders</CardTitle>
                    <CardDescription>A list of all sales orders in your company.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Order ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                                {salesOrders.map((order) => (
                                    <tr key={order.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">{order.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{order.customerName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(order.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${{
                                                pending: 'bg-yellow-100 text-yellow-800',
                                                approved: 'bg-blue-100 text-blue-800',
                                                invoiced: 'bg-green-100 text-green-800',
                                                rejected: 'bg-red-100 text-red-800',
                                            }[order.status]}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {order.status === 'pending' && canApprove && (
                                                <Button variant="outline" size="sm" onClick={() => handleApprove(order.id)}>Approve</Button>
                                            )}
                                            {order.status === 'approved' && canApprove && (
                                                <Button variant="outline" size="sm" onClick={() => handleGenerateInvoice(order.id)}>Generate Invoice</Button>
                                            )}
                                            {(order.status === 'invoiced') && (
                                                <Button variant="ghost" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print</Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
