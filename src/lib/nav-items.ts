
import {
    LayoutDashboard,
    FileBarChart2,
    Landmark,
    Users,
    ShoppingCart,
    Factory,
    Settings,
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
    Store,
    Warehouse,
    Cog,
    FileText,
    ClipboardList,
    History,
    ShieldAlert,
    ArrowDown,
    ArrowUp,
    RefreshCw,
    AreaChart,
    Target,
    BarChart,
    LayoutGrid,
    Bell,
    LineChart,
    BookOpen,
    Scale,
    CircleDollarSign,
    Archive,
    FileClock,
    PillBottle
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
                    { href: '/incomes', label: 'Incomes', icon: TrendingUp, permission: 'view_incomes' },
                    { href: '/expenses', label: 'Expenses', icon: TrendingDown, permission: 'view_expenses' },
                    { href: '/receipts', label: 'Receipts', icon: Receipt, permission: 'view_receipts' },
                    { href: '/payments', label: 'Payments', icon: CreditCard, permission: 'view_payments' },
                    { href: '/journal', label: 'Journal Entries', icon: BookText, permission: 'view_journal_entries' },
                    { href: '/opening-balance', label: 'Opening Balances', icon: Database, permission: 'view_opening_balances' },
                    { href: '/reconciliation', label: 'Reconciliation', icon: GitCompare, permission: 'view_reconciliation' },
                ]
            },
          //  {
          //      label: 'Budgets',
          //      icon: PiggyBank,
            //    subItems: [
              //      { href: '/budget-overview', label: 'Budget Overview', icon: CircleDollarSign, permission: 'view_budget_overview' },
                //    { href: '/all-budgets', label: 'All Budgets', icon: Archive, permission: 'view_reports_budgets' },
                  //  { href: '/budget-vs-actual', label: 'Budget vs Actual', icon: BarChart, permission: 'view_budget_vs_actual' },
              //      { href: '/budget-categories', label: 'Budget Categories', icon: LayoutGrid, permission: 'view_budget_categories' },
                //    { href: '/budget-alerts', label: 'Budget Alerts', icon: Bell, permission: 'view_budget_alerts' },
              //  ]
           // },
            {
                label: 'Reports',
                icon: FileBarChart2,
                subItems: [
                    {
                        label: 'Accounting',
                        icon: Landmark,
                        subItems: [
                            { href: '/reports/account-balances', label: 'Account Balances', icon: Scale, permission: 'view_reports_accounting' },
                            { href: '/reports/trial-balance', label: 'Trial Balance', icon: BookOpen, permission: 'view_reports_accounting' },
                            { href: '/reports/balance-sheet', label: 'Balance Sheet', icon: Landmark, permission: 'view_reports_accounting' },
                            { href: '/reports/income-statement', label: 'Income Statement', icon: LineChart, permission: 'view_reports_accounting' },
                            { href: '/reports/financial-statement', label: 'Financial Statement', icon: FileText, permission: 'view_reports_accounting' },
                            { href: '/reports/cash-flow-statement', label: 'Cash Flow Statement', icon: ClipboardList, permission: 'view_reports_accounting' },
                            { href: '/reports/account-statement', label: 'Account Statement', icon: ClipboardList, permission: 'view_reports_accounting' },
                            { href: '/reports/income-tax', label: 'Income Tax (NG 2026)', icon: Landmark, permission: 'view_reports_accounting' },
                            { href: '/reports/vat-report', label: 'VAT Report', icon: FileText, permission: 'view_reports_accounting' },
                        ]
                    },
                    {
                        label: 'Transaction Reports',
                        icon: ClipboardList,
                        subItems: [
                           // { href: '/reports/transaction-history', label: 'Transaction History', icon: History, permission: 'view_reports_transactions' },
                            { href: '/reports/expense-analysis', label: 'Expense Analysis', icon: TrendingDown, permission: 'view_reports_transactions' },
                            { href: '/reports/liability-analysis', label: 'Liability Analysis', icon: ShieldAlert, permission: 'view_reports_transactions' },
                            { href: '/reports/cash-outflow', label: 'Cash Outflow', icon: ArrowDown, permission: 'view_reports_transactions' },
                            { href: '/reports/cash-inflow', label: 'Cash Inflow', icon: ArrowUp, permission: 'view_reports_transactions' },
                          //  { href: '/reports/income-analysis', label: 'Income Analysis', icon: TrendingUp, permission: 'view_reports_transactions' },
                          //  { href: '/reports/bank-reconciliation-report', label: 'Bank Reconciliation Report', icon: RefreshCw, permission: 'view_reports_transactions' },
                        ]
                    },
                    // {
                      //  label: 'Budget Reports',
                      //  icon: PiggyBank,
                      //  subItems: [
                      //      { href: '/reports/budget-vs-actual', label: 'Budget vs Actual', icon: BarChart, permission: 'view_reports' },
                       //     { href: '/reports/budget-variance-analysis', label: 'Budget Variance Analysis', icon: AreaChart, permission: 'view_reports' },
                         //   { href: '/reports/budget-performance', label: 'Budget Performance', icon: Target, permission: 'view_reports' },
                      //  ]
                 //   }
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
                          permission: 'view_inventory_issue_material'
                        },
                        {
                          href: '/inventory/finished-goods',
                          label: 'Finished Goods',
                          icon: Package, // cube icon
                          permission: 'view_inventory_finished_goods'
                        },
                        {
                          href: '/inventory/raw-materials',
                          label: 'Raw Materials',
                          icon: Layers, // stacked layers
                          permission: 'view_inventory_raw_materials'
                        },
                        // {
                         // href: '/inventory/work-in-progress',
                          // label: 'Work-in-Progress',
                         // icon: Factory, // factory icon
                         // permission: 'view_inventory_wip'
                        // },
                        {
                          href: '/inventory/packaging-materials',
                          label: 'Packaging Materials',
                          icon: Package,
                          permission: 'view_inventory_packaging'
                        },
                        // {
                        //  href: '/inventory/consumables',
                        //  label: 'Consumables & Supplies',
                        //  icon: 
                        // ShoppingCart, // cart icon
                        //  permission: 'view_inventory_consumables'
                        // },
                        {
                          href: '/inventory/spare-parts',
                          label: 'Spare Parts',
                          icon: Wrench,
                          permission: 'view_inventory_spare_parts'
                        },
                        {
                          href: '/inventory/fuel-energy',
                          label: 'Fuel & Energy',
                          icon: Fuel,
                          permission: 'view_inventory_fuel'
                        },
                        {
                          href: '/inventory/returned-goods',
                          label: 'Returned Goods',
                          icon: Undo2, // curved return arrow
                          permission: 'view_inventory_returned_goods'
                        },
                        {
                          href: '/inventory/obsolete-scrap',
                          label: 'Obsolete & Scrap',
                          icon: Trash2,
                          permission: 'view_inventory_obsolete'
                        },
                        {
                          href: '/inventory/goods-in-transit',
                          label: 'Goods-in-Transit',
                          icon: Truck,
                          permission: 'view_inventory_in_transit'
                        },
                        {
                          href: '/inventory/promotional-materials',
                          label: 'Promotional Materials',
                          icon: Sparkles,
                          permission: 'view_inventory_promotional'
                        },
                        {
                          href: '/inventory/safety-stock',
                          label: 'Safety Stock',
                          icon: ShieldCheck,
                          permission: 'view_inventory_safety_stock'
                        },
                        {
                          href: '/inventory/quality-hold',
                          label: 'Quality-Hold',
                          icon: Ban, // prohibited / hold icon
                          permission: 'view_inventory_quality_hold'
                        },
                        {
                          href: '/inventory/consignment',
                          label: 'Consignment',
                          icon: Archive, // stacked box look
                          permission: 'view_inventory_consignment'
                        },
                
                      
    
    
    
    
    
                ]
            },
            {
                label: 'Sales',
                icon: ShoppingCart,
                subItems: [
                    { href: '/sales/pos', label: 'Point of Sale (POS)', icon: Store, permission: 'view_pos' },
                    { href: '/sales/pending-invoices', label: 'Pending Invoices', icon: FileClock, permission: 'view_pending_invoices' },
                     { href: '/sales/credit-notes', label: 'Credit Notes', icon: FileText, permission: 'view_credit_notes' },
                ]
            },
            {
                label: 'Purchases',
                icon: ShoppingCart,
                subItems: [
                    { href: '/procurement', label: 'Purchase Orders', icon: ShoppingCart, permission: 'view_purchase_orders' },
                    { href: '/Account-Payable', label: 'Purchase Invoices', icon: FileClock, permission: 'view_purchase_invoices' },
             
                ]
            },
            {
                label: 'Production',
                icon: Factory,
                subItems: [
                    { href: '/production', label: 'Production', icon: Factory, permission: 'view_production' },
                    { href: '/production/boms', label: 'BOM Settings', icon: Users, permission: 'view_production_reports' },
                    { href: '/production/pet-manufacturing', label: 'Pet Making', icon: PillBottle, permission: 'view_production_reports' },
                    { href: '/production/reports', label: 'Reports', icon: BarChart, permission: 'view_production_reports' },
              ]
            },
          
          
            { href: '/admin/register-user', label: 'Users', icon: Users, permission: 'manage_users' },
            { href: '/admin/settings', label: 'Settings', icon: Settings, permission: 'manage_settings' },
        ];