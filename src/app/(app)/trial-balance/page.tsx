'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader,
  TableRow, TableFooter, TableCaption
} from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, CheckCircle, AlertCircle,
  RefreshCcw, FileSpreadsheet,
  FileText, Printer, Download,
  Calendar, Filter, ChevronDown,
  Building, ShieldCheck, BarChart3,
  Eye, EyeOff, Save, Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ====================================
// Types & Interfaces
// ====================================

interface Account {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

interface Section {
  section_name: string;
  accounts: Account[];
  total_debit: number;
  total_credit: number;
}

interface TrialBalanceReport {
  success: boolean;
  message?: string;
  company_name?: string;
  company_tin?: string;
  report_date: string;
  sections: { [key: string]: Section };
  grand_totals: {
    debit: number;
    credit: number;
    variance: number;
  };
}

interface ExportOptions {
  includeCompanyInfo: boolean;
  includeNotes: boolean;
  includeSignature: boolean;
  showZeroBalances: boolean;
  format: 'detailed' | 'summary';
}

// ====================================
// Constants
// ====================================

const SECTION_COLORS: Record<string, { bg: string; text: string }> = {
  'Asset': { bg: 'bg-blue-50', text: 'text-blue-800' },
  'Liability': { bg: 'bg-yellow-50', text: 'text-yellow-800' },
  'Equity': { bg: 'bg-green-50', text: 'text-green-800' },
  'Revenue': { bg: 'bg-purple-50', text: 'text-purple-800' },
  'COGS': { bg: 'bg-gray-50', text: 'text-gray-800' },
  'Expense': { bg: 'bg-red-50', text: 'text-red-800' },
};

const ACCOUNT_TYPES = [
  'All',
  'Asset',
  'Liability',
  'Equity',
  'Revenue',
  'COGS',
  'Expense'
];

// ====================================
// Utility Functions
// ====================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (date: Date): string => {
  return format(date, 'dd MMMM yyyy');
};

const getFiscalYear = (date: Date): string => {
  const year = date.getFullYear();
  return `FY ${year}/${year + 1}`;
};

// ====================================
// Export Functions
// ====================================

