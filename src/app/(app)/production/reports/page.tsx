'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableCaption,
  TableFooter as UITableFooter
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Package,
  Factory,
  Truck,
  Users,
  BarChart3,
  FileText,
  Download,
  Calendar,
  Calculator,
  TrendingUpIcon,
  TrendingDownIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Type Definitions (Expanded) ---
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
    // NEW FIELDS for the complete cycle
    opening_stock_wip: number;
    closing_stock_wip: number;
    opening_stock_finished_goods: number;
    closing_stock_finished_goods: number;
}

interface CalculatedCosts {
    cost_of_raw_materials_consumed: number;
    prime_cost: number;
    total_factory_overhead: number;
    factory_production_cost: number;
    cost_of_goods_manufactured: number;
    cost_of_goods_sold: number;
}

// --- Helper Functions (Enhanced) ---
const calculateCosts = (data?: ManufacturingData): CalculatedCosts => {
    if (!data) {
        return { 
            cost_of_raw_materials_consumed: 0, 
            prime_cost: 0, 
            total_factory_overhead: 0, 
            factory_production_cost: 0, 
            cost_of_goods_manufactured: 0, 
            cost_of_goods_sold: 0 
        };
    }
    
    const cost_of_raw_materials_consumed = data.opening_stock_raw_materials + 
        data.purchases + 
        data.carriage_inwards - 
        data.return_outwards - 
        data.closing_stock_raw_materials;
    
    const prime_cost = cost_of_raw_materials_consumed + data.direct_labor;
    const total_factory_overhead = Object.values(data.factory_overhead).reduce((acc, value) => acc + value, 0);
    const factory_production_cost = prime_cost + total_factory_overhead;
    const cost_of_goods_manufactured = factory_production_cost + data.opening_stock_wip - data.closing_stock_wip;
    const cost_of_goods_sold = cost_of_goods_manufactured + data.opening_stock_finished_goods - data.closing_stock_finished_goods;
    
    return { 
        cost_of_raw_materials_consumed, 
        prime_cost, 
        total_factory_overhead, 
        factory_production_cost, 
        cost_of_goods_manufactured, 
        cost_of_goods_sold 
    };
};

const formatCurrency = (num: number | null | undefined, currency: string = 'NGN') => {
    if (num === null || num === undefined || isNaN(num)) return `0.00`;
    
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    const formatted = formatter.format(Math.abs(num));
    const prefix = num < 0 ? `-` : '';
    
    return `${prefix}${currency} ${formatted}`;
};

const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00';
    
    const formatted = new Intl.NumberFormat('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(Math.abs(num));
    
    return num < 0 ? `(${formatted})` : formatted;
};

const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
};

const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    return null;
};

const getTrendColor = (change: number, reverseLogic: boolean = false) => {
    if (reverseLogic) {
        return change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-muted-foreground";
    }
    return change > 0 ? "text-red-600" : change < 0 ? "text-green-600" : "text-muted-foreground";
};

