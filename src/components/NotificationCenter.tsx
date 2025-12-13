'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Info, Tag, User, Building, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

// NOTE: These should be in a shared file, e.g., src/types/index.ts
interface User {
  uid: string;
  email: string;
  full_name: string;
  role: string;
  user_type: string;
  company_type: string;
  company_id: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  targetRole?: string;
  targetCompanyId?: string;
  actionType?: 'input_price';
  relatedItemName?: string;
}

// Dummy notifications - this should eventually be replaced by a real API call
const dummyNotifications: Notification[] = [
  {
    id: "1",
    title: "Welcome to ClearBooks!",
    message: "Explore your new dashboard and features.",
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    read: false
  },
  {
    id: "inv_add_1",
    title: "New Inventory Addition: Bottle",
    message: "Quantity 20 of Bottle added. Price not set.",
    timestamp: new Date("2025-12-12T16:18:20Z"),
    read: false,
    targetRole: "admin_manager",
    targetCompanyId: "MFP123",
    actionType: "input_price",
    relatedItemName: "Bottle"
  },
  {
    id: '2',
    title: 'System Maintenance Scheduled',
    message: 'Scheduled maintenance on 25th Dec 2025.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: true,
    targetCompanyId: "MFP123"
  },
  {
    id: '3',
    title: 'Role Update: Store Manager',
    message: 'You have been assigned the role of Store Manager.',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    read: false,
    targetRole: "store_manager",
    targetCompanyId: "MFP123"
  }
];

const formatTimestamp = (date: Date) => {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const getNotificationIcon = (notification: Notification) => {
    const iconProps = { className: "w-5 h-5 text-gray-500" };
    if (notification.actionType) {
        return <Tag {...iconProps} />;
    }
    if (notification.targetRole) {
        return <User {...iconProps} />;
    }
    if (notification.targetCompanyId) {
        return <Building {...iconProps} />;
    }
    return <Info {...iconProps} />;
};

export function NotificationCenter() {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const filtered = dummyNotifications.filter(n => {
            const isGeneral = !n.targetRole && !n.targetCompanyId;
            const isTargeted = n.targetRole === currentUser.role && n.targetCompanyId === currentUser.company_id;
            const isCompanyWide = !n.targetRole && n.targetCompanyId === currentUser.company_id;
            return isGeneral || isTargeted || isCompanyWide;
          });
          setNotifications(filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        }
      } catch (error) {
        console.error("Failed to fetch user or notifications:", error);
        toast({ title: "Error", description: "Could not load notifications.", variant: "destructive" });
      }
      setIsLoading(false);
    };
    fetchData();
  }, [toast]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    router.push(`/notifications/${notification.id}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-lg">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" onClick={markAllAsRead} className="text-xs p-0 h-auto">
                <CheckCheck className='mr-1 h-4 w-4'/> Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="text-center p-10 text-gray-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-10 text-gray-500">
              <Info className='mx-auto h-8 w-8 text-gray-400' />
              <p className="mt-2">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex items-start p-4 cursor-pointer transition-colors border-b ${
                  notification.read ? 'bg-transparent' : 'bg-blue-50/50'
                } hover:bg-gray-100 dark:hover:bg-gray-800`}
              >
                <div className="flex-shrink-0 mt-1 mr-4">
                    {getNotificationIcon(notification)}
                </div>
                <div className="flex-grow">
                  <p className={`font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'} dark:text-gray-300`}>{notification.title}</p>
                  <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'} dark:text-gray-400`}>{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(notification.timestamp)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0 ml-4 self-center">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            ))
          )}
        </ScrollArea>
        <div className="p-2 border-t">
            <Button variant="ghost" className="w-full text-sm" onClick={() => router.push('/notifications')}>
                View All Notifications
            </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
