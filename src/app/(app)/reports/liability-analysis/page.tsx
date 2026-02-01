'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";


// --- Type Definitions ---
type Liability = {
    account_code: string;
    account_name: string;
    balance: number;
};

// --- Main Page Component ---
const LiabilityAnalysisPage = () => {
    const { user } = useAuth();
    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalLiability, setTotalLiability] = useState(0);
    const [structuredLiabilities, setStructuredLiabilities] = useState<{ current: Liability[], nonCurrent: Liability[] }>({ current: [], nonCurrent: [] });


    const fetchLiabilities = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`https://hariindustries.net/api/clearbook/liability-analysis.php?company_id=${user.company_id}`);
            const data = await res.json();

            if (res.ok && data.success) {
                const liabilitiesData: Liability[] = data.data;
                setLiabilities(liabilitiesData);

                // --- NEW: Structure the data for the organogram ---
                const current = liabilitiesData.filter(l => l.account_code.startsWith('21'));
                const nonCurrent = liabilitiesData.filter(l => l.account_code.startsWith('22'));
                setStructuredLiabilities({ current, nonCurrent });

                const total = liabilitiesData.reduce((sum, item) => sum + item.balance, 0);
                setTotalLiability(total);
            } else {
                setError(data.message || 'Failed to fetch liability data.');
            }
        } catch (err) {
            setError('A network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiabilities();
    }, [user]);

    const handlePrint = () => {
        window.print();
    };
    const chartData = useMemo(() => {
        return liabilities.map(item => ({
            name: item.account_name,
            value: item.balance,
        }));
    }, [liabilities]);

    const chartConfig = useMemo(() => {
        const config = {};
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
        chartData.forEach((item, index) => {
            config[item.name] = {
                label: item.name,
                color: COLORS[index % COLORS.length],
            };
        });
        return config;
    }, [chartData]);


    // --- Render Logic ---
    if (loading) {
        return <div className="p-4">Loading liability analysis...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* --- Header --- */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Liability Analysis</h1>
                    <p className="text-muted-foreground">An organizational overview of outstanding liabilities.</p>
                </div>
                <Button variant="outline" onClick={handlePrint} className="hide-on-print">Print Report</Button>
            </div>

            {/* --- Organogram and Chart Layout --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Organogram */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Liability Structure</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="text-center">
                                {/* Top Level: Total Liabilities */}
                                <div className="inline-block bg-primary text-primary-foreground p-4 rounded-lg shadow-md">
                                    <div className="font-bold text-lg">Total Liabilities</div>
                                    <div className="text-2xl font-black">
                                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(totalLiability)}
                                    </div>
                                </div>
                                
                                {/* Connecting Lines */}
                                <div className="flex justify-center mt-4">
                                    <div className="w-px h-8 bg-border"></div>
                                </div>
                                <div className="w-1/2 mx-auto h-px bg-border"></div>
                                
                                {/* Second Level: Current & Non-Current */}
                                <div className="flex justify-around mt-4 space-x-4">
                                    {/* Current Liabilities */}
                                    <div className="flex-1 text-center">
                                        <div className="w-full h-px bg-border"></div>
                                        <div className="w-px h-4 bg-border mx-auto"></div>
                                        <div className="inline-block bg-secondary p-3 rounded-md border w-full">
                                            <div className="font-semibold">Current Liabilities</div>
                                            <div className="text-xl font-bold">
                                                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(structuredLiabilities.current.reduce((s, i) => s + i.balance, 0))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Non-Current Liabilities */}
                                    <div className="flex-1 text-center">
                                        <div className="w-full h-px bg-border"></div>
                                        <div className="w-px h-4 bg-border mx-auto"></div>
                                        <div className="inline-block bg-secondary p-3 rounded-md border w-full">
                                            <div className="font-semibold">Non-Current Liabilities</div>
                                            <div className="text-xl font-bold">
                                                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(structuredLiabilities.nonCurrent.reduce((s, i) => s + i.balance, 0))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- Detailed Table --- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Account Name</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {liabilities.length > 0 ? (
                                        liabilities.map((item) => (
                                            <TableRow key={item.account_code}>
                                                <TableCell>{item.account_name}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(item.balance)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={2} className="text-center">No liabilities found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Pie Chart */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Liability Composition</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <ChartContainer config={chartConfig}>
                                    <PieChart>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color} />
                                            ))}
                                        </Pie>
                                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                                    </PieChart>
                                </ChartContainer>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
             <style jsx global>{`
                @media print {
                    .hide-on-print { display: none; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );

};

export default LiabilityAnalysisPage;
