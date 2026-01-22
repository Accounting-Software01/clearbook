'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, UserCircle, Loader2, TrendingUp, DollarSign, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const userRoles = [
    "admin",
    "accountant",
    "staff"
];

interface Invoice {
  id: string; 
  invoice_number: string;
  customer_name: string;
  invoice_date: string; 
  due_date: string;     
  total_amount: number;
  amount_due: number;  
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
}

interface FinancialData {
    totalRevenue: number;
    outstandingBalance: number;
    overdueInvoices: number;
}

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isFinancialLoading, setIsFinancialLoading] = useState(true);


  const financialChartData = financialData
  ? [
      { name: 'Revenue', value: financialData.totalRevenue },
      { name: 'Outstanding', value: financialData.outstandingBalance },
      { name: 'Overdue', value: financialData.overdueInvoices },
    ]
  : [];


  const fetchFinancialData = useCallback(async () => {
    if (!user?.company_id) return;
    setIsFinancialLoading(true);
    try {
        const res = await fetch(`https://hariindustries.net/api/clearbook/get-sales-invoices.php?company_id=${user.company_id}`);
        if (!res.ok) throw new Error('Could not fetch financial data.');
        const invoices: Invoice[] = await res.json();



        const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
        const outstandingBalance = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_due), 0);
        const overdueInvoices = invoices.filter(inv => new Date(inv.due_date) < new Date() && inv.status !== 'PAID').length;

        setFinancialData({ totalRevenue, outstandingBalance, overdueInvoices });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error fetching financials', description: error.message });
        setFinancialData(null);
    } finally {
        setIsFinancialLoading(false);
    }
  }, [user?.company_id, toast]);

  useEffect(() => {
    if (user) {
      const now = new Date();
      const formattedLoginTime = `${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
      setLastLogin(formattedLoginTime);
      fetchFinancialData();
    }
  }, [user, fetchFinancialData]);

  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  const sortedUserRoles = user ? [user.role, ...userRoles.filter(r => r !== user.role)] : userRoles;

  if (!user) {
    return null; 
  }

  return (
    <div className="flex h-screen items-start justify-center gap-6 p-8 bg-white">
      {/* Left Column */}
      <div className="w-1/3 h-[90vh] flex flex-col sticky top-8">
        <h2 className="text-xl font-bold text-center mb-4">User Roles</h2>
        <ScrollArea className="h-full pr-4">
            <div className="relative flex flex-col items-center">
                {sortedUserRoles.map((role, index) => {
                const isCurrentUserRole = user?.role === role;

                return (
                    <div key={role} className="flex items-center w-full mb-10">
                      <div className="flex flex-col items-end text-right pr-4 w-1/2">
                          <span className="text-xs font-medium capitalize">{role.replace('_', ' ')}</span>
                          {isCurrentUserRole && (
                          <>
                              <span className="text-xs text-muted-foreground">{user.full_name}</span>
                              <span className="text-xs text-green-600 font-bold dark:text-green-400">You're here</span>
                          </>
                          )}
                      </div>
                      <div className="relative w-16 h-16 flex-shrink-0">
                          {isCurrentUserRole && <div className="absolute w-full h-full rounded-full bg-green-500/20 animate-ping"></div>}
                          <UserCircle className={`w-16 h-16 ${isCurrentUserRole ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                          {index < sortedUserRoles.length - 1 && (
                            <div className={`absolute top-full left-1/2 w-0.5 h-12 transform -translate-x-1/2 mt-2 bg-gray-200`}></div>
                          )}
                      </div>
                    </div>
                );
                })}
            </div>
        </ScrollArea>
      </div>

      {/* Right Column */}
      <div className="w-2/3 h-[90vh] flex flex-col">
         <div className="mb-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">
                        Welcome, {user ? user.full_name : 'Guest'}
                    </h1>
                    {user && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Role: {user.role} | Company ID: {user.company_id}
                        </p>
                    )}
                    {lastLogin && <p className='text-xs text-muted-foreground mt-1'>Last login: {lastLogin}</p>}
                </div>
            </div>
        </div>
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                    

            <div  className=" w-full min-h-[320px] p-6 rounded-xl  bg-no-repeat bg-center bg-contain"
  style={{ backgroundImage: "url('/chart.png')" }}>

                    
                    
                    
                   
                </div>
                {/* Financial Snapshot */}
                <div className="pt-4">
                    <h3 className="text-xl font-semibold mb-4">Financial Snapshot</h3>
                    {isFinancialLoading ? (
                            <div className="flex items-center justify-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
                        ) : financialData ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(parseFloat(String(financialData.totalRevenue || '0').replace(/[^0-9.]/g, '')))}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(parseFloat(String(financialData.outstandingBalance || '0').replace(/[^0-9.]/g, '')))}</div></CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader>
                                <CardContent><div className="text-2xl font-bold">{financialData.overdueInvoices}</div></CardContent>
                            </Card>
                        </div>


                    ) : (
                         <div className="p-4 flex items-center text-center rounded-lg bg-gray-50">
                            <Info className="w-5 h-5 mr-3 text-primary"/>
                            <p className="text-sm text-muted-foreground">No financial data available to display.</p>
                        </div>
                    )}
                </div>

                {/* Quick Reminders - Kept as is */}
               
                <div className="p-4 rounded-lg bg-yellow-100/30">
                    <h3 className="font-semibold text-base flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-yellow-500"/>Quick Reminders</h3>
                    <ul className="list-disc list-inside text-sm mt-2 ml-2">
                        
                        <li>3 failed invoices require attention.</li>
                        <li>2 payment vouchers pending approval.</li>
                    </ul>
                </div>
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}