// --- Main Page Component ---
const ManufacturingAccountPage = () => {
    const { user } = useAuth();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState<string>(currentYear.toString());
    const [reportData, setReportData] = useState<ManufacturingData | null>(null);
    const [previousYearData, setPreviousYearData] = useState<ManufacturingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPercentages, setShowPercentages] = useState(true);
    const [activeTab, setActiveTab] = useState("statement");

    const fetchReportData = useCallback(async (selectedYear: string) => {
        if (!user?.company_id) return;
        setLoading(true);
        setError(null);

        const currentYear = parseInt(selectedYear, 10);
        const prevYear = currentYear - 1;

        try {
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

    const calculatedCosts = useMemo(() => calculateCosts(reportData), [reportData]);
    const previousYearCalculatedCosts = useMemo(() => calculateCosts(previousYearData), [previousYearData]);
    
    const prevYearLabel = (parseInt(year, 10) - 1).toString();
    const currentYearLabel = year;

    // Calculate percentage changes for key metrics
    const keyMetrics = useMemo(() => {
        if (!reportData || !previousYearData) return [];
        
        return [
            {
                label: "Cost of Goods Sold",
                current: calculatedCosts.cost_of_goods_sold,
                previous: previousYearCalculatedCosts.cost_of_goods_sold,
                icon: <DollarSign className="h-4 w-4" />,
                color: "bg-red-50 border-red-200"
            },
            {
                label: "Cost of Goods Manufactured",
                current: calculatedCosts.cost_of_goods_manufactured,
                previous: previousYearCalculatedCosts.cost_of_goods_manufactured,
                icon: <Factory className="h-4 w-4" />,
                color: "bg-blue-50 border-blue-200"
            },
            {
                label: "Prime Cost",
                current: calculatedCosts.prime_cost,
                previous: previousYearCalculatedCosts.prime_cost,
                icon: <Calculator className="h-4 w-4" />,
                color: "bg-green-50 border-green-200"
            },
            {
                label: "Factory Overhead",
                current: calculatedCosts.total_factory_overhead,
                previous: previousYearCalculatedCosts.total_factory_overhead,
                icon: <Package className="h-4 w-4" />,
                color: "bg-purple-50 border-purple-200"
            }
        ];
    }, [calculatedCosts, previousYearCalculatedCosts, reportData, previousYearData]);

    const factoryOverheadItems = useMemo(() => {
        if (!reportData) return [];
        return Object.entries(reportData.factory_overhead).map(([key, value]) => ({
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            value,
            previous: previousYearData?.factory_overhead[key as keyof typeof reportData.factory_overhead] || 0
        }));
    }, [reportData, previousYearData]);

    const exportToCSV = () => {
        if (!reportData || !calculatedCosts) return;
        
        const headers = [
            'Category',
            `${currentYearLabel} Amount (NGN)`,
            `${prevYearLabel} Amount (NGN)`,
            'Change %'
        ];
        
        const rows = [
            ['Opening Stock - Raw Materials', reportData.opening_stock_raw_materials, previousYearData?.opening_stock_raw_materials || 0],
            ['Purchases', reportData.purchases, previousYearData?.purchases || 0],
            ['Carriage Inwards', reportData.carriage_inwards, previousYearData?.carriage_inwards || 0],
            ['Return Outwards', reportData.return_outwards, previousYearData?.return_outwards || 0],
            ['Closing Stock - Raw Materials', reportData.closing_stock_raw_materials, previousYearData?.closing_stock_raw_materials || 0],
            ['Cost of Raw Materials Consumed', calculatedCosts.cost_of_raw_materials_consumed, previousYearCalculatedCosts.cost_of_raw_materials_consumed],
            ['Direct Labor', reportData.direct_labor, previousYearData?.direct_labor || 0],
            ['Prime Cost', calculatedCosts.prime_cost, previousYearCalculatedCosts.prime_cost],
            ...factoryOverheadItems.map(item => [item.name, item.value, item.previous]),
            ['Total Factory Overhead', calculatedCosts.total_factory_overhead, previousYearCalculatedCosts.total_factory_overhead],
            ['Factory Production Cost', calculatedCosts.factory_production_cost, previousYearCalculatedCosts.factory_production_cost],
            ['Opening WIP', reportData.opening_stock_wip, previousYearData?.opening_stock_wip || 0],
            ['Closing WIP', reportData.closing_stock_wip, previousYearData?.closing_stock_wip || 0],
            ['Cost of Goods Manufactured', calculatedCosts.cost_of_goods_manufactured, previousYearCalculatedCosts.cost_of_goods_manufactured],
            ['Opening Finished Goods', reportData.opening_stock_finished_goods, previousYearData?.opening_stock_finished_goods || 0],
            ['Closing Finished Goods', reportData.closing_stock_finished_goods, previousYearData?.closing_stock_finished_goods || 0],
            ['Cost of Goods Sold', calculatedCosts.cost_of_goods_sold, previousYearCalculatedCosts.cost_of_goods_sold]
        ];
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `manufacturing-report-${year}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getPercentageChangeCell = (current: number, previous: number | null | undefined) => {
        if (!showPercentages || previous === null || previous === undefined || previous === 0) return null;
        
        const change = calculatePercentageChange(current, previous);
        if (isNaN(change)) return null;
        
        return (
            <TableCell className="text-right">
                <Badge 
                    variant={Math.abs(change) < 5 ? "outline" : change > 0 ? "destructive" : "success"}
                    className="text-xs"
                >
                    {getTrendIcon(change)}
                    <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
                </Badge>
            </TableCell>
        );
    };

    if (loading) {
        return (
            <div className="container mx-auto p-4">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center h-96">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-medium">Loading Manufacturing Report</p>
                        <p className="text-sm text-muted-foreground mt-2">Fetching production cost data for {year}...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manufacturing Cost Report</h1>
                    <p className="text-muted-foreground mt-1">
                        Complete production cost analysis from raw materials to cost of goods sold
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPercentages(!showPercentages)}
                    >
                        {showPercentages ? (
                            <EyeOff className="h-4 w-4 mr-2" />
                        ) : (
                            <Eye className="h-4 w-4 mr-2" />
                        )}
                        {showPercentages ? "Hide Changes" : "Show Changes"}
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToCSV}
                        disabled={!reportData}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Year Selection Card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Report Period</CardTitle>
                    <CardDescription>Select financial year for manufacturing cost analysis</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select a year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Comparing with</span>
                            <Badge variant="outline">{prevYearLabel}</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <Card className="border-destructive">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-destructive flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            Error Loading Report
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{error}</p>
                        <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => fetchReportData(year)}
                        >
                            <Loader2 className="h-4 w-4 mr-2" />
                            Retry Loading Data
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!error && reportData && (
                <>
                    {/* Key Metrics Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {keyMetrics.map((metric, index) => {
                            const change = calculatePercentageChange(metric.current, metric.previous);
                            const changeText = change > 0 ? "increase" : change < 0 ? "decrease" : "no change";
                            const changeColor = getTrendColor(change, metric.label.includes("Cost"));
                            
                            return (
                                <Card key={index} className={`${metric.color} border`}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-medium">
                                                {metric.label}
                                            </CardTitle>
                                            <div className={changeColor}>
                                                {getTrendIcon(change)}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(metric.current)}
                                        </div>
                                        <div className="flex items-center mt-2">
                                            <div className={`text-sm ${changeColor}`}>
                                                {change !== 0 && (
                                                    <>
                                                        {change > 0 ? "+" : ""}{change.toFixed(1)}% 
                                                        <span className="text-muted-foreground ml-1">
                                                            from {prevYearLabel}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="mt-3">
                                                        <Progress 
                                                            value={Math.min(100, (metric.current / (metric.previous * 1.5)) * 100)} 
                                                            className="h-2"
                                                        />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{metric.current.toLocaleString()} vs {metric.previous.toLocaleString()} in {prevYearLabel}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Tabs for Different Views */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2">
                            <TabsTrigger value="statement">
                                <FileText className="h-4 w-4 mr-2" />
                                Cost Statement
                            </TabsTrigger>
                            <TabsTrigger value="overhead">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Overhead Analysis
                            </TabsTrigger>
                        </TabsList>

                        {/* Cost Statement Tab */}
                        <TabsContent value="statement">
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div>
                                            <CardTitle>Statement of Production Cost</CardTitle>
                                            <CardDescription>
                                                Detailed breakdown of manufacturing costs for {year}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="w-fit">
                                            COGS: {formatCurrency(calculatedCosts.cost_of_goods_sold)}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[45%]">Cost Component</TableHead>
                                                    <TableHead className="text-right w-[25%]">
                                                        {currentYearLabel} (NGN)
                                                    </TableHead>
                                                    <TableHead className="text-right w-[25%]">
                                                        {prevYearLabel} (NGN)
                                                    </TableHead>
                                                    {showPercentages && (
                                                        <TableHead className="text-right w-[5%]">Change</TableHead>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {/* Raw Materials Section */}
                                                <TableRow className="bg-muted/30">
                                                    <TableCell colSpan={showPercentages ? 4 : 3} className="font-bold text-base">
                                                        Raw Materials
                                                    </TableCell>
                                                </TableRow>
                                                
                                                {[
                                                    { label: "Opening Stock", current: reportData.opening_stock_raw_materials, previous: previousYearData?.opening_stock_raw_materials },
                                                    { label: "Purchases", current: reportData.purchases, previous: previousYearData?.purchases },
                                                    { label: "Add: Carriage Inwards", current: reportData.carriage_inwards, previous: previousYearData?.carriage_inwards },
                                                    { label: "Less: Return Outwards", current: reportData.return_outwards, previous: previousYearData?.return_outwards, negative: true },
                                                    { label: "Less: Closing Stock", current: reportData.closing_stock_raw_materials, previous: previousYearData?.closing_stock_raw_materials, negative: true }
                                                ].map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className={`pl-8 ${item.negative ? 'text-red-600' : ''}`}>
                                                            {item.label}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(item.current)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {formatCurrency(item.previous || 0)}
                                                        </TableCell>
                                                        {showPercentages && getPercentageChangeCell(item.current, item.previous)}
                                                    </TableRow>
                                                ))}

                                                <TableRow className="font-bold bg-muted/10">
                                                    <TableCell>Cost of Raw Materials Consumed</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="font-bold">{formatCurrency(calculatedCosts.cost_of_raw_materials_consumed)}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        {formatCurrency(previousYearCalculatedCosts.cost_of_raw_materials_consumed)}
                                                    </TableCell>
                                                    {showPercentages && getPercentageChangeCell(
                                                        calculatedCosts.cost_of_raw_materials_consumed,
                                                        previousYearCalculatedCosts.cost_of_raw_materials_consumed
                                                    )}
                                                </TableRow>

                                                {/* Direct Labor */}
                                                <TableRow>
                                                    <TableCell className="font-medium">Direct Labor</TableCell>
                                                    <TableCell className="text-right border-b">
                                                        {formatCurrency(reportData.direct_labor)}
                                                    </TableCell>
                                                    <TableCell className="text-right border-b text-muted-foreground">
                                                        {formatCurrency(previousYearData?.direct_labor || 0)}
                                                    </TableCell>
                                                    {showPercentages && getPercentageChangeCell(
                                                        reportData.direct_labor,
                                                        previousYearData?.direct_labor
                                                    )}
                                                </TableRow>

                                                {/* Prime Cost */}
                                                <TableRow className="font-bold bg-green-50 border-green-200">
                                                    <TableCell className="text-green-700">Prime Cost</TableCell>
                                                    <TableCell className="text-right text-green-700">
                                                        {formatCurrency(calculatedCosts.prime_cost)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-green-600">
                                                        {formatCurrency(previousYearCalculatedCosts.prime_cost)}
                                                    </TableCell>
                                                    {showPercentages && getPercentageChangeCell(
                                                        calculatedCosts.prime_cost,
                                                        previousYearCalculatedCosts.prime_cost
                                                    )}
                                                </TableRow>

                                                {/* Factory Overhead Section */}
                                                <TableRow className="bg-muted/30">
                                                    <TableCell colSpan={showPercentages ? 4 : 3} className="font-bold text-base pt-4">
                                                        Factory Overheads
                                                    </TableCell>
                                                </TableRow>

                                                {factoryOverheadItems.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="pl-8">{item.name}</TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCurrency(item.value)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {formatCurrency(item.previous)}
                                                        </TableCell>
                                                        {showPercentages && getPercentageChangeCell(item.value, item.previous)}
                                                    </TableRow>
                                                ))}

                                                <TableRow>
                                                    <TableCell className="pl-8 font-semibold">Total Factory Overheads</TableCell>
                                                    <TableCell className="text-right border-b">
                                                        {formatCurrency(calculatedCosts.total_factory_overhead)}
                                                    </TableCell>
                                                    <TableCell className="text-right border-b text-muted-foreground">
                                                        {formatCurrency(previousYearCalculatedCosts.total_factory_overhead)}
                                                    </TableCell>
                                                    {showPercentages && getPercentageChangeCell(
                                                        calculatedCosts.total_factory_overhead,
                                                        previousYearCalculatedCosts.total_factory_overhead
                                                    )}
                                                </TableRow>

                                                {/* Factory Production Cost */}
                                                <TableRow className="font-bold bg-blue-50 border-blue-200">
                                                    <TableCell className="text-blue-700">Factory / Production Cost</TableCell>
                                                    <TableCell className="text-right text-blue-700">
                                                        {formatCurrency(calculatedCosts.factory_production_cost)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-blue-600">
                                                        {formatCurrency(previousYearCalculatedCosts.factory_production_cost)}
                                                    </TableCell>
                                                    {showPercentages && getPercentageChangeCell(
                                                        calculatedCosts.factory_production_cost,
                                                        previousYearCalculatedCosts.factory_production_cost
                                                    )}
                                                </TableRow>

                                                {/* WIP & COGM Section */}
                                                <TableRow className="bg-muted/30">
                                                    <TableCell colSpan={showPercentages ? 4 : 3} className="font-bold text-base pt-4">
                                                        Work-in-Progress Adjustment
                                                    </TableCell>
                                                </TableRow>

                                                {[
                                                    { label: "Add: Opening Work-in-Progress", current: reportData.opening_stock_wip, previous: previousYearData?.opening_stock_wip },
                                                    { label: "Less: Closing Work-in-Progress", current: reportData.closing_stock_wip, previous: previousYearData?.closing_stock_wip, negative: true }
                                                ].map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className={`pl-8 ${item.negative ? 'text-red-600' : ''}`}>
                                                            {item.label}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCurrency(item.current)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {formatCurrency(item.previous || 0)}
                                                        </TableCell>
                                                        {showPercentages && getPercentageChangeCell(item.current, item.previous)}
                                                    </TableRow>
                                                ))}

                                                <TableRow className="font-bold bg-purple-50 border-purple-200 text-lg">
                                                    <TableCell className="text-purple-700">Cost of Goods Manufactured</TableCell>
                                                    <TableCell className="text-right text-purple-700">
                                                        {formatCurrency(calculatedCosts.cost_of_goods_manufactured)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-purple-600">
                                                        {formatCurrency(previousYearCalculatedCosts.cost_of_goods_manufactured)}
                                                    </TableCell>
                                                    {showPercentages && getPercentageChangeCell(
                                                        calculatedCosts.cost_of_goods_manufactured,
                                                        previousYearCalculatedCosts.cost_of_goods_manufactured
                                                    )}
                                                </TableRow>

                                                {/* Finished Goods & COGS Section */}
                                                <TableRow className="bg-muted/30">
                                                    <TableCell colSpan={showPercentages ? 4 : 3} className="font-bold text-base pt-4">
                                                        Finished Goods Adjustment
                                                    </TableCell>
                                                </TableRow>

                                                {[
                                                    { label: "Add: Opening Finished Goods", current: reportData.opening_stock_finished_goods, previous: previousYearData?.opening_stock_finished_goods },
                                                    { label: "Less: Closing Finished Goods", current: reportData.closing_stock_finished_goods, previous: previousYearData?.closing_stock_finished_goods, negative: true }
                                                ].map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell className={`pl-8 ${item.negative ? 'text-red-600' : ''}`}>
                                                            {item.label}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCurrency(item.current)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            {formatCurrency(item.previous || 0)}
                                                        </TableCell>
                                                        {showPercentages && getPercentageChangeCell(item.current, item.previous)}
                                                    </TableRow>
                                                ))}

                                                <TableRow className="font-bold bg-red-50 border-red-200 text-xl">
                                                    <TableCell className="text-red-700">Cost of Goods Sold (COGS)</TableCell>
                                                    <TableCell className="text-right text-red-700">
                                                        {formatCurrency(calculatedCosts.cost_of_goods_sold)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-600">
                                                        {formatCurrency(previousYearCalculatedCosts.cost_of_goods_sold)}
                                                    </TableCell>
                                                    {showPercentages && getPercentageChangeCell(
                                                        calculatedCosts.cost_of_goods_sold,
                                                        previousYearCalculatedCosts.cost_of_goods_sold
                                                    )}
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                                <CardFooter className="text-sm text-muted-foreground">
                                    <p>Report generated on {new Date().toLocaleDateString()}</p>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        {/* Overhead Analysis Tab */}
                        <TabsContent value="overhead">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Factory Overhead Analysis</CardTitle>
                                    <CardDescription>
                                        Breakdown of factory overhead costs for {year}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-lg">Overhead Distribution</h3>
                                            <div className="space-y-3">
                                                {factoryOverheadItems.map((item, index) => {
                                                    const percentage = (item.value / calculatedCosts.total_factory_overhead) * 100;
                                                    const change = calculatePercentageChange(item.value, item.previous);
                                                    
                                                    return (
                                                        <div key={index} className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium">{item.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold">{formatCurrency(item.value)}</span>
                                                                    {change !== 0 && (
                                                                        <Badge 
                                                                            variant={Math.abs(change) < 10 ? "outline" : change > 0 ? "destructive" : "success"}
                                                                            className="text-xs"
                                                                        >
                                                                            {change > 0 ? "+" : ""}{change.toFixed(1)}%
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Progress value={percentage} className="h-2" />
                                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                                <span>{percentage.toFixed(1)}% of total</span>
                                                                <span>Prev: {formatCurrency(item.previous)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-lg">Cost Insights</h3>
                                            <Card>
                                                <CardContent className="pt-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">Total Factory Overhead:</span>
                                                            <span className="font-bold text-lg">
                                                                {formatCurrency(calculatedCosts.total_factory_overhead)}
                                                            </span>
                                                        </div>
                                                        <Separator />
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span>As % of Prime Cost:</span>
                                                                <span className="font-medium">
                                                                    {((calculatedCosts.total_factory_overhead / calculatedCosts.prime_cost) * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>As % of COGS:</span>
                                                                <span className="font-medium">
                                                                    {((calculatedCosts.total_factory_overhead / calculatedCosts.cost_of_goods_sold) * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-sm">Top Overhead Items</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        {[...factoryOverheadItems]
                                                            .sort((a, b) => b.value - a.value)
                                                            .slice(0, 3)
                                                            .map((item, index) => (
                                                                <div key={index} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`h-3 w-3 rounded-full ${
                                                                            index === 0 ? 'bg-red-500' : 
                                                                            index === 1 ? 'bg-orange-500' : 
                                                                            'bg-yellow-500'
                                                                        }`} />
                                                                        <span>{item.name}</span>
                                                                    </div>
                                                                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
};

export default ManufacturingAccountPage;