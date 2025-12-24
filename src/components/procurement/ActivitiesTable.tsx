'use client';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Activity {
    id: string;
    date: string;
    type: string;
    reference: string;
    amount: number;
    status?: string; // Optional status property
}

interface ActivitiesTableProps {
    activities: Activity[];
}

export function ActivitiesTable({ activities }: ActivitiesTableProps) {
    const formatNumber = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getTypeBadgeVariant = (type: string): "secondary" | "default" => {
        switch (type) {
            case 'Purchase Invoice':
                return 'secondary';
            case 'Payment':
                return 'default';
            default:
                return 'default';
        }
    };

    const getStatusBadgeVariant = (status?: string): "success" | "destructive" | "warning" | "default" => {
        switch (status?.toLowerCase()) {
            case 'paid':
            case 'approved':
                return 'success';
            case 'unpaid':
            case 'overdue':
                return 'destructive';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    const capitalize = (s?: string) => s && s.charAt(0).toUpperCase() + s.slice(1) || "N/A";

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {activities.length > 0 ? (
                    activities.map((activity) => (
                        <TableRow key={`${activity.type}-${activity.id}`}>
                            <TableCell>{format(new Date(activity.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{activity.reference}</TableCell>
                            <TableCell>
                                <Badge variant={getTypeBadgeVariant(activity.type)}>{activity.type}</Badge>
                            </TableCell>
                            <TableCell>
                                {activity.status && (
                                    <Badge variant={getStatusBadgeVariant(activity.status)}>{capitalize(activity.status)}</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(activity.amount)}</TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No activities found.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}
