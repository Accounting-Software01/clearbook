
'use client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, LayoutDashboard, FilePlus, BookPlus, BookOpen, Scale, FileBarChart2, Landmark, ArrowRightLeft } from 'lucide-react';


const menuItems = [
    {
        href: '/',
        title: 'Dashboard',
        icon: <LayoutDashboard />,
    },
    {
        title: 'Data Entry',
        items: [
            {
                href: '/payment-voucher/new',
                title: 'New Payment Voucher',
                icon: <FilePlus />,
            },
            {
                href: '/journal',
                title: 'Journal Entry',
                icon: <BookPlus />,
            },
        ]
    },
    {
        title: 'Reports',
        items: [
            {
                href: '/ledger',
                title: 'General Ledger',
                icon: <BookOpen />,
            },
            {
                href: '/trial-balance',
                title: 'Trial Balance',
                icon: <Scale />,
            },
            {
                href: '/profit-loss',
                title: 'Profit & Loss',
                icon: <FileBarChart2 />,
            },
            {
                href: '/balance-sheet',
                title: 'Balance Sheet',
                icon: <Landmark />,
            },
            {
                href: '/cash-flow',
                title: 'Cash Flow',
                icon: <ArrowRightLeft />,
            }
        ]
    }
];

interface AppLayoutProps {
    children: React.ReactNode;
    title: string;
    description: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
    const pathname = usePathname();

    const isActive = (href: string) => {
        return pathname === href;
    };
    
    return (
        <div className="min-h-screen bg-background">
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground rounded-lg p-2">
                            <Library />
                        </div>
                        <h1 className="text-xl font-semibold">Accounting</h1>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                         {menuItems.map((item) => (
                            item.items ? (
                                <SidebarGroup key={item.title}>
                                    <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.href}>
                                                <Link href={subItem.href}>
                                                    <SidebarMenuSubButton as="a" isActive={isActive(subItem.href)}>
                                                          {subItem.icon}
                                                          <span>{subItem.title}</span>
                                                    </SidebarMenuSubButton>
                                                </Link>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </SidebarGroup>
                            ) : (
                                <SidebarMenuItem key={item.href}>
                                    <Link href={item.href}>
                                        <SidebarMenuButton as="a" isActive={isActive(item.href)}>
                                            {item.icon}
                                            {item.title}
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            )
                        ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
                     <SidebarTrigger className="md:hidden"/>
                     <div>
                        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                        <p className="text-muted-foreground">{description}</p>
                     </div>
                </header>
                <main className="p-4 sm:p-6">{children}</main>
            </SidebarInset>
        </div>
    );
}
