'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Edit, 
  Save, 
  X, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  Calculator,
  Plus,
  RefreshCw,
  Building2,
  Shield,
  Percent,
  Briefcase,
  Heart,
  Home,
  Landmark
} from 'lucide-react';
import { api, hrAPI } from '@/lib/api';

interface SalaryStructureData {
  id: number;
  staff_id: number;
  first_name: string;
  last_name: string;
  staff_code: string;
  dept_name: string;
  position_name: string;
  grade_level_id: number;
  grade_code: string;
  grade_name: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  medical_allowance: number;
  communication_allowance: number;
  risk_allowance: number;
  other_allowances: number;
  currency_code: string;
  effective_from: string;
  is_current: boolean;
  // New fields for advanced calculations
  salary_percentage_basic: number;
  salary_percentage_housing: number;
  salary_percentage_transport: number;
  salary_percentage_others: number;
  // Tax Reliefs
  house_rental_relief: number;
  life_assurance: number;
  gratuity: number;
  mortgage_interest: number;
  // Pension
  pfa_id: number;
  pfa_name: string;
  pension_pin: string;
  nhf_number: string;
}

interface GradeLevel {
  id: number;
  grade_code: string;
  grade_name: string;
  step: number;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
}

interface PFA {
  id: number;
  pfa_code: string;
  pfa_name: string;
}

