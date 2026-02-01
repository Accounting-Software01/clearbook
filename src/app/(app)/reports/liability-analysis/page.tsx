'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

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
  const [structuredLiabilities, setStructuredLiabilities] = useState<{
    current: Liability[];
    nonCurrent: Liability[];
  }>({ current: [], nonCurrent: [] });

  const fetchLiabilities = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://hariindustries.net/api/clearbook/liability-analysis.php?company_id=${user.company_id}`
      );
      const data = await res.json();

      if (res.ok && data.success) {
        const liabilitiesData: Liability[] = data.data || [];
        setLiabilities(liabilitiesData);

        // Classify liabilities — adjust prefixes based on YOUR actual chart of accounts
        // Common Nigerian patterns: 41xx = current liabilities, 42xx = non-current
        // If your system uses 20xx/21xx for current liabilities, change back to '20'/'21'
        const current = liabilitiesData.filter((l) => l.account_code.startsWith('41'));
        const nonCurrent = liabilitiesData.filter((l) => l.account_code.startsWith('42'));

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
    return liabilities.map((item) => ({
      name: item.account_name,
      value: item.balance,
    }));
  }, [liabilities]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    chartData.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  const currentTotal = structuredLiabilities.current.reduce((s, i) => s + i.balance, 0);
  const nonCurrentTotal = structuredLiabilities.nonCurrent.reduce((s, i) => s + i.balance, 0);

  // --- Render Logic ---
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading liability analysis...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-lg text-red-600">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-8 print:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liability Analysis</h1>
          <p className="text-muted-foreground mt-1">
            An organizational overview of outstanding liabilities.
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint} className="hide-on-print">
          Print Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Structure + Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organogram Card */}
          <Card>
            <CardHeader>
              <CardTitle>Liability Structure</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col items-center">
                {/* Total Liabilities */}
                <div className="bg-primary text-primary-foreground px-8 py-5 rounded-xl shadow-lg text-center min-w-[280px]">
                  <div className="text-lg font-semibold">Total Liabilities</div>
                  <div className="text-3xl font-black mt-1">
                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
                      totalLiability
                    )}
                  </div>
                </div>

                {/* Connector */}
                <div className="w-0.5 h-10 bg-border my-3" />

                {/* Current & Non-Current */}
                <div className="flex flex-col sm:flex-row w-full max-w-4xl justify-center gap-8 sm:gap-12">
                  {/* Current */}
                  <div className="flex-1 text-center">
                    <div className="inline-block bg-secondary border px-6 py-4 rounded-lg shadow min-w-[260px]">
                      <div className="font-semibold text-lg">Current Liabilities</div>
                      <div className="text-2xl font-bold mt-2">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
                          currentTotal
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Non-Current */}
                  <div className="flex-1 text-center">
                    <div className="inline-block bg-secondary border px-6 py-4 rounded-lg shadow min-w-[260px]">
                      <div className="font-semibold text-lg">Non-Current Liabilities</div>
                      <div className="text-2xl font-bold mt-2">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
                          nonCurrentTotal
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Breakdown */}
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
                        <TableCell className="font-medium">{item.account_name}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
                            item.balance
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                        No liabilities recorded at this time.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Right: Composition Pie */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Liability Composition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ChartContainer config={chartConfig}>
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={chartConfig[entry.name]?.color || '#8884d8'}
                        />
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

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .hide-on-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .shadow-lg,
          .shadow {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LiabilityAnalysisPage;