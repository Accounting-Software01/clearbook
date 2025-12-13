'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserPlus, Settings, Star, UserCircle, Loader2, TrendingUp, DollarSign, ShoppingCart, ArrowDown, ArrowUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCurrentUser } from '@/lib/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface User {
    uid: string;
    full_name: string;
    email: string;
    role: string;
    user_type: string;
    company_type: string;
    company_id: string;
}

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

// Mock Data for the Chart
const chartData = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  { name: 'Mar', revenue: 2000, expenses: 9800 },
  { name: 'Apr', revenue: 2780, expenses: 3908 },
  { name: 'May', revenue: 1890, expenses: 4800 },
  { name: 'Jun', revenue: 2390, expenses: 3800 },
  { name: 'Jul', revenue: 3490, expenses: 4300 },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser as User);
      
      const now = new Date();
      const formattedLoginTime = `${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
      setLastLogin(formattedLoginTime);
    }

    fetchUser();
    setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  if (!user) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen items-center justify-center gap-6 p-8 bg-background overflow-hidden">
      {/* Left Column */}
      <Card className="w-1/3 h-[90vh] flex flex-col">
        <CardHeader className="text-center">
            <CardTitle>User Roles</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-4">
                <div className="relative flex flex-col items-center">
                    {userRoles.map((role, index) => {
                    const isCurrentUserRole = user?.role === role;
                    const isLineFromCurrentUser = user?.role === userRoles[index];

                    return (
                        <div key={role} className="flex items-center w-full mb-16">
                        <div className="flex flex-col items-end text-right pr-4 w-1/2">
                            <span className="text-sm font-medium capitalize">{role.replace('_', ' ')}</span>
                            {isCurrentUserRole && (
                            <>
                                <span className="text-xs text-muted-foreground">{user.full_name}</span>
                                <span className="text-xs text-green-600 font-bold dark:text-green-400">You're here</span>
                            </>
                            )}
                        </div>
                        <div className="relative w-24 h-24 flex-shrink-0">
                            {isCurrentUserRole && <div className="absolute w-full h-full rounded-full animate-rotate-dot"></div>}
                            <UserCircle className={`w-24 h-24 ${isCurrentUserRole ? 'text-green-500' : 'text-muted-foreground/50'}`} />
                            {index < userRoles.length - 1 && (
                            <div className={`absolute top-full left-1/2 w-0.5 h-20 transform -translate-x-1/2 mt-2 ${isLineFromCurrentUser ? 'bg-green-500' : 'bg-border'}`}></div>
                            )}
                        </div>
                        </div>
                    );
                    })}
                </div>
            </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Column */}
      <Card className="w-2/3 h-[90vh] flex flex-col">
         <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-2xl">
                        Welcome, {user ? user.full_name : 'Guest'}
                    </CardTitle>
                    {user && (
                        <CardDescription className="text-sm text-muted-foreground mt-1">
                            Role: {user.role} | Company ID: {user.company_id}
                        </CardDescription>
                    )}
                    {lastLogin && <p className='text-sm text-muted-foreground mt-1'>Last login: {lastLogin}</p>}
                </div>
                <div className='text-right'>
                    <p className='text-sm italic text-muted-foreground'>"{quote}"</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden">
             <ScrollArea className="h-full pr-4">
                <div className="space-y-6">
                    {/* Quick Reminders */}
                    <div className="p-4 border rounded-lg bg-yellow-100/20 border-yellow-300">
                        <h3 className="font-semibold flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/>Quick Reminders</h3>
                        <ul className="list-disc list-inside text-sm mt-2">
                            <li>3 failed invoices require attention.</li>
                            <li>2 payment vouchers pending approval.</li>
                        </ul>
                    </div>

                    {/* Financial Trends Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center"><TrendingUp className="w-5 h-5 mr-2"/>Financial Trends</CardTitle>
                            <CardDescription>Monthly revenue and expenses overview.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" activeDot={{ r: 8 }} />
                                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Enhanced Settings and Status */}
                    <div className="pt-4 border-t">
                        <h3 className="text-lg font-semibold mb-4">System Status & Settings</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="p-4 flex flex-col items-center justify-center text-center">
                                <UserPlus className="w-8 h-8 mb-2 text-primary"/>
                                <p className="font-semibold">User Registration</p>
                                <Button variant='link' size='sm'>Manage Users</Button>
                            </Card>
                            <Card className="p-4 flex flex-col items-center justify-center text-center">
                                <Settings className="w-8 h-8 mb-2 text-primary"/>
                                <p className="font-semibold">Company Settings</p>
                                <Button variant='link' size='sm'>Configure</Button>
                            </Card>
                             <Card className="p-4 flex flex-col items-center justify-center text-center">
                                <Star className="w-8 h-8 mb-2 text-yellow-500"/>
                                <p className="font-semibold">Subscription</p>
                                <p className="text-sm text-green-600 font-bold">Premium Plan</p>
                            </Card>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

