'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FilePlus,
    BookPlus,
    BookOpen,
    Scale,
    FileBarChart2,
    Landmark,
    ArrowRightLeft,
    Users,
    Library,
    Boxes,
    ChevronDown,
    ShoppingCart,
    Factory,
    LogOut,
    Settings,
    DollarSign,
    Banknote,
    Package,
    Wrench,
    Fuel,
    Undo2,
    Trash2,
    Truck,
    Sparkles,
    ShieldCheck,
    Ban,
    Layers,
    Send,
    TrendingUp,
    TrendingDown,
    Receipt,
    CreditCard,
    BookText,
    Database,
    GitCompare,
    PiggyBank,
    CircleDollarSign,
    Archive,
    BarChart,
    LayoutGrid,
    Bell,
    LineChart,
    FileText,
    ClipboardList,
    History,
    ShieldAlert,
    ArrowDown,
    ArrowUp,
    RefreshCw,
    AreaChart,
    Target,
    Briefcase, 
    Wallet,
    Clock, 
    Award,
    CalendarClock, 
    UserCheck,
    Store,
    FileClock,
    Quote,
    CheckSquare,
    Tags,
    Warehouse,
    UserSquare,
    FolderSync,
    Cog,
    BadgeDollarSign,
    Ruler,
    Link as LinkIcon

} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const allNavItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
        {
            label: 'Financial Management',
            isTitle: true,
        },
        {
            label: 'Accounting',
            icon: Landmark,
            subItems: [
                { href: '/incomes', label: 'Incomes', icon: TrendingUp, permission: 'view_accounting' },
                { href: '/expenses', label: 'Expenses', icon: TrendingDown, permission: 'view_accounting' },
                { href: '/receipts', label: 'Receipts', icon: Receipt, permission: 'view_accounting' },
                { href: '/payments', label: 'Payments', icon: CreditCard, permission: 'view_accounting' },
                { href: '/journal', label: 'Journal Entries', icon: BookText, permission: 'view_accounting' },
                { href: '/opening-balance', label: 'Opening Balances', icon: Database, permission: 'view_accounting' },
                { href: '/reconciliation', label: 'Reconciliation', icon: GitCompare, permission: 'view_accounting' },
            ]
        },
        {
            label: 'Budgets',
            icon: PiggyBank,
            subItems: [
                { href: '/budget-overview', label: 'Budget Overview', icon: CircleDollarSign, permission: 'view_budgets' },
                { href: '/all-budgets', label: 'All Budgets', icon: Archive, permission: 'view_budgets' },
                { href: '/budget-vs-actual', label: 'Budget vs Actual', icon: BarChart, permission: 'view_budgets' },
                { href: '/budget-categories', label: 'Budget Categories', icon: LayoutGrid, permission: 'view_budgets' },
                { href: '/budget-alerts', label: 'Budget Alerts', icon: Bell, permission: 'view_budgets' },
            ]
        },
        {
            label: 'Reports',
            icon: FileBarChart2,
            subItems: [
                {
                    label: 'Accounting',
                    icon: Landmark,
                    subItems: [
                        { href: '/reports/account-balances', label: 'Account Balances', icon: Scale, permission: 'view_reports' },
                        { href: '/reports/trial-balance', label: 'Trial Balance', icon: BookOpen, permission: 'view_reports' },
                        { href: '/reports/balance-sheet', label: 'Balance Sheet', icon: Landmark, permission: 'view_reports' },
                        { href: '/reports/income-statement', label: 'Income Statement', icon: LineChart, permission: 'view_reports' },
                        { href: '/reports/financial-statement', label: 'Financial Statement', icon: FileText, permission: 'view_reports' },
                        { href: '/reports/cash-flow-statement', label: 'Cash Flow Statement', icon: ArrowRightLeft, permission: 'view_reports' },
                        { href: '/reports/account-statement', label: 'Account Statement', icon: ClipboardList, permission: 'view_reports' },
                        { href: '/reports/income-tax', label: 'Income Tax (NG 2026)', icon: Landmark, permission: 'view_reports' },
                        { href: '/reports/vat-report', label: 'VAT Report', icon: FileText, permission: 'view_reports' },
                    ]
                },
                {
                    label: 'Transaction Reports',
                    icon: ArrowRightLeft,
                    subItems: [
                        { href: '/reports/transaction-history', label: 'Transaction History', icon: History, permission: 'view_reports' },
                        { href: '/reports/expense-analysis', label: 'Expense Analysis', icon: TrendingDown, permission: 'view_reports' },
                        { href: '/reports/liability-analysis', label: 'Liability Analysis', icon: ShieldAlert, permission: 'view_reports' },
                        { href: '/reports/cash-outflow', label: 'Cash Outflow', icon: ArrowDown, permission: 'view_reports' },
                        { href: '/reports/cash-inflow', label: 'Cash Inflow', icon: ArrowUp, permission: 'view_reports' },
                        { href: '/reports/income-analysis', label: 'Income Analysis', icon: TrendingUp, permission: 'view_reports' },
                        { href: '/reports/bank-reconciliation-report', label: 'Bank Reconciliation Report', icon: RefreshCw, permission: 'view_reports' },
                    ]
                },
                {
                    label: 'Budget Reports',
                    icon: PiggyBank,
                    subItems: [
                        { href: '/reports/budget-vs-actual', label: 'Budget vs Actual', icon: BarChart, permission: 'view_reports' },
                        { href: '/reports/budget-variance-analysis', label: 'Budget Variance Analysis', icon: AreaChart, permission: 'view_reports' },
                        { href: '/reports/budget-performance', label: 'Budget Performance', icon: Target, permission: 'view_reports' },
                    ]
                }
            ]
        },
        {
            label: 'Business Operations',
            isTitle: true,
        },
        {
            label: 'Invoicing',
            icon: FileText,
            subItems: [
                { href: '/invoicing/all-invoices', label: 'All Invoices', icon: FileText, permission: 'view_invoicing' },
            ]
        },
        {
            label: 'Bills/Purchases',
            icon: ShoppingCart,
            subItems: [
                { href: '/bills/all-bills', label: 'All Bills', icon: ShoppingCart, permission: 'view_bills' },
            ]
        },
        {
            href: '/customers',
            label: 'Customers',
            icon: Users,
            permission: 'view_customers'
        },
        {
            href: '/suppliers',
            label: 'Suppliers',
            icon: Truck,
            permission: 'view_suppliers'
        },
        {
            label: 'Reports',
            icon: ClipboardList,
            subItems: [
                {
                    label: 'Customer Reports',
                    icon: Users,
                    subItems: [
                        { href: '/reports/customer-statement', label: 'Customer Statement', icon: FileText, permission: 'view_reports' },
                        { href: '/reports/customer-balances', label: 'Customer Balances', icon: Wallet, permission: 'view_reports' },
                        { href: '/reports/debtors-report', label: 'Debtors Report', icon: ArrowDown, permission: 'view_reports' },
                        { href: '/reports/creditors-report', label: 'Creditors Report', icon: ArrowUp, permission: 'view_reports' },
                        { href: '/reports/customer-aging', label: 'Customer Aging', icon: Clock, permission: 'view_reports' },
                        { href: '/reports/customers-with-credit-limit', label: 'Customers with Credit Limit', icon: CreditCard, permission: 'view_reports' },
                        { href: '/reports/exceeded-credit-limit', label: 'Exceeded Credit Limit', icon: Ban, permission: 'view_reports' },
                        { href: '/reports/best-performing-customers', label: 'Best Performing Customers', icon: Award, permission: 'view_reports' },
                        { href: '/reports/last-transaction-date', label: 'Last Transaction Date', icon: CalendarClock, permission: 'view_reports' },
                    ]
                },
                {
                    label: 'Supplier Reports',
                    icon: Truck,
                    subItems: [
                        { href: '/reports/supplier-statement', label: 'Supplier Statement', icon: FileText, permission: 'view_reports' },
                        { href: '/reports/supplier-balances', label: 'Supplier Balances', icon: Wallet, permission: 'view_reports' },
                        { href: '/reports/supplier-aging', label: 'Supplier Aging', icon: Clock, permission: 'view_reports' },
                    ]
                }
            ]
        },
        {
            label: 'Inventory Management',
            isTitle: true,
        },
        {
            label: 'Sales',
            icon: ShoppingCart,
            subItems: [
                { href: '/sales/pos', label: 'Point of Sale (POS)', icon: Store, permission: 'view_sales' },
                { href: '/sales/pending-invoices', label: 'Pending Invoices', icon: FileClock, permission: 'view_sales' },
                { href: '/sales/quotations', label: 'Quotations', icon: Quote, permission: 'view_sales' },
                { href: '/sales/sales-orders', label: 'Sales Orders', icon: ShoppingCart, permission: 'view_sales' },
                { href: '/sales/sales-invoices', label: 'Sales Invoices', icon: FileText, permission: 'view_sales' },
                { href: '/sales/invoice-issuance', label: 'Invoice Issuance', icon: CheckSquare, permission: 'view_sales' },
                { href: '/sales/credit-notes', label: 'Credit Notes', icon: FileText, permission: 'view_sales' },
            ]
        },
        {
            label: 'Purchases',
            icon: ShoppingCart,
            subItems: [
                { href: '/purchases/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, permission: 'view_purchases' },
                { href: '/purchases/grns', label: 'GRNs', icon: ClipboardList, permission: 'view_purchases' },
                { href: '/purchases/purchase-invoices', label: 'Purchase Invoices', icon: FileText, permission: 'view_purchases' },
                { href: '/purchases/return-debit-notes', label: 'Return / Debit Notes', icon: Undo2, permission: 'view_purchases' },
            ]
        },
        {
            label: 'Products',
            icon: Package,
            subItems: [
                { href: '/products/all-products', label: 'All Products', icon: Package, permission: 'view_products' },
                { href: '/products/categories', label: 'Categories', icon: Layers, permission: 'view_products' },
                { href: '/products/brands', label: 'Brands', icon: Tags, permission: 'view_products' },
            ]
        },
        {
            label: 'Stock Management',
            icon: Boxes,
            subItems: [
                { href: '/stock/warehouses', label: 'Warehouses', icon: Warehouse, permission: 'view_stock' },
                { href: '/stock/user-warehouses', label: 'User Warehouses', icon: UserSquare, permission: 'view_stock' },
                { href: '/stock/stock-adjustments', label: 'Stock Adjustments', icon: FolderSync, permission: 'view_stock' },
                { href: '/stock/stock-transfers', label: 'Stock Transfers', icon: ArrowRightLeft, permission: 'view_stock' },
            ]
        },
        {
            label: 'Inventory Reports',
            icon: FileBarChart2,
            subItems: [
                { href: '/inventory-reports/stock-report', label: 'Stock Report', icon: FileText, permission: 'view_inventory_reports' },
                { href: '/inventory-reports/sales-report', label: 'Sales Report', icon: LineChart, permission: 'view_inventory_reports' },
                { href: '/inventory-reports/pending-pos-invoices', label: 'Pending POS Invoices', icon: FileClock, permission: 'view_inventory_reports' },
            ]
        },
        {
            label: 'Inventory Settings',
            icon: Cog,
            subItems: [
                { href: '/inventory-settings/general', label: 'General Settings', icon: Cog, permission: 'manage_inventory_settings' },
                { href: '/inventory-settings/pricing-rules', label: 'Pricing Rules', icon: BadgeDollarSign, permission: 'manage_inventory_settings' },
                { href: '/inventory-settings/units-of-measure', label: 'Units of Measure', icon: Ruler, permission: 'manage_inventory_settings' },
                { href: '/inventory-settings/account-mappings', label: 'Account Mappings', icon: LinkIcon, permission: 'manage_inventory_settings' },
            ]
        },
        { href: '/admin/register-user', label: 'Users', icon: Users, permission: 'manage_users' },
        { href: '/admin/settings', label: 'Settings', icon: Settings, permission: 'manage_settings' },
    ];

    if (!user || !user.permissions) {
        return (
            <aside className="w-64 flex-shrink-0 rounded-2xl bg-primary border shadow-lg flex flex-col">
                <div className="p-6 flex items-center gap-2 border-b border-white/20">
                    <Library className="h-8 w-8 text-primary-foreground" />
                    <h2 className="text-2xl font-bold text-primary-foreground">ClearBooks</h2>
                </div>
            </aside>
        );
    }

    const isAdmin = user.role === 'admin';

    const filterItems = (items: any[]) => {
        return items
            .map(item => {
                if (item.companyType && item.companyType !== user.company_type) {
                    return null;
                }
                if (isAdmin) {
                    return item;
                }
                if (item.subItems) {
                    const accessibleSubItems = filterItems(item.subItems);
                    return accessibleSubItems.length > 0 ? { ...item, subItems: accessibleSubItems } : null;
                }
                if (item.permission) {
                    return user.permissions?.includes(item.permission) ? item : null;
                }
                return item; // For titles
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
    };
    
    const navItems = filterItems(allNavItems);

    const renderNavItems = (items: any[], level = 0) => {
        return items.map((item, index) => {
            if (item.isTitle) {
                return <li key={index} className="px-3 pt-4 pb-2 text-sm font-bold text-primary-foreground/60">{item.label}</li>;
            }

            if (item.subItems) {
                return (
                    <li key={index}>
                        <Collapsible>
                            <CollapsibleTrigger className={cn("flex items-center justify-between w-full gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white")}>
                                <div className="flex items-center gap-3">
                                    <item.icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-6 space-y-2 py-2">
                                <ul className="space-y-2">
                                    {renderNavItems(item.subItems, level + 1)}
                                </ul>
                            </CollapsibleContent>
                        </Collapsible>
                    </li>
                );
            }
            return (
                <li key={item.href}>
                    <Link
                        href={item.href!}
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                            pathname === item.href && "bg-white/20 text-white font-semibold shadow-md"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                </li>
            );
        });
    };

    return (
        <aside className="w-64 flex-shrink-0 rounded-2xl bg-primary border shadow-lg flex flex-col">
            <div className="p-6 flex items-center justify-between gap-2 border-b border-white/20">
                <div className="flex items-center gap-2">
                    <Library className="h-8 w-8 text-primary-foreground" />
                    <h2 className="text-2xl font-bold text-primary-foreground">ClearBooks</h2>
                </div>
            </div>
            <ScrollArea className="flex-grow">
                <nav className="py-4 px-4">
                    <ul className="space-y-2">
                        {renderNavItems(navItems)}
                    </ul>
                </nav>
            </ScrollArea>
            <div className="p-4 border-t border-white/20">
                 <button
                    onClick={logout}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white w-full"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
            <div className="p-4 border-t border-white/20 text-center text-xs text-primary-foreground/70">
                <p>&copy; 2024 ClearBooks</p>
            </div>
        </aside>
    );
}
