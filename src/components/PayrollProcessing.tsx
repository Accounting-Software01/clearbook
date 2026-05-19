'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  AlertCircle,
  TrendingUp,
  Users,
  Banknote,
  RefreshCw,
  Download,
  Lock,
  Unlock,
  Shield
} from 'lucide-react';
import { hrAPI } from '@/lib/api';

// ── Fix #6 & #7: added nhis_employer and pension_employer to the interface ──
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
  nhif_employee: number;       // NHF stored here
  nhis_employee: number;
  nhis_employer: number;       // ← added
  pension_employee: number;
  pension_employer: number;    // ← added
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

// ── Fix #6: added totalNHISEmployer and totalPensionEmployer to interface ──
interface PayrollSummary {
  totalStaff: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalPAYE: number;
  totalNSSF: number;
  totalNHIF: number;           // NHF
  totalNHIS: number;           // employee NHIS
  totalNHISEmployer: number;   // ← added
  totalPension: number;        // employee pension
  totalPensionEmployer: number;// ← added
  totalAdvanceDeductions: number;
  totalLoanDeductions: number;
  totalEmployerCost: number;   // pension_employer + nhis_employer (NHF is employee-only)
}

const defaultSummary: PayrollSummary = {
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
  totalEmployerCost: 0,
};

