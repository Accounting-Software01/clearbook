'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingDown, Landmark, Clock, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// --- Type Definitions ---
type Liability = {
    account_code: string;
    account_name: string;
    balance: number;
};

type StructuredLiabilities = {
    current: Liability[];
    nonCurrent: Liability[];
};

// --- Helpers ---
const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

const COLORS = ['#639922', '#3B6D11', '#97C459', '#B4B2A9', '#5F5E5A'];

// --- Sub-components ---

const MetricCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div className="bg-muted/50 rounded-md p-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-medium mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
);

const OrgConnector = () => (
    <svg className="w-full overflow-visible" height="36" viewBox="0 0 400 36" preserveAspectRatio="xMidYMid meet">
        <line x1="200" y1="0" x2="200" y2="18" stroke="currentColor" strokeWidth="1" className="text-border" />
        <line x1="100" y1="18" x2="300" y2="18" stroke="currentColor" strokeWidth="1" className="text-border" />
        <line x1="100" y1="18" x2="100" y2="36" stroke="currentColor" strokeWidth="1" className="text-border" />
        <line x1="300" y1="18" x2="300" y2="36" stroke="currentColor" strokeWidth="1" className="text-border" />
    </svg>
);

// --- Main Page Component ---
const LiabilityAnalysisPage = () => {
    const { user } = useAuth();
    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [structured, setStructured] = useState<StructuredLiabilities>({ current: [], nonCurrent: [] });

    const fetchLiabilities = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `https://hariindustries.net/api/clearbook/liability-analysis.php?company_id=${user.company_id}`
            );
            const data = await res.json();

            if (res.ok && data.success) {
                const raw: Liability[] = data.data;
                setLiabilities(raw);

                // Numeric range classification — robust against code prefix variations
                const current = raw.filter(l => {
                    const code = parseInt(l.account_code);
                    return code >= 200000 && code < 220000;
                });
                const nonCurrent = raw.filter(l => {
                    const code = parseInt(l.account_code);
                    return code >= 220000 && code < 300000;
                });
                setStructured({ current, nonCurrent });
            } else {
                setError(data.message || 'Failed to fetch liability data.');
            }
        } catch {
            setError('A network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchLiabilities();
    }, [fetchLiabilities]);

    const totalLiability = useMemo(
        () => liabilities.reduce((sum, item) => sum + item.balance, 0),
        [liabilities]
    );

    const currentTotal = useMemo(
        () => structured.current.reduce((s, i) => s + i.balance, 0),
        [structured.current]
    );

    const nonCurrentTotal = useMemo(
        () => structured.nonCurrent.reduce((s, i) => s + i.balance, 0),
        [structured.nonCurrent]
    );

    const chartData = useMemo(
        () => liabilities.map(item => ({ name: item.account_name, value: item.balance })),
        [liabilities]
    );

    const currentRatioPct = totalLiability > 0
        ? Math.round((currentTotal / totalLiability) * 100)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-green-700" />
                <span>Loading liability analysis...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center gap-3 p-4 text-red-600 bg-red-50 rounded-md m-6">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                    <p className="font-medium text-sm">Failed to load data</p>
                    <p className="text-sm">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLiabilities} className="ml-auto">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Liability Analysis</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Organizational overview of outstanding liabilities
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[11px] bg-green-50 text-green-800 rounded-full px-2.5 py-0.5 mt-2 font-medium">
                        
                    </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="hide-on-print">
                    Print Report
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left: Organogram + Table */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Organogram card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                Liability Structure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-0 pb-6">
                            {/* Total box */}
                            <div className="bg-green-700 text-white rounded-md px-8 py-3 text-center shadow-sm">
                                <p className="text-[10px] uppercase tracking-widest opacity-80 font-medium">Total Liabilities</p>
                                <p className="text-xl font-semibold mt-0.5">{fmt(totalLiability)}</p>
                            </div>

                            {/* SVG Connectors */}
                            <OrgConnector />

                            {/* Current / Non-Current branches */}
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="border-t-2 border-green-600 bg-muted/40 rounded-md px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <Clock className="h-3 w-3 text-green-700" />
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                                            Current Liabilities
                                        </p>
                                    </div>
                                    <p className="text-lg font-semibold">{fmt(currentTotal)}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {structured.current.length} account{structured.current.length !== 1 ? 's' : ''} · due &lt; 12 months
                                    </p>
                                </div>
                                <div className="border-t-2 border-border bg-muted/40 rounded-md px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mb-1">
                                        <Landmark className="h-3 w-3 text-muted-foreground" />
                                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                                            Non-Current Liabilities
                                        </p>
                                    </div>
                                    <p className="text-lg font-semibold">{fmt(nonCurrentTotal)}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {structured.nonCurrent.length === 0
                                            ? 'No accounts recorded'
                                            : `${structured.nonCurrent.length} account(s)`}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed breakdown table */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                Detailed Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px] text-xs">Code</TableHead>
                                        <TableHead className="text-xs">Account Name</TableHead>
                                        <TableHead className="text-right text-xs">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Current Liabilities Section */}
                                    <TableRow className="bg-green-50/60 hover:bg-green-50/60">
                                        <TableCell colSpan={3} className="text-[11px] uppercase tracking-wide text-green-800 font-semibold py-2 px-4">
                                            Current Liabilities
                                        </TableCell>
                                    </TableRow>
                                    {structured.current.length > 0 ? (
                                        structured.current.map(item => (
                                            <TableRow key={item.account_code}>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{item.account_code}</TableCell>
                                                <TableCell className="text-sm">{item.account_name}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{fmt(item.balance)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-sm text-muted-foreground italic py-4">
                                                No current liabilities found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow className="bg-muted/30">
                                        <TableCell colSpan={2} className="text-xs text-muted-foreground font-medium py-2 px-4">Current subtotal</TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold py-2">{fmt(currentTotal)}</TableCell>
                                    </TableRow>

                                    {/* Non-Current Liabilities Section */}
                                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                                        <TableCell colSpan={3} className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold py-2 px-4">
                                            Non-Current Liabilities
                                        </TableCell>
                                    </TableRow>
                                    {structured.nonCurrent.length > 0 ? (
                                        structured.nonCurrent.map(item => (
                                            <TableRow key={item.account_code}>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{item.account_code}</TableCell>
                                                <TableCell className="text-sm">{item.account_name}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">{fmt(item.balance)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-sm text-muted-foreground italic py-4">
                                                No non-current liabilities recorded
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow className="bg-muted/30">
                                        <TableCell colSpan={2} className="text-xs text-muted-foreground font-medium py-2 px-4">Non-current subtotal</TableCell>
                                        <TableCell className="text-right font-mono text-xs font-semibold py-2">{fmt(nonCurrentTotal)}</TableCell>
                                    </TableRow>

                                    {/* Grand Total */}
                                    <TableRow className="bg-green-50 hover:bg-green-50">
                                        <TableCell colSpan={2} className="font-semibold text-green-800 text-sm py-3 px-4">Total Liabilities</TableCell>
                                        <TableCell className="text-right font-mono text-sm font-semibold text-green-800 py-3">{fmt(totalLiability)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Chart + Metrics */}
                <div className="space-y-5">

                    {/* Donut chart */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                Liability Composition
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 1 ? (
                                <div className="h-[220px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Tooltip
                                                formatter={(value: number) => [fmt(value), '']}
                                                contentStyle={{ fontSize: 12, borderRadius: 6 }}
                                            />
                                            <Pie
                                                data={chartData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={80}
                                                paddingAngle={3}
                                            >
                                                {chartData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend
                                                iconType="square"
                                                iconSize={8}
                                                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : chartData.length === 1 ? (
                                /* Single-account donut with legend */
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative w-36 h-36">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={60} paddingAngle={0}>
                                                    <Cell fill="#639922" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[10px] text-muted-foreground">Total</span>
                                            <span className="text-sm font-semibold">₦75</span>
                                        </div>
                                    </div>
                                    <div className="w-full border-t pt-3 space-y-2">
                                        {chartData.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                                <span className="flex-1 truncate">{item.name}</span>
                                                <span className="font-medium text-foreground">100%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground gap-2">
                                    <TrendingDown className="h-6 w-6 opacity-30" />
                                    <span>No liability data to display</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary metrics */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                                Summary Metrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3">
                            <MetricCard
                                label="Total Accounts"
                                value={`${liabilities.length}`}
                                sub="liability accounts"
                            />
                            <MetricCard
                                label="Current Ratio"
                                value={`${currentRatioPct}%`}
                                sub="of total is current"
                            />
                            <MetricCard
                                label="Tax Payable"
                                value={fmt(structured.current.find(l => l.account_code.startsWith('2014'))?.balance ?? 0)}
                                sub="VAT output"
                            />
                            <MetricCard
                                label="Long-term Debt"
                                value={fmt(nonCurrentTotal)}
                                sub={nonCurrentTotal === 0 ? 'none recorded' : `${structured.nonCurrent.length} account(s)`}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .hide-on-print { display: none !important; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

export default LiabilityAnalysisPage;