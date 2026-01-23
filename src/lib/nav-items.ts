
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
    Link as LinkIcon,
    FileChartPie

} from 'lucide-react';

export const allNavItems = [
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
        label: 'Bills/Purchases',
        icon: ShoppingCart,
        subItems: [
            { href: '/bills', label: 'All Bills', icon: ShoppingCart, permission: 'view_bills' },
        ]
    },
    {
        href: '/customers',
        label: 'Customers',
        icon: Users,
        permission: 'view_customers'
    },
    
    {
        label: 'Inventory Management',
        isTitle: true,
    },
    {
        label: 'Ware House',
        icon: Package,
        subItems: [
           
                {
                  href: '/inventory/issue-material',
                  label: 'Issue Material',
                  icon: Send, // paper-plane style icon
                },
                {
                  href: '/inventory/finished-goods',
                  label: 'Finished Goods',
                  icon: Package, // cube icon
                },
                {
                  href: '/inventory/raw-materials',
                  label: 'Raw Materials',
                  icon: Layers, // stacked layers
                },
                {
                  href: '/inventory/work-in-progress',
                  label: 'Work-in-Progress',
                  icon: Factory, // factory icon
                },
                {
                  href: '/inventory/packaging-materials',
                  label: 'Packaging Materials',
                  icon: Package,
                },
                {
                  href: '/inventory/consumables',
                  label: 'Consumables & Supplies',
                  icon: ShoppingCart, // cart icon
                },
                {
                  href: '/inventory/spare-parts',
                  label: 'Spare Parts',
                  icon: Wrench,
                },
                {
                  href: '/inventory/fuel-energy',
                  label: 'Fuel & Energy',
                  icon: Fuel,
                },
                {
                  href: '/inventory/returned-goods',
                  label: 'Returned Goods',
                  icon: Undo2, // curved return arrow
                },
                {
                  href: '/inventory/obsolete-scrap',
                  label: 'Obsolete & Scrap',
                  icon: Trash2,
                },
                {
                  href: '/inventory/goods-in-transit',
                  label: 'Goods-in-Transit',
                  icon: Truck,
                },
                {
                  href: '/inventory/promotional-materials',
                  label: 'Promotional Materials',
                  icon: Sparkles,
                },
                {
                  href: '/inventory/safety-stock',
                  label: 'Safety Stock',
                  icon: ShieldCheck,
                },
                {
                  href: '/inventory/quality-hold',
                  label: 'Quality-Hold',
                  icon: Ban, // prohibited / hold icon
                },
                {
                  href: '/inventory/consignment',
                  label: 'Consignment',
                  icon: Archive, // stacked box look
                },
        
              





        ]
    },
    {
        label: 'Sales',
        icon: ShoppingCart,
        subItems: [
            { href: '/sales/pos', label: 'Point of Sale (POS)', icon: Store, permission: 'view_sales' },
            { href: '/sales/pending-invoices', label: 'Pending Invoices', icon: FileClock, permission: 'view_sales' },
             { href: '/sales/credit-notes', label: 'Credit Notes', icon: FileText, permission: 'view_sales' },
        ]
    },
    {
        label: 'Purchases',
        icon: ShoppingCart,
        subItems: [
            { href: '/procurement', label: 'Purchase Orders', icon: ShoppingCart, permission: 'view_purchases' },
            { href: '/Account-Payable', label: 'Purchase Invoices', icon: FileChartPie, permission: 'view_purchases' },
     
        ]
    },
    {
        label: 'Production',
        icon: Factory,
        subItems: [
            { href: '/production', label: 'Production', icon: Factory, permission: 'manage_bomsettings' },
            { href: '/production/boms', label: 'BOM Settings', icon: Users, permission: 'manage_bomsettings' },
            
            { href: '/products/reports', label: 'Reports', icon: BarChart, permission: 'view_products' },
      ]
    },
  
  
    { href: '/users', label: 'Manage Users', icon: Users, permission: 'manage_users' },
    { href: '/admin/settings', label: 'Settings', icon: Settings, permission: 'manage_settings' },
];
