'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays, parseISO } from 'date-fns';

// Define the structure of the data we expect from the API
interface SubscriptionDetails {
    id: string;
    company_id: string;
    tier: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    paid: number;
    paystack_reference: string;
    created_at: string;
    updated_at: string;
}

// Helper functions for UI
const formatPlanName = (tier: string) => tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'No Plan';
const getStatusBadgeVariant = (isActive: boolean): 'success' | 'destructive' | 'secondary' => {
    return isActive ? 'success' : 'destructive';
};

const SubscriptionAndBilling = () => {
    // Component-specific state
    const [details, setDetails] = useState<SubscriptionDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get user from auth to find the company_id
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.company_id) {
            setIsLoading(false);
            setError("Could not find a company ID for your user.");
            return;
        }

        const fetchSubscriptionDetails = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiUrl = `https://hariindustries.net/api/clearbook/subscription.php?company_id=${user.company_id}`;
                const response = await fetch(apiUrl);
                const result = await response.json();

                if (result.success && result.data) {
                    setDetails(result.data);
                } else {
                    // If the API call was successful but there's no subscription
                    setDetails(null);
                }
            } catch (err) {
                console.error("Failed to fetch subscription details:", err);
                setError("An error occurred while fetching your subscription data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSubscriptionDetails();
    }, [user?.company_id]); // Re-run if the user/company_id changes

    // 1. Loading State
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                <p className="ml-4 text-gray-600">Loading Subscription & Billing...</p>
            </div>
        );
    }

    // 2. Error State
    if (error) {
        return (
            <Card className="max-w-2xl mx-auto border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle /> Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                </CardContent>
            </Card>
        );
    }

    // 3. No Subscription State
    if (!details) {
        return (
            <Card className="max-w-2xl mx-auto shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AlertCircle className="text-orange-500" />No Subscription Found</CardTitle>
                    <CardDescription>You do not have an active or expired subscription record.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="mb-4">Please choose a plan to get started.</p>
                    <Link href="/subscription"><Button>Choose a Plan</Button></Link>
                </CardContent>
            </Card>
        );
    }

    // 4. Success State: Display Subscription Details
    const { tier, is_active, start_date, end_date } = details;
    
    const startDate = parseISO(start_date);
    const endDate = parseISO(end_date);
    const today = new Date();

    const totalDuration = differenceInDays(endDate, startDate);
    const daysRemaining = differenceInDays(endDate, today);
    const progressValue = totalDuration > 0 ? Math.max(0, Math.min(100, ((totalDuration - daysRemaining) / totalDuration) * 100)) : 0;
    const status = is_active ? 'active' : 'inactive';

    return (
        <Card className="max-w-2xl mx-auto shadow-lg bg-white rounded-2xl border">
            <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">Your Current Plan</CardTitle>
                    <CardDescription>Manage your subscription and billing details below.</CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(is_active)} className="capitalize text-base py-1 px-3">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {status}
                </Badge>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="p-6 bg-gray-50 rounded-xl border">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{formatPlanName(tier)} Plan</h3>
                    <p className="text-4xl font-bold text-gray-800">
                        {tier === 'premium' ? '$45' : '$25'}<span className="text-lg font-normal text-gray-500">/month</span>
                    </p>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1 text-sm font-medium">
                            <p className="text-gray-600">Time Remaining</p>
                            <p className="text-gray-800">{daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}</p>
                        </div>
                        <Progress value={progressValue} className="h-2" />
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Subscribed on {format(startDate, 'MMM d, yyyy')}</span>
                        <span>{is_active ? `Renews on ${format(endDate, 'MMM d, yyyy')}` : `Expired on ${format(endDate, 'MMM d, yyyy')}`}</span>
                    </div>
                </div>
                <div className="border-t pt-6 flex flex-col sm:flex-row gap-4">
                    {tier !== 'premium' && is_active && (
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700"><Zap className="w-4 h-4 mr-2" />Upgrade to Premium</Button>
                    )}
                     <Link href="/settings/billing" className="flex-1">
                        <Button variant="outline" className="w-full">Manage Billing History</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};

export default SubscriptionAndBilling;
