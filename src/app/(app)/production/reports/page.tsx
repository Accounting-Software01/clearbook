'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from 'lucide-react';

// --- Type Definitions ---
interface ManufacturingData {
    opening_stock_raw_materials: number;
    purchases: number;
    carriage_inwards: number;
    return_outwards: number;
    closing_stock_raw_materials: number;
    direct_labor: number;
    factory_overhead: {
        salaries: number;
        depreciation: number;
        plant_repairs: number;
        rent_and_rates: number;
        power: number;
        indirect_materials: number;
    };
}

// --- Helper Functions ---
const calculateCosts = (data?: ManufacturingData) => {
    if (!data) {
        return { cost_of_raw_materials_consumed: 0, prime_cost: 0, total_factory_overhead: 0, factory_production_cost: 0 };
    }
    const cost_of_raw_materials_consumed = data.opening_stock_raw_materials + data.purchases + data.carriage_inwards - data.return_outwards - data.closing_stock_raw_materials;
    const prime_cost = cost_of_raw_materials_consumed + data.direct_labor;
    const total_factory_overhead = Object.values(data.factory_overhead).reduce((acc, value) => acc + value, 0);
    const factory_production_cost = prime_cost + total_factory_overhead;
    return { cost_of_raw_materials_consumed, prime_cost, total_factory_overhead, factory_production_cost };
}

