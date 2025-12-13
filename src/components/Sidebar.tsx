'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getCurrentUser, logout } from '@/lib/auth';

interface CurrentUser {
    role: string;
    company_type: string;
}

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin_manager', 'accountant', 'sales_manager', 'store_manager', 'procurement_manager', 'production_manager'] },
    {
        label: 'Transactions', 
        icon: ArrowRightLeft, 
        roles: ['admin_manager', 'accountant'],
        subItems: [
            { href: '/payment-voucher/new', label: 'New Payment', icon: FilePlus },
            { href: '/journal', label: 'Journal Entry', icon: BookPlus },
        ]
    },
    {
        label: 'Financial Reports', 
        icon: FileBarChart2, 
        roles: ['admin_manager', 'accountant'],
        subItems: [
            { href: '/ledger', label: 'General Ledger', icon: BookOpen },
            { href: '/trial-balance', label: 'Trial Balance', icon: Scale },
            { href: '/profit-loss', label: 'Profit & Loss', icon: Landmark },
            { href: '/balance-sheet', label: 'Balance Sheet', icon: Landmark },
            { href: '/cash-flow', label: 'Cash Flow', icon: ArrowRightLeft },
        ]
    },
    { href: '/inventory', label: 'Inventory', icon: Boxes, roles: ['admin_manager', 'store_manager'] },
    { href: '/customers', label: 'Customers', icon: UserSquare, roles: ['admin_manager', 'sales_manager'] },
    { href: '/suppliers', label: 'Suppliers', icon: Users, roles: ['admin_manager', 'procurement_manager'] },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser as CurrentUser);
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const isVisible = (roles: string[]) => {
        if (!user) return false;
        if (user.role === 'admin_manager') return true;
        if (user.company_type !== 'manufacturing' && !['accountant', 'procurement_manager'].includes(user.role)) return false;
        return roles.includes(user.role)
    }

    if (!user) {
        return null; // Don't render the sidebar if there is no user
    }

    return (
        <aside className="w-64 flex-shrink-0 rounded-2xl bg-primary dark:bg-slate-900 border shadow-lg flex flex-col">
            <div className="p-6 flex items-center justify-center gap-2 border-b border-white/20">
                <Library className="h-8 w-8 text-primary-foreground" />
                <h2 className="text-2xl font-bold text-primary-foreground">ClearBooks</h2>
            </div>
            <ScrollArea className="flex-grow">
                <nav className="py-4 px-4">
                    <ul className="space-y-2">
                        {navItems.filter(item => isVisible(item.roles)).map((item, index) => (
                             item.subItems ? (
                                <li key={index}>
                                    <Collapsible>
                                        <CollapsibleTrigger className={cn("flex items-center justify-between w-full gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white dark:text-white/70 dark:hover:text-white")}>
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
                                                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/70 hover:bg-white/10 hover:text-white dark:text-white/60 dark:hover:text-white",
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
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white dark:text-white/70 dark:hover:text-white",
                                        pathname === item.href && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            </li>
                            )
                        ))}
                        {(user.role === 'admin_manager' || (user.role === 'sales_manager' && user.company_type === 'manufacturing')) && (
                             <li>
                                <Link 
                                    href="/sales"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white dark:text-white/70 dark:hover:text-white",
                                        pathname === '/sales' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <ShoppingCart className="h-5 w-5" />
                                    <span className="font-medium">Sales</span>
                                </Link>
                            </li>
                        )}
                         {(user.role === 'admin_manager' || (user.role === 'procurement_manager')) && (
                             <li>
                                <Link 
                                    href="/procurement"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white dark:text-white/70 dark:hover:text-white",
                                        pathname === '/procurement' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <ShoppingCart className="h-5 w-5" />
                                    <span className="font-medium">Procurement</span>
                                </Link>
                            </li>
                        )}
                        {(user.role === 'admin_manager' || (user.role === 'production_manager' && user.company_type === 'manufacturing')) && (
                             <li>
                                <Link 
                                    href="/production"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white dark:text-white/70 dark:hover:text-white",
                                        pathname === '/production' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <Factory className="h-5 w-5" />
                                    <span className="font-medium">Production</span>
                                </Link>
                            </li>
                        )}
                        {user.role === 'admin_manager' && (
                             <li>
                                <Link 
                                    href="/admin/register-user"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white dark:text-white/70 dark:hover:text-white",
                                        pathname === '/admin/register-user' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <UserPlus className="h-5 w-5" />
                                    <span className="font-medium">Register User</span>
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>
            </ScrollArea>
            <div className="p-4 border-t border-white/20">
                 <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white dark:text-white/70 dark:hover:text-white w-full"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
            <div className="p-4 border-t border-white/20 text-center text-xs text-primary-foreground/70 dark:text-slate-400">
                <p>&copy; 2024 ClearBooks</p>
            </div>
        </aside>
    );
}
