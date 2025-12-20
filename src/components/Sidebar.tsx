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
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUser } from '@/contexts/UserContext';

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useUser();

    if (!user) {
        return null;
    }

    const inventoryLabel = 'Inventory';

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin_manager', 'accountant', 'sales_manager', 'store_manager', 'procurement_manager', 'production_manager'] },
        {
            label: 'Transactions', 
            icon: ArrowRightLeft, 
            roles: ['admin_manager', 'accountant'],
            subItems: [
                { href: '/payment-voucher/new', label: 'Payment Voucher', icon: FilePlus },
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
          ];
    
    const showInventoryLink = user.role === 'admin_manager' || 
                              user.role === 'store_manager' || 
                              (user.role === 'production_manager' && user.company_type === 'manufacturing');

    return (
        <aside className="w-64 flex-shrink-0 rounded-2xl bg-primary border shadow-lg flex flex-col">
            <div className="p-6 flex items-center justify-center gap-2 border-b border-white/20">
                <Library className="h-8 w-8 text-primary-foreground" />
                <h2 className="text-2xl font-bold text-primary-foreground">ClearBooks</h2>
            </div>
            <ScrollArea className="flex-grow">
                <nav className="py-4 px-4">
                    <ul className="space-y-2">
                        {navItems.filter(item => user.role === 'admin_manager' || item.roles.includes(user.role)).map((item, index) => (
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

                        {showInventoryLink && (
                             <li>
                                <Link 
                                    href="/inventory"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                                        pathname === '/inventory' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <Boxes className="h-5 w-5" />
                                    <span className="font-medium">{inventoryLabel}</span>
                                </Link>
                            </li>
                        )}

                        {(user.role === 'admin_manager' || user.role === 'sales_manager') && (
                             <li>
                                <Link 
                                    href="/sales"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                                        pathname === '/sales' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <ShoppingCart className="h-5 w-5" />
                                    <span className="font-medium">Sales</span>
                                </Link>
                            </li>
                        )}
                         {(user.role === 'admin_manager' || user.role === 'procurement_manager') && (
                             <li>
                                <Link 
                                    href="/procurement"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                                        pathname === '/procurement' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <ShoppingCart className="h-5 w-5" />
                                    <span className="font-medium">Procurement</span>
                                </Link>
                            </li>
                        )}
                        {(user.role === 'admin_manager' || user.role === 'production_manager') && user.company_type === 'manufacturing' && (
                             <li>
                                <Link 
                                    href="/production"
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                                        pathname === '/production' && "bg-white/20 text-white font-semibold shadow-md"
                                    )}
                                >
                                    <Factory className="h-5 w-5" />
                                    <span className="font-medium">Production</span>
                                </Link>
                            </li>
                        )}
                        {user.role === 'admin_manager' && (
                            <>
                                <li>
                                    <Link 
                                        href="/admin/register-user"
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                                            pathname === '/admin/register-user' && "bg-white/20 text-white font-semibold shadow-md"
                                        )}
                                    >
                                        <UserPlus className="h-5 w-5" />
                                        <span className="font-medium">Register User</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link 
                                        href="/admin/settings"
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-primary-foreground/80 hover:bg-white/20 hover:text-white",
                                            pathname === '/admin/settings' && "bg-white/20 text-white font-semibold shadow-md"
                                        )}
                                    >
                                        <Settings className="h-5 w-5" />
                                        <span className="font-medium">Settings</span>
                                    </Link>
                                </li>
                            </>
                        )}
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
