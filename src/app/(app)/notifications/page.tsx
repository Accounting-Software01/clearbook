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
import { Bell, Info, Tag, User, Building, CheckCheck, Package, FileText, Users, Star, Megaphone, ArrowRight } from 'lucide-react';
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
  type?: 'admin_welcome';
  targetRole?: string;
  targetCompanyId?: string;
  actionType?: 'input_price';
  relatedItemName?: string;
}

const dummyNotifications: Notification[] = [
    {
        id: "admin_welcome_1",
        title: "🔔 Welcome to ClearBooks – Admin Access Activated",
        message: "As an Administrator, you now have full control over your organization’s setup, users, and financial activities.",
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        read: false,
        targetRole: 'admin',
        type: 'admin_welcome'
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
  if (notification.type === 'admin_welcome') return <Bell {...iconProps} />;
  if (notification.actionType) return <Tag {...iconProps} />;
  if (notification.targetRole) return <User {...iconProps} />;
  if (notification.targetCompanyId) return <Building {...iconProps} />;
  return <Info {...iconProps} />;
};

const AdminWelcomeNotification = ({ notification, user, onMarkAsRead }: { notification: Notification, user: User | null, onMarkAsRead: (id: string) => void }) => {
    return (
        <Card className="mb-6 border-2 border-blue-500 shadow-lg">
            <CardHeader className="text-center bg-gray-50/50 dark:bg-gray-900/50 pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">{notification.title}</CardTitle>
                <CardDescription className="max-w-3xl mx-auto pt-2">Welcome to <strong>ClearBooks</strong>, your all-in-one financial and operations management platform. As an <strong>Administrator</strong>, you now have full control over your organization’s setup, users, and financial activities.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg flex items-center mb-3"><Package className="mr-2 h-5 w-5 text-primary" />Available Modules</h3>
                            <ul className="space-y-2 text-sm list-disc list-inside text-gray-600 dark:text-gray-400">
                                <li>Accounting & Ledger Management</li>
                                <li>Sales & Invoicing</li>
                                <li>Purchasing & Expenses</li>
                                <li>Inventory & Stock Control</li>
                                <li>User & Role Management</li>
                                <li>Reports & Analytics</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg flex items-center mb-3"><Building className="mr-2 h-5 w-5 text-primary" />Company Information</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><strong>Company ID:</strong> {user?.company_id || 'N/A'}</li>
                                <li><strong>Registration Tier:</strong> <Badge variant="secondary">Professional</Badge></li>
                                <li><strong>Subscription Status:</strong> <Badge className="bg-green-100 text-green-800">Active</Badge></li>
                                <li><strong>Registered Users:</strong> 1 of 5 allowed</li>
                            </ul>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg flex items-center mb-3"><Megaphone className="mr-2 h-5 w-5 text-primary" />Announcements & Updates</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Stay informed about new features, system updates, and promotions.</p>
                        </div>
                    </div>
                    {/* Right Column */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg flex items-center mb-3"><Users className="mr-2 h-5 w-5 text-primary" />User Management</h3>
                            <ul className="space-y-2 text-sm list-disc list-inside text-gray-600 dark:text-gray-400">
                                <li>Add, edit, or remove users</li>
                                <li>Assign roles (Admin, Accountant, Staff)</li>
                                <li>Control module access per user</li>
                                <li>Monitor user activity and permissions</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg flex items-center mb-3"><Star className="mr-2 h-5 w-5 text-primary" />Premium Features</h3>
                             <ul className="space-y-2 text-sm list-disc list-inside text-gray-600 dark:text-gray-400">
                                <li>Multi-branch management</li>
                                <li>Advanced financial reports</li>
                                <li>Automated tax calculations</li>
                                <li>Data export & integrations</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </CardContent>
            <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50 flex justify-center">
                <Button onClick={() => onMarkAsRead(notification.id)}>
                    <CheckCheck className="mr-2 h-5 w-5" />
                    Got it, thanks!
                </Button>
            </div>
        </Card>
    );
}

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
            const isForMyRoleAndCompany = n.targetRole === currentUser.role && n.targetCompanyId === currentUser.company_id;
            const isForMyCompany = !n.targetRole && n.targetCompanyId === currentUser.company_id;
            const isForMyRole = n.targetRole === currentUser.role && !n.targetCompanyId;
            return isGeneral || isForMyRoleAndCompany || isForMyCompany || isForMyRole;
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
  
  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
  };
  
  const unreadCount = notifications.filter((n) => !n.read).length;
  const adminWelcomeNotification = notifications.find(n => n.type === 'admin_welcome' && !n.read && user?.role === 'admin');
  const otherNotifications = notifications.filter(n => n.id !== adminWelcomeNotification?.id);

  const NotificationList = ({ items }: { items: Notification[] }) => (
    <div className="space-y-3">
      {items.length === 0 && !adminWelcomeNotification ? (
        <div className="text-center py-12 text-gray-500">
          <Info className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-4">No new notifications here.</p>
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
            onClick={() => markAsRead(notification.id) /* For now, just mark as read. Later, could go to a detail page */}
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
                Unread <Badge className="ml-2">{unreadCount > 0 ? unreadCount : '0'}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="pt-4">
                {adminWelcomeNotification && <AdminWelcomeNotification notification={adminWelcomeNotification} user={user} onMarkAsRead={markAsRead} />}
                <NotificationList items={otherNotifications} />
            </TabsContent>
            <TabsContent value="unread" className="pt-4">
                {adminWelcomeNotification && <AdminWelcomeNotification notification={adminWelcomeNotification} user={user} onMarkAsRead={markAsRead} />}
                <NotificationList items={otherNotifications.filter(n => !n.read)} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllNotificationsPage;
