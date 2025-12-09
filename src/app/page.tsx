
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardDescription, CardContent, CardTitle } from "@/components/ui/card";
import { FilePlus, BookPlus, BookOpen, Scale, FileBarChart2, Landmark, ArrowRightLeft, Library } from "lucide-react";

const navItems = [
    {
        href: '/payment-voucher/new',
        title: 'New Payment Voucher',
        description: 'Record a direct payment for expenses or assets.',
        icon: <FilePlus className="w-10 h-10 text-primary" />,
    },
    {
        href: '/journal',
        title: 'Journal Entry',
        description: 'Record a manual journal entry with debits and credits.',
        icon: <BookPlus className="w-10 h-10 text-primary" />,
    },
    {
        href: '/ledger',
        title: 'General Ledger',
        description: 'View detailed transaction history for any account.',
        icon: <BookOpen className="w-10 h-10 text-primary" />,
    },
    {
        href: '/trial-balance',
        title: 'Trial Balance',
        description: 'Verify account balances for a specific period.',
        icon: <Scale className="w-10 h-10 text-primary" />,
    },
    {
        href: '/profit-loss',
        title: 'Profit & Loss',
        description: 'See your business’s financial performance over time.',
        icon: <FileBarChart2 className="w-10 h-10 text-primary" />,
    },
    {
        href: '/balance-sheet',
        title: 'Balance Sheet',
        description: 'A snapshot of your company’s financial health.',
        icon: <Landmark className="w-10 h-10 text-primary" />,
    },
    {
        href: '/cash-flow',
        title: 'Cash Flow Statement',
        description: 'Track the movement of cash in and out of the business.',
        icon: <ArrowRightLeft className="w-10 h-10 text-primary" />,
    }
];


export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <main className="container mx-auto px-0">
         <div className="mb-12 text-center">
            <div className="flex justify-center mb-4">
                <Library className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight">Accounting Hub</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                A comprehensive system to record, analyze, and report on your financial transactions, ensuring accuracy and providing insights for business decisions.
            </p>
        </div>
       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {navItems.map((item) => (
                <Link href={item.href} key={item.href} passHref>
                   <Card className="h-full bg-card/50 hover:bg-card/90 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col justify-center text-center">
                        <CardContent className="p-8">
                            <div className="flex justify-center mb-4">
                                {item.icon}
                            </div>
                            <CardTitle className="text-lg mb-2">{item.title}</CardTitle>
                            <CardDescription>{item.description}</CardDescription>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
      </main>
    </div>
  );
}
