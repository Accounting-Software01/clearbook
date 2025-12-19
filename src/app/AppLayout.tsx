'use client';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { Loader2, LogOut, X, Minus, Boxes } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useUser } from '@/contexts/UserContext';
import SessionExpired from '@/components/SessionExpired';

const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/payment-voucher/new', label: 'New Payment' },
    { href: '/journal', label: 'Journal Entry' },
    { href: '/ledger', label: 'General Ledger' },
    { href: '/trial-balance', label: 'Trial Balance' },
    { href: '/profit-loss', label: 'Profit & Loss' },
    { href: '/balance-sheet', label: 'Balance Sheet' },
    { href: '/cash-flow', label: 'Cash Flow' },
    { href: '/inventory', label: 'Inventory', icon: Boxes },
    { href: '/customers', label: 'Customers' },
    { href: '/suppliers', label: 'Suppliers' },
];

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading, sessionExpired, logout } = useUser();
    const [isCardCollapsed, setIsCardCollapsed] = useState(false);

    const isAuthPage = pathname === '/login' || pathname === '/signup';

    useEffect(() => {
        if (!isLoading && !user && !isAuthPage && !sessionExpired) {
            router.replace('/login');
        } else if (user && isAuthPage) {
            router.replace('/dashboard');
        }
    }, [isLoading, user, isAuthPage, router, sessionExpired, pathname]);

    if (sessionExpired) {
        return <SessionExpired />;
    }

    if (isLoading || (!user && !isAuthPage)) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isAuthPage) {
        return <>{children}</>;
    }
    
    const currentNavItem = navItems.find(item => pathname.startsWith(item.href));
    const title = currentNavItem?.label || 'ClearBooks';

    return (
        <div className="relative z-10 flex h-[90vh] w-full max-w-7xl mx-auto gap-4 p-4">
            <Sidebar />
            <main className="flex-1 h-full overflow-hidden">
                <Card className="w-full h-full flex flex-col shadow-2xl bg-card/80 backdrop-blur-xl transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                        <div className="flex items-center gap-2">
                           <div className="flex items-center gap-2 group">
                                <Button size="icon-sm" variant="ghost" className="rounded-full bg-red-500 hover:bg-red-600 text-red-900" onClick={() => setIsCardCollapsed(!isCardCollapsed)}>
                                    <X className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                                </Button>
                                <Button size="icon-sm" variant="ghost" className="rounded-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900" onClick={() => setIsCardCollapsed(!isCardCollapsed)}>
                                    <Minus className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                                </Button>
                               <button className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"></button>
                           </div>
                            <div className="flex items-center gap-2 ml-4">
                                <h1 className="text-base font-semibold">{title}</h1>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                             {user && <NotificationCenter userRole={user.role} userCompanyId={user.company_id} />}
                             <ThemeToggle />
                             <Button variant="ghost" size="sm" onClick={logout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                         </div>
                    </CardHeader>
                   <div
                        className={cn(
                            "flex-grow overflow-hidden transition-all duration-500 ease-in-out",
                            isCardCollapsed ? 'max-h-0 opacity-0' : 'max-h-[100vh] opacity-100'
                        )}
                    >
                        <ScrollArea className="h-full">
                             <CardContent className="p-6">
                                {children}
                            </CardContent>
                        </ScrollArea>
                    </div>
                </Card>
            </main>
        </div>
    );
}