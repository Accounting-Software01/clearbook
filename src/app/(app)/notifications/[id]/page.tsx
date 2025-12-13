'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bell,
  Tag,
  ArrowLeft,
  Info,
  Building,
  User,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { SetPriceForAdditionDialog } from '@/components/SetPriceForAdditionDialog';

// Interfaces
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
  id: string | number;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  targetRole?: string;
  targetCompanyId?: string;
  actionType?: "input_price";
  relatedItemId?: number;
  relatedItemName?: string;
  relatedItemType?: "product" | "raw_material";
  relatedQuantityAdded?: number;
}

// Dummy data
const dummyNotifications: Notification[] = [
    {
        id: "1",
        title: "Welcome to ClearBooks!",
        message: "Explore your new dashboard and features.",
        timestamp: new Date(),
        read: false,
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
        relatedItemId: 2,
        relatedItemName: "Bottle",
        relatedItemType: "raw_material",
        relatedQuantityAdded: 20,
    },
];

// Helper functions
const formatTimestamp = (date: Date) => {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return date.toLocaleDateString();
};

const getNotificationIcon = (notification: Notification) => {
  const props = { className: 'w-5 h-5' };
  if (notification.actionType) return <Tag {...props} />;
  if (notification.targetRole) return <User {...props} />;
  if (notification.targetCompanyId) return <Building {...props} />;
  return <Info {...props} />;
};

// The Page Component
export default function NotificationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetPriceDialogOpen, setIsSetPriceDialogOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchNotification = async () => {
      setIsLoading(true);
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("You must be logged in to view notifications.");
        }

        let allNotifications: Notification[] = [...dummyNotifications];

        if (user.role === 'admin_manager' && user.company_id) {
          const response = await fetch(`https://hariindustries.net/busa-api/database/get_new_inventory_additions.php?companyId=${user.company_id}`);
          if (!response.ok) throw new Error('Failed to fetch data from the server.');
          const data = await response.json();
          if (data.success && Array.isArray(data.notifications)) {
            const liveNotifications: Notification[] = data.notifications.map((n: any) => ({ ...n, id: String(n.id), timestamp: new Date(n.timestamp) }));
            const notificationMap = new Map(allNotifications.map(n => [String(n.id), n]));
            liveNotifications.forEach(n => notificationMap.set(String(n.id), n));
            allNotifications = Array.from(notificationMap.values());
          }
        }

        const found = allNotifications.find((n) => String(n.id) === id);
        if (!found) throw new Error("Notification not found.");

        const isGeneral = !found.targetRole && !found.targetCompanyId;
        const isTargeted = found.targetRole === user.role && found.targetCompanyId === user.company_id;
        const isCompanyWide = !found.targetRole && found.targetCompanyId === user.company_id;

        if (isGeneral || isTargeted || isCompanyWide) {
          setNotification(found);
        } else {
          throw new Error("You are not authorized to view this notification.");
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotification();
  }, [id]);

  const handleSetPriceSuccess = () => {
    setIsSetPriceDialogOpen(false);
    // Refresh the page or optimistically update the state to show the action is completed.
    // For now, we'll just show a toast, but you might want to refetch or redirect.
    toast({
        title: "Action Complete",
        description: "The inventory price has been set and the journal entry created.",
    });
    if (notification) {
        setNotification(prev => prev ? { ...prev, read: true, actionType: undefined } : null);
    }
  };

  const renderContent = () => {
    if (isLoading) return (
        <div className='text-center text-muted-foreground py-10'><Loader2 className="mx-auto h-12 w-12 animate-spin" /><p className='mt-4'>Loading...</p></div>
    );
    if (error) return (
        <div className='text-center text-red-500 py-10'><Info className='mx-auto h-12 w-12' /><p className='mt-4 text-lg'>{error}</p></div>
    );
    if (!notification) return null;

    return (
        <div className='space-y-6'>
            <div className='flex items-start space-x-4'>
                <div className='mt-1'>{getNotificationIcon(notification)}</div>
                <div className='flex-1'>
                    <h2 className='text-xl font-semibold'>{notification.title}</h2>
                    <p className='text-sm text-gray-500'>{formatTimestamp(notification.timestamp)}</p>
                </div>
            </div>
            <p>{notification.message}</p>
            {notification.actionType === "input_price" && (
                <div className='mt-6 p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg'>
                    <div className='flex items-center'>
                        <Tag className='h-6 w-6 text-blue-600 mr-3' />
                        <div>
                            <p className='font-bold text-blue-800'>Action Required: Input Price</p>
                            <p className='text-sm text-blue-700'>
                                Item: <span className='font-semibold'>{notification.relatedItemName}</span> (Qty: {notification.relatedQuantityAdded})
                            </p>
                            <Button size='sm' className='mt-3' onClick={() => setIsSetPriceDialogOpen(true)}>
                                Set Price & Post Journal
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <>
      <div className='max-w-4xl mx-auto p-4'>
        <div className='mb-4'>
            <Button asChild variant='outline' size='sm'>
                <Link href='/notifications'><ArrowLeft className='mr-2 h-4 w-4' />Back to Notifications</Link>
            </Button>
        </div>
        <Card className='shadow-lg'>
          <CardHeader className='border-b'>
            <div className='flex items-start justify-between'>
                <div>
                    <CardTitle className='flex items-center text-2xl'><Bell className='mr-3 text-primary' />Notification Details</CardTitle>
                    <CardDescription className='mt-2'>Detailed view of your notification.</CardDescription>
                </div>
                {notification && <Badge variant={notification.read ? "secondary" : "default"}>{notification.read ? "Read" : "Unread"}</Badge>}
            </div>
          </CardHeader>
          <CardContent className='p-6'>{renderContent()}</CardContent>
          {notification && (
            <CardFooter className='bg-gray-50 p-4 border-t flex justify-end'>
                <Button variant='outline'><CheckCircle className='mr-2 h-4 w-4' />Mark as Read</Button>
            </CardFooter>
          )}
        </Card>
      </div>

      {notification && notification.actionType === 'input_price' && (
        <SetPriceForAdditionDialog
            open={isSetPriceDialogOpen}
            onOpenChange={setIsSetPriceDialogOpen}
            itemId={notification.relatedItemId!}
            itemName={notification.relatedItemName!}
            itemType={notification.relatedItemType!}
            quantityAdded={notification.relatedQuantityAdded!}
            onSuccess={handleSetPriceSuccess}
            notificationId={notification.id}
        />
      )}
    </>
  );
}
