'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  PieChart,
  BarChart2,
  Eye,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { api, hrAPI } from '@/lib/api';

interface ReportFilters {
  month: string;
  year: number;
  department: string;
  staff: string;
  status?: string;
}

const Reports = () => {
  const [activeReport, setActiveReport] = useState('payroll');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    month: new Date().toISOString().slice(0, 7),
    year: new Date().getFullYear(),
    department: 'all',
    staff: 'all',
    status: 'all'
  });
  const [departments, setDepartments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const reportTypes = [
    { id: 'payroll', label: 'Payroll Report', icon: DollarSign },
    { id: 'staff', label: 'Staff Report', icon: Users },
    { id: 'leave', label: 'Leave Analysis', icon: Calendar },
    { id: 'attendance', label: 'Attendance Report', icon: TrendingUp },
    { id: 'tax', label: 'PAYE & Statutory', icon: FileText },
    { id: 'cost', label: 'Labor Cost Analysis', icon: PieChart }
  ];

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [activeReport, filters]);

  // ✅ FIXED: Use fetch-based API calls
  const fetchFilters = async () => {
    try {
      const [deptsRes, staffRes] = await Promise.all([
        api<any>('/DepartmentController.php'),
        hrAPI.getStaff()
      ]);
      
      if (deptsRes.success) setDepartments(deptsRes.data || []);
      if (staffRes.success) setStaff(staffRes.data || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let response;
      switch(activeReport) {
        case 'payroll':
          response = await api<any>(`/ReportsController.php?type=payroll&month=${filters.month}`);
          break;
        case 'staff':
          let staffUrl = `/ReportsController.php?type=staff`;
          if (filters.department !== 'all') staffUrl += `&department_id=${filters.department}`;
          if (filters.status && filters.status !== 'all') staffUrl += `&status=${filters.status}`;
          response = await api<any>(staffUrl);
          break;
        case 'leave':
          response = await api<any>(`/ReportsController.php?type=leave&year=${filters.year}`);
          break;
        case 'attendance':
          response = await api<any>(`/ReportsController.php?type=attendance&month=${filters.month}`);
          break;
        case 'tax':
          response = await api<any>(`/ReportsController.php?type=tax&month=${filters.month}`);
          break;
        case 'cost':
          response = await api<any>(`/ReportsController.php?type=labor-cost&month=${filters.month}`);
          break;
        default:
          response = { success: false, data: null };
      }
      
      if (response.success) {
        setReportData(response.data);
      } else {
        setReportData(null);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (format: string) => {
    if (!reportData) {
      alert('No data to export');
      return;
    }
    
    let csvContent = '';
    let filename = `${activeReport}_report_${new Date().toISOString().slice(0, 10)}`;
    
    switch(activeReport) {
      case 'payroll':
        const payrollHeaders = ['Staff Name', 'Gross Pay', 'PAYE', 'NSSF', 'NHIF', 'Net Pay'];
        const payrollRows = reportData.payroll?.map((item: any) => [
          item.staff_name,
          item.gross_pay,
          item.paye,
          item.nssf,
          item.nhif,
          item.net_pay
        ]) || [];
        csvContent = [payrollHeaders, ...payrollRows].map(row => row.join(',')).join('\n');
        filename += '_payroll.csv';
        break;
        
      case 'staff':
        const staffHeaders = ['Staff Code', 'Name', 'Department', 'Position', 'Status', 'Hire Date', 'Basic Salary'];
        const staffRows = reportData.staff?.map((item: any) => [
          item.staff_code,
          `${item.first_name} ${item.last_name}`,
          item.dept_name,
          item.position_name,
          item.employment_status,
          item.hire_date,
          item.basic_salary
        ]) || [];
        csvContent = [staffHeaders, ...staffRows].map(row => row.join(',')).join('\n');
        filename += '_staff.csv';
        break;
        
      case 'leave':
        const leaveHeaders = ['Leave Type', 'Total Taken', 'Total Balance'];
        const leaveRows = reportData.summary?.map((item: any) => [
          item.leave_name,
          item.total_taken,
          item.total_balance
        ]) || [];
        csvContent = [leaveHeaders, ...leaveRows].map(row => row.join(',')).join('\n');
        filename += '_leave.csv';
        break;
        
      case 'tax':
        const taxHeaders = ['Statutory Item', 'Amount'];
        const taxRows = [
          ['Total PAYE Collected', reportData.totalPAYE],
          ['Total NSSF Contributions', reportData.totalNSSF],
          ['Total NHIF Contributions', reportData.totalNHIF],
          ['Employer Total Cost', reportData.employerCost]
        ];
        csvContent = [taxHeaders, ...taxRows].map(row => row.join(',')).join('\n');
        filename += '_tax.csv';
        break;
        
      default:
        alert('Export not available for this report type');
        return;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const printContent = document.getElementById('report-content');
    if (printContent) {
      const originalTitle = document.title;
      document.title = `${activeReport.toUpperCase()} Report`;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${activeReport.toUpperCase()} Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              @media print {
                body { margin: 0; padding: 15px; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <button onclick="window.print()" style="margin-bottom: 20px; padding: 10px;">Print Report</button>
            ${printContent.outerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
      }
      document.title = originalTitle;
    } else {
      window.print();
    }
  };

  const getCurrencySymbol = () => {
    return '₦'; // Nigerian Naira
  };

  const renderPayrollReport = () => {
    if (!reportData) return (
      <div className="text-center py-12 text-gray-500">
        No payroll data available for the selected period
      </div>
    );
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalStaff || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Gross Payroll</p>
                <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.totalGross || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Net Pay</p>
                <p className="text-2xl font-bold text-green-600">{getCurrencySymbol()}{(reportData.totalNet || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross Pay</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PAYE</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pension</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">NHF</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.payroll?.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.staff_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {getCurrencySymbol()}{item.gross_pay?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {getCurrencySymbol()}{item.paye?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-yellow-600">
                      {getCurrencySymbol()}{item.pension?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                      {getCurrencySymbol()}{item.nhf?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                      {getCurrencySymbol()}{item.net_pay?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-bold">
                  <td className="px-6 py-4 text-right">TOTAL:</td>
                  <td className="px-6 py-4 text-right">{getCurrencySymbol()}{(reportData.totalGross || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{getCurrencySymbol()}{(reportData.totalPAYE || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{getCurrencySymbol()}{(reportData.totalPension || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{getCurrencySymbol()}{(reportData.totalNHF || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{getCurrencySymbol()}{(reportData.totalNet || 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStaffReport = () => {
    if (!reportData?.staff?.length) return (
      <div className="text-center py-12 text-gray-500">
        No staff data available
      </div>
    );
    
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.staff.map((employee: any) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.staff_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.first_name} {employee.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.dept_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.position_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      employee.employment_status === 'Active' ? 'bg-green-100 text-green-800' : 
                      employee.employment_status === 'Terminated' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {employee.employment_status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(employee.hire_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {getCurrencySymbol()}{(employee.basic_salary || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={6} className="px-6 py-4 text-right font-bold">Total Staff:</td>
                <td className="px-6 py-4 text-right font-bold">{reportData.staff.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderLeaveReport = () => {
    if (!reportData?.summary?.length) return (
      <div className="text-center py-12 text-gray-500">
        No leave data available for the selected year
      </div>
    );
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reportData.summary.map((item: any, idx: number) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6 border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.leave_name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{item.total_taken} days</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.total_balance > 10 ? 'bg-green-100 text-green-800' : 
                  item.total_balance > 0 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  Balance: {item.total_balance} days
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 rounded-full h-2 transition-all"
                  style={{ width: `${(item.total_taken / (item.total_taken + item.total_balance)) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaxReport = () => {
    if (!reportData) return (
      <div className="text-center py-12 text-gray-500">
        No tax data available for the selected period
      </div>
    );
    
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Statutory Deductions Summary</h3>
          <p className="text-sm text-gray-500">For the period ending {new Date(filters.month + '-01').toLocaleDateString('en-NG', { year: 'numeric', month: 'long' })}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Total PAYE Collected</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.totalPAYE || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">To be remitted to FIRS by 10th of next month</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Total Pension Contributions</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.totalPension || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">Employee + Employer contributions (8% total)</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Total NHF Contributions</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.totalNHF || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">Employee contributions only (2.5%)</p>
            </div>
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Employer Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.employerCost || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">Pension + NHF + Other statutory</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceReport = () => {
    if (!reportData) return (
      <div className="text-center py-12 text-gray-500">
        No attendance data available for the selected period
      </div>
    );
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Present Days</p>
              <p className="text-2xl font-bold text-green-600">{reportData.totalPresent || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Absent Days</p>
              <p className="text-2xl font-bold text-red-600">{reportData.totalAbsent || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Late Days</p>
              <p className="text-2xl font-bold text-yellow-600">{reportData.totalLate || 0}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-600">{reportData.attendanceRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCostReport = () => {
    if (!reportData) return (
      <div className="text-center py-12 text-gray-500">
        No labor cost data available for the selected period
      </div>
    );
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Salary Cost</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.totalSalary || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Pension Cost</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.totalPension || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">NHF Cost</p>
              <p className="text-2xl font-bold text-gray-900">{getCurrencySymbol()}{(reportData.totalNHF || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total Labor Cost</p>
              <p className="text-2xl font-bold text-blue-600">{getCurrencySymbol()}{(reportData.totalCost || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    switch(activeReport) {
      case 'payroll':
        return renderPayrollReport();
      case 'staff':
        return renderStaffReport();
      case 'leave':
        return renderLeaveReport();
      case 'attendance':
        return renderAttendanceReport();
      case 'tax':
        return renderTaxReport();
      case 'cost':
        return renderCostReport();
      default:
        return <div className="text-center py-12 text-gray-500">Select a report type</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Reports & Analytics</h2>
          <p className="text-sm text-gray-500">Generate and export HR reports</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => downloadReport('csv')}
            disabled={!reportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={printReport}
            disabled={!reportData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Report Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${activeReport === report.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${activeReport === report.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {report.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            {(activeReport === 'payroll' || activeReport === 'tax' || activeReport === 'cost' || activeReport === 'attendance') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <input
                  type="month"
                  value={filters.month}
                  onChange={(e) => setFilters({...filters, month: e.target.value})}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2"
                />
              </div>
            )}
            {activeReport === 'leave' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={filters.year}
                  onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
                  className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 w-32"
                />
              </div>
            )}
            {activeReport === 'staff' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters({...filters, department: e.target.value})}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2"
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.dept_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2"
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Terminated">Terminated</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <button
                onClick={fetchReport}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Generate Report
              </button>
            </div>
            <div>
              <button
                onClick={fetchReport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div id="report-content" className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Generating report...</p>
            </div>
          ) : (
            renderReportContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;