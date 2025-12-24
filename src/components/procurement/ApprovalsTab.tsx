'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PurchaseOrderApprovalList } from './PurchaseOrderApprovalList';
import { GrnApprovalList } from './GrnApprovalList';

export function ApprovalsTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Action Center</CardTitle>
                <CardDescription>Review, submit, and approve documents for your company.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="po_actions">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="po_actions">Purchase Orders</TabsTrigger>
                        <TabsTrigger value="grn_approvals">GRN Approvals</TabsTrigger>
                    </TabsList>
                    <TabsContent value="po_actions" className="mt-4">
                        <PurchaseOrderApprovalList />
                    </TabsContent>
                    <TabsContent value="grn_approvals" className="mt-4">
                        <GrnApprovalList />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
