
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, Bell, Banknote, Shield } from 'lucide-react';
import RecentVouchersTable from '@/components/ui/RecentVouchersTable';
import type { JournalVoucher } from '@/lib/api';
import { JournalActions } from './JournalActions';

interface JournalViewsProps {
    vouchers: JournalVoucher[];
    pendingApprovalCount: number;
    vouchersTodayCount: number;
    settings: any;
    isAdmin: boolean;
    onVoucherUpdate: (voucherId: number, newStatus: 'approved' | 'rejected') => void;
    onPrint: (voucher: JournalVoucher) => void;
    onSettingsUpdate: (newSettings: any) => void;
    companyId: number;
    userId: number;
}

export const JournalViews: React.FC<JournalViewsProps> = ({ vouchers, pendingApprovalCount, vouchersTodayCount, settings, isAdmin, onVoucherUpdate, onPrint, onSettingsUpdate, companyId, userId }) => {
    const renderApprovalView = () => (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Access Control</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{settings?.manualJournalsEnabled ? 'Enabled' : 'Disabled'}</div>
                        <p className="text-xs text-muted-foreground mb-4">Manual entries are currently {settings?.manualJournalsEnabled ? 'allowed' : 'disallowed'}.</p>
                        <JournalActions selectedVoucher={null} companyId={companyId} userId={userId} settings={settings} printRef={{current: null}} onVoucherUpdate={() => {}} onSettingsUpdate={onSettingsUpdate} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle><Bell className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-amber-600">{pendingApprovalCount}</div><p className="text-xs text-muted-foreground">vouchers require attention</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Vouchers Today</CardTitle><Banknote className="h-4 w-4 text-muted-foreground" /></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{vouchersTodayCount}</div><p className="text-xs text-muted-foreground">vouchers created today</p></CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle>Voucher Approval Queue</CardTitle><CardDescription>Review, approve, or reject vouchers.</CardDescription></CardHeader>
                <CardContent><RecentVouchersTable vouchers={vouchers.filter(v => v.status === 'pending_approval')} showActions={true} onApprove={(v) => onVoucherUpdate(v.id, 'approved')} onReject={(v) => onVoucherUpdate(v.id, 'rejected')} onPrint={onPrint} companyId={companyId} /></CardContent>
            </Card>
        </div>
    );

    const renderRecentView = () => (
        <Card>
            <CardHeader>
                <CardTitle>Recent Journal Vouchers</CardTitle>
                <CardDescription>A list of all recently created journal vouchers and their status.</CardDescription>
            </CardHeader>
            <CardContent>
                <RecentVouchersTable vouchers={vouchers} showActions={false} onPrint={onPrint} companyId={companyId} />
            </CardContent>
        </Card>
    );

    const renderPermissionDenied = () => (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="text-center"><CardTitle className="text-2xl text-destructive">Access Denied</CardTitle></CardHeader>
           <CardContent className="flex flex-col items-center p-16 space-y-4"><div className="p-4 bg-destructive/10 rounded-full"><Shield className="h-16 w-16 text-destructive" /></div><p>You do not have permission to view this section.</p></CardContent>
       </Card>
   );

    if (isAdmin) {
        return renderApprovalView();
    }

    return renderRecentView();
};
