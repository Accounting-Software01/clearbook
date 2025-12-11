
'use client';
import Link from 'next/link';
import { LogOut, Boxes, X, Minus } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getCurrentUser, logout } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';


const useUser = () => {
    const [user, setUser] = useState<{ uid: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            setIsLoading(false);
        };
        checkUser();
    }, []);

    return { user, isLoading };
};

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
    const { user, isLoading } = useUser();
    const [isCardCollapsed, setIsCardCollapsed] = useState(false);


    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [isLoading, user, router]);

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };
    
    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen w-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const currentNavItem = navItems.find(item => pathname === item.href);
    const title = currentNavItem?.label || 'ClearBooks';


    return (
        <div className="relative z-10 flex h-[90vh] w-full max-w-7xl mx-auto gap-4">
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
                             <ThemeToggle />
                             <Button variant="ghost" size="sm" onClick={handleLogout}>
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
