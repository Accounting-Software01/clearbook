'use client';

import React from 'react';
import { AccountsPayableTabContent } from '@/components/procurement/AccountsPayableTabContent';

export default function AccountsPayablePage() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                    <p className="text-muted-foreground">Manage supplier invoices and payments.</p>
                </div>
            </header>
            <AccountsPayableTabContent />
        </div>
    );
}
