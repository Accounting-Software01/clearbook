'use client';

import React, { useState } from 'react';
import { SupplierInvoiceList } from './SupplierInvoiceList';

type ApView = 'list' | 'details';

export function AccountsPayableTabContent() {
    const [view, setView] = useState<ApView>('list');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

    const handleViewDetails = (invoiceId: number) => {
        setSelectedInvoiceId(invoiceId);
        setView('details');
    };

    const handleBackToList = () => {
        setSelectedInvoiceId(null);
        setView('list');
    };

    const renderContent = () => {
        switch (view) {
            case 'details':
                // Placeholder for invoice details view
                return <div>Invoice Details for {selectedInvoiceId} <button onClick={handleBackToList}>Back</button></div>;
            case 'list':
            default:
                return <SupplierInvoiceList onViewDetails={handleViewDetails} />;
        }
    };

    return (
        <div>
            {renderContent()}
        </div>
    );
}
