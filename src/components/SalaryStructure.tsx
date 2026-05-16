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
  Plus
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
}

const SalaryStructure = () => {
  const [salaries, setSalaries] = useState<SalaryStructureData[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddModal, setShowAddModal] = useState(false);
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
    currency_code: 'NGN'
  });

  useEffect(() => {
    fetchSalaryData();
  }, []);

  // ✅ FIXED: Use fetch-based API calls
  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      // Fetch salary structures
      const salaryResponse = await api<any>('/SalaryStructureController.php');
      const staffResponse = await hrAPI.getStaff();
      
      if (salaryResponse.success) {
        setSalaries(salaryResponse.data || []);
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
      other_allowances: salary.other_allowances
    });
  };

  // ✅ FIXED: PUT request for update
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
    // Nigerian PAYE calculation (Monthly)
    if (total <= 30000) return total * 0.07;
    if (total <= 60000) return 2100 + (total - 30000) * 0.11;
    if (total <= 110000) return 5400 + (total - 60000) * 0.15;
    if (total <= 160000) return 12900 + (total - 110000) * 0.19;
    if (total <= 320000) return 22400 + (total - 160000) * 0.21;
    return 56000 + (total - 320000) * 0.24;
  };

  // ✅ FIXED: POST request for create
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
        currency_code: 'NGN'
      });
      fetchSalaryData();
    } catch (error) {
      console.error('Error adding salary structure:', error);
      alert('Failed to add salary structure');
    }
  };

  // Calculate summary statistics
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
          <p className="text-sm text-gray-500">Manage staff salaries and allowances (₦ NGN)</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Salary Structure
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Monthly Wage</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦{formatNumber(summary.totalMonthlyWage)}
                  </dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Salary</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦{formatNumber(summary.averageSalary)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Staff on Payroll</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{salaries.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calculator className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Estimated PAYE</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    ₦{formatNumber(calculatePAYE(summary.totalMonthlyWage))}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Structure Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-md font-medium text-gray-900">Staff Salary Details</h3>
          <p className="text-xs text-gray-500 mt-1">Showing {salaries.length} salary structure(s)</p>
        </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Housing</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transport</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Meal</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective From</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salaries.map((salary) => {
                  const total = calculateTotal(salary);
                  const currencySymbol = getCurrencySymbol(salary.currency_code || 'NGN');
                  return (
                    <tr key={salary.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {salary.first_name?.[0]}{salary.last_name?.[0]}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {salary.first_name} {salary.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{salary.position_name || 'N/A'}</div>
                          </div>
                        </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {salary.dept_name || 'N/A'}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {editingId === salary.id ? (
                          <input
                            type="number"
                            value={editForm.basic_salary}
                            onChange={(e) => setEditForm({...editForm, basic_salary: e.target.value})}
                            className="w-32 text-right border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          `${currencySymbol}${formatNumber(salary.basic_salary)}`
                        )}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {editingId === salary.id ? (
                          <input
                            type="number"
                            value={editForm.housing_allowance}
                            onChange={(e) => setEditForm({...editForm, housing_allowance: e.target.value})}
                            className="w-32 text-right border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          `${currencySymbol}${formatNumber(salary.housing_allowance || 0)}`
                        )}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {editingId === salary.id ? (
                          <input
                            type="number"
                            value={editForm.transport_allowance}
                            onChange={(e) => setEditForm({...editForm, transport_allowance: e.target.value})}
                            className="w-32 text-right border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          `${currencySymbol}${formatNumber(salary.transport_allowance || 0)}`
                        )}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {editingId === salary.id ? (
                          <input
                            type="number"
                            value={editForm.meal_allowance}
                            onChange={(e) => setEditForm({...editForm, meal_allowance: e.target.value})}
                            className="w-32 text-right border border-gray-300 rounded-md text-sm px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          `${currencySymbol}${formatNumber(salary.meal_allowance || 0)}`
                        )}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {currencySymbol}{formatNumber(total)}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(salary.effective_from).toLocaleDateString('en-NG')}
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingId === salary.id ? (
                          <div className="flex justify-end space-x-2">
                            <button onClick={() => handleSave(salary.id)} className="text-green-600 hover:text-green-900" title="Save">
                              <Save className="h-4 w-4" />
                            </button>
                            <button onClick={handleCancel} className="text-red-600 hover:text-red-900" title="Cancel">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEdit(salary)} className="text-blue-600 hover:text-blue-900" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="font-bold">
                  <td colSpan={6} className="px-6 py-4 text-right text-sm font-bold text-gray-900">GRAND TOTAL:</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                    ₦{formatNumber(summary.totalMonthlyWage)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add Salary Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddSalary}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Add Salary Structure
                      </h3>
                      <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Staff Member *</label>
                          <select
                            required
                            value={newSalary.staff_id}
                            onChange={(e) => setNewSalary({...newSalary, staff_id: e.target.value})}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            <option value="">Select Staff</option>
                            {staff.map(s => (
                              <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.staff_code})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Effective From *</label>
                          <input
                            type="date"
                            required
                            value={newSalary.effective_from}
                            onChange={(e) => setNewSalary({...newSalary, effective_from: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Currency</label>
                          <select
                            value={newSalary.currency_code}
                            onChange={(e) => setNewSalary({...newSalary, currency_code: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="NGN">Nigerian Naira (₦)</option>
                            <option value="USD">US Dollar ($)</option>
                            <option value="GBP">British Pound (£)</option>
                            <option value="EUR">Euro (€)</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Basic Salary *</label>
                            <input
                              type="number"
                              required
                              value={newSalary.basic_salary}
                              onChange={(e) => setNewSalary({...newSalary, basic_salary: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Housing Allowance</label>
                            <input
                              type="number"
                              value={newSalary.housing_allowance}
                              onChange={(e) => setNewSalary({...newSalary, housing_allowance: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Transport Allowance</label>
                            <input
                              type="number"
                              value={newSalary.transport_allowance}
                              onChange={(e) => setNewSalary({...newSalary, transport_allowance: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Meal Allowance</label>
                            <input
                              type="number"
                              value={newSalary.meal_allowance}
                              onChange={(e) => setNewSalary({...newSalary, meal_allowance: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Medical Allowance</label>
                            <input
                              type="number"
                              value={newSalary.medical_allowance}
                              onChange={(e) => setNewSalary({...newSalary, medical_allowance: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Communication Allowance</label>
                            <input
                              type="number"
                              value={newSalary.communication_allowance}
                              onChange={(e) => setNewSalary({...newSalary, communication_allowance: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Salary Structure
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
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