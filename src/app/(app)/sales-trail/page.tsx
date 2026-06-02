'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Loader2, AlertCircle, RefreshCw, Download, Filter, X, FileText, TrendingUp, Calendar,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const API = 'https://hariindustries.net/api/clearbook/sales-trail.php';

interface SalesTrailItem {
    invoice_number: string;
    invoice_date: string;
    customer_name: string;
    total_amount: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    line_subtotal: number;
    status: string;
}

interface FilterState {
    invoice_number: string;
    customer_name: string;
    item_name: string;
    status: string;
    startDate: string;
    endDate: string;
}

// Status options for the select dropdown
const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'cancelled', label: 'Cancelled' },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'paid' || statusLower === 'completed') {
        return 'bg-green-100 text-green-700';
    } else if (statusLower === 'pending') {
        return 'bg-yellow-100 text-yellow-700';
    } else if (statusLower === 'cancelled') {
        return 'bg-red-100 text-red-700';
    } else if (statusLower === 'partial') {
        return 'bg-blue-100 text-blue-700';
    }
    return 'bg-gray-100 text-gray-600';
};

const getStatusText = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'paid') return 'Paid';
    if (statusLower === 'completed') return 'Completed';
    if (statusLower === 'pending') return 'Pending';
    if (statusLower === 'cancelled') return 'Cancelled';
    if (statusLower === 'partial') return 'Partial';
    return status || '—';
};

// ─── Export to Excel / CSV ────────────────────────────────────────────────────

