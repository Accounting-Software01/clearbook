'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Eye,
  Send,
  FileText,
  AlertCircle,
  TrendingUp,
  Users,
  Banknote,
  RefreshCw,
  Printer,
  Download
} from 'lucide-react';
import { hrAPI } from '@/lib/api';

interface PayrollRecord {
  id: number;
  staff_id: number;
  staff_code: string;
  first_name: string;
  last_name: string;
  dept_name: string;
  position_name: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  medical_allowance: number;
  communication_allowance: number;
  risk_allowance: number;
  overtime_pay: number;
  bonus: number;
  other_earnings: number;
  total_earnings: number;
  paye_tax: number;
  nssf_employee: number;
  nhif_employee: number;
  pension_employee: number;
  advance_deduction: number;
  loan_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  status: 'Draft' | 'Approved' | 'Posted' | 'Paid' | 'Cancelled';
  currency_code: string;
  payroll_month: string;
}

interface PayrollSummary {
  totalStaff: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPAYE: number;
  totalNSSF: number;
  totalNHIF: number;
  totalPension: number;
  totalAdvanceDeductions: number;
  totalLoanDeductions: number;
}

const PayrollProcessing = () => {
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalStaff: 0,
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalPAYE: 0,
    totalNSSF: 0,
    totalNHIF: 0,
    totalPension: 0,
    totalAdvanceDeductions: 0,
    totalLoanDeductions: 0
  });
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');

  useEffect(() => {
    if (payrollMonth) {
      fetchPayrollData();
    }
  }, [payrollMonth]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const response = await hrAPI.getPayroll(payrollMonth);
      if (response.success) {
        setPayrollData(response.data?.payroll || []);
        setSummary(response.data?.summary || {
          totalStaff: 0,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          totalPAYE: 0,
          totalNSSF: 0,
          totalNHIF: 0,
          totalPension: 0,
          totalAdvanceDeductions: 0,
          totalLoanDeductions: 0
        });
        if (response.data?.payroll?.[0]?.currency_code) {
          setSelectedCurrency(response.data.payroll[0].currency_code);
        }
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePayroll = async () => {
    setProcessingStatus('generating');
    try {
      const response = await hrAPI.generatePayroll(payrollMonth);
      if (response.success) {
        setProcessingStatus('success');
        await fetchPayrollData();
        setTimeout(() => setProcessingStatus(null), 3000);
      } else {
        setProcessingStatus('error');
        setTimeout(() => setProcessingStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error generating payroll:', error);
      setProcessingStatus('error');
      setTimeout(() => setProcessingStatus(null), 3000);
    }
  };

  const approvePayroll = async () => {
    if (!window.confirm('Approve payroll for journal posting?')) return;
    
    setProcessingStatus('approving');
    try {
      const response = await hrAPI.approvePayroll(payrollMonth);
      if (response.success) {
        setProcessingStatus('approved');
        await fetchPayrollData();
        setTimeout(() => setProcessingStatus(null), 3000);
      } else {
        setProcessingStatus('error');
        setTimeout(() => setProcessingStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error approving payroll:', error);
      setProcessingStatus('error');
      setTimeout(() => setProcessingStatus(null), 3000);
    }
  };

  const postToJournals = async () => {
    if (!window.confirm('Post payroll to journal vouchers? This will create accounting entries.')) return;
    
    setProcessingStatus('posting');
    try {
      // Get current user ID from localStorage or context
      const userId = parseInt(localStorage.getItem('user_id') || '1');
      const response = await hrAPI.postPayrollToJournals(payrollMonth, userId);
      if (response.success) {
        setProcessingStatus('posted');
        alert(`Journal Voucher Created: ${response.voucher_no || 'Success'}`);
        await fetchPayrollData();
        setTimeout(() => setProcessingStatus(null), 3000);
      } else {
        setProcessingStatus('error');
        setTimeout(() => setProcessingStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error posting to journals:', error);
      setProcessingStatus('error');
      setTimeout(() => setProcessingStatus(null), 3000);
    }
  };

  const exportToExcel = () => {
    // Simple CSV export
    const headers = ['Staff Code', 'Name', 'Department', 'Position', 'Basic Salary', 'Allowances', 'Gross', 'PAYE', 'NSSF', 'NHIF', 'Net Pay', 'Status'];
    const rows = payrollData.map(row => [
      row.staff_code,
      `${row.first_name} ${row.last_name}`,
      row.dept_name,
      row.position_name,
      row.basic_salary,
      (row.total_earnings - row.basic_salary),
      row.total_earnings,
      row.paye_tax,
      row.nssf_employee,
      row.nhif_employee,
      row.net_pay,
      row.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${payrollMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getPayrollStatus = (): 'not_generated' | 'generated' | 'approved' | 'posted' => {
    if (payrollData.length === 0) return 'not_generated';
    const allApproved = payrollData.every(p => p.status === 'Approved');
    const allPosted = payrollData.every(p => p.status === 'Posted');
    if (allPosted) return 'posted';
    if (allApproved) return 'approved';
    return 'generated';
  };

  const status = getPayrollStatus();

  const getCurrencySymbol = () => {
    switch(selectedCurrency) {
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'EUR': return '€';
      default: return '₦';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="month"
                value={payrollMonth}
                onChange={(e) => setPayrollMonth(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={generatePayroll}
              disabled={status !== 'not_generated' && status !== 'generated'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Generate Payroll
            </button>
            <button
              onClick={fetchPayrollData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportToExcel}
              disabled={payrollData.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </button>
            <button
              onClick={approvePayroll}
              disabled={status !== 'generated'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Payroll
            </button>
            <button
              onClick={postToJournals}
              disabled={status !== 'approved'}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4 mr-2" />
              Post to Journals
            </button>
          </div>
        </div>

        {/* Processing Status Messages */}
        {processingStatus && (
          <div className={`mt-4 p-4 rounded-md ${
            processingStatus === 'success' || processingStatus === 'approved' || processingStatus === 'posted'
              ? 'bg-green-50 text-green-800'
              : processingStatus === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-blue-50 text-blue-800'
          }`}>
            <div className="flex">
              {processingStatus === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
              {processingStatus === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
              {(processingStatus === 'generating' || processingStatus === 'approving' || processingStatus === 'posting') && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
              )}
              <span>
                {processingStatus === 'generating' && 'Generating payroll...'}
                {processingStatus === 'success' && 'Payroll generated successfully!'}
                {processingStatus === 'approving' && 'Approving payroll...'}
                {processingStatus === 'approved' && 'Payroll approved successfully!'}
                {processingStatus === 'posting' && 'Posting to journal vouchers...'}
                {processingStatus === 'posted' && 'Posted to journal vouchers successfully!'}
                {processingStatus === 'error' && 'An error occurred. Please try again.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Staff Count</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{summary.totalStaff}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Gross Earnings</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{getCurrencySymbol()}{summary.totalGross.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Banknote className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Deductions</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{getCurrencySymbol()}{summary.totalDeductions.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Net Pay</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{getCurrencySymbol()}{summary.totalNet.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">PAYE Tax (Withholding)</dt>
            <dd className="mt-1 text-2xl font-semibold text-red-600">{getCurrencySymbol()}{summary.totalPAYE.toLocaleString()}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">NSSF Contributions</dt>
            <dd className="mt-1 text-2xl font-semibold text-yellow-600">{getCurrencySymbol()}{summary.totalNSSF.toLocaleString()}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">NHIF Contributions</dt>
            <dd className="mt-1 text-2xl font-semibold text-orange-600">{getCurrencySymbol()}{summary.totalNHIF.toLocaleString()}</dd>
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Payroll Details</h3>
          <div className="text-sm text-gray-500">
            {payrollData.length} records found
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : payrollData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No payroll data for this period. Click "Generate Payroll" to create.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Allowances</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PAYE</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.staff_code}</div>
                      <div className="text-sm text-gray-500">{row.first_name} {row.last_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.dept_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {getCurrencySymbol()}{row.basic_salary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {getCurrencySymbol()}{(row.total_earnings - row.basic_salary).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {getCurrencySymbol()}{row.total_earnings.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {getCurrencySymbol()}{row.paye_tax.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {getCurrencySymbol()}{row.total_deductions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                      {getCurrencySymbol()}{row.net_pay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        row.status === 'Posted' ? 'bg-green-100 text-green-800' :
                        row.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                        row.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status || 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-bold">
                  <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900">TOTAL:</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{getCurrencySymbol()}{summary.totalGross.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{getCurrencySymbol()}{summary.totalPAYE.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{getCurrencySymbol()}{summary.totalDeductions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-green-600">{getCurrencySymbol()}{summary.totalNet.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Nigerian Payroll Info Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Nigerian Payroll Information:</p>
            <p className="mt-1">PAYE tax is calculated based on Nigerian tax bands (7% - 24%). Pension is 8% (Employee 4% + Employer 4%). NHF is 2.5% of basic salary. All values are in Nigerian Naira (₦).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollProcessing;