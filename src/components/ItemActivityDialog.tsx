'use client';
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle } from "lucide-react";
import { getCurrentUser } from '@/lib/auth';

interface Activity {
  date: string;
  activity: string;
  user: string;
  change: number;
  notes: string;
}

interface User {
  uid: string;
  company_id: string;
  role: string;
}

interface ItemActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number | null;
  itemName: string | null;
}

export function ItemActivityDialog({ open, onOpenChange, itemId, itemName }: ItemActivityDialogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Load user when dialog opens
  useEffect(() => {
    const fetchUser = async () => {
      if (open) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    };
    fetchUser();
  }, [open]);

  // Load activities when dialog & user & itemId are available
  useEffect(() => {
    if (!open || !itemId || !user) {
      setActivities([]);
      setError(null);
      return;
    }

    const fetchActivities = async () => {
      setIsLoading(true);
      setError(null);
      setActivities([]);

      const endpoint = `https://hariindustries.net/busa-api/database/get_item_activity.php?companyId=${user.company_id}&itemId=${itemId}`;
      console.log(`Requesting: ${endpoint}`);

      let responseText = '';

      try {
        const response = await fetch(endpoint);
        responseText = await response.text();

        if (!response.ok) {
          console.error("API HTTP Error:", response.status, responseText);
          throw new Error(`Server Error: ${response.status}. Response: "${responseText.substring(0, 150)}..."`);
        }

        const data = JSON.parse(responseText);
        console.log("API Response Data:", data);

        if (data.success && Array.isArray(data.activities)) {
          setActivities(data.activities);
          if (data.activities.length === 0) {
            console.warn("No activities returned for the item.");
          }
        } else {
          const errorMessage = data.error || "Invalid API response structure.";
          console.error("API Logic Error:", errorMessage);
          throw new Error(errorMessage);
        }
      } catch (e: any) {
        console.error("Error during fetchActivities:", e);
        let detailedError = e.message;

        if (e instanceof SyntaxError) {
          detailedError = "Invalid JSON from server. Likely a PHP error. Check console for raw output.";
          console.error("Raw server response:", responseText);
        }

        setError(detailedError);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();

  }, [open, itemId, user]);
  console.log("Loaded Activities:", activities);
console.log("User:", user);
console.log("itemId:", itemId);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Activity for: {itemName || 'Item'}</DialogTitle>
          <DialogDescription>
            A log of all inventory movements for this item.
          </DialogDescription>
        </DialogHeader>

        <div className="h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-full text-destructive text-center p-4">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Failed to load activities</p>
              <p className="text-sm text-muted-foreground mt-2 bg-red-50 p-3 rounded-md">{error}</p>
            </div>
          ) : activities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {activities.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(activity.date).toLocaleString()}</TableCell>
                    <TableCell>{activity.activity}</TableCell>
                    <TableCell>{activity.user}</TableCell>

                    <TableCell
                      className={`text-right ${
                        activity.change < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {activity.change}
                    </TableCell>

                    <TableCell>{activity.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <p>No activity found for this item.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
