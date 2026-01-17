'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, BellOff, Settings, Filter } from "lucide-react";

const BudgetAlertsPage = () => {
    // For now, it's an empty array as the image shows "No alerts found"
    const [alerts, setAlerts] = useState([]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6" />
                    <CardTitle className="text-2xl">Budget Alerts</CardTitle>
                </div>
                <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Alert Settings
                </Button>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-4 mb-6">
                    <div className="flex-1">
                        <label className="text-sm font-medium">Alert Type</label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an option..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="over-budget">Over Budget</SelectItem>
                                <SelectItem value="near-limit">Nearing Limit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-medium">Status</label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an option..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="read">Read</SelectItem>
                                <SelectItem value="dismissed">Dismissed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="self-end">
                        <Button>
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                </div>

                <div className="border rounded-md min-h-[300px] flex flex-col">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Budget</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead>Utilization</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {alerts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-20">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <BellOff className="h-12 w-12" />
                                            <p className="font-semibold text-lg">No alerts found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                // When data is available, it would be mapped here.
                                <></>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default BudgetAlertsPage;
