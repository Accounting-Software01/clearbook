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
  Download,
  Lock,
  Unlock,
  Shield
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
  grade_level: string;
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
  nhis_employee: number;
  nhis_employer: number;        // ✅ Added
  pension_employee: number;
  pension_employer: number;     // ✅ Added
  advance_deduction: number;
  loan_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  status: 'Draft' | 'Approved' | 'Posted' | 'Paid' | 'Cancelled';
  currency_code: string;
  payroll_month: string;
  is_locked: boolean;
}

interface PayrollSummary {
  totalStaff: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPAYE: number;
  totalNSSF: number;
  totalNHIF: number;
  totalNHIS: number;
  totalNHISEmployer: number;    // ✅ Added
  totalPension: number;
  totalPensionEmployer: number; // ✅ Added
  totalAdvanceDeductions: number;
  totalLoanDeductions: number;
  totalEmployerCost: number;
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
    totalNHIS: 0,
    totalNHISEmployer: 0,
    totalPension: 0,
    totalPensionEmployer: 0,
    totalAdvanceDeductions: 0,
    totalLoanDeductions: 0,
    totalEmployerCost: 0
  });
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [isLocked, setIsLocked] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollRecord | null>(null);

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
          totalNHIS: 0,
          totalNHISEmployer: 0,
          totalPension: 0,
          totalPensionEmployer: 0,
          totalAdvanceDeductions: 0,
          totalLoanDeductions: 0,
          totalEmployerCost: 0
        });
        setIsLocked(response.data?.is_locked || false);
        if (response.data?.payroll?.[0]?.currency_code) {
          setSelectedCurrency(response.data.payroll[0].currency_code);
        }
      }
    } catch (error) {
      console.error('Error fetching payroll:', error);
      setStatusMessage('Failed to fetch payroll data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Deduplicated action handler
  const runAction = async (action: string, confirmMessage: string, apiCall: () => Promise<any>) => {
    if (!window.confirm(confirmMessage)) return;
    
    setProcessingStatus(action);
    setStatusMessage('');
    try {
      const response = await apiCall();
      if (response.success) {
        setProcessingStatus(`${action}_success`);
        setStatusMessage(response.message || `${action} completed successfully`);
        await fetchPayrollData();
      } else {
        setProcessingStatus('error');
        setStatusMessage(response.message || `${action} failed`);
      }
    } catch (error: any) {
      console.error(`Error ${action}:`, error);
      setProcessingStatus('error');
      setStatusMessage(error.message || `${action} failed`);
    } finally {
      setTimeout(() => {
        setProcessingStatus(null);
        setStatusMessage('');
      }, 3000);
    }
  };

  const generatePayroll = () => {
    runAction('generating', 'Generate payroll for this month?', () => hrAPI.generatePayroll(payrollMonth));
  };

  const approvePayroll = () => {
    runAction('approving', 'Approve payroll for journal posting?', () => hrAPI.approvePayroll(payrollMonth));
  };

  const lockPayroll = () => {
    runAction('locking', 'Lock payroll? No further changes will be allowed.', () => hrAPI.lockPayroll(payrollMonth));
  };

  const unlockPayroll = () => {
    runAction('unlocking', 'Unlock payroll? Changes will be allowed again.', () => hrAPI.unlockPayroll(payrollMonth));
  };

  const postToJournals = () => {
    const userId = parseInt(localStorage.getItem('user_id') || '1');
    runAction('posting', 'Post payroll to journal vouchers? This will create accounting entries.', 
      () => hrAPI.postPayrollToJournals(payrollMonth, userId));
  };

  const exportToExcel = () => {
    const headers = ['Staff Code', 'Name', 'Department', 'Grade', 'Basic', 'Allowances', 'Gross', 'PAYE', 'Pension', 'NHF', 'NHIS', 'Net Pay', 'Status'];
    const rows = payrollData.map(row => [
      row.staff_code,
      `${row.first_name} ${row.last_name}`,
      row.dept_name,
      row.grade_level || 'N/A',
      row.basic_salary,
      (row.total_earnings - row.basic_salary),
      row.total_earnings,
      row.paye_tax,
      row.pension_employee,
      row.nhif_employee,
      row.nhis_employee || 0,
      row.net_pay,
      row.status
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${payrollMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPayrollStatus = (): 'not_generated' | 'generated' | 'approved' | 'posted' | 'locked' => {
    if (isLocked) return 'locked';
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

  const getStatusBadge = (status: string, isLocked: boolean) => {
    if (isLocked) return 'bg-red-100 text-red-800';
    switch(status) {
      case 'Posted': return 'bg-green-100 text-green-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const TaxBreakdownModal = ({ employee, onClose }: { employee: PayrollRecord | null; onClose: () => void }) => {
    if (!employee) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tax Breakdown - {employee.first_name} {employee.last_name}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Gross Annual Income</p>
                <p className="text-xl font-bold">{getCurrencySymbol()}{(employee.total_earnings * 12).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Effective Tax Rate</p>
                <p className="text-xl font-bold">{((employee.paye_tax / employee.total_earnings) * 100).toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Tax Reliefs Applied</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Consolidated Relief (1% or ₦200k)</span>
                  <span>{getCurrencySymbol()}{Math.max(employee.total_earnings * 12 * 0.01, 200000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>NHF Relief (2.5% of basic)</span>
                  <span>{getCurrencySymbol()}{(employee.basic_salary * 0.025).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Pension Relief (8% of pensionable)</span>
                  <span>{getCurrencySymbol()}{(employee.pension_employee).toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Tax Bands</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>First ₦800,000</span>
                  <span>0%</span>
                </div>
                <div className="flex justify-between">
                  <span>Next ₦2,200,000</span>
                  <span>15%</span>
                </div>
                <div className="flex justify-between">
                  <span>Next ₦9,000,000</span>
                  <span>18%</span>
                </div>
                <div className="flex justify-between">
                  <span>Above ₦12,000,000</span>
                  <span>21-25%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
              disabled={status === 'locked'}
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
            {isLocked ? (
              <button
                onClick={unlockPayroll}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Unlock Payroll
              </button>
            ) : (
              <button
                onClick={lockPayroll}
                disabled={status !== 'approved' && status !== 'posted'}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Lock className="h-4 w-4 mr-2" />
                Lock Payroll
              </button>
            )}
            <button
              onClick={exportToExcel}
              disabled={payrollData.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={approvePayroll}
              disabled={status !== 'generated' || isLocked}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Payroll
            </button>
            <button
              onClick={postToJournals}
              disabled={status !== 'approved' || isLocked}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4 mr-2" />
              Post to Journals
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {isLocked && (
          <div className="mt-4 p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
            <div className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              <span>This payroll is locked. No changes can be made until unlocked by an administrator.</span>
            </div>
          </div>
        )}

        {/* Processing Status Messages */}
        {(processingStatus || statusMessage) && (
          <div className={`mt-4 p-4 rounded-md ${
            processingStatus?.includes('_success') || processingStatus === 'approved' || processingStatus === 'posted'
              ? 'bg-green-50 text-green-800'
              : processingStatus === 'error'
              ? 'bg-red-50 text-red-800'
              : 'bg-blue-50 text-blue-800'
          }`}>
            <div className="flex">
              {(processingStatus?.includes('_success') || processingStatus === 'approved' || processingStatus === 'posted') && <CheckCircle className="h-5 w-5 mr-2" />}
              {processingStatus === 'locked' && <Lock className="h-5 w-5 mr-2" />}
              {processingStatus === 'unlocked' && <Unlock className="h-5 w-5 mr-2" />}
              {processingStatus === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
              {(processingStatus && !processingStatus.includes('_success') && processingStatus !== 'error' && processingStatus !== 'locked' && processingStatus !== 'unlocked') && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
              )}
              <span>
                {processingStatus === 'generating' && 'Generating payroll...'}
                {processingStatus === 'generating_success' && 'Payroll generated successfully!'}
                {processingStatus === 'approving' && 'Approving payroll...'}
                {processingStatus === 'approved' && 'Payroll approved successfully!'}
                {processingStatus === 'posting' && 'Posting to journal vouchers...'}
                {processingStatus === 'posted' && 'Posted to journal vouchers successfully!'}
                {processingStatus === 'locking' && 'Locking payroll...'}
                {processingStatus === 'locked' && 'Payroll locked successfully!'}
                {processingStatus === 'unlocking' && 'Unlocking payroll...'}
                {processingStatus === 'unlocked' && 'Payroll unlocked successfully!'}
                {processingStatus === 'error' && `Error: ${statusMessage || 'Please try again'}`}
                {statusMessage && !processingStatus?.includes('_success') && processingStatus !== 'error' && ` ${statusMessage}`}
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

      {/* Additional Stats - Enhanced */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">PAYE Tax (FIRS)</dt>
            <dd className="mt-1 text-2xl font-semibold text-red-600">{getCurrencySymbol()}{summary.totalPAYE.toLocaleString()}</dd>
            <p className="text-xs text-gray-400 mt-1">Due by 10th of next month</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pension (PRA 2014)</dt>
            <dd className="mt-1 text-2xl font-semibold text-purple-600">{getCurrencySymbol()}{summary.totalPension.toLocaleString()}</dd>
            <p className="text-xs text-gray-400 mt-1">8% Employee | 10% Employer</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">NHF (FMBN)</dt>
            <dd className="mt-1 text-2xl font-semibold text-orange-600">{getCurrencySymbol()}{summary.totalNHIF.toLocaleString()}</dd>
            <p className="text-xs text-gray-400 mt-1">2.5% of basic salary</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">NHIS (NHIA 2022)</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-600">{getCurrencySymbol()}{summary.totalNHIS.toLocaleString()}</dd>
            <p className="text-xs text-gray-400 mt-1">5% Employee | 10% Employer</p>
          </div>
        </div>
      </div>

      {/* Employer Cost Card */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg shadow p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90">Total Employer Cost (Pension 10% + NHIS 10%)</p>
            <p className="text-3xl font-bold mt-1">{getCurrencySymbol()}{summary.totalEmployerCost.toLocaleString()}</p>
          </div>
          <Shield className="h-12 w-12 opacity-50" />
        </div>
        <p className="text-xs opacity-75 mt-3">This amount represents employer statutory contributions to be remitted</p>
      </div>

      {/* Payroll Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Payroll Details</h3>
          <div className="text-sm text-gray-500">
            {payrollData.length} records found {isLocked && <span className="ml-2 text-red-600">🔒 Locked</span>}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Basic</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gross</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">PAYE</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pension</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.grade_level || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                      {getCurrencySymbol()}{row.basic_salary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {getCurrencySymbol()}{row.total_earnings.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {getCurrencySymbol()}{row.paye_tax.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                      {getCurrencySymbol()}{row.pension_employee.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                      {getCurrencySymbol()}{row.total_deductions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                      {getCurrencySymbol()}{row.net_pay.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(row.status, isLocked)}`}>
                        {row.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => {
                          setSelectedEmployee(row);
                          setShowTaxDetails(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Tax Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-bold">
                  <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900">TOTAL:</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{getCurrencySymbol()}{summary.totalGross.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{getCurrencySymbol()}{summary.totalPAYE.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-purple-600">{getCurrencySymbol()}{summary.totalPension.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{getCurrencySymbol()}{summary.totalDeductions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-green-600">{getCurrencySymbol()}{summary.totalNet.toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Nigerian Payroll Info Note - Updated */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Nigerian Payroll Information (2024):</p>
            <p className="mt-1">
              PAYE: Progressive rates 7% - 24% with reliefs | Pension (PRA 2014): Employee 8% | Employer 10%<br />
              NHF: 2.5% of basic salary | NHIS (NHIA 2022): Employee 5% | Employer 10% of basic salary
            </p>
          </div>
        </div>
      </div>

      {/* Tax Breakdown Modal */}
      {showTaxDetails && selectedEmployee && (
        <TaxBreakdownModal employee={selectedEmployee} onClose={() => setShowTaxDetails(false)} />
      )}
    </div>
  );
};

export default PayrollProcessing;