const generatePDF = async (
  report: TrialBalanceReport,
  startDate: Date,
  endDate: Date,
  options: ExportOptions,
  hideZeroBalances: boolean
) => {
  const doc = new jsPDF('landscape');
  
  // Add FIRS Header
  doc.setFillColor(10, 45, 85); // Dark blue background
  doc.rect(0, 0, 297, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FEDERAL INLAND REVENUE SERVICE', 148.5, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text('TRIAL BALANCE REPORT', 148.5, 18, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Company Information
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPANY INFORMATION', 20, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  yPos += 8;
  doc.text(`Company Name: ${report.company_name || 'Not Available'}`, 20, yPos);
  yPos += 6;
  doc.text(`TIN: ${report.company_tin || 'N/A'}`, 20, yPos);
  yPos += 6;
  doc.text(`Report Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 20, yPos);
  yPos += 6;
  doc.text(`Generated On: ${formatDate(new Date())}`, 20, yPos);
  
  // Report Summary
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT SUMMARY', 20, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Debit: ${formatCurrency(report.grand_totals.debit)}`, 20, yPos);
  yPos += 6;
  doc.text(`Total Credit: ${formatCurrency(report.grand_totals.credit)}`, 20, yPos);
  yPos += 6;
  doc.text(`Variance: ${formatCurrency(report.grand_totals.variance)}`, 20, yPos);
  yPos += 8;
  
  // Prepare table data
  const tableData: any[] = [];
  
  Object.entries(report.sections).forEach(([sectionName, section]) => {
    // Add section header
    tableData.push([
      { content: `${sectionName.toUpperCase()} SECTION`, colSpan: 4, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }
    ]);
    
    // Filter accounts based on zero balance setting
    const accounts = hideZeroBalances 
      ? section.accounts.filter(acc => acc.debit !== 0 || acc.credit !== 0)
      : section.accounts;
    
    accounts.forEach(account => {
      tableData.push([
        account.account_code,
        account.account_name,
        { content: formatCurrency(account.debit), styles: { halign: 'right' } },
        { content: formatCurrency(account.credit), styles: { halign: 'right' } }
      ]);
    });
    
    // Add section totals
    tableData.push([
      { content: `TOTAL ${sectionName.toUpperCase()}`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: formatCurrency(section.total_debit), styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatCurrency(section.total_credit), styles: { halign: 'right', fontStyle: 'bold' } }
    ]);
    
    // Add empty row for spacing
    tableData.push(['', '', '', '']);
  });
  
  // Add grand totals
  tableData.push([
    { content: 'GRAND TOTAL', colSpan: 2, styles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: formatCurrency(report.grand_totals.debit), styles: { halign: 'right', fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' } },
    { content: formatCurrency(report.grand_totals.credit), styles: { halign: 'right', fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' } }
  ]);
  
  // Generate table
  (doc as any).autoTable({
    startY: yPos,
    head: [['Account Code', 'Account Name', 'Debit Balance (₦)', 'Credit Balance (₦)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [10, 45, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });
  
  // Add footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This report is generated in compliance with FIRS regulations and accounting standards.', 148.5, finalY, { align: 'center' });
  
  if (options.includeSignature) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('_________________________', 100, finalY + 15);
    doc.text('Authorized Signature', 100, finalY + 20);
    doc.text('_________________________', 200, finalY + 15);
    doc.text('Date', 200, finalY + 20);
  }
  
  // Add page number
  doc.setFontSize(8);
  doc.text(`Page 1 of 1`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
  
  // Save PDF
  doc.save(`TrialBalance_${report.company_tin || 'Report'}_${formatDate(new Date())}.pdf`);
};

const generateExcel = (report: TrialBalanceReport, startDate: Date, endDate: Date) => {
  const wb = XLSX.utils.book_new();
  
  // Add metadata
  const metadata = [
    ['FEDERAL INLAND REVENUE SERVICE - TRIAL BALANCE REPORT'],
    [''],
    ['Company Name:', report.company_name || 'N/A'],
    ['Company TIN:', report.company_tin || 'N/A'],
    ['Report Period:', `${formatDate(startDate)} to ${formatDate(endDate)}`],
    ['Generated Date:', formatDate(new Date())],
    ['Report Status:', Math.abs(report.grand_totals.debit - report.grand_totals.credit) < 0.01 ? 'BALANCED' : 'NOT BALANCED'],
    ['']
  ];
  
  const wsMetadata = XLSX.utils.aoa_to_sheet(metadata);
  XLSX.utils.book_append_sheet(wb, wsMetadata, 'Report Info');
  
  // Create main data sheet
  const data: any[][] = [
    ['Account Code', 'Account Name', 'Section', 'Debit Balance', 'Credit Balance']
  ];
  
  Object.entries(report.sections).forEach(([sectionName, section]) => {
    section.accounts.forEach(account => {
      data.push([
        account.account_code,
        account.account_name,
        sectionName,
        account.debit,
        account.credit
      ]);
    });
  });
  
  // Add totals
  data.push(['', '', 'GRAND TOTAL', report.grand_totals.debit, report.grand_totals.credit]);
  
  const wsData = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, wsData, 'Trial Balance');
  
  // Save Excel file
  XLSX.writeFile(wb, `TrialBalance_${formatDate(new Date())}.xlsx`);
};

// ====================================
// Main Component
// ====================================

export default function TrialBalancePage() {
  const { user } = useAuth();
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [hideZeroBalances, setHideZeroBalances] = useState<boolean>(true);
  const [filterAccountType, setFilterAccountType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCompanyInfo: true,
    includeNotes: true,
    includeSignature: true,
    showZeroBalances: false,
    format: 'detailed'
  });

  // Fetch Report
  const fetchReport = async () => {
    if (!user?.company_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = new URL('https://hariindustries.net/api/clearbook/balancetrial.php');
      url.searchParams.set('company_id', user.company_id);
      url.searchParams.set('fromDate', format(startDate, 'yyyy-MM-dd'));
      url.searchParams.set('toDate', format(endDate, 'yyyy-MM-dd'));
      
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const data: TrialBalanceReport = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to generate trial balance');
      }
      
      // Calculate variance
      if (data.grand_totals) {
        data.grand_totals.variance = Math.abs(data.grand_totals.debit - data.grand_totals.credit);
      }
      
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      console.error('Error fetching trial balance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [user]);

  const handleExportPDF = () => {
    if (!report) return;
    generatePDF(report, startDate, endDate, exportOptions, hideZeroBalances);
  };

  const handleExportExcel = () => {
    if (!report) return;
    generateExcel(report, startDate, endDate);
  };

  const handlePrint = () => {
    window.print();
  };

  const isBalanced = report 
    ? Math.abs(report.grand_totals.debit - report.grand_totals.credit) < 0.01
    : false;

  const filteredSections = report 
    ? Object.entries(report.sections).filter(([sectionName]) => {
        if (filterAccountType === 'All') return true;
        return sectionName === filterAccountType;
      })
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700">Loading Trial Balance</h2>
          <p className="text-sm text-gray-500 mt-2">Preparing financial report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <h3 className="font-semibold text-red-800">Report Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
          <Button 
            onClick={fetchReport} 
            className="mt-4 w-full"
            variant="outline"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Retry Loading Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-primary" />
                Trial Balance Report
              </h1>
              <p className="text-gray-600 mt-1">
                Comprehensive overview of all ledger account balances
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={isBalanced ? "success" : "destructive"} className="px-3 py-1">
                {isBalanced ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {isBalanced ? 'Balanced' : 'Not Balanced'}
              </Badge>
              {report?.company_tin && (
                <Badge variant="outline" className="px-3 py-1">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  TIN: {report.company_tin}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Fiscal Year: {getFiscalYear(endDate)}</span>
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-2" />
            <span>Generated: {formatDate(new Date())}</span>
          </div>
        </div>

        {/* Controls Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Report Controls
            </CardTitle>
            <CardDescription>
              Customize your trial balance report parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <DatePicker 
                  date={startDate} 
                  setDate={setStartDate}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <DatePicker 
                  date={endDate} 
                  setDate={setEndDate}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Select value={filterAccountType} onValueChange={setFilterAccountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search">Search Accounts</Label>
                <Input
                  placeholder="Search by account name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hide-zero" 
                    checked={hideZeroBalances}
                    onCheckedChange={(checked) => setHideZeroBalances(checked as boolean)}
                  />
                  <Label htmlFor="hide-zero" className="text-sm">
                    {hideZeroBalances ? (
                      <span className="flex items-center">
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Zero Balances
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Show Zero Balances
                      </span>
                    )}
                  </Label>
                </div>
                
                <Button 
                  onClick={fetchReport}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleExportPDF}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Export FIRS PDF
                </Button>
                <Button 
                  onClick={handleExportExcel}
                  variant="outline"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button 
                  onClick={handlePrint}
                  variant="ghost"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Debit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {report ? formatCurrency(report.grand_totals.debit) : '₦0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Sum of all debit balances</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {report ? formatCurrency(report.grand_totals.credit) : '₦0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Sum of all credit balances</div>
            </CardContent>
          </Card>
          
          <Card className={isBalanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Balance Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isBalanced ? 'text-green-700' : 'text-red-600'}`}>
                {report ? formatCurrency(report.grand_totals.variance) : '₦0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {isBalanced ? 'Perfectly balanced ledger' : 'Requires reconciliation'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Period Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  {report?.company_name || user?.company_id || 'Company'} - Trial Balance
                </h3>
                <p className="text-sm text-blue-700">
                  Period: {formatDate(startDate)} to {formatDate(endDate)}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setExportOptions({...exportOptions, format: 'detailed'})}
              variant="ghost" 
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>

        {/* Main Report Table */}
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 hover:bg-gray-100">
                    <TableHead className="w-[120px] font-semibold">Account Code</TableHead>
                    <TableHead className="font-semibold">Account Name</TableHead>
                    <TableHead className="text-right font-semibold w-[180px]">Debit Balance</TableHead>
                    <TableHead className="text-right font-semibold w-[180px]">Credit Balance</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {filteredSections.map(([sectionName, section]) => {
                    // Filter accounts based on search and zero balance settings
                    const filteredAccounts = section.accounts.filter(account => {
                      const matchesSearch = searchQuery === '' || 
                        account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        account.account_code.toLowerCase().includes(searchQuery.toLowerCase());
                      
                      const showAccount = hideZeroBalances 
                        ? account.debit !== 0 || account.credit !== 0
                        : true;
                      
                      return matchesSearch && showAccount;
                    });
                    
                    if (filteredAccounts.length === 0) return null;
                    
                    return (
                      <React.Fragment key={sectionName}>
                        {/* Section Header */}
                        <TableRow className={SECTION_COLORS[sectionName]?.bg || 'bg-gray-100'}>
                          <TableCell colSpan={4} className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <ChevronDown className="h-4 w-4 mr-2" />
                                <span className={`font-bold uppercase ${SECTION_COLORS[sectionName]?.text || 'text-gray-800'}`}>
                                  {sectionName === 'COGS' ? 'COST OF GOODS SOLD' : sectionName} SECTION
                                </span>
                              </div>
                              <div className="text-sm font-medium">
                                <span className="text-green-700 mr-4">
                                  Debit: {formatCurrency(section.total_debit)}
                                </span>
                                <span className="text-red-600">
                                  Credit: {formatCurrency(section.total_credit)}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Account Rows */}
                        {filteredAccounts.map((account) => (
                          <TableRow key={`${sectionName}-${account.account_code}`} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {account.account_code}
                            </TableCell>
                            <TableCell>{account.account_name}</TableCell>
                            <TableCell className={`text-right font-medium ${account.debit > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                              {formatCurrency(account.debit)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${account.credit > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                              {formatCurrency(account.credit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
                
                <TableFooter className="bg-gray-900">
                  <TableRow>
                    <TableCell colSpan={2} className="text-white font-bold py-4">
                      GRAND TOTAL
                    </TableCell>
                    <TableCell className="text-right text-white font-bold py-4">
                      {report ? formatCurrency(report.grand_totals.debit) : '₦0.00'}
                    </TableCell>
                    <TableCell className="text-right text-white font-bold py-4">
                      {report ? formatCurrency(report.grand_totals.credit) : '₦0.00'}
                    </TableCell>
                  </TableRow>
                </TableFooter>
                
                <TableCaption className="bg-gray-50 p-4">
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-gray-600">
                      Total Accounts: {report ? Object.values(report.sections).reduce((sum, section) => sum + section.accounts.length, 0) : 0}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                        <span className="text-gray-600">Debit Balances</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                        <span className="text-gray-600">Credit Balances</span>
                      </div>
                    </div>
                  </div>
                </TableCaption>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Export Settings */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Export Settings</CardTitle>
            <CardDescription>
              Configure FIRS-compliant export options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="company-info" 
                    checked={exportOptions.includeCompanyInfo}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeCompanyInfo: checked as boolean})
                    }
                  />
                  <Label htmlFor="company-info">Include Company Information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="notes" 
                    checked={exportOptions.includeNotes}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeNotes: checked as boolean})
                    }
                  />
                  <Label htmlFor="notes">Include Compliance Notes</Label>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="signature" 
                    checked={exportOptions.includeSignature}
                    onCheckedChange={(checked) => 
                      setExportOptions({...exportOptions, includeSignature: checked as boolean})
                    }
                  />
                  <Label htmlFor="signature">Include Signature Fields</Label>
                </div>
                <Select 
                  value={exportOptions.format} 
                  onValueChange={(value: 'detailed' | 'summary') => 
                    setExportOptions({...exportOptions, format: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Detailed Report</SelectItem>
                    <SelectItem value="summary">Summary Format</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}