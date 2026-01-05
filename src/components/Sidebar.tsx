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
    Warehouse,
    Wrench,
    Fuel,
    Undo2,
    Trash2,
    Truck,
    Sparkles,
    ShieldCheck,
    Ban,
    Layers,
    Send
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
            label: 'Transactions',
            icon: ArrowRightLeft,
            subItems: [
                { href: '/payment-workbench', label: 'Payment Workbench', icon: Banknote, permission: 'view_accounting' },
                { href: '/payment-voucher/new', label: 'Payment Voucher', icon: FilePlus, permission: 'view_accounting' },
                { href: '/journal', label: 'Journal Entry', icon: BookPlus, permission: 'view_accounting' },
                { href: '/Account-Payable', label: 'Invoices', icon: DollarSign, permission: 'view_accounting' },
            ]
        },
        {
            label: 'Financial Reports',
            icon: FileBarChart2,
            subItems: [
                { href: '/ledger', label: 'General Ledger', icon: BookOpen, permission: 'view_accounting' },
                { href: '/trial-balance', label: 'Trial Balance', icon: Scale, permission: 'view_accounting' },
                { href: '/profit-loss', label: 'Profit & Loss', icon: Landmark, permission: 'view_accounting' },
                { href: '/balance-sheet', label: 'Balance Sheet', icon: Landmark, permission: 'view_accounting' },
                { href: '/cash-flow', label: 'Cash Flow', icon: ArrowRightLeft, permission: 'view_accounting' },
            ]
        },
        {
            label: 'Inventory',
            icon: Boxes,
            permission: 'view_inventory',
            subItems: [
                { href: '/inventory/issue-material', label: 'Issue Material', icon: Send, permission: 'view_inventory' },
                { href: '/inventory/finished-goods', label: 'Finished Goods', icon: Package, permission: 'view_inventory' },
                { href: '/inventory/raw-materials', label: 'Raw Materials', icon: Layers, permission: 'view_inventory' },
                { href: '/inventory/work-in-progress', label: 'Work-in-Progress', icon: Factory, permission: 'view_inventory' },
                { href: '/inventory/packaging-materials', label: 'Packaging Materials', icon: Package, permission: 'view_inventory' },
                { href: '/inventory/consumables-supplies', label: 'Consumables & Supplies', icon: ShoppingCart, permission: 'view_inventory' },
                { href: '/inventory/spare-parts', label: 'Spare Parts', icon: Wrench, permission: 'view_inventory' },
                { href: '/inventory/fuel-energy', label: 'Fuel & Energy', icon: Fuel, permission: 'view_inventory' },
                { href: '/inventory/returned-goods', label: 'Returned Goods', icon: Undo2, permission: 'view_inventory' },
                { href: '/inventory/obsolete-scrap', label: 'Obsolete & Scrap', icon: Trash2, permission: 'view_inventory' },
                { href: '/inventory/goods-in-transit', label: 'Goods-in-Transit', icon: Truck, permission: 'view_inventory' },
                { href: '/inventory/promotional-materials', label: 'Promotional Materials', icon: Sparkles, permission: 'view_inventory' },
                { href: '/inventory/safety-stock', label: 'Safety Stock', icon: ShieldCheck, permission: 'view_inventory' },
                { href: '/inventory/quality-hold', label: 'Quality-Hold', icon: Ban, permission: 'view_inventory' },
                { href: '/inventory/consignment', label: 'Consignment', icon: Layers, permission: 'view_inventory' },
            ]
        },
        { href: '/sales', label: 'Sales', icon: ShoppingCart, permission: 'view_sales' },
        { href: '/procurement', label: 'Procurement', icon: ShoppingCart, permission: 'view_procurement' },
        { href: '/production', label: 'Production', icon: Factory, permission: 'view_production', companyType: 'manufacturing' },
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

    const navItems = allNavItems
        .map(item => {
            // Filter out items that don't match the user's company type
            if (item.companyType && item.companyType !== user.company_type) {
                return null;
            }

            // If the user is an admin, they can see everything
            if (isAdmin) {
                return item;
            }

            // For non-admin users, check permissions
            if (item.subItems) {
                const accessibleSubItems = item.subItems.filter(subItem =>
                    user.permissions?.includes(subItem.permission)
                );
                return accessibleSubItems.length > 0 ? { ...item, subItems: accessibleSubItems } : null;
            }
            if (item.permission) {
                return user.permissions?.includes(item.permission) ? item : null;
            }
            return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);


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
                        {navItems.map((item, index) => (
                             item.subItems ? (
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
                                            {item.subItems.map(subItem => (
                                                <Link 
                                                    key={subItem.href}
                                                    href={subItem.href} 
                                                    className={cn(
                                                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/70 hover:bg-white/10 hover:text-white",
                                                        pathname === subItem.href && "bg-white/10 text-white font-semibold"
                                                    )}
                                                >
                                                    <subItem.icon className="h-4 w-4" />
                                                    <span className="text-sm font-medium">{subItem.label}</span>
                                                </Link>
                                            ))}
                                        </CollapsibleContent>
                                    </Collapsible>
                                </li>
                            ) : (
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
                            )
                        ))}
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
