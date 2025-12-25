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
    UserSquare,
    Library,
    Boxes,
    ChevronDown,
    UserPlus,
    ShoppingCart,
    Factory,
    LogOut,
    Settings,
    DollarSign
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

    if (!user) {
        return null;
    }

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'accountant', 'staff'] },
        {
            label: 'Transactions', 
            icon: ArrowRightLeft, 
            roles: ['admin', 'accountant'],
            subItems: [
                { href: '/payment-voucher/new', label: 'Payment Voucher', icon: FilePlus },
                { href: '/journal', label: 'Journal Entry', icon: BookPlus },
                { href: '/Account-Payable', label: 'Accounts Payable', icon: DollarSign },
            ]
        },
        {
            label: 'Financial Reports', 
            icon: FileBarChart2, 
            roles: ['admin', 'accountant'],
            subItems: [
                { href: '/ledger', label: 'General Ledger', icon: BookOpen },
                { href: '/trial-balance', label: 'Trial Balance', icon: Scale },
                { href: '/profit-loss', label: 'Profit & Loss', icon: Landmark },
                { href: '/balance-sheet', label: 'Balance Sheet', icon: Landmark },
                { href: '/cash-flow', label: 'Cash Flow', icon: ArrowRightLeft },
            ]
        },
        { href: '/inventory', label: 'Inventory', icon: Boxes, roles: ['admin'] },
        { href: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['admin'] },
        { href: '/procurement', label: 'Procurement', icon: ShoppingCart, roles: ['admin'] },
        { href: '/production', label: 'Production', icon: Factory, roles: ['admin'], companyType: 'manufacturing' },
        {
            label: 'Admin',
            icon: Settings,
            roles: ['admin'],
            subItems: [
                { href: '/admin/register-user', label: 'Register User', icon: UserPlus },
                { href: '/admin/settings', label: 'Settings', icon: Settings },
            ]
        }
    ];

    return (
        <aside className="w-64 flex-shrink-0 rounded-2xl bg-primary border shadow-lg flex flex-col">
            <div className="p-6 flex items-center justify-center gap-2 border-b border-white/20">
                <Library className="h-8 w-8 text-primary-foreground" />
                <h2 className="text-2xl font-bold text-primary-foreground">ClearBooks</h2>
            </div>
            <ScrollArea className="flex-grow">
                <nav className="py-4 px-4">
                    <ul className="space-y-2">
                        {navItems.filter(item => item.roles.includes(user.role) && (!item.companyType || item.companyType === user.company_type)).map((item, index) => (
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
