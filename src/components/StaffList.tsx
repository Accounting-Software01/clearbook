'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { hrAPI, onLoadingChange } from '@/lib/api';
import StaffModal from './StaffModal';

interface Staff {
  id: number;
  staff_code: string;
  first_name: string;
  last_name: string;
  personal_email: string;
  phone_number: string;
  department_id: number;
  dept_name: string;
  position_name: string;
  employment_status: string;
  basic_salary: number;
  profile_image: string | null;
}

interface Department {
  id: number;
  dept_code: string;
  dept_name: string;
}

const StaffList = () => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStaff, setTotalStaff] = useState(0);
  const itemsPerPage = 10;

  // Track global loading state
  useEffect(() => {
    const unsubscribe = onLoadingChange(setGlobalLoading);
    return unsubscribe;
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, [searchTerm, selectedDepartment, selectedStatus, currentPage]);

  // Fetch staff using hrAPI
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await hrAPI.getStaff({
        search: searchTerm || undefined,
        department_id: selectedDepartment ? parseInt(selectedDepartment) : undefined,
        status: selectedStatus || undefined,
        page: currentPage,
        limit: itemsPerPage
      });
      
      if (response.success) {
        setStaff(response.data || []);
        setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
        setTotalStaff(response.total || 0);
      } else {
        console.error('Failed to fetch staff:', response.message);
        setStaff([]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments using hrAPI
  const fetchDepartments = async () => {
    try {
      const departmentsData = await hrAPI.getDepartments();
      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  // Delete staff using hrAPI
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const response = await hrAPI.deleteStaff(id);
        if (response.success) {
          await fetchStaff(); // Refresh list
        } else {
          alert(response.message || 'Failed to delete staff member');
        }
      } catch (error) {
        console.error('Error deleting staff:', error);
        alert('Failed to delete staff member');
      }
    }
  };

  // Refresh data
  const handleRefresh = () => {
    fetchStaff();
    fetchDepartments();
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedStatus('');
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Active': 'bg-green-100 text-green-800',
      'On Leave': 'bg-yellow-100 text-yellow-800',
      'Terminated': 'bg-red-100 text-red-800',
      'Suspended': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Loading Overlay */}
      {(loading || globalLoading) && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}

      {/* Header with Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-md w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, staff code, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          {/* Filters and Actions */}
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.dept_name}</option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>
            
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Reset
            </button>
            
            <button
              onClick={handleRefresh}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => {
                setSelectedStaff(null);
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </button>
          </div>
        </div>
        
        {/* Results Count */}
        {!loading && (
          <div className="text-sm text-gray-500">
            Showing {staff.length} of {totalStaff} staff members
          </div>
        )}
      </div>

      {/* Staff Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No staff members found</p>
            <button
              onClick={() => {
                setSelectedStaff(null);
                setShowModal(true);
              }}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              + Add your first staff member
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staff.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {employee.profile_image ? (
                              <img src={employee.profile_image} alt="" className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {employee.first_name?.[0]}{employee.last_name?.[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{employee.staff_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.dept_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.position_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{employee.personal_email}</div>
                        <div className="text-xs text-gray-500">{employee.phone_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(employee.employment_status)}`}>
                          {employee.employment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => {
                            setSelectedStaff(employee);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Staff Form Modal */}
      <StaffModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedStaff(null);
        }}
        onSave={() => {
          fetchStaff();
          setShowModal(false);
          setSelectedStaff(null);
        }}
        staff={selectedStaff}
      />
    </div>
  );
};

export default StaffList;