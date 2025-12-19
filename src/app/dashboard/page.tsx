'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserPlus, Settings, Star, UserCircle, Loader2, TrendingUp, DollarSign, ShoppingCart, ArrowDown, ArrowUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/contexts/UserContext';
import SessionExpired from '@/components/SessionExpired';

// Motivational Quotes
const motivationalQuotes = [
    "The secret of getting ahead is getting started.",
    "Well done is better than well said.",
    "The journey of a thousand miles begins with a single step.",
    "Either you run the day or the day runs you.",
    "Your limitation is only your imagination."
];

const userRoles = [
    "admin_manager",
    "accountant",
    "sales_manager",
    "store_manager",
    "procurement_manager",
    "production_manager"
];

export default function DashboardPage() {
  const { user, isLoading, sessionExpired } = useUser();
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    if (user) {
      const now = new Date();
      const formattedLoginTime = `${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
      setLastLogin(formattedLoginTime);
    }
    setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, [user]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  if (sessionExpired) {
      return <SessionExpired />;
  }

  const sortedUserRoles = user ? [user.role, ...userRoles.filter(r => r !== user.role)] : userRoles;

  if (!user) {
    return null; // Should not happen if sessionExpired is handled, but as a fallback
  }

  return (
    <div className="flex h-screen items-start justify-center gap-6 p-8 bg-white">
      {/* Left Column */}
      <div className="w-1/3 h-[90vh] flex flex-col sticky top-8">
        <h2 className="text-xl font-bold text-center mb-4">User Roles</h2>
        <ScrollArea className="h-full pr-4">
            <div className="relative flex flex-col items-center">
                {sortedUserRoles.map((role, index) => {
                const isCurrentUserRole = user?.role === role;

                return (
                    <div key={role} className="flex items-center w-full mb-10">
                      <div className="flex flex-col items-end text-right pr-4 w-1/2">
                          <span className="text-xs font-medium capitalize">{role.replace('_', ' ')}</span>
                          {isCurrentUserRole && (
                          <>
                              <span className="text-xs text-muted-foreground">{user.full_name}</span>
                              <span className="text-xs text-green-600 font-bold dark:text-green-400">You're here</span>
                          </>
                          )}
                      </div>
                      <div className="relative w-16 h-16 flex-shrink-0">
                          {isCurrentUserRole && <div className="absolute w-full h-full rounded-full bg-green-500/20 animate-ping"></div>}
                          <UserCircle className={`w-16 h-16 ${isCurrentUserRole ? 'text-green-500' : 'text-muted-foreground/30'}`} />
                          {index < sortedUserRoles.length - 1 && (
                            <div className={`absolute top-full left-1/2 w-0.5 h-12 transform -translate-x-1/2 mt-2 bg-gray-200`}></div>
                          )}
                      </div>
                    </div>
                );
                })}
            </div>
        </ScrollArea>
      </div>

      {/* Right Column */}
      <div className="w-2/3 h-[90vh] flex flex-col">
         <div className="mb-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">
                        Welcome, {user ? user.full_name : 'Guest'}
                    </h1>
                    {user && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Role: {user.role} | Company ID: {user.company_id}
                        </p>
                    )}
                    {lastLogin && <p className='text-xs text-muted-foreground mt-1'>Last login: {lastLogin}</p>}
                </div>
                <div className='text-right'>
                    <p className='text-base italic text-muted-foreground'>"{quote}"</p>
                </div>
            </div>
        </div>
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                {/* Quick Reminders */}
                <div className="p-4 rounded-lg bg-yellow-100/30">
                    <h3 className="font-semibold text-base flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-yellow-500"/>Quick Reminders</h3>
                    <ul className="list-disc list-inside text-sm mt-2 ml-2">
                        <li>3 failed invoices require attention.</li>
                        <li>2 payment vouchers pending approval.</li>
                    </ul>
                </div>

                {/* Enhanced Settings and Status */}
                <div className="pt-4">
                    <h3 className="text-xl font-semibold mb-4">System Status & Settings</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                        {user.role === 'admin_manager' && (
                          <>
                            <div className="p-4 flex flex-col items-center justify-center text-center rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <UserPlus className="w-8 h-8 mb-2 text-primary"/>
                                <p className="font-semibold text-base">User Registration</p>
                                <Button variant='link' size='sm' className="mt-1">Manage Users</Button>
                            </div>
                            <div className="p-4 flex flex-col items-center justify-center text-center rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <Settings className="w-8 h-8 mb-2 text-primary"/>
                                <p className="font-semibold text-base">Company Settings</p>
                                <Button variant='link' size='sm' className="mt-1">Configure</Button>
                            </div>
                          </>
                        )}
                         <div className="p-4 flex flex-col items-center justify-center text-center rounded-lg bg-gray-50">
                            <Star className="w-8 h-8 mb-2 text-yellow-500"/>
                            <p className="font-semibold text-base">Subscription</p>
                            <p className="text-sm text-green-600 font-bold">Premium Plan</p>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}
