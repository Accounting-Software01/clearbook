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
  Info,
  CreditCard,
  BarChart3,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  XCircle
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
  recentInvoices: Invoice[];
  cashFlow: {
    month: string;
    revenue: number;
    expenses: number;
  }[];
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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const sanitizeNumber = (value: string | number): number => {
  const num = typeof value === 'string' 
    ? parseFloat(value.replace(/[^0-9.]/g, '')) 
    : value;
  return isNaN(num) ? 0 : num;
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid': return 'bg-green-100 text-green-800';
    case 'partially paid': return 'bg-yellow-100 text-yellow-800';
    case 'unpaid': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid': return <CheckCircle className="h-4 w-4" />;
    case 'partially paid': return <Clock className="h-4 w-4" />;
    case 'unpaid': return <XCircle className="h-4 w-4" />;
    default: return null;
  }
};

// Orbiting Circles Component
const OrbitingCircles = ({ isCurrentUser }: { isCurrentUser: boolean }) => {
  if (!isCurrentUser) return null;
  
  return (
    <>
      {/* Inner Orbit Ring */}
      <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-[spin_8s_linear_infinite]" />
      
      {/* Orbiting Circles */}
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full animate-[orbit_3s_linear_infinite]" />
      <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-green-500 rounded-full animate-[orbit_4s_linear_infinite_reverse]" />
      <div className="absolute -top-2 -right-2 w-3 h-3 bg-purple-500 rounded-full animate-[orbit_5s_linear_infinite]" />
      <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-orange-500 rounded-full animate-[orbit_3.5s_linear_infinite_reverse]" />
      
      {/* Pulsing Center Glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-green-400/20 animate-pulse" />
    </>
  );
};

// Main Component
export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isFinancialLoading, setIsFinancialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'cashflow'>('overview');

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

      // Get recent invoices (last 5)
      const recentInvoices = invoices
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
        .slice(0, 5);

      // Mock cash flow data (replace with actual API data)
      const cashFlow = [
        { month: 'Jan', revenue: 450000, expenses: 320000 },
        { month: 'Feb', revenue: 520000, expenses: 380000 },
        { month: 'Mar', revenue: 480000, expenses: 350000 },
        { month: 'Apr', revenue: 610000, expenses: 420000 },
        { month: 'May', revenue: 580000, expenses: 390000 },
        { month: 'Jun', revenue: 720000, expenses: 450000 },
      ];

      setFinancialData({ 
        totalRevenue, 
        outstandingBalance, 
        overdueInvoices,
        recentInvoices,
        cashFlow
      });
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
      const formattedLoginTime = `${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      setLastLogin(formattedLoginTime);
      fetchFinancialData();
    }
  }, [user, fetchFinancialData]);

  // Loading State
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading accounting dashboard...</p>
        </div>
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
    <>
      {/* Global Animations */}
      <style jsx global>{`
        @keyframes orbit {
          0% {
            transform: rotate(0deg) translateX(40px) rotate(0deg);
          }
          100% {
            transform: rotate(360deg) translateX(40px) rotate(-360deg);
          }
        }
        @keyframes orbit-reverse {
          0% {
            transform: rotate(0deg) translateX(40px) rotate(0deg);
          }
          100% {
            transform: rotate(-360deg) translateX(40px) rotate(360deg);
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  Accounting Dashboard
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    <UserCircle className="h-4 w-4 mr-2" />
                    {user.role}
                  </span>
                  <span className="text-sm text-gray-600">
                    Company ID: {user.company_id}
                  </span>
                  {lastLogin && (
                    <span className="text-xs text-gray-500">
                      Last login: {lastLogin}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Welcome back,</p>
                  <p className="font-semibold text-gray-900">{user.full_name}</p>
                </div>
                <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-green-500 animate-pulse" />
                  <UserCircle className="relative w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* Left Column - User Roles & Quick Stats */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              {/* User Roles Card */}
              <Card className="shadow-lg border-gray-200/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                    <UserCircle className="h-5 w-5 mr-2 text-blue-600" />
                    User Roles Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] sm:h-[400px]">
                    <div className="relative flex flex-col items-center py-4">
                      {sortedUserRoles.map((role, index) => {
                        const isCurrentUserRole = user?.role === role;
                        
                        return (
                          <div key={role} className="flex items-center w-full mb-8 sm:mb-10">
                            {/* Role Information */}
                            <div className="flex flex-col items-end text-right pr-3 sm:pr-4 w-1/2">
                              <span className="text-sm font-medium text-gray-700 capitalize">
                                {role.replace('_', ' ')}
                              </span>
                              {isCurrentUserRole && (
                                <>
                                  <span className="text-xs text-gray-500 mt-1 truncate max-w-[120px]">
                                    {user.full_name}
                                  </span>
                                  <span className="text-xs font-semibold text-green-600 mt-1">
                                    Active Session
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {/* Role Icon with Orbit Effect */}
                            <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
                              <div className="relative w-10 h-10 sm:w-14 sm:h-14">
                                {isCurrentUserRole && (
                                  <OrbitingCircles isCurrentUser={isCurrentUserRole} />
                                )}
                                <UserCircle 
                                  className={`w-10 h-10 sm:w-14 sm:h-14 ${
                                    isCurrentUserRole 
                                      ? 'text-blue-600' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              </div>
                              
                              {/* Connecting Line */}
                              {index < sortedUserRoles.length - 1 && (
                                <div className="absolute top-full left-1/2 w-0.5 h-8 sm:h-12 transform -translate-x-1/2 mt-2 bg-gradient-to-b from-blue-200 to-transparent"></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-lg border-gray-200/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">This Month</p>
                      <p className="text-lg font-bold text-gray-900">
                        {financialData ? formatCurrency(financialData.totalRevenue / 12) : '₦0'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Avg. Invoice</p>
                      <p className="text-lg font-bold text-gray-900">
                        {financialData?.recentInvoices?.length 
                          ? formatCurrency(financialData.totalRevenue / financialData.recentInvoices.length)
                          : '₦0'}
                      </p>
                    </div>
                    <CreditCard className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Main Dashboard */}
            <div className="lg:col-span-3">
              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
                {(['overview', 'invoices', 'cashflow'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <ScrollArea className="h-[calc(100vh-220px)] sm:h-[calc(100vh-200px)] pr-2">
                <div className="space-y-4 md:space-y-6">
                  
                  {/* Financial Overview Cards */}
                  {activeTab === 'overview' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Total Revenue */}
                        <Card className="shadow-lg border-l-4 border-l-blue-500 hover:shadow-xl transition-all duration-300">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                  {financialData ? formatCurrency(financialData.totalRevenue) : '₦0'}
                                </h3>
                                <p className="text-xs text-green-600 mt-2 flex items-center">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  +12.5% from last month
                                </p>
                              </div>
                              <div className="p-3 bg-blue-100 rounded-full">
                                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Outstanding Balance */}
                        <Card className="shadow-lg border-l-4 border-l-amber-500 hover:shadow-xl transition-all duration-300">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Outstanding Balance</p>
                                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                  {financialData ? formatCurrency(financialData.outstandingBalance) : '₦0'}
                                </h3>
                                <p className="text-xs text-amber-600 mt-2 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {financialData?.overdueInvoices || 0} overdue invoices
                                </p>
                              </div>
                              <div className="p-3 bg-amber-100 rounded-full">
                                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Overdue Invoices */}
                        <Card className="shadow-lg border-l-4 border-l-red-500 hover:shadow-xl transition-all duration-300">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Overdue Invoices</p>
                                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                  {financialData?.overdueInvoices || 0}
                                </h3>
                                <p className="text-xs text-red-600 mt-2 flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Requires immediate attention
                                </p>
                              </div>
                              <div className="p-3 bg-red-100 rounded-full">
                                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Recent Invoices */}
                      <Card className="shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-gray-700" />
                            Recent Invoices
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {isFinancialLoading ? (
                            <div className="flex items-center justify-center h-48">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : financialData?.recentInvoices?.length ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Invoice #</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Customer</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {financialData.recentInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                      <td className="py-3 px-4 font-medium text-gray-900">
                                        #{invoice.invoice_number}
                                      </td>
                                      <td className="py-3 px-4 text-gray-700">
                                        {invoice.customer_name}
                                      </td>
                                      <td className="py-3 px-4 text-gray-700">
                                        {formatDate(invoice.due_date)}
                                      </td>
                                      <td className="py-3 px-4 font-medium text-gray-900">
                                        {formatCurrency(invoice.total_amount)}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                                          {getStatusIcon(invoice.status)}
                                          <span className="ml-1">{invoice.status}</span>
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-12 text-gray-500">
                              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p>No invoice data available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Cash Flow Chart */}
                  {activeTab === 'cashflow' && financialData && (
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2 text-gray-700" />
                          Cash Flow Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 sm:h-80">
                          {/* Simple bar chart implementation */}
                          <div className="flex items-end h-48 sm:h-56 space-x-2 sm:space-x-4 mt-4">
                            {financialData.cashFlow.map((monthData, index) => (
                              <div key={monthData.month} className="flex-1 flex flex-col items-center">
                                <div className="relative w-full">
                                  <div 
                                    className="w-full bg-blue-500 rounded-t-md"
                                    style={{ height: `${(monthData.revenue / 800000) * 100}%` }}
                                  />
                                  <div 
                                    className="w-full bg-green-500 rounded-t-md mt-1"
                                    style={{ height: `${(monthData.expenses / 500000) * 100}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 mt-2">{monthData.month}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center space-x-4 mt-6">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                              <span className="text-sm text-gray-600">Revenue</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                              <span className="text-sm text-gray-600">Expenses</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  System Status: Active
                </span>
                <span>Data updated just now</span>
              </div>
              <div className="mt-2 sm:mt-0">
                <span>© 2024 ClearBook Accounting</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}