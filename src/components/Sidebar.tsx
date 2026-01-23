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
    Link as LinkIcon,
    FileChartPie

} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from '@/hooks/useAuth';
import { allNavItems } from '@/lib/nav-items';

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

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
