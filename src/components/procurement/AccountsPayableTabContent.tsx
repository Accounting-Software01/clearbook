
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierInvoiceList } from './SupplierInvoiceList';
import { SupplierInvoiceDetails } from './SupplierInvoiceDetails'; // I've added this import
import { GrnForInvoiceList } from './GrnForInvoiceList';

export function AccountsPayableTabContent() {
    // State to manage which view is active
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

    // Handler to switch to the details view
    const handleViewDetails = (invoiceId: number) => {
        setSelectedInvoiceId(invoiceId);
    };

    // Handler to return to the list view
    const handleBackToList = () => {
        setSelectedInvoiceId(null);
    };
    
    // This function will be called after an invoice is approved, returning the user to the list.
    const handleInvoiceApproved = () => {
        setSelectedInvoiceId(null);
        // We could add a toast notification here in the future
    };

    return (
        <Tabs defaultValue="grn-for-invoicing">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="grn-for-invoicing">GRNs for Invoicing</TabsTrigger>
                <TabsTrigger value="supplier-invoices">Supplier Invoices</TabsTrigger>
            </TabsList>
            <TabsContent value="grn-for-invoicing">
                <GrnForInvoiceList />
            </TabsContent>
            <TabsContent value="supplier-invoices">
                {
                    // If an invoice is selected, show details; otherwise, show the list.
                    selectedInvoiceId ? (
                        <SupplierInvoiceDetails 
                            invoiceId={selectedInvoiceId} 
                            onBack={handleBackToList} 
                            onInvoiceApproved={handleInvoiceApproved}
                        />
                    ) : (
                        <SupplierInvoiceList onViewDetails={handleViewDetails} />
                    )
                }
            </TabsContent>
        </Tabs>
    );
}
