'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const manufacturingData = {
    '2025': {
        opening_stock_raw_materials: 50000,
        purchases: 410000,
        carriage_inwards: 40000,
        return_outwards: 65000,
        closing_stock_raw_materials: 62000,
        direct_labor: 210000,
        factory_overhead: {
            salaries: 170000,
            depreciation: 85000,
            plant_repairs: 28000,
            rent_and_rates: 12000,
            power: 14000,
            indirect_materials: 29000,
        },
    },
    '2024': {
        opening_stock_raw_materials: 47600,
        purchases: 392800,
        carriage_inwards: 38100,
        return_outwards: 62400,
        closing_stock_raw_materials: 60400,
        direct_labor: 202700,
        factory_overhead: {
            salaries: 164200,
            depreciation: 80000,
            plant_repairs: 27300,
            rent_and_rates: 11400,
            power: 13600,
            indirect_materials: 27700,
        },
    }
};

const calculateCosts = (data: typeof manufacturingData['2025']) => {
    const cost_of_raw_materials_consumed = data.opening_stock_raw_materials + data.purchases + data.carriage_inwards - data.return_outwards - data.closing_stock_raw_materials;
    const prime_cost = cost_of_raw_materials_consumed + data.direct_labor;
    const total_factory_overhead = Object.values(data.factory_overhead).reduce((acc, value) => acc + value, 0);
    const factory_production_cost = prime_cost + total_factory_overhead;
    return { cost_of_raw_materials_consumed, prime_cost, total_factory_overhead, factory_production_cost };
}

const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return '';
    return num.toLocaleString('en-US');
};

const ManufacturingAccountPage = () => {
    const [year, setYear] = useState<'2025' | '2024'>('2025');

    const reportData = manufacturingData[year];
    const calculatedCosts = calculateCosts(reportData);

    const previousYearData = manufacturingData[year === '2025' ? '2024' : '2025'];
    const previousYearCalculatedCosts = calculateCosts(previousYearData);

    return (
        <div className="container mx-auto p-4">
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle>Manufacturing Account</CardTitle>
                    <p className="text-muted-foreground">
                        Select a year to view the report.
                    </p>
                </CardHeader>
                <CardContent>
                    <Select value={year} onValueChange={(value) => setYear(value as '2025' | '2024')}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2024">2024</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Presentation of Manufacturing Account</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-2/4"></TableHead>
                                <TableHead className="text-right">{year} ($)</TableHead>
                                <TableHead className="text-right">{year === '2025' ? '2024' : '2025'} ($)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>Raw materials</TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="pl-8">Opening stock</TableCell>
                                <TableCell className="text-right">{formatNumber(reportData.opening_stock_raw_materials)}</TableCell>
                                <TableCell className="text-right">{formatNumber(previousYearData.opening_stock_raw_materials)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="pl-8">Purchases</TableCell>
                                <TableCell className="text-right">{formatNumber(reportData.purchases)}</TableCell>
                                <TableCell className="text-right">{formatNumber(previousYearData.purchases)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="pl-8">Add carriage inwards</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(reportData.carriage_inwards)}</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(previousYearData.carriage_inwards)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="pl-8">Less return outwards</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(reportData.return_outwards)}</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(previousYearData.return_outwards)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="pl-8">Raw materials available</TableCell>
                                <TableCell className="text-right">{formatNumber(reportData.opening_stock_raw_materials + reportData.purchases + reportData.carriage_inwards - reportData.return_outwards)}</TableCell>
                                <TableCell className="text-right">{formatNumber(previousYearData.opening_stock_raw_materials + previousYearData.purchases + previousYearData.carriage_inwards - previousYearData.return_outwards)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="pl-8">Less closing stock</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(reportData.closing_stock_raw_materials)}</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(previousYearData.closing_stock_raw_materials)}</TableCell>
                            </TableRow>
                            <TableRow className="font-bold">
                                <TableCell>Cost of raw materials used</TableCell>
                                <TableCell className="text-right">{formatNumber(calculatedCosts.cost_of_raw_materials_consumed)}</TableCell>
                                <TableCell className="text-right">{formatNumber(previousYearCalculatedCosts.cost_of_raw_materials_consumed)}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell>Direct labor</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(reportData.direct_labor)}</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(previousYearData.direct_labor)}</TableCell>
                            </TableRow>
                             <TableRow className="font-bold">
                                <TableCell>Prime cost</TableCell>
                                <TableCell className="text-right">{formatNumber(calculatedCosts.prime_cost)}</TableCell>
                                <TableCell className="text-right">{formatNumber(previousYearCalculatedCosts.prime_cost)}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>Factory overhead</TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                            {Object.entries(reportData.factory_overhead).map(([key, value]) => (
                                <TableRow key={key}>
                                    <TableCell className="pl-8">{key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}</TableCell>
                                    <TableCell className="text-right">{formatNumber(value)}</TableCell>
                                    <TableCell className="text-right">{formatNumber(previousYearData.factory_overhead[key as keyof typeof previousYearData.factory_overhead])}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow>
                                <TableCell>Total factory overhead</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right border-b">{formatNumber(calculatedCosts.total_factory_overhead)}</TableCell>
                                <TableCell className="text-right border-b">{formatNumber(previousYearCalculatedCosts.total_factory_overhead)}</TableCell>
                            </TableRow>
                            <TableRow className="font-bold text-lg">
                                <TableCell>Factory or production cost</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right">{formatNumber(calculatedCosts.factory_production_cost)}</TableCell>
                                <TableCell className="text-right">{formatNumber(previousYearCalculatedCosts.factory_production_cost)}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default ManufacturingAccountPage;
