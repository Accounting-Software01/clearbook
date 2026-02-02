'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  Loader2, AlertCircle, CheckCircle, PiggyBank, Landmark, Users,
  Download, Printer, FileText, FileSpreadsheet, Search, Eye, EyeOff,
  RefreshCw, Calendar, Clock, Shield, TrendingUp, TrendingDown,
  BarChart3, Calculator, Building, CreditCard, Banknote,
  ChevronDown, ChevronUp, Copy, Filter, Settings, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// ====================================
// Interfaces
// ====================================

interface ReportAccount {
  id: string;
  name: string;
  balance: number;
}

interface ReportSubGroup {
  accounts: ReportAccount[];
  total: number;
}

interface ReportSection {
  subGroups: Record<string, ReportSubGroup>;
  total: number;
}

interface ProcessedData {
  assets: ReportSection;
  liabilities: ReportSection;
  equity: ReportSection;
  totalLiabilitiesAndEquity: number;
  company_name?: string;
  company_tin?: string;
  generated_at?: string;
}

// ====================================
// Constants
// ====================================

const SECTION_CONFIG = {
  'ASSETS': { 
    color: 'blue', 
    icon: <PiggyBank className="h-5 w-5" />,
    description: 'What the company owns'
  },
  'LIABILITIES': { 
    color: 'yellow', 
    icon: <Landmark className="h-5 w-5" />,
    description: 'What the company owes'
  },
  'EQUITY': { 
    color: 'green', 
    icon: <Users className="h-5 w-5" />,
    description: 'Owner\'s stake in the company'
  }
} as const;

// ====================================
// Utility Functions
// ====================================

const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '-';
  
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
};

const formatDisplayCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) return '-';
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
  
  return amount < 0 ? `(${formatted})` : formatted;
};

const getSectionColor = (section: keyof typeof SECTION_CONFIG): string => {
  const config = SECTION_CONFIG[section];
  if (!config) return 'bg-gray-100 text-gray-800';
  
  const colors = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    green: 'bg-green-50 text-green-800 border-green-200',
  };
  
  return colors[config.color] || colors.blue;
};

// ====================================
// Export Functions
// ====================================

const generatePDFReport = (
  data: ProcessedData,
  reportDate: Date,
  companyName?: string
) => {
  const doc = new jsPDF('portrait');
  
  // Add professional header
  doc.setFillColor(10, 45, 85);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE SHEET', 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Statement of Financial Position', 105, 22, { align: 'center' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  
  // Company and period information
  let yPos = 35;
  doc.text(`Company: ${companyName || data.company_name || 'Not Available'}`, 20, yPos);
  doc.text(`As of: ${format(reportDate, 'dd MMMM yyyy')}`, 150, yPos);
  yPos += 6;
  doc.text(`TIN: ${data.company_tin || 'N/A'}`, 20, yPos);
  doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 150, yPos);
  
  // Summary section
  yPos += 10;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, 170, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL POSITION', 30, yPos + 8);
  doc.setFont('helvetica', 'normal');
  
  const isBalanced = Math.abs(data.assets.total - data.totalLiabilitiesAndEquity) < 0.01;
  
  yPos += 25;
  doc.text(`Status: ${isBalanced ? 'BALANCED' : 'NOT BALANCED'}`, 30, yPos);
  doc.text(`Total Assets: ${formatCurrency(data.assets.total)}`, 30, yPos + 6);
  doc.text(`Total Liabilities & Equity: ${formatCurrency(data.totalLiabilitiesAndEquity)}`, 30, yPos + 12);
  
  // Prepare table data
  yPos += 25;
  const tableData: any[] = [];
  
  // Process each section
  Object.entries({
    'ASSETS': data.assets,
    'LIABILITIES': data.liabilities,
    'EQUITY': data.equity
  }).forEach(([sectionName, section]) => {
    // Section header
    tableData.push([
      { 
        content: sectionName, 
        colSpan: 2, 
        styles: { 
          fillColor: [220, 220, 220], 
          fontStyle: 'bold',
          textColor: [0, 0, 0]
        } 
      }
    ]);
    
    // Subgroups and accounts
    Object.entries(section.subGroups).forEach(([subGroupName, subGroup]) => {
      // Subgroup header
      tableData.push([
        { content: subGroupName, styles: { fontStyle: 'bold' } },
        ''
      ]);
      
      // Accounts
      subGroup.accounts.forEach(account => {
        tableData.push([
          `  ${account.name}`,
          { content: formatCurrency(account.balance), styles: { halign: 'right' } }
        ]);
      });
      
      // Subgroup total
      tableData.push([
        { content: `Total ${subGroupName}`, styles: { fontStyle: 'bold' } },
        { content: formatCurrency(subGroup.total), styles: { halign: 'right', fontStyle: 'bold' } }
      ]);
      
      // Spacer
      tableData.push(['', '']);
    });
    
    // Section total
    tableData.push([
      { content: `TOTAL ${sectionName}`, styles: { fillColor: [200, 200, 200], fontStyle: 'bold' } },
      { content: formatCurrency(section.total), styles: { halign: 'right', fillColor: [200, 200, 200], fontStyle: 'bold' } }
    ]);
    
    // Spacer between sections
    tableData.push(['', '']);
  });
  
  // Grand comparison
  tableData.push([
    { content: 'TOTAL ASSETS', colSpan: 1, styles: { fontStyle: 'bold' } },
    { content: formatCurrency(data.assets.total), styles: { halign: 'right', fontStyle: 'bold' } }
  ]);
  
  tableData.push([
    { content: 'TOTAL LIABILITIES & EQUITY', colSpan: 1, styles: { fontStyle: 'bold' } },
    { content: formatCurrency(data.totalLiabilitiesAndEquity), styles: { halign: 'right', fontStyle: 'bold' } }
  ]);
  
  // Generate table
  (doc as any).autoTable({
    startY: yPos,
    head: [['Account', 'Amount (₦)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [10, 45, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' }
    }
  });
  
  // Add footer
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This balance sheet is prepared in accordance with accounting standards.', 105, finalY, { align: 'center' });
  
  // Add page number
  doc.text(`Page 1 of 1`, 190, doc.internal.pageSize.height - 10, { align: 'right' });
  
  // Save PDF
  doc.save(`BalanceSheet_${format(reportDate, 'yyyyMMdd')}.pdf`);
};

