'use client';

import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Download, 
  Printer, 
  Search, 
  Calendar,
  Eye,
  RefreshCw,
  Plus,
  X,
  CheckCircle
} from 'lucide-react';
import { api, hrAPI } from '@/lib/api';

interface PayslipData {
  id: number;
  staff_id: number;
  staff_code: string;
  first_name: string;
  last_name: string;
  payroll_month: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  medical_allowance: number;
  communication_allowance: number;
  risk_allowance: number;
  overtime_pay: number;
  bonus: number;
  total_earnings: number;
  paye_tax: number;
  pension_employee: number;
  pension_employer: number;
  nhf_employee: number;
  nhf_employer: number;
  nhis_employee: number;      // ✅ Added NHIS employee
  nhis_employer: number;      // ✅ Added NHIS employer
  advance_deduction: number;
  loan_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  bank_name: string;
  bank_account_number: string;
  department: string;
  position: string;
  grade: string;
  currency_code: string;
  status: string;
  national_id: string;
  nhif_no: string;
}

const PayslipGenerator = () => {
  const [payslips, setPayslips] = useState<PayslipData[]>([]);
  const [filteredPayslips, setFilteredPayslips] = useState<PayslipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [generateForm, setGenerateForm] = useState({
    staff_id: '',
    payroll_month: new Date().toISOString().slice(0, 7)
  });

  useEffect(() => {
    fetchPayslips();
    fetchStaff();
    fetchCompanyDetails();
  }, []);

  useEffect(() => {
    filterPayslips();
  }, [searchTerm, selectedMonth, selectedStaff, payslips]);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      let url = '/PayslipController.php';
      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth);
      if (selectedStaff) params.append('staff_id', selectedStaff);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await api<any>(url);
      if (response.success) {
        setPayslips(response.data || []);
        setFilteredPayslips(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await hrAPI.getStaff();
      if (response.success) {
        setStaffList(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchCompanyDetails = async () => {
    try {
      const response = await api<any>('/CompanyController.php');
      if (response.success) {
        setCompanyDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  const filterPayslips = () => {
    let filtered = [...payslips];
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.staff_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedMonth) {
      filtered = filtered.filter(p => p.payroll_month === selectedMonth);
    }
    
    if (selectedStaff) {
      filtered = filtered.filter(p => p.staff_id.toString() === selectedStaff);
    }
    
    setFilteredPayslips(filtered);
  };

  const generatePayslip = async () => {
    if (!generateForm.staff_id) {
      alert('Please select a staff member');
      return;
    }
    
    setGenerating(true);
    try {
      const response = await api('/PayslipController.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'generate',
          staff_id: generateForm.staff_id,
          payroll_month: generateForm.payroll_month
        })
      });
      
      if (response.success) {
        alert('Payslip generated successfully!');
        setShowGenerateModal(false);
        setGenerateForm({
          staff_id: '',
          payroll_month: new Date().toISOString().slice(0, 7)
        });
        fetchPayslips();
      } else {
        alert(response.message || 'Failed to generate payslip');
      }
    } catch (error) {
      console.error('Error generating payslip:', error);
      alert('Failed to generate payslip');
    } finally {
      setGenerating(false);
    }
  };

  const downloadPayslip = async (payslipId: number) => {
    try {
      const url = `https://hariindustries.net/api/clearbook/PayslipController.php/download/${payslipId}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Failed to download payslip');
    }
  };

  const printPayslip = (payslip: PayslipData) => {
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) {
      printWindow.document.write(getPayslipHTML(payslip, companyDetails));
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    switch(currencyCode) {
      case 'USD': return '$';
      case 'GBP': return '£';
      case 'EUR': return '€';
      default: return '₦';
    }
  };

  const formatNumber = (num: number) => {
    return num?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
  };

  const getMonthOptions = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push(monthDate.toISOString().slice(0, 7));
    }
    return months;
  };

  const getPayslipHTML = (payslip: PayslipData, company: any) => {
    const monthYear = payslip.payroll_month ? 
      new Date(payslip.payroll_month + '-01').toLocaleDateString('en-NG', { 
        year: 'numeric', 
        month: 'long' 
      }) : 'Unknown Month';
    
    const currencySymbol = getCurrencySymbol(payslip.currency_code || 'NGN');
    
    const totalEarnings = payslip.total_earnings || 
      (payslip.basic_salary + (payslip.housing_allowance || 0) + (payslip.transport_allowance || 0) + 
       (payslip.meal_allowance || 0) + (payslip.medical_allowance || 0) + (payslip.communication_allowance || 0) + 
       (payslip.risk_allowance || 0) + (payslip.overtime_pay || 0) + (payslip.bonus || 0));
    
    const totalDeductions = payslip.total_deductions ||
      ((payslip.paye_tax || 0) + (payslip.pension_employee || 0) + (payslip.nhf_employee || 0) +
       (payslip.nhis_employee || 0) + (payslip.advance_deduction || 0) + (payslip.loan_deduction || 0) + 
       (payslip.other_deductions || 0));

    // Calculate pension percentage for display
    const pensionablePay = payslip.basic_salary + (payslip.housing_allowance || 0) + (payslip.transport_allowance || 0);
    const employeePensionPercent = pensionablePay > 0 ? ((payslip.pension_employee / pensionablePay) * 100).toFixed(1) : 0;
    const employerPensionPercent = pensionablePay > 0 ? ((payslip.pension_employer / pensionablePay) * 100).toFixed(1) : 0;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pay Statement - ${payslip.staff_code} - ${monthYear}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            background: white;
            padding: 40px 20px;
            color: #000;
          }
          .payslip-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border: 1px solid #ccc;
            padding: 25px 30px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #000;
          }
          .company-name {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .company-address {
            font-size: 9pt;
            color: #333;
            margin-top: 5px;
          }
          .pay-statement {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 15px;
            text-transform: uppercase;
          }
          .pay-period {
            font-size: 10pt;
            font-style: italic;
            margin-top: 3px;
          }
          
          .info-grid {
            margin: 15px 0;
            border: 1px solid #ddd;
          }
          .info-row {
            display: flex;
            border-bottom: 1px solid #eee;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            width: 35%;
            padding: 6px 12px;
            font-weight: 600;
            background: #f9f9f9;
            border-right: 1px solid #eee;
          }
          .info-value {
            width: 65%;
            padding: 6px 12px;
          }
          
          .two-column {
            display: flex;
            margin: 15px 0;
            gap: 20px;
          }
          .column {
            flex: 1;
          }
          .section-title {
            font-weight: bold;
            font-size: 11pt;
            padding: 6px 0;
            border-bottom: 1px solid #000;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .earning-item, .deduction-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dotted #eee;
          }
          .item-label {
            font-size: 10pt;
          }
          .item-amount {
            font-size: 10pt;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            margin-top: 5px;
            font-weight: bold;
            border-top: 1px solid #000;
          }
          
          .net-pay-section {
            margin: 20px 0 15px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
          .net-pay-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }
          .net-pay-label {
            font-size: 12pt;
            font-weight: bold;
          }
          .net-pay-amount {
            font-size: 16pt;
            font-weight: bold;
          }
          .amount-payable {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #ccc;
          }
          
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            text-align: center;
            font-size: 8pt;
            color: #666;
            border-top: 1px solid #eee;
          }
          .note {
            margin-top: 10px;
            font-size: 8pt;
            color: #555;
            text-align: center;
          }
          
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .payslip-container {
              border: none;
              padding: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="payslip-container">
          <div class="header">
            <div class="company-name">${company?.company_name || 'COMPANY NAME'}</div>
            <div class="company-address">
              ${company?.address_line1 || ''}${company?.city ? ', ' + company.city : ''}${company?.state ? ', ' + company.state : ''}
            </div>
            <div class="pay-statement">PAY STATEMENT</div>
            <div class="pay-period">${monthYear} [Month End]</div>
          </div>
          
          <div class="info-grid">
            <div class="info-row">
              <div class="info-label">Personal No.</div>
              <div class="info-value">${payslip.staff_code || '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Name</div>
              <div class="info-value">${payslip.first_name || ''} ${payslip.last_name || ''}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Grade</div>
              <div class="info-value">${payslip.grade || 'N/A'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Designation</div>
              <div class="info-value">${payslip.position || 'N/A'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Department</div>
              <div class="info-value">${payslip.department || 'N/A'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Bank</div>
              <div class="info-value">${payslip.bank_name || 'N/A'}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Account No.</div>
              <div class="info-value">${payslip.bank_account_number || 'N/A'}</div>
            </div>
          </div>
          
          <div class="two-column">
            <div class="column">
              <div class="section-title">EARNINGS</div>
              <div class="earning-item">
                <span class="item-label">Consolidated Salary</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.basic_salary)}</span>
              </div>
              ${(payslip.risk_allowance || 0) > 0 ? `
              <div class="earning-item">
                <span class="item-label">Occupational Hazard</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.risk_allowance)}</span>
              </div>
              ` : ''}
              ${(payslip.housing_allowance || 0) > 0 ? `
              <div class="earning-item">
                <span class="item-label">Housing Allowance</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.housing_allowance)}</span>
              </div>
              ` : ''}
              ${(payslip.transport_allowance || 0) > 0 ? `
              <div class="earning-item">
                <span class="item-label">Transport Allowance</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.transport_allowance)}</span>
              </div>
              ` : ''}
              ${(payslip.meal_allowance || 0) > 0 ? `
              <div class="earning-item">
                <span class="item-label">Meal Allowance</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.meal_allowance)}</span>
              </div>
              ` : ''}
              <div class="total-row">
                <span>Gross Pay</span>
                <span>${currencySymbol}${formatNumber(totalEarnings)}</span>
              </div>
            </div>
            
            <div class="column">
              <div class="section-title">DEDUCTIONS</div>
              <div class="deduction-item">
                <span class="item-label">Pay As You Earn (PAYE)</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.paye_tax)}</span>
              </div>
              <div class="deduction-item">
                <span class="item-label">Pension (Employee 8%)</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.pension_employee)}</span>
              </div>
              <div class="deduction-item">
                <span class="item-label">NHIS (Employee 5%)</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.nhis_employee || 0)}</span>
              </div>
              <div class="deduction-item">
                <span class="item-label">National Housing Fund (NHF 2.5%)</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.nhf_employee)}</span>
              </div>
              ${(payslip.advance_deduction || 0) > 0 ? `
              <div class="deduction-item">
                <span class="item-label">Salary Advance</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.advance_deduction)}</span>
              </div>
              ` : ''}
              ${(payslip.loan_deduction || 0) > 0 ? `
              <div class="deduction-item">
                <span class="item-label">Loan Deduction</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.loan_deduction)}</span>
              </div>
              ` : ''}
              ${(payslip.other_deductions || 0) > 0 ? `
              <div class="deduction-item">
                <span class="item-label">Other Deductions</span>
                <span class="item-amount">${currencySymbol}${formatNumber(payslip.other_deductions)}</span>
              </div>
              ` : ''}
              <div class="total-row">
                <span>Total Deductions</span>
                <span>${currencySymbol}${formatNumber(totalDeductions)}</span>
              </div>
            </div>
          </div>
          
          <div class="net-pay-section">
            <div class="net-pay-row">
              <span class="net-pay-label">NET PAY</span>
              <span class="net-pay-amount">${currencySymbol}${formatNumber(payslip.net_pay)}</span>
            </div>
            <div class="amount-payable">
              <span>TOTAL AMOUNT PAYABLE</span>
              <span>${currencySymbol}${formatNumber(payslip.net_pay)}</span>
            </div>
          </div>
          
          <div class="footer">
            <div>Generated on: ${new Date().toLocaleString('en-NG')}</div>
            <div class="note">
              <strong>📝 Note:</strong> This payslip is computer-generated and requires no signature.<br>
              Pension (PRA 2014): Employee 8% | Employer 10% of Basic + Housing + Transport<br>
              NHIS (NHIA 2022): Employee 5% | Employer 10% of Basic Salary<br>
              NHF: 2.5% of Basic Salary
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Payslip Generator</h2>
          <p className="text-sm text-gray-500">Generate, view, download and print staff payslips</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Payslip
          </button>
          <button
            onClick={fetchPayslips}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Staff</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name or Staff Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                fetchPayslips();
              }}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Months</option>
              {getMonthOptions().map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleDateString('en-NG', { year: 'numeric', month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member</label>
            <select
              value={selectedStaff}
              onChange={(e) => {
                setSelectedStaff(e.target.value);
                fetchPayslips();
              }}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Staff</option>
              {staffList.map((staff: any) => (
                <option key={staff.id} value={staff.id}>
                  {staff.first_name} {staff.last_name} ({staff.staff_code})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMonth('');
                setSelectedStaff('');
                fetchPayslips();
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-medium">Generate Payslip</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff</label>
                <select
                  value={generateForm.staff_id}
                  onChange={(e) => setGenerateForm({...generateForm, staff_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg py-2 px-3"
                  required
                >
                  <option value="">Select Staff Member</option>
                  {staffList.map((staff: any) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.first_name} {staff.last_name} ({staff.staff_code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payroll Month</label>
                <input
                  type="month"
                  value={generateForm.payroll_month}
                  onChange={(e) => setGenerateForm({...generateForm, payroll_month: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg py-2 px-3"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={generatePayslip}
                disabled={generating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslips Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-md font-medium text-gray-900">Staff Payslips</h3>
          <p className="text-xs text-gray-500 mt-1">Showing {filteredPayslips.length} payslip(s)</p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No payslips found</p>
            <p className="text-xs text-gray-400 mt-2">Click "Generate Payslip" to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Pay</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayslips.map((payslip) => {
                  const currencySymbol = getCurrencySymbol(payslip.currency_code || 'NGN');
                  return (
                    <tr key={payslip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 font-medium">
                              {payslip.first_name?.[0]}{payslip.last_name?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {payslip.first_name} {payslip.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{payslip.staff_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payslip.payroll_month + '-01').toLocaleDateString('en-NG', { year: 'numeric', month: 'long' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        {currencySymbol}{formatNumber(payslip.total_earnings)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                        {currencySymbol}{formatNumber(payslip.total_deductions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                        {currencySymbol}{formatNumber(payslip.net_pay)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Generated
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => printPayslip(payslip)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Print Payslip"
                        >
                          <Printer className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => downloadPayslip(payslip.id)}
                          className="text-blue-600 hover:text-blue-900 ml-2"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4 inline" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPayslip(payslip);
                            setShowPreview(true);
                          }}
                          className="text-green-600 hover:text-green-900 ml-2"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedPayslip && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">Payslip Preview</h3>
                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6" dangerouslySetInnerHTML={{ __html: getPayslipHTML(selectedPayslip, companyDetails) }} />
              <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end space-x-3">
                <button
                  onClick={() => printPayslip(selectedPayslip)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  <Printer className="h-4 w-4 inline mr-2" />
                  Print
                </button>
                <button
                  onClick={() => downloadPayslip(selectedPayslip.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipGenerator;
