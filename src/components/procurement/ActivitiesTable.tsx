'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, ArrowRightCircle, CheckCircle, XCircle } from 'lucide-react';

interface Activity {
    id: string;
    date: string;
    type: string;
    reference: string;
    amount: number;
    status: string;
}

interface ActivitiesTableProps {
    activities: Activity[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case 'invoice':
            return <FileText className="h-5 w-5 text-blue-500" />;
        case 'payment':
            return <ArrowRightCircle className="h-5 w-5 text-green-500" />;
        default:
            return <FileText className="h-5 w-5 text-gray-500" />;
    }
};

const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
        case 'posted':
            return <Badge variant="default" className="bg-green-100 text-green-800">Posted</Badge>;
        case 'pending':
            return <Badge variant="secondary">Pending</Badge>;
        case 'cancelled':
            return <Badge variant="destructive">Cancelled</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

export const ActivitiesTable: React.FC<ActivitiesTableProps> = ({ activities }) => {
    if (activities.length === 0) {
        return <div className="text-center text-muted-foreground py-8">No activities found for this supplier.</div>;
    }

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activities.map((activity) => (
                        <TableRow key={activity.id}>
                            <TableCell>
                                <Tooltip>
                                    <TooltipTrigger>
                                        {getActivityIcon(activity.type)}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{activity.type}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell>{new Date(activity.date).toLocaleDateString()}</TableCell>
                            <TableCell>{activity.reference}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(activity.amount)}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(activity.status)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TooltipProvider>
    );
};
