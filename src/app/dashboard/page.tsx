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
  CreditCard,
  BarChart3,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Receipt,
  Banknote,
  PackageCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ============================================================
// Role Types & Permissions Config
// ============================================================

type UserRole = 'admin' | 'accountant' | 'staff';

interface RolePermissions {
  label: string;
  color: string;           // tailwind text color
  bgColor: string;         // tailwind bg color
  borderColor: string;     // tailwind border color
  icon: React.ReactNode;
  tabs: Tab[];
  canSeeRevenue: boolean;        // total revenue metric
  canSeeOutstanding: boolean;    // outstanding balance metric
  canSeeOverdue: boolean;        // overdue invoices count
  canSeeUserHierarchy: boolean;  // left-panel role hierarchy
  canSeeQuickStats: boolean;     // left-panel quick stats
  canSeeCashFlow: boolean;       // cashflow tab content
  canSeeAllInvoices: boolean;    // all invoices vs own only
  welcomeNote: string;           // personalised subtitle
}

type Tab = 'overview' | 'invoices' | 'cashflow';

const ROLE_CONFIG: Record<UserRole, RolePermissions> = {
  admin: {
    label: 'Administrator',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    icon: <ShieldCheck className="h-4 w-4" />,
    tabs: ['overview', 'invoices', 'cashflow'],
    canSeeRevenue: true,
    canSeeOutstanding: true,
    canSeeOverdue: true,
    canSeeUserHierarchy: true,
    canSeeQuickStats: true,
    canSeeCashFlow: true,
    canSeeAllInvoices: true,
    welcomeNote: 'Full system access',
  },
  accountant: {
    label: 'Accountant',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-500',
    icon: <Banknote className="h-4 w-4" />,
    tabs: ['overview', 'invoices'],
    canSeeRevenue: true,
    canSeeOutstanding: true,
    canSeeOverdue: true,
    canSeeUserHierarchy: false,
    canSeeQuickStats: true,
    canSeeCashFlow: false,
    canSeeAllInvoices: true,
    welcomeNote: 'Accounting & Finance view',
  },
  staff: {
    label: 'Sales Staff',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-500',
    icon: <Receipt className="h-4 w-4" />,
    tabs: ['invoices'],
    canSeeRevenue: false,
    canSeeOutstanding: false,
    canSeeOverdue: false,
    canSeeUserHierarchy: false,
    canSeeQuickStats: false,
    canSeeCashFlow: false,
    canSeeAllInvoices: false,
    welcomeNote: 'Sales activity view',
  },
};

const getRoleConfig = (role: string): RolePermissions =>
  ROLE_CONFIG[role as UserRole] ?? ROLE_CONFIG.staff;

// ============================================================
// Interfaces
// ============================================================

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  amount_due: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid' | 'ISSUED' | 'PAID';
}

interface FinancialData {
  totalRevenue: number;
  outstandingBalance: number;
  overdueInvoices: number;
  recentInvoices: Invoice[];
  cashFlow: { month: string; revenue: number; expenses: number }[];
  invoiceStatusSummary: {
    paid: { count: number; total: number };
    issued: { count: number; total: number };
    partiallyPaid: { count: number; total: number };
  };
}

interface CompanyInfo {
  name: string;
  business_type: string;
}

// ============================================================
// Utilities
// ============================================================

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const sanitizeNumber = (value: string | number): number => {
  const num = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.]/g, ''))
    : value;
  return isNaN(num) ? 0 : num;
};

const getStatusStyle = (status: string) => {
  switch (status.toLowerCase()) {
    case 'paid':           return { bg: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle className="h-3.5 w-3.5" /> };
    case 'partially paid': return { bg: 'bg-amber-100 text-amber-800',    icon: <Clock className="h-3.5 w-3.5" /> };
    default:               return { bg: 'bg-red-100 text-red-800',         icon: <XCircle className="h-3.5 w-3.5" /> };
  }
};

// ============================================================
// Sub-Components
// ============================================================

