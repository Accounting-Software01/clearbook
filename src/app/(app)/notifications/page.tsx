'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Info, Tag, User, Building, CheckCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

// NOTE: The interfaces and dummy data should eventually be moved to a shared file.
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
  const iconProps = { className: "w-5 h-5" };
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

const AllNotificationsPage = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const filtered = dummyNotifications.filter((n) => {
            const isGeneral = !n.targetRole && !n.targetCompanyId;
            const isTargeted = n.targetRole === currentUser.role && n.targetCompanyId === currentUser.company_id;
            const isCompanyWide = !n.targetRole && n.targetCompanyId === currentUser.company_id;
            return isGeneral || isTargeted || isCompanyWide;
          });
          setNotifications(filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        }
      } catch (error) {
        console.error("Failed to fetch user or notifications:", error);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const NotificationList = ({ items }: { items: Notification[] }) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Info className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-4">No notifications here.</p>
        </div>
      ) : (
        items.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-start p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
              notification.read
                ? 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
            }`}
            onClick={() => router.push(`/notifications/${notification.id}`)}
          >
            <div className="flex-shrink-0 mt-1 mr-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
              {getNotificationIcon(notification)}
            </div>
            <div className="flex-grow">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200">{notification.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatTimestamp(notification.timestamp)}
              </span>
            </div>
            {!notification.read && (
              <div className="flex-shrink-0 ml-4 self-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-2xl font-bold">
                <Bell className="mr-3 h-6 w-6" />
                Notifications
              </CardTitle>
              <CardDescription className="mt-1">
                You have {unreadCount} unread messages.
              </CardDescription>
            </div>
            {unreadCount > 0 && (
                <Button onClick={markAllAsRead} size="sm" variant="outline">
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all as read
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread <Badge className="ml-2">{unreadCount}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="pt-4">
                <NotificationList items={notifications} />
            </TabsContent>
            <TabsContent value="unread" className="pt-4">
                <NotificationList items={notifications.filter(n => !n.read)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllNotificationsPage;