const generateExcelReport = (data: ProcessedData, reportDate: Date) => {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['BALANCE SHEET'],
    [''],
    ['Company:', data.company_name || 'N/A'],
    ['TIN:', data.company_tin || 'N/A'],
    ['As of Date:', format(reportDate, 'dd MMMM yyyy')],
    ['Generated:', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
    [''],
    ['FINANCIAL POSITION'],
    ['Total Assets:', data.assets.total],
    ['Total Liabilities:', data.liabilities.total],
    ['Total Equity:', data.equity.total],
    ['Total Liabilities & Equity:', data.totalLiabilitiesAndEquity],
    ['Balance Status:', Math.abs(data.assets.total - data.totalLiabilitiesAndEquity) < 0.01 ? 'BALANCED' : 'NOT BALANCED'],
    ['']
  ];
  
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  
  // Detailed sheet
  const detailedData: any[][] = [
    ['Section', 'Sub Group', 'Account', 'Balance (₦)']
  ];
  
  const processSection = (sectionName: string, section: ReportSection) => {
    Object.entries(section.subGroups).forEach(([subGroupName, subGroup]) => {
      subGroup.accounts.forEach(account => {
        detailedData.push([
          sectionName,
          subGroupName,
          account.name,
          account.balance
        ]);
      });
      detailedData.push([
        sectionName,
        subGroupName,
        `Total ${subGroupName}`,
        subGroup.total
      ]);
      detailedData.push(['', '', '', '']); // Empty row
    });
    detailedData.push([
      sectionName,
      '',
      `TOTAL ${sectionName}`,
      section.total
    ]);
    detailedData.push(['', '', '', '']); // Empty row
  };
  
  processSection('ASSETS', data.assets);
  processSection('LIABILITIES', data.liabilities);
  processSection('EQUITY', data.equity);
  
  const wsDetails = XLSX.utils.aoa_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Balance Sheet');
  
  // Save Excel file
  XLSX.writeFile(wb, `BalanceSheet_${format(reportDate, 'yyyyMMdd')}.xlsx`);
};

// ====================================
// Main Component
// ====================================

const BalanceSheetPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State Management
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [reportDate, setReportDate] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroBalances, setShowZeroBalances] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'ASSETS': true,
    'LIABILITIES': true,
    'EQUITY': true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState({
    includeCompanyInfo: true,
    includeNotes: true,
    includeSignature: false,
    format: 'detailed' as 'detailed' | 'summary'
  });

  // Fetch Data
  const generateReport = useCallback(async () => {
    if (!reportDate) {
      toast({ 
        title: "Date Required", 
        description: "Please select a date for the report.", 
        variant: 'destructive' 
      });
      return;
    }
    
    if (!user?.company_id) {
      toast({ 
        title: "Authentication Required", 
        description: "Please wait while we load your company information.", 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const toDate = format(reportDate, 'yyyy-MM-dd');
      const url = new URL('https://hariindustries.net/api/clearbook/balance-sheet.php');
      url.searchParams.append('company_id', user.company_id);
      url.searchParams.append('toDate', toDate);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success && data.processedData) {
        setProcessedData({
          ...data.processedData,
          company_name: data.company_name,
          company_tin: data.company_tin,
          generated_at: data.generated_at
        });
        
        if (Object.keys(data.processedData.assets.subGroups).length === 0) {
          toast({
            title: "No Data Available",
            description: "The balance sheet is empty for the selected date.",
            variant: 'default'
          });
        } else {
          toast({
            title: "Report Generated",
            description: "Balance sheet has been successfully generated.",
          });
        }
      } else {
        throw new Error(data.message || "Invalid data format received from server.");
      }
    } catch (e: any) {
      const errorMessage = `Failed to load data: ${e.message}`;
      setError(errorMessage);
      toast({ 
        title: "Error Generating Report", 
        description: e.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportDate, user, toast]);

  // Auto-generate report on mount
  useEffect(() => {
    if (user?.company_id) {
      generateReport();
    }
  }, [user, generateReport]);

  // Calculate balance status
  const isBalanced = useMemo(() => {
    if (!processedData) return false;
    return Math.abs(processedData.assets.total - processedData.totalLiabilitiesAndEquity) < 0.01;
  }, [processedData]);

  // Calculate financial ratios
  const financialRatios = useMemo(() => {
    if (!processedData) return null;
    
    const { assets, liabilities, equity } = processedData;
    
    return {
      debtToEquity: liabilities.total / equity.total,
      currentRatio: 1.5, // This would need current assets/liabilities data
      equityRatio: equity.total / assets.total,
      debtRatio: liabilities.total / assets.total
    };
  }, [processedData]);

  // Handle exports
  const handleExportPDF = () => {
    if (!processedData) {
      toast({ 
        title: "No Data to Export", 
        variant: "destructive" 
      });
      return;
    }
    generatePDFReport(processedData, reportDate, user?.company_name);
  };

  const handleExportExcel = () => {
    if (!processedData) {
      toast({ 
        title: "No Data to Export", 
        variant: "destructive" 
      });
      return;
    }
    generateExcelReport(processedData, reportDate);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !processedData) return;
    
    const isBalanced = Math.abs(processedData.assets.total - processedData.totalLiabilitiesAndEquity) < 0.01;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Balance Sheet</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #1e40af; margin-bottom: 5px; }
          .company-info { margin-bottom: 20px; }
          .summary { 
            background: ${isBalanced ? '#d1fae5' : '#fee2e2'}; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px; 
            display: flex; 
            justify-content: space-between;
          }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #d1d5db; }
          td { padding: 8px; border: 1px solid #d1d5db; }
          .section-header { font-weight: bold; }
          .assets { background: #dbeafe; }
          .liabilities { background: #fef3c7; }
          .equity { background: #d1fae5; }
          .debit { color: #059669; text-align: right; }
          .credit { color: #dc2626; text-align: right; }
          .total-row { background: #1f2937; color: white; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
          @media print {
            .no-print { display: none; }
            body { margin: 0; }
            .header { margin-top: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Balance Sheet</h1>
          <p>As of: ${format(reportDate, 'MMMM dd, yyyy')}</p>
          <p>Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}</p>
        </div>
        
        <div class="company-info">
          <p><strong>Company:</strong> ${user?.company_name || user?.company_id || 'N/A'}</p>
        </div>
        
        <div class="summary">
          <span>
            ${isBalanced ? '✓ BALANCED' : '✗ NOT BALANCED'}
          </span>
          <span>
            Assets: ${formatDisplayCurrency(processedData.assets.total)} | 
            Liab. & Equity: ${formatDisplayCurrency(processedData.totalLiabilitiesAndEquity)}
          </span>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th style="text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries({
              'ASSETS': processedData.assets,
              'LIABILITIES': processedData.liabilities,
              'EQUITY': processedData.equity
            }).map(([sectionName, section]) => {
              let sectionClass = '';
              switch(sectionName) {
                case 'ASSETS': sectionClass = 'assets'; break;
                case 'LIABILITIES': sectionClass = 'liabilities'; break;
                case 'EQUITY': sectionClass = 'equity'; break;
              }
              
              return `
                <tr class="${sectionClass} section-header">
                  <td colspan="2">${sectionName}</td>
                </tr>
                ${Object.entries(section.subGroups).map(([subGroupName, subGroup]) => `
                  <tr class="${sectionClass}">
                    <td colspan="2" style="padding-left: 20px;"><strong>${subGroupName}</strong></td>
                  </tr>
                  ${subGroup.accounts.map(account => `
                    <tr>
                      <td style="padding-left: 40px;">${account.name}</td>
                      <td style="text-align: right;">${formatDisplayCurrency(account.balance)}</td>
                    </tr>
                  `).join('')}
                  <tr>
                    <td style="padding-left: 20px; font-weight: bold;">Total ${subGroupName}</td>
                    <td style="text-align: right; font-weight: bold;">${formatDisplayCurrency(subGroup.total)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>TOTAL ${sectionName}</td>
                  <td style="text-align: right;">${formatDisplayCurrency(section.total)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td>TOTAL LIABILITIES AND EQUITY</td>
              <td style="text-align: right;">${formatDisplayCurrency(processedData.totalLiabilitiesAndEquity)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>This report was generated by ClearBooks Accounting System</p>
          <p>${format(new Date(), 'MMMM dd, yyyy HH:mm:ss')}</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #1e40af; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print Report
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; margin-left: 10px; background: #6b7280; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Close Window
          </button>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter accounts based on search and zero balance settings
  const filteredData = useMemo(() => {
    if (!processedData) return null;

    const filterAccounts = (accounts: ReportAccount[]) => {
      return accounts.filter(account => {
        const matchesSearch = searchTerm === '' || 
          account.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const showAccount = showZeroBalances || account.balance !== 0;
        
        return matchesSearch && showAccount;
      });
    };

    return {
      assets: {
        ...processedData.assets,
        subGroups: Object.fromEntries(
          Object.entries(processedData.assets.subGroups).map(([key, subGroup]) => [
            key,
            {
              ...subGroup,
              accounts: filterAccounts(subGroup.accounts)
            }
          ])
        )
      },
      liabilities: {
        ...processedData.liabilities,
        subGroups: Object.fromEntries(
          Object.entries(processedData.liabilities.subGroups).map(([key, subGroup]) => [
            key,
            {
              ...subGroup,
              accounts: filterAccounts(subGroup.accounts)
            }
          ])
        )
      },
      equity: {
        ...processedData.equity,
        subGroups: Object.fromEntries(
          Object.entries(processedData.equity.subGroups).map(([key, subGroup]) => [
            key,
            {
              ...subGroup,
              accounts: filterAccounts(subGroup.accounts)
            }
          ])
        )
      },
      totalLiabilitiesAndEquity: processedData.totalLiabilitiesAndEquity
    };
  }, [processedData, searchTerm, showZeroBalances]);

  // Render section component
  const renderSection = (title: keyof typeof SECTION_CONFIG, section: ReportSection) => {
    const config = SECTION_CONFIG[title];
    const isExpanded = expandedSections[title];
    
    return (
      <React.Fragment>
        {/* Section Header */}
        <TableRow 
          className={`${getSectionColor(title)} cursor-pointer hover:opacity-90`}
          onClick={() => toggleSection(title)}
        >
          <TableCell colSpan={2} className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.icon}
                <div>
                  <span className="font-bold text-lg">{title}</span>
                  <div className="text-sm font-normal">{config.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-xl">
                    {formatCurrency(section.total)}
                  </div>
                  <div className="text-sm font-normal">
                    {Object.keys(section.subGroups).length} sub-groups
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </TableCell>
        </TableRow>

        {/* Sub-groups and Accounts */}
        {isExpanded && Object.entries(section.subGroups).map(([subGroupName, subGroup]) => (
          <React.Fragment key={subGroupName}>
            {/* Sub-group Header */}
            <TableRow className="bg-gray-50 hover:bg-gray-100">
              <TableCell colSpan={2} className="pl-8 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{subGroupName}</span>
                  <span className="font-medium">{formatCurrency(subGroup.total)}</span>
                </div>
              </TableCell>
            </TableRow>

            {/* Accounts */}
            {subGroup.accounts.length > 0 ? (
              subGroup.accounts.map(account => (
                <TableRow key={account.id} className="hover:bg-gray-50">
                  <TableCell className="pl-12 py-2">{account.name}</TableCell>
                  <TableCell className={`text-right font-mono py-2 ${account.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatDisplayCurrency(account.balance)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="pl-12 py-4 text-center text-gray-400 italic">
                  No accounts match your filters
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
        
        {/* Section Total */}
        {isExpanded && (
          <TableRow className="bg-gray-800 text-white font-bold">
            <TableCell className="py-3">
              TOTAL {title}
            </TableCell>
            <TableCell className="text-right font-mono py-3">
              {formatCurrency(section.total)}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-primary" />
                Balance Sheet
              </h1>
              <p className="text-gray-600 mt-1">
                Statement of financial position as of {format(reportDate, 'MMMM dd, yyyy')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={isBalanced ? "success" : "destructive"} className="px-3 py-1">
                {isBalanced ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Balanced
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Balanced
                  </>
                )}
              </Badge>
              {processedData?.company_tin && (
                <Badge variant="outline" className="px-3 py-1">
                  <Shield className="h-3 w-3 mr-1" />
                  TIN: {processedData.company_tin}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Reporting Date: {format(reportDate, 'MMMM dd, yyyy')}</span>
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-2" />
            <span>Generated: {format(new Date(), 'HH:mm')}</span>
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
              Configure your balance sheet parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>As of Date</Label>
                <DatePicker 
                  date={reportDate} 
                  setDate={setReportDate}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Quick Actions</Label>
                <Button 
                  onClick={generateReport}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Export Options</Label>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleExportPDF}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={!processedData}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button 
                    onClick={handleExportExcel}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!processedData}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Print</Label>
                <Button 
                  onClick={handlePrint}
                  variant="outline"
                  className="w-full"
                  disabled={!processedData}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="show-zero" 
                    checked={showZeroBalances}
                    onCheckedChange={(checked) => setShowZeroBalances(checked as boolean)}
                  />
                  <Label htmlFor="show-zero" className="flex items-center gap-2 cursor-pointer">
                    {showZeroBalances ? (
                      <>
                        <Eye className="h-4 w-4" />
                        Show Zero Balances
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Hide Zero Balances
                      </>
                    )}
                  </Label>
                </div>
              </div>
              
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search accounts..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {processedData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Total Assets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(processedData.assets.total)}
                </div>
                <div className="text-xs text-gray-500 mt-1">What the company owns</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  Total Liabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">
                  {formatCurrency(processedData.liabilities.total)}
                </div>
                <div className="text-xs text-gray-500 mt-1">What the company owes</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Equity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(processedData.equity.total)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Owner's stake</div>
              </CardContent>
            </Card>
            
            <Card className={isBalanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Balance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isBalanced ? 'text-green-700' : 'text-red-600'}`}>
                  {isBalanced ? 'Balanced' : 'Not Balanced'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Assets {isBalanced ? '=' : '≠'} Liabilities + Equity
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report Period Banner */}
        {processedData && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {processedData.company_name || user?.company_id || 'Company'} - Balance Sheet
                  </h3>
                  <p className="text-sm text-blue-700">
                    As of: {format(reportDate, 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigator.clipboard.writeText(
                  `Balance Sheet: ${format(reportDate, 'MMMM dd, yyyy')} - ${processedData.company_name || ''}`
                )}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Info
              </Button>
            </div>
          </div>
        )}

        {/* Main Report Table */}
        <Card className="shadow-lg overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-gray-600">Loading balance sheet...</p>
                <p className="text-sm text-gray-500 mt-2">Processing financial position data</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-4">{error}</p>
                <Button onClick={generateReport} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : filteredData ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 hover:bg-gray-100">
                      <TableHead className="font-semibold">Account</TableHead>
                      <TableHead className="text-right font-semibold">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renderSection('ASSETS', filteredData.assets)}
                    {renderSection('LIABILITIES', filteredData.liabilities)}
                    {renderSection('EQUITY', filteredData.equity)}
                    
                    {/* Total Liabilities & Equity */}
                    <TableRow className="bg-gray-900 text-white font-bold">
                      <TableCell className="py-3">
                        TOTAL LIABILITIES AND EQUITY
                      </TableCell>
                      <TableCell className="text-right font-mono py-3">
                        {formatCurrency(filteredData.totalLiabilitiesAndEquity)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Balance Sheet Data</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Generate a report to view the balance sheet for the selected date.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Settings */}
        {processedData && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Export Settings</CardTitle>
              <CardDescription>
                Configure your balance sheet export preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={exportOptions.format}
                      onChange={(e) => 
                        setExportOptions({...exportOptions, format: e.target.value as 'detailed' | 'summary'})
                      }
                    >
                      <option value="detailed">Detailed Report</option>
                      <option value="summary">Summary Format</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BalanceSheetPage;