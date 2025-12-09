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
    UserSquare 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/home', label: 'Home', icon: LayoutDashboard },
    { href: '/payment-voucher/new', label: 'New Payment', icon: FilePlus },
    { href: '/journal', label: 'Journal Entry', icon: BookPlus },
    { href: '/ledger', label: 'General Ledger', icon: BookOpen },
    { href: '/trial-balance', label: 'Trial Balance', icon: Scale },
    { href: '/profit-loss', label: 'Profit & Loss', icon: FileBarChart2 },
    { href: '/balance-sheet', label: 'Balance Sheet', icon: Landmark },
    { href: '/cash-flow', label: 'Cash Flow', icon: ArrowRightLeft },
    { href: '/customers', label: 'Customers', icon: UserSquare },
    { href: '/suppliers', label: 'Suppliers', icon: Users },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 flex-shrink-0 rounded-2xl bg-black/10 dark:bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg flex flex-col animate-zoom-in-fade">
            <div className="p-6 text-center">
                <h2 className="text-2xl font-bold text-white">ClearBooks</h2>
            </div>
            <nav className="flex-grow px-4">
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.href}>
                            <Link href={item.href} passHref>
                                <div className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 text-gray-300 hover:bg-white/10 hover:text-white",
                                    pathname === item.href && "bg-primary/80 text-primary-foreground shadow-md"
                                )}>
                                    <item.icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="p-4 border-t border-white/10 text-center text-xs text-gray-400">
                <p>&copy; 2024 ClearBooks</p>
            </div>
        </aside>
    );
}