const SalaryStructure = () => {
  const [salaries, setSalaries] = useState<SalaryStructureData[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [pfas, setPfas] = useState<PFA[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReliefModal, setShowReliefModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<SalaryStructureData | null>(null);
  const [activeTab, setActiveTab] = useState<'salary' | 'reliefs' | 'pension'>('salary');
  const [newSalary, setNewSalary] = useState({
    staff_id: '',
    effective_from: new Date().toISOString().split('T')[0],
    basic_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    meal_allowance: '',
    medical_allowance: '',
    communication_allowance: '',
    risk_allowance: '',
    other_allowances: '',
    currency_code: 'NGN',
    // Advanced fields
    grade_level_id: '',
    salary_percentage_basic: '50',
    salary_percentage_housing: '22',
    salary_percentage_transport: '15',
    salary_percentage_others: '13',
    // Reliefs
    house_rental_relief: '',
    life_assurance: '',
    gratuity: '',
    mortgage_interest: '',
    // Pension
    pfa_id: '',
    pension_pin: '',
    nhf_number: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSalaryData(),
        fetchGradeLevels(),
        fetchPFAs(),
        fetchStaff()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryData = async () => {
    const response = await api<any>('/SalaryStructureController.php');
    if (response.success) {
      setSalaries(response.data || []);
    }
  };

  const fetchStaff = async () => {
    const response = await hrAPI.getStaff();
    if (response.success) {
      setStaff(response.data || []);
    }
  };

  const fetchGradeLevels = async () => {
    try {
      const response = await api<any>('/GradeLevelController.php');
      if (response.success) {
        setGradeLevels(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching grade levels:', error);
    }
  };

  const fetchPFAs = async () => {
    try {
      const response = await api<any>('/PFAController.php');
      if (response.success) {
        setPfas(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching PFAs:', error);
    }
  };

  const handleGradeSelect = (gradeId: string) => {
    const grade = gradeLevels.find(g => g.id.toString() === gradeId);
    if (grade) {
      setNewSalary({
        ...newSalary,
        basic_salary: grade.basic_salary.toString(),
        housing_allowance: grade.housing_allowance.toString(),
        transport_allowance: grade.transport_allowance.toString(),
        meal_allowance: grade.meal_allowance.toString(),
        grade_level_id: gradeId
      });
    }
  };

  const handleEdit = (salary: SalaryStructureData) => {
    setEditingId(salary.id);
    setEditForm({
      basic_salary: salary.basic_salary,
      housing_allowance: salary.housing_allowance,
      transport_allowance: salary.transport_allowance,
      meal_allowance: salary.meal_allowance,
      medical_allowance: salary.medical_allowance,
      communication_allowance: salary.communication_allowance,
      risk_allowance: salary.risk_allowance,
      other_allowances: salary.other_allowances,
      house_rental_relief: salary.house_rental_relief,
      life_assurance: salary.life_assurance,
      gratuity: salary.gratuity,
      mortgage_interest: salary.mortgage_interest,
      pfa_id: salary.pfa_id,
      pension_pin: salary.pension_pin,
      nhf_number: salary.nhf_number
    });
  };

  const handleSave = async (id: number) => {
    try {
      await api('/SalaryStructureController.php', {
        method: 'PUT',
        body: JSON.stringify({ id, ...editForm })
      });
      setEditingId(null);
      fetchSalaryData();
    } catch (error) {
      console.error('Error saving salary structure:', error);
      alert('Failed to save changes');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/SalaryStructureController.php', {
        method: 'POST',
        body: JSON.stringify(newSalary)
      });
      setShowAddModal(false);
      resetNewSalaryForm();
      fetchSalaryData();
    } catch (error) {
      console.error('Error adding salary structure:', error);
      alert('Failed to add salary structure');
    }
  };

  const handleUpdateReliefs = async () => {
    if (!selectedSalary) return;
    try {
      await api('/SalaryStructureController.php', {
        method: 'PUT',
        body: JSON.stringify({ id: selectedSalary.id, ...editForm })
      });
      setShowReliefModal(false);
      setSelectedSalary(null);
      fetchSalaryData();
      alert('Reliefs updated successfully');
    } catch (error) {
      console.error('Error updating reliefs:', error);
      alert('Failed to update reliefs');
    }
  };

  const resetNewSalaryForm = () => {
    setNewSalary({
      staff_id: '',
      effective_from: new Date().toISOString().split('T')[0],
      basic_salary: '',
      housing_allowance: '',
      transport_allowance: '',
      meal_allowance: '',
      medical_allowance: '',
      communication_allowance: '',
      risk_allowance: '',
      other_allowances: '',
      currency_code: 'NGN',
      grade_level_id: '',
      salary_percentage_basic: '50',
      salary_percentage_housing: '22',
      salary_percentage_transport: '15',
      salary_percentage_others: '13',
      house_rental_relief: '',
      life_assurance: '',
      gratuity: '',
      mortgage_interest: '',
      pfa_id: '',
      pension_pin: '',
      nhf_number: ''
    });
  };

  const calculateTotal = (salary: SalaryStructureData) => {
    return (
      parseFloat(salary.basic_salary?.toString() || '0') +
      parseFloat(salary.housing_allowance?.toString() || '0') +
      parseFloat(salary.transport_allowance?.toString() || '0') +
      parseFloat(salary.meal_allowance?.toString() || '0') +
      parseFloat(salary.medical_allowance?.toString() || '0') +
      parseFloat(salary.communication_allowance?.toString() || '0') +
      parseFloat(salary.risk_allowance?.toString() || '0') +
      parseFloat(salary.other_allowances?.toString() || '0')
    );
  };

  const calculatePAYE = (total: number) => {
    if (total <= 30000) return total * 0.07;
    if (total <= 60000) return 2100 + (total - 30000) * 0.11;
    if (total <= 110000) return 5400 + (total - 60000) * 0.15;
    if (total <= 160000) return 12900 + (total - 110000) * 0.19;
    if (total <= 320000) return 22400 + (total - 160000) * 0.21;
    return 56000 + (total - 320000) * 0.24;
  };

  const calculateAnnualTaxRelief = (reliefs: any) => {
    const houseRelief = Math.min((reliefs.house_rental_relief || 0) * 0.20, 500000);
    const lifeRelief = Math.min((reliefs.life_assurance || 0) * 0.15, 200000);
    const gratuityRelief = Math.min((reliefs.gratuity || 0) * 0.10, 300000);
    const mortgageRelief = Math.min((reliefs.mortgage_interest || 0) * 0.15, 300000);
    return houseRelief + lifeRelief + gratuityRelief + mortgageRelief;
  };

  const summary = {
    totalMonthlyWage: salaries.reduce((sum, s) => sum + calculateTotal(s), 0),
    averageSalary: salaries.length ? (salaries.reduce((sum, s) => sum + calculateTotal(s), 0) / salaries.length) : 0,
    highestSalary: salaries.length ? Math.max(...salaries.map(s => calculateTotal(s))) : 0,
    lowestSalary: salaries.length ? Math.min(...salaries.map(s => calculateTotal(s))) : 0,
    totalPotentialRelief: salaries.reduce((sum, s) => sum + calculateAnnualTaxRelief(s), 0)
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Salary Structure</h2>
          <p className="text-sm text-gray-500">Manage staff salaries, allowances, and statutory reliefs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Salary Structure
        </button>
      </div>

      {/* Summary Cards - Enhanced */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Monthly Wage</p>
              <p className="text-2xl font-semibold">₦{formatNumber(summary.totalMonthlyWage)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Salary</p>
              <p className="text-2xl font-semibold">₦{formatNumber(summary.averageSalary)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Staff on Payroll</p>
              <p className="text-2xl font-semibold">{salaries.length}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Estimated PAYE</p>
              <p className="text-2xl font-semibold text-red-600">₦{formatNumber(calculatePAYE(summary.totalMonthlyWage))}</p>
            </div>
            <Calculator className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-lg border p-5 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Annual Tax Reliefs</p>
              <p className="text-2xl font-semibold text-green-700">₦{formatNumber(summary.totalPotentialRelief)}</p>
            </div>
            <Shield className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Salary Breakdown Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Percent className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Salary Percentage Breakdown (Standard Nigerian Structure)</p>
            <p className="mt-1">Basic: 50% | Housing: 22% | Transport: 15% | Other Allowances: 13%</p>
            <p className="text-xs mt-1 opacity-75">Pension is calculated on Basic + Housing + Transport (8% Employee | 10% Employer)</p>
          </div>
        </div>
      </div>

      {/* Salary Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-md font-medium text-gray-900">Staff Salary Details</h3>
            <p className="text-xs text-gray-500 mt-1">Showing {salaries.length} salary structure(s)</p>
          </div>
          <button onClick={fetchSalaryData} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : salaries.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No salary structures found</p>
            <p className="text-xs text-gray-400 mt-2">Click "Add Salary Structure" to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Grade</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Basic</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Housing</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Transport</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">PFA</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Reliefs</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaries.map((salary) => {
                  const total = calculateTotal(salary);
                  const totalRelief = calculateAnnualTaxRelief(salary);
                  return (
                    <tr key={salary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-700 font-medium text-sm">
                              {salary.first_name?.[0]}{salary.last_name?.[0]}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium">{salary.first_name} {salary.last_name}</div>
                            <div className="text-xs text-gray-500">{salary.staff_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {salary.grade_code || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">₦{formatNumber(salary.basic_salary)}</td>
                      <td className="px-6 py-4 text-sm text-right">₦{formatNumber(salary.housing_allowance)}</td>
                      <td className="px-6 py-4 text-sm text-right">₦{formatNumber(salary.transport_allowance)}</td>
                      <td className="px-6 py-4 text-sm text-right font-bold">₦{formatNumber(total)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{salary.pfa_name || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        {totalRelief > 0 ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                            ₦{formatNumber(totalRelief)}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSalary(salary);
                            setEditForm({
                              house_rental_relief: salary.house_rental_relief,
                              life_assurance: salary.life_assurance,
                              gratuity: salary.gratuity,
                              mortgage_interest: salary.mortgage_interest,
                              pfa_id: salary.pfa_id,
                              pension_pin: salary.pension_pin,
                              nhf_number: salary.nhf_number
                            });
                            setShowReliefModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-800"
                          title="Edit Reliefs & Pension"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(salary)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Salary"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-bold">
                  <td colSpan={5} className="px-6 py-4 text-right">GRAND TOTAL:</td>
                  <td className="px-6 py-4 text-right">₦{formatNumber(summary.totalMonthlyWage)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Salary Modal - Enhanced */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">Add Salary Structure</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAddSalary} className="p-6 space-y-4">
                {/* Staff & Grade Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                    <select
                      required
                      value={newSalary.staff_id}
                      onChange={(e) => setNewSalary({...newSalary, staff_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Staff</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.staff_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                    <select
                      value={newSalary.grade_level_id}
                      onChange={(e) => handleGradeSelect(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Grade (Auto-fill salary)</option>
                      {gradeLevels.map(g => (
                        <option key={g.id} value={g.id}>{g.grade_code} - {g.grade_name} (₦{formatNumber(g.basic_salary)})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Salary Percentage Breakdown
                  </h4>
                  <div className="grid grid-cols-4 gap-3 text-center text-sm">
                    <div className="bg-white rounded p-2">
                      <div className="font-bold text-blue-700">50%</div>
                      <div className="text-xs text-gray-500">Basic</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="font-bold text-blue-700">22%</div>
                      <div className="text-xs text-gray-500">Housing</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="font-bold text-blue-700">15%</div>
                      <div className="text-xs text-gray-500">Transport</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="font-bold text-blue-700">13%</div>
                      <div className="text-xs text-gray-500">Others</div>
                    </div>
                  </div>
                </div>

                {/* Salary Amounts */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary *</label>
                    <input
                      type="number"
                      required
                      value={newSalary.basic_salary}
                      onChange={(e) => setNewSalary({...newSalary, basic_salary: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="₦0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Housing Allowance</label>
                    <input
                      type="number"
                      value={newSalary.housing_allowance}
                      onChange={(e) => setNewSalary({...newSalary, housing_allowance: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transport Allowance</label>
                    <input
                      type="number"
                      value={newSalary.transport_allowance}
                      onChange={(e) => setNewSalary({...newSalary, transport_allowance: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meal Allowance</label>
                    <input
                      type="number"
                      value={newSalary.meal_allowance}
                      onChange={(e) => setNewSalary({...newSalary, meal_allowance: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Allowance</label>
                    <input
                      type="number"
                      value={newSalary.medical_allowance}
                      onChange={(e) => setNewSalary({...newSalary, medical_allowance: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Risk Allowance</label>
                    <input
                      type="number"
                      value={newSalary.risk_allowance}
                      onChange={(e) => setNewSalary({...newSalary, risk_allowance: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Effective Date & Currency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Effective From *</label>
                    <input
                      type="date"
                      required
                      value={newSalary.effective_from}
                      onChange={(e) => setNewSalary({...newSalary, effective_from: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={newSalary.currency_code}
                      onChange={(e) => setNewSalary({...newSalary, currency_code: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="NGN">Nigerian Naira (₦)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="GBP">British Pound (£)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                </div>

                {/* Pension & NHF Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Pension & NHF
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PFA (Pension Administrator)</label>
                      <select
                        value={newSalary.pfa_id}
                        onChange={(e) => setNewSalary({...newSalary, pfa_id: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select PFA</option>
                        {pfas.map(p => (
                          <option key={p.id} value={p.id}>{p.pfa_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pension PIN</label>
                      <input
                        type="text"
                        value={newSalary.pension_pin}
                        onChange={(e) => setNewSalary({...newSalary, pension_pin: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="e.g., 1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NHF Number</label>
                      <input
                        type="text"
                        value={newSalary.nhf_number}
                        onChange={(e) => setNewSalary({...newSalary, nhf_number: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Salary Structure
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reliefs & Pension Modal */}
      {showReliefModal && selectedSalary && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">Tax Reliefs & Pension Details</h3>
                <button onClick={() => setShowReliefModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {/* Tabs */}
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab('reliefs')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'reliefs' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                  >
                    <Home className="h-4 w-4 inline mr-2" />
                    Tax Reliefs
                  </button>
                  <button
                    onClick={() => setActiveTab('pension')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'pension' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                  >
                    <Landmark className="h-4 w-4 inline mr-2" />
                    Pension & NHF
                  </button>
                </div>

                {/* Tax Reliefs Tab */}
                {activeTab === 'reliefs' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Annual Tax Reliefs</strong> - These reduce your taxable income
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        House Rental Relief (Annual)
                      </label>
                      <input
                        type="number"
                        value={editForm.house_rental_relief || ''}
                        onChange={(e) => setEditForm({...editForm, house_rental_relief: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0.00"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max relief: ₦500,000 (20% of rental value)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Life Assurance Premium (Annual)
                      </label>
                      <input
                        type="number"
                        value={editForm.life_assurance || ''}
                        onChange={(e) => setEditForm({...editForm, life_assurance: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0.00"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max relief: ₦200,000 (15% of premium)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gratuity (Annual)
                      </label>
                      <input
                        type="number"
                        value={editForm.gratuity || ''}
                        onChange={(e) => setEditForm({...editForm, gratuity: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0.00"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max relief: ₦300,000 (10% of gratuity)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mortgage Interest (Annual)
                      </label>
                      <input
                        type="number"
                        value={editForm.mortgage_interest || ''}
                        onChange={(e) => setEditForm({...editForm, mortgage_interest: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0.00"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max relief: ₦300,000 (15% of interest)</p>
                    </div>
                  </div>
                )}

                {/* Pension & NHF Tab */}
                {activeTab === 'pension' && (
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>Pension (PRA 2014):</strong> Employee 8% | Employer 10% of Basic + Housing + Transport
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PFA (Pension Administrator)</label>
                      <select
                        value={editForm.pfa_id || ''}
                        onChange={(e) => setEditForm({...editForm, pfa_id: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select PFA</option>
                        {pfas.map(p => (
                          <option key={p.id} value={p.id}>{p.pfa_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pension PIN</label>
                      <input
                        type="text"
                        value={editForm.pension_pin || ''}
                        onChange={(e) => setEditForm({...editForm, pension_pin: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="e.g., 1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">NHF Number</label>
                      <input
                        type="text"
                        value={editForm.nhf_number || ''}
                        onChange={(e) => setEditForm({...editForm, nhf_number: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowReliefModal(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateReliefs}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryStructure;