const exportToExcel = (items: SalesTrailItem[], filter: FilterState) => {
    const data = items.map(item => ({
        'Invoice Number': item.invoice_number,
        'Invoice Date': formatDate(item.invoice_date),
        'Customer Name': item.customer_name,
        'Item Name': item.item_name,
        'Quantity': item.quantity,
        'Unit Price (₦)': item.unit_price,
        'Line Subtotal (₦)': item.line_subtotal,
        'Invoice Total (₦)': item.total_amount,
        'Status': getStatusText(item.status),
    }));

    // Add summary row
    const totalAmount = items.reduce((sum, item) => sum + item.total_amount, 0);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalSubtotal = items.reduce((sum, item) => sum + item.line_subtotal, 0);

    data.push({} as any);
    data.push({
        'Invoice Number': 'SUMMARY',
        'Invoice Date': '',
        'Customer Name': '',
        'Item Name': '',
        'Quantity': totalQuantity,
        'Unit Price (₦)': '',
        'Line Subtotal (₦)': totalSubtotal,
        'Invoice Total (₦)': totalAmount,
        'Status': '',
    });

    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header as keyof typeof row];
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
            if (typeof value === 'number') return value.toString();
            return value || '';
        }).join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_trail_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SalesTrailPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // ── State ─────────────────────────────────────────────────────────────────
    const [items, setItems] = useState<SalesTrailItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterState>({
        invoice_number: '',
        customer_name: '',
        item_name: '',
        status: 'all',  // Changed from '' to 'all'
        startDate: '',
        endDate: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [summary, setSummary] = useState({
        totalInvoices: 0,
        totalAmount: 0,
        totalItems: 0,
        uniqueCustomers: 0,
    });

    // ── Filtered Items ────────────────────────────────────────────────────────
    const filteredItems = items.filter(item => {
        // Filter by invoice number
        if (filter.invoice_number && !item.invoice_number.toLowerCase().includes(filter.invoice_number.toLowerCase())) {
            return false;
        }
        // Filter by customer name
        if (filter.customer_name && !item.customer_name.toLowerCase().includes(filter.customer_name.toLowerCase())) {
            return false;
        }
        // Filter by item name
        if (filter.item_name && !item.item_name.toLowerCase().includes(filter.item_name.toLowerCase())) {
            return false;
        }
        // Filter by status - skip if 'all' is selected
        if (filter.status && filter.status !== 'all') {
            const itemStatus = getStatusText(item.status).toLowerCase();
            if (itemStatus !== filter.status.toLowerCase()) {
                return false;
            }
        }
        // Filter by date range
        if (filter.startDate && new Date(item.invoice_date) < new Date(filter.startDate)) {
            return false;
        }
        if (filter.endDate && new Date(item.invoice_date) > new Date(filter.endDate)) {
            return false;
        }
        return true;
    });

    // Calculate summary from filtered items
    const filteredSummary = {
        totalAmount: filteredItems.reduce((sum, item) => sum + item.total_amount, 0),
        totalItems: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
        uniqueInvoices: new Set(filteredItems.map(item => item.invoice_number)).size,
        uniqueCustomers: new Set(filteredItems.map(item => item.customer_name)).size,
    };

    // ── Fetch Data ────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!user?.company_id) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const url = `${API}?company_id=${user.company_id}&limit=500`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            setItems(data);
            
            // Calculate summary from all data
            const uniqueInvoices = new Set(data.map((item: SalesTrailItem) => item.invoice_number));
            const uniqueCustomers = new Set(data.map((item: SalesTrailItem) => item.customer_name));
            const totalAmount = data.reduce((sum: number, item: SalesTrailItem) => sum + item.total_amount, 0);
            const totalItems = data.reduce((sum: number, item: SalesTrailItem) => sum + item.quantity, 0);
            
            setSummary({
                totalInvoices: uniqueInvoices.size,
                totalAmount: totalAmount,
                totalItems: totalItems,
                uniqueCustomers: uniqueCustomers.size,
            });
            
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'Failed to load sales trail data',
            });
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id, toast]);

    useEffect(() => {
        if (user?.company_id) {
            fetchData();
        }
    }, [fetchData, user?.company_id]);

    // ── Filter Handlers ───────────────────────────────────────────────────────
    const setFilterField = (key: keyof FilterState, value: string) => {
        setFilter(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilter({
            invoice_number: '',
            customer_name: '',
            item_name: '',
            status: 'all',
            startDate: '',
            endDate: '',
        });
    };

    const hasActiveFilters = () => {
        return filter.invoice_number !== '' || 
               filter.customer_name !== '' || 
               filter.item_name !== '' || 
               filter.status !== 'all' || 
               filter.startDate !== '' || 
               filter.endDate !== '';
    };

    // ── Filter Bar Component ───────────────────────────────────────────────────
    const FilterBar = () => (
        <Card className="mb-4">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Filters</span>
                        {hasActiveFilters() && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                                <X className="h-3 w-3 mr-1" /> Clear all
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => exportToExcel(filteredItems, filter)}>
                            <Download className="h-4 w-4 mr-2" />
                            Export to Excel
                        </Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Invoice Number</Label>
                        <Input 
                            placeholder="Search invoice..." 
                            value={filter.invoice_number}
                            onChange={e => setFilterField('invoice_number', e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Customer Name</Label>
                        <Input 
                            placeholder="Search customer..." 
                            value={filter.customer_name}
                            onChange={e => setFilterField('customer_name', e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Item Name</Label>
                        <Input 
                            placeholder="Search item..." 
                            value={filter.item_name}
                            onChange={e => setFilterField('item_name', e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Status</Label>
                        <Select 
                            value={filter.status} 
                            onValueChange={v => setFilterField('status', v)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">From Date</Label>
                        <Input 
                            type="date" 
                            value={filter.startDate}
                            onChange={e => setFilterField('startDate', e.target.value)}
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">To Date</Label>
                        <Input 
                            type="date" 
                            value={filter.endDate}
                            onChange={e => setFilterField('endDate', e.target.value)}
                            className="h-9"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    // ── Summary Cards ──────────────────────────────────────────────────────────
    const SummaryCards = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Sales Value</p>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
                            ) : (
                                <p className="text-2xl font-bold text-blue-600 mt-1">
                                    {formatCurrency(filteredSummary.totalAmount)}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {filteredSummary.uniqueInvoices} invoice(s)
                            </p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-blue-200" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Items Sold</p>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
                            ) : (
                                <p className="text-2xl font-bold text-green-600 mt-1">
                                    {filteredSummary.totalItems.toLocaleString()}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Across all invoices
                            </p>
                        </div>
                        <FileText className="h-10 w-10 text-green-200" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Unique Customers</p>
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary mt-1" />
                            ) : (
                                <p className="text-2xl font-bold text-purple-600 mt-1">
                                    {filteredSummary.uniqueCustomers}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Active customers
                            </p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-purple-200" />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Date Range</p>
                            {filter.startDate || filter.endDate ? (
                                <>
                                    <p className="text-sm font-medium mt-1">
                                        {filter.startDate ? formatDate(filter.startDate) : 'All'} - {filter.endDate ? formatDate(filter.endDate) : 'Present'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Filtered view
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-medium mt-1">All Time</p>
                            )}
                        </div>
                        <Calendar className="h-10 w-10 text-orange-200" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-6 w-6 text-blue-500" />
                        Sales Trail
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Detailed transaction trail of all sales invoices and items
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                        <Filter className="mr-2 h-4 w-4" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            {showFilters && <FilterBar />}

            {/* Summary Cards */}
            <SummaryCards />

            {/* Main Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Sales Transaction Details
                        {hasActiveFilters() && filteredItems.length !== items.length && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                                ({filteredItems.length} of {items.length} items shown)
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-destructive text-center py-12">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p className="font-medium">Failed to load sales trail data</p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchData} className="mt-4">
                                Try Again
                            </Button>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
                            <p className="font-medium">No sales transactions found</p>
                            <p className="text-sm mt-1">
                                {items.length > 0 ? 'Try adjusting your filters.' : 'No sales data available.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Subtotal</TableHead>
                                        <TableHead className="text-right">Invoice Total</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item, index) => (
                                        <TableRow key={`${item.invoice_number}-${index}`}>
                                            <TableCell className="font-mono text-sm font-medium">
                                                {item.invoice_number}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {formatDate(item.invoice_date)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {item.customer_name}
                                            </TableCell>
                                            <TableCell>
                                                {item.item_name}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {item.quantity.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(item.unit_price)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {formatCurrency(item.line_subtotal)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold">
                                                {formatCurrency(item.total_amount)}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(item.status)}`}>
                                                    {getStatusText(item.status)}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Footer Summary */}
            {!isLoading && !error && filteredItems.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
                            <div className="text-muted-foreground">
                                Showing {filteredItems.length} line items
                                {hasActiveFilters() && items.length !== filteredItems.length && 
                                    ` (filtered from ${items.length} total)`
                                }
                            </div>
                            <div className="flex gap-6">
                                <div>
                                    <span className="text-muted-foreground">Total Sales:</span>
                                    <span className="font-bold ml-2 text-blue-600">
                                        {formatCurrency(filteredSummary.totalAmount)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Total Items:</span>
                                    <span className="font-bold ml-2 text-green-600">
                                        {filteredSummary.totalItems.toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Invoices:</span>
                                    <span className="font-bold ml-2">
                                        {filteredSummary.uniqueInvoices}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default SalesTrailPage;
