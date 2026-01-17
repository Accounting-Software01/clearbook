'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Cog, Users, X, CheckCircle, Ban } from 'lucide-react';

const AlertSettingsPage = () => {
    const [enableAlerts, setEnableAlerts] = useState(true);
    const [warningThreshold, setWarningThreshold] = useState('80.00');
    const [criticalThreshold, setCriticalThreshold] = useState('90.00');
    const [alertOnOverBudget, setAlertOnOverBudget] = useState(true);
    const [alertOnApproval, setAlertOnApproval] = useState(true);
    const [notificationFrequency, setNotificationFrequency] = useState('immediate');
    const [emailRecipients, setEmailRecipients] = useState('admin@example.com finance@example.com');
    const [systemUsers, setSystemUsers] = useState([
        { id: 'test2', name: 'Test2 Test2', email: 'test2@kamfany.com' },
        { id: 'test3', name: 'Test3 Test3', email: 'test3@kamfany.com' },
    ]);

    const removeUser = (id: string) => {
        setSystemUsers(systemUsers.filter(user => user.id !== id));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Cog className="h-5 w-5" /> Alert Configuration</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <Alert variant="warning">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>You are configuring default alert settings. These will apply to all budgets unless overridden.</AlertDescription>
                        </Alert>
                        <div className="flex items-center space-x-3 rounded-md border p-4">
                             <Switch id="enable-alerts" checked={enableAlerts} onCheckedChange={setEnableAlerts} />
                             <div className="space-y-1">
                                <label htmlFor="enable-alerts" className="text-sm font-medium leading-none">Enable Budget Alerts</label>
                                <p className="text-sm text-muted-foreground">Send notifications when budget thresholds are reached</p>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label htmlFor="warning-threshold" className="font-semibold text-sm">Warning Threshold (%) *</label>
                                <div className="flex items-center"><Input id="warning-threshold" type="number" value={warningThreshold} onChange={e => setWarningThreshold(e.target.value)} /><span className="ml-2 text-muted-foreground">%</span></div>
                                <p className="text-xs text-muted-foreground">Alert when budget utilization reaches this percentage</p>
                            </div>
                             <div className="space-y-2">
                                <label htmlFor="critical-threshold" className="font-semibold text-sm">Critical Threshold (%) *</label>
                                <div className="flex items-center"><Input id="critical-threshold" type="number" value={criticalThreshold} onChange={e => setCriticalThreshold(e.target.value)} /><span className="ml-2 text-muted-foreground">%</span></div>
                                <p className="text-xs text-muted-foreground">Alert when budget utilization reaches critical level</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="font-semibold text-sm">Alert Triggers</label>
                            <div className="flex items-start space-x-3 rounded-md border p-4">
                                <Checkbox id="over-budget" checked={alertOnOverBudget} onCheckedChange={c => setAlertOnOverBudget(c as boolean)} />
                                <div className="space-y-1">
                                    <label htmlFor="over-budget" className="text-sm font-medium leading-none">Alert on Over Budget</label>
                                    <p className="text-sm text-muted-foreground">Send alert when expenses exceed budgeted amount</p>
                                </div>
                            </div>
                             <div className="flex items-start space-x-3 rounded-md border p-4">
                                <Checkbox id="approval-required" checked={alertOnApproval} onCheckedChange={c => setAlertOnApproval(c as boolean)} />
                                 <div className="space-y-1">
                                    <label htmlFor="approval-required" className="text-sm font-medium leading-none">Alert on Approval Required</label>
                                    <p className="text-sm text-muted-foreground">Send alert when budget needs approval</p>
                                </div>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <label htmlFor="notif-freq" className="font-semibold text-sm">Notification Frequency *</label>
                            <Select value={notificationFrequency} onValueChange={setNotificationFrequency}><SelectTrigger id="notif-freq"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="immediate">Immediate</SelectItem></SelectContent></Select>
                            <p className="text-xs text-muted-foreground">How often to send alert notifications</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Alert Recipients</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email-recipients" className="font-semibold text-sm">Email Recipients</label>
                             <Textarea id="email-recipients" value={emailRecipients} onChange={e => setEmailRecipients(e.target.value)} placeholder="Enter email addresses (one per line or comma-separated) e.g., admin@example.com finance@example.com" className="h-24" />
                             <p className="text-xs text-muted-foreground">Enter email addresses to receive budget alerts</p>
                        </div>
                         <div className="space-y-2">
                            <label className="font-semibold text-sm">System User Recipients</label>
                            <div className="p-3 border rounded-lg min-h-[40px] flex flex-wrap gap-2">
                                {systemUsers.map(user => (
                                    <Badge key={user.id} variant="default" className="flex items-center gap-2 text-sm bg-primary hover:bg-primary-dark"><span>{user.name} ({user.email})</span><button onClick={() => removeUser(user.id)} className="rounded-full hover:bg-black/20 p-0.5"><X className="h-3 w-3" /></button></Badge>
                                ))}
                            </div>
                             <p className="text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple users</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6 sticky top-6">
                <Card>
                    <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <Button className="w-full">Save Settings</Button>
                        <Link href="/budget-alerts" className="w-full inline-block"><Button variant="outline" className="w-full"><X className="mr-2 h-4 w-4" /> Cancel</Button></Link>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Alert Levels</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3"><Badge variant="outline" className="text-yellow-600 border-yellow-500"><AlertTriangle className="h-4 w-4" /></Badge><div><p className="font-semibold">Warning</p><p className="text-sm text-muted-foreground">Triggered at warning threshold</p></div></div>
                        <div className="flex items-start gap-3"><Badge variant="outline" className="text-red-600 border-red-500"><AlertTriangle className="h-4 w-4" /></Badge><div><p className="font-semibold">Critical</p><p className="text-sm text-muted-foreground">Triggered at critical threshold</p></div></div>
                        <div className="flex items-start gap-3"><Badge variant="destructive"><Ban className="h-4 w-4" /></Badge><div><p className="font-semibold">Over Budget</p><p className="text-sm text-muted-foreground">Expenses exceed budget (&gt;100%)</p></div></div>
                         <div className="flex items-start gap-3"><Badge variant="default" className="bg-blue-500"><CheckCircle className="h-4 w-4" /></Badge><div><p className="font-semibold">Approval</p><p className="text-sm text-muted-foreground">Budget requires approval</p></div></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AlertSettingsPage;
