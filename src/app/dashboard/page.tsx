'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  UserCircle, 
  Loader2, 
  TrendingUp, 
  DollarSign, 
  Info 
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Constants
const USER_ROLES = ['admin', 'accountant', 'staff'] as const;

// Interfaces
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

// Helper Functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

const sanitizeNumber = (value: string | number): number => {
  const num = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.]/g, '')) 
    : value;
  return isNaN(num) ? 0 : num;
};

// Main Component
export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isFinancialLoading, setIsFinancialLoading] = useState(true);

  // Fetch Financial Data
  const fetchFinancialData = useCallback(async () => {
    if (!user?.company_id) return;
    
    setIsFinancialLoading(true);
    try {
      const response = await fetch(
        `https://hariindustries.net/api/clearbook/get-sales-invoices.php?company_id=${user.company_id}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }
      
      const invoices: Invoice[] = await response.json();
      
      // Calculate financial metrics
      const totalRevenue = invoices.reduce(
        (sum, invoice) => sum + sanitizeNumber(invoice.total_amount), 
        0
      );
      
      const outstandingBalance = invoices.reduce(
        (sum, invoice) => sum + sanitizeNumber(invoice.amount_due), 
        0
      );
      
      const overdueInvoices = invoices.filter(invoice => {
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        return dueDate < today && invoice.status !== 'PAID';
      }).length;

      setFinancialData({ totalRevenue, outstandingBalance, overdueInvoices });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Financial Data Error',
        description: errorMessage
      });
      setFinancialData(null);
    } finally {
      setIsFinancialLoading(false);
    }
  }, [user?.company_id, toast]);

  // Initialize Dashboard
  useEffect(() => {
    if (user) {
      const now = new Date();
      const formattedLoginTime = `${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
      setLastLogin(formattedLoginTime);
      fetchFinancialData();
    }
  }, [user, fetchFinancialData]);

  // Loading State
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // No User State
  if (!user) {
    return null;
  }

  // Prepare User Roles for Display
  const sortedUserRoles = user 
    ? [user.role, ...USER_ROLES.filter(role => role !== user.role)] 
    : USER_ROLES;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column - User Roles */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card className="shadow-lg border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    User Roles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(75vh-8rem)]">
                    <div className="relative flex flex-col items-center py-4">
                      {sortedUserRoles.map((role, index) => {
                        const isCurrentUserRole = user?.role === role;
                        
                        return (
                          <div key={role} className="flex items-center w-full mb-10">
                            {/* Role Information */}
                            <div className="flex flex-col items-end text-right pr-4 w-1/2">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {role.replace('_', ' ')}
                              </span>
                              {isCurrentUserRole && (
                                <>
                                  <span className="text-xs text-gray-500 mt-1">
                                    {user.full_name}
                                  </span>
                                  <span className="text-xs font-semibold text-green-600 mt-1">
                                    Current Role
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {/* Role Icon */}
                            <div className="relative w-16 h-16 flex-shrink-0">
                              {isCurrentUserRole && (
                                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
                              )}
                              <UserCircle 
                                className={`w-16 h-16 ${
                                  isCurrentUserRole 
                                    ? 'text-green-500' 
                                    : 'text-gray-300'
                                }`} 
                              />
                              
                              {/* Connecting Line */}
                              {index < sortedUserRoles.length - 1 && (
                                <div className="absolute top-full left-1/2 w-0.5 h-12 transform -translate-x-1/2 mt-2 bg-gray-200"></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>

         {/* Right Column - Dashboard Content */}
<div className="lg:col-span-2">
  <ScrollArea className="h-[calc(100vh-4rem)] pr-2">
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white rounded-xl shadow-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome, {user.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Role:</span> {user.role}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Company ID:</span> {user.company_id}
            </p>
            {lastLogin && (
              <p className="text-xs text-gray-500">
                Last login: {lastLogin}
              </p>
            )}
          </div>
        </div>
        
        <div className="relative w-full md:w-64 h-40 md:h-48">
          <Image
            src="/chart.png"
            alt="Financial Overview Chart"
            fill
            className="rounded-lg object-contain"
            priority
            sizes="(max-width: 768px) 100vw, 256px"
          />
        </div>
      </div>

      {/* Financial Snapshot Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Financial Snapshot
        </h2>
        
        {isFinancialLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : financialData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Revenue Card */}
            <Card className="border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Balance Card */}
            <Card className="border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Outstanding Balance
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData.outstandingBalance)}
                </div>
              </CardContent>
            </Card>

            {/* Overdue Invoices Card */}
            <Card className="border-gray-200 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Overdue Invoices
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {financialData.overdueInvoices}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* No Data State */
          <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Info className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-600">
                No financial data available
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  </ScrollArea>
</div>

        </div>
      </div>
    </div>
  );
}