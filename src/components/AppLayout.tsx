'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, LayoutDashboard, FilePlus, BookPlus, BookOpen, Scale, FileBarChart2, Landmark, ArrowRightLeft, Menu } from 'lucide-react';
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from "@/components/ui/menubar";
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import React from 'react';

const menuItems = [
    {
        href: '/',
        title: 'Dashboard',
        icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
        title: 'Data Entry',
        items: [
            {
                href: '/payment-voucher/new',
                title: 'New Payment Voucher',
                icon: <FilePlus className="mr-2 h-4 w-4" />,
            },
            {
                href: '/journal',
                title: 'Journal Entry',
                icon: <BookPlus className="mr-2 h-4 w-4" />,
            },
        ]
    },
    {
        title: 'Reports',
        items: [
            {
                href: '/ledger',
                title: 'General Ledger',
                icon: <BookOpen className="mr-2 h-4 w-4" />,
            },
            {
                href: '/trial-balance',
                title: 'Trial Balance',
                icon: <Scale className="mr-2 h-4 w-4" />,
            },
            {
                href: '/profit-loss',
                title: 'Profit & Loss',
                icon: <FileBarChart2 className="mr-2 h-4 w-4" />,
            },
            {
                href: '/balance-sheet',
                title: 'Balance Sheet',
                icon: <Landmark className="mr-2 h-4 w-4" />,
            },
            {
                href: '/cash-flow',
                title: 'Cash Flow',
                icon: <ArrowRightLeft className="mr-2 h-4 w-4" />,
            }
        ]
    }
];

interface AppLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
}

const NavLinks = ({ className }: { className?: string }) => {
    const pathname = usePathname();
    const isActive = (href: string) => pathname === href;

    return (
        <nav className={className}>
            {menuItems.map((item) => (
                item.items ? (
                    <MenubarMenu key={item.title}>
                        <MenubarTrigger>{item.title}</MenubarTrigger>
                        <MenubarContent>
                            {item.items.map((subItem) => (
                                <Link href={subItem.href} key={subItem.href} passHref>
                                    <MenubarItem>
                                        {subItem.icon} {subItem.title}
                                    </MenubarItem>
                                </Link>
                            ))}
                        </MenubarContent>
                    </MenubarMenu>
                ) : (
                    <Link href={item.href} key={item.href} passHref>
                        <Button variant={isActive(item.href) ? 'secondary' : 'ghost'}>
                            {item.icon} {item.title}
                        </Button>
                    </Link>
                )
            ))}
        </nav>
    );
};


export function AppLayout({ children, title, description }: AppLayoutProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 w-full border-b bg-background">
                <div className="container flex h-16 items-center space-x-4">
                    <div className="flex items-center gap-2 mr-6">
                        <Library className="h-6 w-6 text-primary" />
                        <h1 className="text-xl font-semibold">Accounting</h1>
                    </div>
                    
                    {/* Desktop Menu */}
                    <Menubar className="hidden md:flex border-none shadow-none rounded-none">
                       <NavLinks className="flex items-center space-x-1" />
                    </Menubar>

                    {/* Mobile Menu */}
                    <div className="flex flex-1 items-center justify-end md:hidden">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-6 w-6" />
                                    <span className="sr-only">Toggle Menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left">
                                <div className="flex items-center gap-2 p-4 border-b">
                                    <Library className="h-6 w-6 text-primary" />
                                    <h1 className="text-xl font-semibold">Accounting</h1>
                                </div>
                                <NavLinks className="flex flex-col space-y-2 p-4" />
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>
            
            <div className="container mt-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground">{description}</p>
                </div>
                <main>{children}</main>
            </div>
        </div>
    );
}