const PayrollProcessing = () => {
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PayrollSummary>(defaultSummary);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  // ── Fix #5: store backend error/info message to surface to user ──
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('NGN');
  const [isLocked, setIsLocked] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollRecord | null>(null);

  useEffect(() => {
    if (payrollMonth) fetchPayrollData();
  }, [payrollMonth]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const response = await hrAPI.getPayroll(payrollMonth);
      if (response.success) {
        setPayrollData(response.data?.payroll || []);
        setSummary(response.data?.summary || defaultSummary);
        setIsLocked(response.data?.is_locked || false);
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

  // ── Helper: run an action, update status, and refresh data ──
  const runAction = async (
    statusKey: string,
    successKey: string,
    action: () => Promise<{ success: boolean; message?: string; voucher_no?: string }>
  ) => {
    setProcessingStatus(statusKey);
    setProcessingMessage(null);
    try {
      const response = await action();
      if (response.success) {
        setProcessingStatus(successKey);
        setProcessingMessage(response.voucher_no ? `Journal Voucher: ${response.voucher_no}` : (response.message ?? null));
        await fetchPayrollData();
      } else {
        // ── Fix #5: surface backend message on error ──
        setProcessingStatus('error');
        setProcessingMessage(response.message ?? 'An unexpected error occurred.');
      }
    } catch (error) {
      console.error(`Error during ${statusKey}:`, error);
      setProcessingStatus('error');
      setProcessingMessage('A network error occurred. Please try again.');
    } finally {
      setTimeout(() => {
        setProcessingStatus(null);
        setProcessingMessage(null);
      }, 5000);
    }
  };

  const generatePayroll = () =>
    runAction('generating', 'success', () => hrAPI.generatePayroll(payrollMonth));

  const approvePayroll = async () => {
    if (!window.confirm('Approve payroll for journal posting?')) return;
    runAction('approving', 'approved', () => hrAPI.approvePayroll(payrollMonth));
  };

  const lockPayroll = async () => {
    if (!window.confirm('Lock payroll? No further changes will be allowed.')) return;
    runAction('locking', 'locked', () => hrAPI.lockPayroll(payrollMonth));
  };

  const unlockPayroll = async () => {
    if (!window.confirm('Unlock payroll? Changes will be allowed again.')) return;
    runAction('unlocking', 'unlocked', () => hrAPI.unlockPayroll(payrollMonth));
  };

  const postToJournals = async () => {
    if (!window.confirm('Post payroll to journal vouchers? This will create accounting entries.')) return;
    const userId = parseInt(localStorage.getItem('user_id') || '1');
    runAction('posting', 'posted', () => hrAPI.postPayrollToJournals(payrollMonth, userId));
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
      row.status,
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${payrollMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Fix #3: 'posted' no longer blocks generation; only 'locked' does ──
  // ── Fix #4: lock available for both 'approved' and 'posted' ──
  const getPayrollStatus = (): 'not_generated' | 'generated' | 'approved' | 'posted' | 'locked' => {
    if (isLocked) return 'locked';
    if (payrollData.length === 0) return 'not_generated';
    const allPosted   = payrollData.every(p => p.status === 'Posted');
    const allApproved = payrollData.every(p => p.status === 'Approved');
    if (allPosted)   return 'posted';
    if (allApproved) return 'approved';
    return 'generated';
  };

  const status = getPayrollStatus();

  const getCurrencySymbol = () => {
    switch (selectedCurrency) {
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'EUR': return '€';
      default:    return '₦';
    }
  };

  const getStatusBadge = (rowStatus: string, locked: boolean) => {
    if (locked) return 'bg-red-100 text-red-800';
    switch (rowStatus) {
      case 'Posted':   return 'bg-green-100 text-green-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Draft':    return 'bg-yellow-100 text-yellow-800';
      default:         return 'bg-gray-100 text-gray-800';
    }
  };

  const TaxBreakdownModal = ({ employee, onClose }: { employee: PayrollRecord | null; onClose: () => void }) => {
    if (!employee) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tax Breakdown — {employee.first_name} {employee.last_name}</h3>
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
                <p className="text-xl font-bold">
                  {employee.total_earnings > 0
                    ? ((employee.paye_tax / employee.total_earnings) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Monthly Deductions</h4>
              <div className="space-y-2 text-sm">
                {[
                  ['PAYE Tax',            employee.paye_tax],
                  ['Pension (8%)',         employee.pension_employee],
                  ['NHF (2.5%)',           employee.nhif_employee],
                  ['NHIS (5%)',            employee.nhis_employee],
                ].map(([label, value]) => (
                  <div key={label as string} className="flex justify-between">
                    <span>{label}</span>
                    <span>{getCurrencySymbol()}{(value as number).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Deductions</span>
                  <span>{getCurrencySymbol()}{employee.total_deductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-green-700">
                  <span>Net Pay</span>
                  <span>{getCurrencySymbol()}{employee.net_pay.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Tax Reliefs Applied</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Consolidated Relief (higher of 1% gross or ₦200,000)</span>
                  <span>{getCurrencySymbol()}{Math.max(employee.total_earnings * 12 * 0.01, 200000).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Tax Bands (Finance Act 2023)</h4>
              <div className="space-y-2 text-sm">
                {[
                  ['First ₦800,000',        '0%'],
                  ['Next ₦2,200,000',       '15%'],
                  ['Next ₦9,000,000',       '18%'],
                  ['Next ₦13,000,000',      '21%'],
                  ['Next ₦25,000,000',      '23%'],
                  ['Above ₦50,000,000',     '25%'],
                ].map(([band, rate]) => (
                  <div key={band} className="flex justify-between">
                    <span>{band}</span><span>{rate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isSuccess = ['success', 'approved', 'posted', 'locked', 'unlocked'].includes(processingStatus ?? '');
  const isInProgress = ['generating', 'approving', 'posting', 'locking', 'unlocking'].includes(processingStatus ?? '');

  return (
    <div className="space-y-6">

      {/* ── Header Controls ── */}
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

            {/* ── Fix #3: allow generate when not locked (includes 'posted') ── */}
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
              // ── Fix #4: lock available for 'approved' and 'posted' ──
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

        {/* Locked banner */}
        {isLocked && (
          <div className="mt-4 p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
            <div className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              <span>This payroll is locked. No changes can be made until unlocked by an administrator.</span>
            </div>
          </div>
        )}

        {/* ── Fix #5: processing status with backend message ── */}
        {processingStatus && (
          <div className={`mt-4 p-4 rounded-md ${
            isSuccess    ? 'bg-green-50 text-green-800' :
            processingStatus === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            <div className="flex items-start">
              {isSuccess && <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />}
              {processingStatus === 'locked'   && <Lock   className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />}
              {processingStatus === 'unlocked' && <Unlock className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />}
              {processingStatus === 'error'    && <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />}
              {isInProgress && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2 flex-shrink-0" />
              )}
              <div>
                <span className="font-medium">
                  {processingStatus === 'generating' && 'Generating payroll…'}
                  {processingStatus === 'success'    && 'Payroll generated successfully!'}
                  {processingStatus === 'approving'  && 'Approving payroll…'}
                  {processingStatus === 'approved'   && 'Payroll approved successfully!'}
                  {processingStatus === 'posting'    && 'Posting to journal vouchers…'}
                  {processingStatus === 'posted'     && 'Posted to journal vouchers successfully!'}
                  {processingStatus === 'locking'    && 'Locking payroll…'}
                  {processingStatus === 'locked'     && 'Payroll locked successfully!'}
                  {processingStatus === 'unlocking'  && 'Unlocking payroll…'}
                  {processingStatus === 'unlocked'   && 'Payroll unlocked successfully!'}
                  {processingStatus === 'error'      && 'Action failed'}
                </span>
                {processingMessage && (
                  <p className="text-sm mt-0.5 opacity-80">{processingMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Staff Count',     value: summary.totalStaff,      icon: <Users       className="h-6 w-6 text-gray-400" />, format: false },
          { label: 'Gross Earnings',  value: summary.totalGross,      icon: <TrendingUp  className="h-6 w-6 text-gray-400" />, format: true  },
          { label: 'Total Deductions',value: summary.totalDeductions, icon: <Banknote    className="h-6 w-6 text-gray-400" />, format: true  },
          { label: 'Net Pay',         value: summary.totalNet,        icon: <DollarSign  className="h-6 w-6 text-gray-400" />, format: true  },
        ].map(({ label, value, icon, format }) => (
          <div key={label} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">{icon}</div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{label}</dt>
                    <dd className="text-2xl font-semibold text-gray-900">
                      {format ? `${getCurrencySymbol()}${value.toLocaleString()}` : value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Statutory deduction cards ── */}
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
            <p className="text-xs text-gray-400 mt-1">8% employee — employer shown in cost below</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">NHF (FMBN)</dt>
            <dd className="mt-1 text-2xl font-semibold text-orange-600">{getCurrencySymbol()}{summary.totalNHIF.toLocaleString()}</dd>
            <p className="text-xs text-gray-400 mt-1">2.5% of basic — employee only</p>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">NHIS (NHIA 2022)</dt>
            <dd className="mt-1 text-2xl font-semibold text-teal-600">{getCurrencySymbol()}{summary.totalNHIS.toLocaleString()}</dd>
            <p className="text-xs text-gray-400 mt-1">5% employee — employer shown in cost below</p>
          </div>
        </div>
      </div>

      {/* ── Employer Cost Card — Fix #2: label now accurately says Pension + NHIS ── */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg shadow p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            {/* Fix #2: removed NHF from the label — it is employee-only */}
            <p className="text-sm opacity-90">Total Employer Statutory Contributions (Pension 10% + NHIS 10%)</p>
            <p className="text-3xl font-bold mt-1">{getCurrencySymbol()}{summary.totalEmployerCost.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-1">
              Pension: {getCurrencySymbol()}{summary.totalPensionEmployer.toLocaleString()} &nbsp;|&nbsp;
              NHIS: {getCurrencySymbol()}{summary.totalNHISEmployer.toLocaleString()}
            </p>
          </div>
          <Shield className="h-12 w-12 opacity-50" />
        </div>
        <p className="text-xs opacity-75 mt-3">Amounts to be remitted to PFA and NHIA on behalf of employees</p>
      </div>

      {/* ── Payroll Table ── */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Payroll Details</h3>
          <div className="text-sm text-gray-500">
            {payrollData.length} records &nbsp;
            {isLocked && <span className="ml-1 text-red-600">🔒 Locked</span>}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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
                  {['Staff', 'Department', 'Grade', 'Basic', 'Gross', 'PAYE', 'Pension', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      ['Basic','Gross','PAYE','Pension','Deductions','Net Pay'].includes(h) ? 'text-right' :
                      ['Status','Actions'].includes(h) ? 'text-center' : 'text-left'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.staff_code}</div>
                      <div className="text-sm text-gray-500">{row.first_name} {row.last_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.dept_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.grade_level || '—'}</td>
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
                        onClick={() => { setSelectedEmployee(row); setShowTaxDetails(true); }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View breakdown"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900">TOTAL:</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{getCurrencySymbol()}{summary.totalGross.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{getCurrencySymbol()}{summary.totalPAYE.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-purple-600">{getCurrencySymbol()}{summary.totalPension.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-red-600">{getCurrencySymbol()}{summary.totalDeductions.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-green-600">{getCurrencySymbol()}{summary.totalNet.toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Nigerian Payroll — Statutory Rates (Finance Act 2023):</p>
            <p className="mt-1">
              PAYE: graduated bands 0%–25% after reliefs &nbsp;|&nbsp;
              Pension (PRA 2014): employee 8% + employer 10% of pensionable &nbsp;|&nbsp;
              NHF: employee 2.5% of basic &nbsp;|&nbsp;
              NHIS (NHIA 2022): employee 5% + employer 10% of basic
            </p>
          </div>
        </div>
      </div>

      {/* Tax modal */}
      {showTaxDetails && selectedEmployee && (
        <TaxBreakdownModal employee={selectedEmployee} onClose={() => setShowTaxDetails(false)} />
      )}
    </div>
  );
};

export default PayrollProcessing;