const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// --- Main Page Component ---
const ManufacturingAccountPage = () => {
    const { user } = useAuth();
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    
    // State for API data
    const [reportData, setReportData] = useState<ManufacturingData | null>(null);
    const [previousYearData, setPreviousYearData] = useState<ManufacturingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReportData = useCallback(async (selectedYear: string) => {
        if (!user?.company_id) return;
        setLoading(true);
        setError(null);

        const currentYear = parseInt(selectedYear, 10);
        const prevYear = currentYear - 1;

        try {
            // Fetch data for both years concurrently
            const [currentYearRes, prevYearRes] = await Promise.all([
                fetch(`https://hariindustries.net/api/clearbook/manufacturing-report.php?company_id=${user.company_id}&year=${currentYear}`),
                fetch(`https://hariindustries.net/api/clearbook/manufacturing-report.php?company_id=${user.company_id}&year=${prevYear}`)
            ]);

            const currentYearResult = await currentYearRes.json();
            const prevYearResult = await prevYearRes.json();

            if (currentYearResult.success) {
                setReportData(currentYearResult.data);
            } else {
                throw new Error(currentYearResult.message || `Failed to fetch data for ${currentYear}`);
            }

            if (prevYearResult.success) {
                setPreviousYearData(prevYearResult.data);
            } else {
                // It's not a critical error if previous year fails, so we just set it to null
                setPreviousYearData(null); 
                console.warn(prevYearResult.message || `Could not fetch data for previous year ${prevYear}`);
            }

        } catch (err: any) {
            setError(err.message);
            setReportData(null);
            setPreviousYearData(null);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchReportData(year);
    }, [year, fetchReportData]);
    
    // --- Calculated Costs ---
    const calculatedCosts = calculateCosts(reportData!);
    const previousYearCalculatedCosts = calculateCosts(previousYearData!);
    const prevYearLabel = (parseInt(year, 10) - 1).toString();

    // --- Render Logic ---
    return (
        <div className="container mx-auto p-4">
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle>Manufacturing Account</CardTitle>
                    <CardDescription>Select a year to view the manufacturing report.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2023">2023</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>
            
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-4 text-muted-foreground">Loading report data...</span>
                </div>
            )}
            
            {error && (
                <Card className="border-destructive">
                    <CardHeader><CardTitle className="text-destructive">Error</CardTitle></CardHeader>
                    <CardContent className="flex items-center">
                        <AlertCircle className="h-8 w-8 text-destructive mr-4" />
                        <p>{error}</p>
                    </CardContent>
                </Card>
            )}

            {!loading && !error && reportData && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Presentation of Manufacturing Account</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-2/4"></TableHead>
                                    <TableHead className="text-right">{year} (NGN)</TableHead>
                                    <TableHead className="text-right">{prevYearLabel} (NGN)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow><TableCell className='font-semibold'>Raw materials</TableCell><TableCell></TableCell><TableCell></TableCell></TableRow>
                                <TableRow><TableCell className="pl-8">Opening stock</TableCell><TableCell className="text-right">{formatNumber(reportData.opening_stock_raw_materials)}</TableCell><TableCell className="text-right">{formatNumber(previousYearData?.opening_stock_raw_materials)}</TableCell></TableRow>
                                <TableRow><TableCell className="pl-8">Purchases</TableCell><TableCell className="text-right">{formatNumber(reportData.purchases)}</TableCell><TableCell className="text-right">{formatNumber(previousYearData?.purchases)}</TableCell></TableRow>
                                <TableRow><TableCell className="pl-8">Add carriage inwards</TableCell><TableCell className="text-right border-b">{formatNumber(reportData.carriage_inwards)}</TableCell><TableCell className="text-right border-b">{formatNumber(previousYearData?.carriage_inwards)}</TableCell></TableRow>
                                <TableRow><TableCell className="pl-8">Less return outwards</TableCell><TableCell className="text-right border-b">{formatNumber(reportData.return_outwards)}</TableCell><TableCell className="text-right border-b">{formatNumber(previousYearData?.return_outwards)}</TableCell></TableRow>
                                <TableRow>
                                    <TableCell className="pl-8">Raw materials available</TableCell>
                                    <TableCell className="text-right">{formatNumber(reportData.opening_stock_raw_materials + reportData.purchases + reportData.carriage_inwards - reportData.return_outwards)}</TableCell>
                                    <TableCell className="text-right">{formatNumber((previousYearData?.opening_stock_raw_materials ?? 0) + (previousYearData?.purchases ?? 0) + (previousYearData?.carriage_inwards ?? 0) - (previousYearData?.return_outwards ?? 0))}</TableCell>
                                </TableRow>
                                <TableRow><TableCell className="pl-8">Less closing stock</TableCell><TableCell className="text-right border-b">{formatNumber(reportData.closing_stock_raw_materials)}</TableCell><TableCell className="text-right border-b">{formatNumber(previousYearData?.closing_stock_raw_materials)}</TableCell></TableRow>
                                <TableRow className="font-bold"><TableCell>Cost of raw materials used</TableCell><TableCell className="text-right">{formatNumber(calculatedCosts.cost_of_raw_materials_consumed)}</TableCell><TableCell className="text-right">{formatNumber(previousYearCalculatedCosts.cost_of_raw_materials_consumed)}</TableCell></TableRow>
                                <TableRow><TableCell>Direct labor</TableCell><TableCell className="text-right border-b">{formatNumber(reportData.direct_labor)}</TableCell><TableCell className="text-right border-b">{formatNumber(previousYearData?.direct_labor)}</TableCell></TableRow>
                                <TableRow className="font-bold"><TableCell>Prime cost</TableCell><TableCell className="text-right">{formatNumber(calculatedCosts.prime_cost)}</TableCell><TableCell className="text-right">{formatNumber(previousYearCalculatedCosts.prime_cost)}</TableCell></TableRow>
                                
                                <TableRow><TableCell className='font-semibold pt-4'>Factory overhead</TableCell><TableCell></TableCell><TableCell></TableCell></TableRow>
                                {Object.entries(reportData.factory_overhead).map(([key, value]) => (
                                    <TableRow key={key}>
                                        <TableCell className="pl-8">{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</TableCell>
                                        <TableCell className="text-right">{formatNumber(value)}</TableCell>
                                        <TableCell className="text-right">{formatNumber(previousYearData?.factory_overhead[key as keyof typeof reportData.factory_overhead])}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell className='pl-8 font-semibold'>Total factory overhead</TableCell>
                                    <TableCell className="text-right border-b">{formatNumber(calculatedCosts.total_factory_overhead)}</TableCell>
                                    <TableCell className="text-right border-b">{formatNumber(previousYearCalculatedCosts.total_factory_overhead)}</TableCell>
                                </TableRow>

                                <TableRow className="font-extrabold text-lg bg-secondary/50">
                                    <TableCell>Factory or Production Cost</TableCell>
                                    <TableCell className="text-right">{formatNumber(calculatedCosts.factory_production_cost)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(previousYearCalculatedCosts.factory_production_cost)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ManufacturingAccountPage;
