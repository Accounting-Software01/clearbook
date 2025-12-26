
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Bell, AlertCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

interface Notification {
    id: number;
    message: string;
    link: string;
    created_at: string;
}

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await api<Notification[]>(`notifications.php?user_id=${user.id}&company_id=${user.company_id}`);
            setNotifications(response);
        } catch (e: any) {
            setError(e.message || "Failed to load notifications.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleMarkAsRead = async (notificationId: number) => {
        // This part is for a future implementation where we mark notifications as read.
        // For now, we'll just remove it from the list visually.
        setNotifications(notifications.filter(n => n.id !== notificationId));
        // In a real app, you would also send a request to the server to update the notification's status.
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-6 w-6" />
                    {notifications.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{notifications.length}</Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                            You have {notifications.length} unread messages.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        {isLoading && <p>Loading...</p>}
                        {error && <p className="text-destructive text-sm"><AlertCircle className="inline-block mr-2 h-4 w-4" />{error}</p>}
                        {!isLoading && !error && notifications.length === 0 && (
                            <p className="text-sm text-center text-muted-foreground">No new notifications.</p>
                        )}
                        {notifications.map((notification) => (
                            <div key={notification.id} className="flex items-start justify-between border-b last:border-b-0 pb-2 mb-2">
                                <Link href={notification.link} className="hover:underline text-sm" onClick={() => handleMarkAsRead(notification.id)}>
                                    {notification.message}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