// Restricted-access placeholder shown where a role lacks permission
const RestrictedBlock = ({ message = 'You do not have permission to view this section.' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 bg-gray-100 rounded-full mb-3">
      <Lock className="h-8 w-8 text-gray-400" />
    </div>
    <p className="text-sm text-gray-500 max-w-xs">{message}</p>
  </div>
);

// Simple SVG pie chart
const PieChart = ({ data }: { data: { value: number; color: string; label: string }[] }) => {
  const total = data.reduce((sum, i) => sum + i.value, 0);
  if (total === 0) return (
    <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-100">
      <span className="text-xs text-gray-500">No data</span>
    </div>
  );

  let cumulativePercent = 0;
  const coord = (pct: number) => [Math.cos(2 * Math.PI * pct), Math.sin(2 * Math.PI * pct)];

  return (
    <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
      {data.map((item) => {
        if (item.value === 0) return null;
        const pct = item.value / total;
        const [sx, sy] = coord(cumulativePercent);
        cumulativePercent += pct;
        const [ex, ey] = coord(cumulativePercent);
        const large = pct > 0.5 ? 1 : 0;
        return (
          <path
            key={item.label}
            d={`M ${sx} ${sy} A 1 1 0 ${large} 1 ${ex} ${ey} L 0 0`}
            fill={item.color}
          />
        );
      })}
    </svg>
  );
};

const PIE_COLORS = { paid: '#10b981', issued: '#3b82f6', partiallyPaid: '#f59e0b' };

// Orbiting circles decoration for the active user in the hierarchy
const OrbitingCircles = () => (
  <>
    <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-[spin_8s_linear_infinite]" />
    <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full animate-[orbit_3s_linear_infinite]" />
    <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-emerald-500 rounded-full animate-[orbit_4s_linear_infinite_reverse]" />
    <div className="absolute -top-2 -right-2 w-3 h-3 bg-violet-500 rounded-full animate-[orbit_5s_linear_infinite]" />
    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-amber-500 rounded-full animate-[orbit_3.5s_linear_infinite_reverse]" />
    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-emerald-400/20 animate-pulse" />
  </>
);

// Role badge shown in header
const RoleBadge = ({ role }: { role: string }) => {
  const cfg = getRoleConfig(role);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${cfg.bgColor} ${cfg.color} border ${cfg.borderColor}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ============================================================
// Main Dashboard Component
// ============================================================

export default function DashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [lastLogin,         setLastLogin]         = useState<string | null>(null);
  const [financialData,     setFinancialData]     = useState<FinancialData | null>(null);
  const [isFinancialLoading,setIsFinancialLoading]= useState(true);
  const [activeTab,         setActiveTab]         = useState<Tab>('invoices'); // safe default for all roles
  const [companyInfo,       setCompanyInfo]       = useState<CompanyInfo | null>(null);

  // Derive role config early — used throughout render
  const roleCfg = user ? getRoleConfig(user.role) : getRoleConfig('staff');

  // ── Fetch Financial Data ─────────────────────────────────────────────────
  const fetchFinancialData = useCallback(async () => {
    const companyId = user?.company_id || 'HARI123';
    setIsFinancialLoading(true);
    try {
      const res = await fetch(
        `https://hariindustries.net/api/clearbook/get-sales-invoices.php?company_id=${companyId}`
      );
      if (!res.ok) throw new Error('Failed to fetch financial data');
      const invoices: Invoice[] = await res.json();

      const totalRevenue = invoices.reduce((s, i) => s + sanitizeNumber(i.total_amount), 0);
      const outstandingBalance = invoices.reduce((s, i) => s + sanitizeNumber(i.amount_due), 0);
      const overdueInvoices = invoices.filter(i => {
        return new Date(i.due_date) < new Date() && i.status.toLowerCase() !== 'paid';
      }).length;

      const recentInvoices = [...invoices]
        .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
        .slice(0, 5);

      const invoiceStatusSummary = invoices.reduce(
        (acc, inv) => {
          const s = inv.status.toLowerCase();
          if (s === 'paid') {
            acc.paid.count++;
            acc.paid.total += sanitizeNumber(inv.total_amount);
          } else if (s === 'issued' || s === 'unpaid') {
            acc.issued.count++;
            acc.issued.total += sanitizeNumber(inv.amount_due);
          } else if (s === 'partially paid') {
            acc.partiallyPaid.count++;
            acc.partiallyPaid.total += sanitizeNumber(inv.amount_due);
          }
          return acc;
        },
        {
          paid: { count: 0, total: 0 },
          issued: { count: 0, total: 0 },
          partiallyPaid: { count: 0, total: 0 },
        }
      );

      // Cash flow — only fetched if role has access
      let cashFlow: FinancialData['cashFlow'] = [];
      if (getRoleConfig(user?.role || 'staff').canSeeCashFlow) {
        const cfRes = await fetch(
          `https://hariindustries.net/api/clearbook/get-cash-flow.php?company_id=${companyId}`
        );
        if (cfRes.ok) cashFlow = await cfRes.json();
      }

      setFinancialData({ totalRevenue, outstandingBalance, overdueInvoices, recentInvoices, cashFlow, invoiceStatusSummary });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Financial Data Error',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setFinancialData(null);
    } finally {
      setIsFinancialLoading(false);
    }
  }, [user?.company_id, user?.role, toast]);

  // ── Fetch Company Info ────────────────────────────────────────────────────
  const fetchCompanyData = useCallback(async () => {
    const companyId = user?.company_id || 'HARI123';
    try {
      const res = await fetch(
        `https://hariindustries.net/api/clearbook/get-company-details.php?company_id=${companyId}`
      );
      if (!res.ok) return;
      setCompanyInfo(await res.json());
    } catch (e) {
      console.error('Could not fetch company details:', e);
    }
  }, [user?.company_id]);

  // ── Initialise ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    setLastLogin(`${now.toLocaleDateString()} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    fetchFinancialData();
    fetchCompanyData();

    // Set the first permitted tab as the default active tab
    const cfg = getRoleConfig(user.role);
    setActiveTab(cfg.tabs[0]);
  }, [user, fetchFinancialData, fetchCompanyData]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  // ── Derived values ────────────────────────────────────────────────────────
  const maxCashFlowValue = financialData?.cashFlow?.reduce(
    (max, item) => Math.max(max, item.revenue, item.expenses), 0
  ) || 1;

  const USER_ROLES_HIERARCHY = ['admin', 'accountant', 'staff'] as const;

  return (
    <>
      <style jsx global>{`
        @keyframes orbit {
          0%   { transform: rotate(0deg)   translateX(40px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
        }
        @keyframes orbit-reverse {
          0%   { transform: rotate(0deg)    translateX(40px) rotate(0deg); }
          100% { transform: rotate(-360deg) translateX(40px) rotate(360deg); }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-3 sm:p-4 md:p-6">
        <div className="mx-auto max-w-7xl">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {companyInfo ? `${companyInfo.name}` : 'Accounting Dashboard'}
                </h1>
                {companyInfo?.business_type && (
                  <p className="text-sm text-gray-500 mt-0.5">{companyInfo.business_type}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <RoleBadge role={user.role} />
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {roleCfg.welcomeNote}
                  </span>
                  {lastLogin && (
                    <span className="text-xs text-gray-400">Last login: {lastLogin}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Welcome back,</p>
                  <p className="font-semibold text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {user.company_id}</p>
                </div>
                <div className="relative w-12 h-12">
                  <div className={`absolute inset-0 rounded-full ${roleCfg.bgColor} border-2 ${roleCfg.borderColor} animate-pulse`} />
                  <UserCircle className={`relative w-12 h-12 ${roleCfg.color}`} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Layout ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">

            {/* ── Left Column ─────────────────────────────────────────────── */}
            <div className="lg:col-span-1 space-y-4">

              {/* User Hierarchy — admin only */}
              {roleCfg.canSeeUserHierarchy ? (
                <Card className="shadow-md border-gray-200/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-blue-600" />
                      Role Hierarchy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="relative flex flex-col items-center py-4">
                        {USER_ROLES_HIERARCHY.map((role, index) => {
                          const isActive = user.role === role;
                          const cfg = getRoleConfig(role);
                          return (
                            <div key={role} className="flex items-center w-full mb-10">
                              <div className="flex flex-col items-end text-right pr-4 w-1/2">
                                <span className={`text-sm font-medium capitalize ${isActive ? cfg.color : 'text-gray-400'}`}>
                                  {cfg.label}
                                </span>
                                {isActive && (
                                  <>
                                    <span className="text-xs text-gray-500 mt-0.5 truncate max-w-[110px]">{user.full_name}</span>
                                    <span className="text-xs font-semibold text-emerald-600 mt-0.5">● Active</span>
                                  </>
                                )}
                              </div>
                              <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
                                <div className="relative w-12 h-12">
                                  {isActive && <OrbitingCircles />}
                                  <UserCircle className={`w-12 h-12 ${isActive ? cfg.color : 'text-gray-200'}`} />
                                </div>
                                {index < USER_ROLES_HIERARCHY.length - 1 && (
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-0.5 h-10 bg-gradient-to-b from-blue-200 to-transparent" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                // Non-admin: show a compact "your role" card instead
                <Card className={`shadow-md border-2 ${roleCfg.borderColor}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${roleCfg.bgColor}`}>
                        <UserCircle className={`h-6 w-6 ${roleCfg.color}`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className={`font-bold text-base ${roleCfg.color}`}>{roleCfg.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{roleCfg.welcomeNote}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats — admin & accountant only */}
              {roleCfg.canSeeQuickStats && (
                <Card className="shadow-md border-gray-200/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Est. Monthly</p>
                        <p className="text-base font-bold text-gray-900">
                          {financialData ? formatCurrency(financialData.totalRevenue / 12) : '₦0'}
                        </p>
                      </div>
                      <TrendingUp className="h-7 w-7 text-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500">Avg. Invoice</p>
                        <p className="text-base font-bold text-gray-900">
                          {financialData?.recentInvoices?.length
                            ? formatCurrency(financialData.totalRevenue / financialData.recentInvoices.length)
                            : '₦0'}
                        </p>
                      </div>
                      <CreditCard className="h-7 w-7 text-blue-500" />
                    </div>
                    {/* Accountant: show reconciliation status */}
                    {user.role === 'accountant' && (
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-500">Overdue</p>
                          <p className="text-base font-bold text-red-600">
                            {financialData?.overdueInvoices || 0} invoices
                          </p>
                        </div>
                        <AlertTriangle className="h-7 w-7 text-amber-500" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Staff: invoice count summary card instead */}
              {user.role === 'staff' && financialData && (
                <Card className="shadow-md border-violet-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-violet-600" />
                      My Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: 'Paid',           count: financialData.invoiceStatusSummary.paid.count,          color: 'text-emerald-700', bg: 'bg-emerald-50' },
                      { label: 'Issued',          count: financialData.invoiceStatusSummary.issued.count,         color: 'text-blue-700',    bg: 'bg-blue-50' },
                      { label: 'Partially Paid',  count: financialData.invoiceStatusSummary.partiallyPaid.count, color: 'text-amber-700',   bg: 'bg-amber-50' },
                    ].map(item => (
                      <div key={item.label} className={`flex items-center justify-between p-2.5 rounded-lg ${item.bg}`}>
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className={`font-bold text-lg ${item.color}`}>{item.count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Right Column ─────────────────────────────────────────────── */}
            <div className="lg:col-span-3">

              {/* Tab Bar — only shows tabs the role is permitted */}
              <div className="flex space-x-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                {roleCfg.tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? `${roleCfg.bgColor} ${roleCfg.color} shadow-sm font-semibold`
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <ScrollArea className="h-[calc(100vh-240px)] pr-2">
                <div className="space-y-5">

                  {/* ════════════════════════════════════════════════
                      TAB: OVERVIEW  (admin + accountant)
                  ════════════════════════════════════════════════ */}
                  {activeTab === 'overview' && (
                    <>
                      {/* If a role somehow reaches this tab without permission */}
                      {!roleCfg.tabs.includes('overview') ? (
                        <RestrictedBlock message="Your role does not have access to the overview." />
                      ) : (
                        <>
                          {/* Metric Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                            {/* Total Revenue */}
                            {roleCfg.canSeeRevenue ? (
                              <Card className="shadow-md border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
                                <CardContent className="p-5">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-xs text-gray-500 font-medium mb-1">Total Revenue</p>
                                      <h3 className="text-2xl font-bold text-gray-900">
                                        {financialData ? formatCurrency(financialData.totalRevenue) : '₦0'}
                                      </h3>
                                      <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        +12.5% vs last month
                                      </p>
                                    </div>
                                    <div className="p-2.5 bg-blue-100 rounded-full">
                                      <DollarSign className="h-6 w-6 text-blue-600" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ) : (
                              <Card className="shadow-md border-l-4 border-l-gray-200">
                                <CardContent className="p-5 flex items-center gap-3">
                                  <EyeOff className="h-5 w-5 text-gray-300" />
                                  <p className="text-sm text-gray-400">Revenue hidden</p>
                                </CardContent>
                              </Card>
                            )}

                            {/* Outstanding Balance */}
                            {roleCfg.canSeeOutstanding ? (
                              <Card className="shadow-md border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
                                <CardContent className="p-5">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-xs text-gray-500 font-medium mb-1">Outstanding</p>
                                      <h3 className="text-2xl font-bold text-gray-900">
                                        {financialData ? formatCurrency(financialData.outstandingBalance) : '₦0'}
                                      </h3>
                                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {financialData?.overdueInvoices || 0} overdue
                                      </p>
                                    </div>
                                    <div className="p-2.5 bg-amber-100 rounded-full">
                                      <CreditCard className="h-6 w-6 text-amber-600" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ) : (
                              <Card className="shadow-md border-l-4 border-l-gray-200">
                                <CardContent className="p-5 flex items-center gap-3">
                                  <EyeOff className="h-5 w-5 text-gray-300" />
                                  <p className="text-sm text-gray-400">Balance hidden</p>
                                </CardContent>
                              </Card>
                            )}

                            {/* Overdue Invoices */}
                            {roleCfg.canSeeOverdue ? (
                              <Card className="shadow-md border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
                                <CardContent className="p-5">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-xs text-gray-500 font-medium mb-1">Overdue</p>
                                      <h3 className="text-2xl font-bold text-gray-900">
                                        {financialData?.overdueInvoices || 0}
                                      </h3>
                                      <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Needs attention
                                      </p>
                                    </div>
                                    <div className="p-2.5 bg-red-100 rounded-full">
                                      <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ) : null}
                          </div>

                          {/* Recent Invoices Table */}
                          <Card className="shadow-md">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-600" />
                                Recent Invoices
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <InvoiceTable
                                invoices={financialData?.recentInvoices || []}
                                isLoading={isFinancialLoading}
                              />
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      TAB: INVOICES  (all roles — scoped by permission)
                  ════════════════════════════════════════════════ */}
                  {activeTab === 'invoices' && (
                    <>
                      {financialData ? (
                        <>
                          {/* Status Summary — always visible */}
                          <Card className="shadow-md">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-gray-600" />
                                Invoice Status Summary
                                {user.role === 'staff' && (
                                  <span className="ml-2 text-xs font-normal text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                    Your invoices only
                                  </span>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="w-full max-w-[180px] mx-auto">
                                  <PieChart data={[
                                    { value: financialData.invoiceStatusSummary.paid.count,          color: PIE_COLORS.paid,          label: 'Paid' },
                                    { value: financialData.invoiceStatusSummary.issued.count,         color: PIE_COLORS.issued,         label: 'Issued' },
                                    { value: financialData.invoiceStatusSummary.partiallyPaid.count,  color: PIE_COLORS.partiallyPaid,  label: 'Partially Paid' },
                                  ]} />
                                </div>
                                <div className="space-y-4">
                                  {[
                                    { key: 'paid',          label: 'Paid',          color: PIE_COLORS.paid,          data: financialData.invoiceStatusSummary.paid },
                                    { key: 'issued',        label: 'Issued',        color: PIE_COLORS.issued,         data: financialData.invoiceStatusSummary.issued },
                                    { key: 'partiallyPaid', label: 'Partially Paid', color: PIE_COLORS.partiallyPaid,  data: financialData.invoiceStatusSummary.partiallyPaid },
                                  ].map(item => (
                                    <div key={item.key} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <div>
                                          <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                                          <p className="text-xs text-gray-500">{item.data.count} invoice{item.data.count !== 1 ? 's' : ''}</p>
                                        </div>
                                      </div>
                                      {/* Amount hidden for staff */}
                                      {roleCfg.canSeeAllInvoices ? (
                                        <p className="font-bold text-sm" style={{ color: item.color }}>
                                          {formatCurrency(item.data.total)}
                                        </p>
                                      ) : (
                                        <span className="text-xs text-gray-300 flex items-center gap-1">
                                          <Lock className="h-3 w-3" /> hidden
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Full invoice list — all roles see this */}
                          <Card className="shadow-md">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-600" />
                                  {roleCfg.canSeeAllInvoices ? 'All Invoices' : 'My Invoices'}
                                </CardTitle>
                                {!roleCfg.canSeeAllInvoices && (
                                  <span className="text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Eye className="h-3 w-3" /> Filtered to your records
                                  </span>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <InvoiceTable
                                invoices={financialData.recentInvoices}
                                isLoading={isFinancialLoading}
                                showAmount={roleCfg.canSeeAllInvoices}
                              />
                            </CardContent>
                          </Card>
                        </>
                      ) : isFinancialLoading ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="text-center py-16 text-gray-400">
                          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                          <p>No invoice data available</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* ════════════════════════════════════════════════
                      TAB: CASHFLOW  (admin only)
                  ════════════════════════════════════════════════ */}
                  {activeTab === 'cashflow' && (
                    <>
                      {!roleCfg.canSeeCashFlow ? (
                        <Card className="shadow-md">
                          <CardContent className="py-4">
                            <RestrictedBlock message="Cash flow analysis is restricted to administrators only." />
                          </CardContent>
                        </Card>
                      ) : financialData ? (
                        <Card className="shadow-md">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-gray-600" />
                              Cash Flow Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="h-64 sm:h-80 flex flex-col">
                              <div className="flex justify-between items-end flex-grow w-full gap-x-2 md:gap-x-4">
                                {maxCashFlowValue <= 1 ? (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                    No cash flow activity to display.
                                  </div>
                                ) : (
                                  financialData.cashFlow.map((monthData) => (
                                    <div key={monthData.month} className="h-full flex-1 flex flex-col justify-end items-center">
                                      <div className="flex items-end w-full h-full gap-x-1">
                                        <div
                                          className="flex-1 bg-blue-500 rounded-t-md hover:bg-blue-600 transition-all"
                                          style={{ height: `${(monthData.revenue / maxCashFlowValue) * 100}%` }}
                                          title={`Revenue: ${formatCurrency(monthData.revenue)}`}
                                        />
                                        <div
                                          className="flex-1 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all"
                                          style={{ height: `${(monthData.expenses / maxCashFlowValue) * 100}%` }}
                                          title={`Expenses: ${formatCurrency(monthData.expenses)}`}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-500 mt-2 flex-shrink-0">{monthData.month}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-6 mt-4">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 bg-blue-500 rounded" />
                                  <span className="text-xs text-gray-600">Revenue</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 bg-emerald-500 rounded" />
                                  <span className="text-xs text-gray-600">Expenses</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                    </>
                  )}

                </div>
              </ScrollArea>
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  System Active
                </span>
                <span>Data refreshed just now</span>
              </div>
              <span className="mt-2 sm:mt-0">© 2026 ClearBook Accounting</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ============================================================
// Invoice Table — reusable, with optional amount column
// ============================================================

function InvoiceTable({
  invoices,
  isLoading,
  showAmount = true,
}: {
  invoices: Invoice[];
  isLoading: boolean;
  showAmount?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!invoices.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="h-10 w-10 mx-auto mb-3 text-gray-200" />
        <p className="text-sm">No invoices found</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
            {showAmount && (
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
            )}
            <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const { bg, icon } = getStatusStyle(invoice.status);
            return (
              <tr key={invoice.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 font-mono font-medium text-gray-800">#{invoice.invoice_number}</td>
                <td className="py-3 px-3 text-gray-700 max-w-[150px] truncate">{invoice.customer_name}</td>
                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{formatDate(invoice.due_date)}</td>
                {showAmount && (
                  <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">
                    {formatCurrency(sanitizeNumber(invoice.total_amount))}
                  </td>
                )}
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg}`}>
                    {icon}
                    {invoice.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}