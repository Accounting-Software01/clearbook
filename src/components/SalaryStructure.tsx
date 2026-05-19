'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Edit, 
  Save, 
  X, 
  TrendingUp,
  Users,
  Calculator,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Building2,
  Shield,
  Percent
} from 'lucide-react';
import { api, hrAPI } from '@/lib/api';

interface SalaryStructureData {
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
  other_allowances: number;
  total_monthly: number;
  currency_code: string;
  effective_from: string;
  is_current: boolean;
  // Reliefs
  house_rental_relief: number;
  life_assurance: number;
  gratuity: number;
  mortgage_interest: number;
  // Pension
  pfa_name: string;
  pension_pin: string;
  nhf_number: string;
  // Percentages
  salary_percentage_basic: number;
  salary_percentage_transport: number;
  salary_percentage_housing: number;
  salary_percentage_others: number;
}

interface GradeLevel {
  id: number;
  grade_code: string;
  grade_name: string;
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
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
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
    // Reliefs
    house_rental_relief: '',
    life_assurance: '',
    gratuity: '',
    mortgage_interest: '',
    // Pension
    pfa_id: '',
    pension_pin: '',
    nhf_number: '',
    // Grade
    grade_level_id: '',
    // Percentages
    salary_percentage_basic: '50',
    salary_percentage_transport: '15',
    salary_percentage_housing: '22',
    salary_percentage_others: '13'
  });

  useEffect(() => {
    fetchSalaryData();
    fetchGradeLevels();
    fetchPFAs();
  }, []);

  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      const response = await api<any>('/SalaryStructureController.php');
      const staffResponse = await hrAPI.getStaff();
      
      if (response.success) {
        setSalaries(response.data || []);
      }
      if (staffResponse.success) {
        setStaff(staffResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching salary data:', error);
    } finally {
      setLoading(false);
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
      setSelectedGrade(grade);
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

  const handleAddSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/SalaryStructureController.php', {
        method: 'POST',
        body: JSON.stringify(newSalary)
      });
      setShowAddModal(false);
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
        house_rental_relief: '',
        life_assurance: '',
        gratuity: '',
        mortgage_interest: '',
        pfa_id: '',
        pension_pin: '',
        nhf_number: '',
        grade_level_id: '',
        salary_percentage_basic: '50',
        salary_percentage_transport: '15',
        salary_percentage_housing: '22',
        salary_percentage_others: '13'
      });
      setSelectedGrade(null);
      fetchSalaryData();
    } catch (error) {
      console.error('Error adding salary structure:', error);
      alert('Failed to add salary structure');
    }
  };

  const summary = {
    totalMonthlyWage: salaries.reduce((sum, s) => sum + calculateTotal(s), 0),
    averageSalary: salaries.length ? (salaries.reduce((sum, s) => sum + calculateTotal(s), 0) / salaries.length) : 0,
    highestSalary: salaries.length ? Math.max(...salaries.map(s => calculateTotal(s))) : 0,
    lowestSalary: salaries.length ? Math.min(...salaries.map(s => calculateTotal(s))) : 0
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      {/* Salary Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-md font-medium text-gray-900">Staff Salary Details</h3>
          <p className="text-xs text-gray-500 mt-1">Showing {salaries.length} salary structure(s)</p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : salaries.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No salary structures found</p>
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaries.map((salary) => {
                  const total = calculateTotal(salary);
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
                      <td className="px-6 py-4 text-sm text-gray-500">{salary.grade_level || '-'}</td>
                      <td className="px-6 py-4 text-sm text-right">₦{formatNumber(salary.basic_salary)}</td>
                      <td className="px-6 py-4 text-sm text-right">₦{formatNumber(salary.housing_allowance)}</td>
                      <td className="px-6 py-4 text-sm text-right">₦{formatNumber(salary.transport_allowance)}</td>
                      <td className="px-6 py-4 text-sm text-right font-bold">₦{formatNumber(total)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{salary.pfa_name || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Edit className="h-4 w-4" />
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

      {/* Add Salary Modal */}
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
                {/* Staff Selection & Grade */}
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
                      <option value="">Select Grade</option>
                      {gradeLevels.map(g => (
                        <option key={g.id} value={g.id}>{g.grade_code} - {g.grade_name}</option>
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
                </div>

                {/* Tax Reliefs Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Tax Reliefs (Annual)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">House Rental Relief</label>
                      <input
                        type="number"
                        value={newSalary.house_rental_relief}
                        onChange={(e) => setNewSalary({...newSalary, house_rental_relief: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max ₦500,000 (20% of rental)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Life Assurance</label>
                      <input
                        type="number"
                        value={newSalary.life_assurance}
                        onChange={(e) => setNewSalary({...newSalary, life_assurance: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max ₦200,000 (15% of premium)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gratuity</label>
                      <input
                        type="number"
                        value={newSalary.gratuity}
                        onChange={(e) => setNewSalary({...newSalary, gratuity: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max ₦300,000 (10% of gratuity)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mortgage Interest</label>
                      <input
                        type="number"
                        value={newSalary.mortgage_interest}
                        onChange={(e) => setNewSalary({...newSalary, mortgage_interest: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2"
                        placeholder="₦0"
                      />
                      <p className="text-xs text-gray-400 mt-1">Max ₦300,000 (15% of interest)</p>
                    </div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                      <input
                        type="date"
                        required
                        value={newSalary.effective_from}
                        onChange={(e) => setNewSalary({...newSalary, effective_from: e.target.value})}
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
    </div>
  );
};

export default SalaryStructure;
