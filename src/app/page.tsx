
'use client';

import React from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilePlus, BookPlus, BookOpen, Scale, FileBarChart2, Landmark, ArrowRightLeft } from "lucide-react";

const navItems = [
    {
        href: '/payment-voucher/new',
        title: 'New Payment Voucher',
        description: 'Record a direct payment for expenses or assets.',
        icon: <FilePlus className="w-8 h-8 text-primary" />,
    },
    {
        href: '/journal',
        title: 'Journal Entry',
        description: 'Record a manual journal entry with debits and credits.',
        icon: <BookPlus className="w-8 h-8 text-primary" />,
    },
    {
        href: '/ledger',
        title: 'General Ledger',
        description: 'View detailed transaction history for any account.',
        icon: <BookOpen className="w-8 h-8 text-primary" />,
    },
    {
        href: '/trial-balance',
        title: 'Trial Balance',
        description: 'Verify account balances for a specific period.',
        icon: <Scale className="w-8 h-8 text-primary" />,
    },
    {
        href: '/profit-loss',
        title: 'Profit & Loss',
        description: 'See your business’s financial performance over time.',
        icon: <FileBarChart2 className="w-8 h-8 text-primary" />,
    },
    {
        href: '/balance-sheet',
        title: 'Balance Sheet',
        description: 'A snapshot of your company’s financial health.',
        icon: <Landmark className="w-8 h-8 text-primary" />,
    },
    {
        href: '/cash-flow',
        title: 'Cash Flow Statement',
        description: 'Track the movement of cash in and out of the business.',
        icon: <ArrowRightLeft className="w-8 h-8 text-primary" />,
    }
];


export default function Home() {
  return (
    <AppLayout title="Dashboard" description="Welcome back! Select a task to get started.">
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {navItems.map((item) => (
                <Link href={item.href} key={item.href} passHref>
                   <Card className="h-full hover:bg-muted/50 transition-colors hover:shadow-md cursor-pointer">
                        <CardHeader className="flex flex-row items-start gap-4">
                            {item.icon}
                            <div className="flex-1">
                                <CardTitle className="text-lg mb-1">{item.title}</CardTitle>
                                <CardDescription>{item.description}</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            ))}
        </div>
    </AppLayout>
  );
}
