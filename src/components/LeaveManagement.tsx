'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Download,
  User,
  FileText,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { api, hrAPI } from '@/lib/api';

interface LeaveType {
  id: number;
  leave_code: string;
  leave_name: string;
  default_days: number;
  is_paid: boolean;
  carry_forward_allowed: boolean;
  max_carry_forward_days: number;
}

interface LeaveRequest {
  id: number;
  staff_id: number;
  staff_code: string;
  first_name: string;
  last_name: string;
  leave_type_id: number;
  leave_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  rejection_reason: string | null;
  created_at: string;
  approved_by_name?: string;
}

interface LeaveBalance {
  id: number;
  staff_id: number;
  leave_type_id: number;
  leave_name: string;
  year: number;
  total_entitled: number;
  taken: number;
  carried_forward: number;
  balance: number;
}

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [formData, setFormData] = useState({
    staff_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ FIXED: Use fetch-based API calls
  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, typesRes, staffRes, balancesRes] = await Promise.all([
        api<any>('/LeaveController.php?action=requests'),
        api<any>('/LeaveController.php?action=types'),
        hrAPI.getStaff(),
        api<any>('/LeaveController.php?action=balances')
      ]);
      
      if (leavesRes.success) setLeaves(leavesRes.data || []);
      if (typesRes.success) setLeaveTypes(typesRes.data || []);
      if (staffRes.success) setStaff(staffRes.data || []);
      if (balancesRes.success) setLeaveBalances(balancesRes.data || []);
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLeaveDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // ✅ FIXED: POST request for create
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = calculateLeaveDays(formData.start_date, formData.end_date);
    
    try {
      await api('/LeaveController.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          ...formData,
          total_days: days
        })
      });
      setShowModal(false);
      setFormData({
        staff_id: '',
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating leave request:', error);
      alert('Failed to create leave request');
    }
  };

  // ✅ FIXED: PUT requests for approve/reject
  const handleAction = async (id: number, action: string, reason: string | null = null) => {
    try {
      if (action === 'approve') {
        await api('/LeaveController.php', {
          method: 'PUT',
          body: JSON.stringify({ action: 'approve', id })
        });
      } else if (action === 'reject') {
        const rejectReason = prompt('Enter rejection reason:');
        if (rejectReason) {
          await api('/LeaveController.php', {
            method: 'PUT',
            body: JSON.stringify({ action: 'reject', id, rejection_reason: rejectReason })
          });
        } else return;
      }
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing leave:`, error);
      alert(`Failed to ${action} leave request`);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getLeaveTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Annual Leave': 'bg-blue-100 text-blue-800',
      'Sick Leave': 'bg-red-100 text-red-800',
      'Compassionate Leave': 'bg-purple-100 text-purple-800',
      'Maternity Leave': 'bg-pink-100 text-pink-800',
      'Paternity Leave': 'bg-indigo-100 text-indigo-800',
      'Unpaid Leave': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    const headers = ['Staff', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Requested On'];
    const rows = filteredLeaves.map(leave => [
      `${leave.first_name} ${leave.last_name}`,
      leave.leave_name,
      new Date(leave.start_date).toLocaleDateString(),
      new Date(leave.end_date).toLocaleDateString(),
      leave.total_days,
      leave.reason,
      leave.status,
      new Date(leave.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredLeaves = filterStatus === 'all' 
    ? leaves 
    : leaves.filter(l => l.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Leave Management</h2>
          <p className="text-sm text-gray-500">Manage staff leave requests and balances</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Leave Request
          </button>
        </div>
      </div>

      {/* Leave Balances Cards */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">Leave Balances Summary</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {leaveTypes.map(type => {
            const balance = leaveBalances.find(b => b.leave_type_id === type.id);
            return (
              <div key={type.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{type.leave_name}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {balance?.balance || 0}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(type.leave_name)}`}>
                    {type.default_days} days/year
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Taken: {balance?.taken || 0} days
                  {type.carry_forward_allowed && balance?.carried_forward ? ` | Carried: ${balance.carried_forward}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filterStatus === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('Pending')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filterStatus === 'Pending' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('Approved')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filterStatus === 'Approved' 
                  ? 'bg-green-100 text-green-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('Rejected')}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                filterStatus === 'Rejected' 
                  ? 'bg-red-100 text-red-800' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Rejected
            </button>
          </div>
          <button 
            onClick={exportToCSV}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Export to CSV"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No leave requests found</p>
            <p className="text-xs text-gray-400 mt-2">Click "New Leave Request" to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested On</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {leave.first_name?.[0]}{leave.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {leave.first_name} {leave.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{leave.staff_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLeaveTypeColor(leave.leave_name)}`}>
                        {leave.leave_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {leave.total_days} days
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {leave.reason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(leave.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {leave.status === 'Pending' && (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleAction(leave.id, 'approve')}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAction(leave.id, 'reject')}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      {leave.status === 'Rejected' && leave.rejection_reason && (
                        <div className="text-xs text-red-600 text-right">
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          {leave.rejection_reason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-sm text-gray-500">
                    Total: {filteredLeaves.length} request(s)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Leave Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        New Leave Request
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Staff Member *</label>
                          <select
                            required
                            value={formData.staff_id}
                            onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            <option value="">Select Staff</option>
                            {staff.map(s => (
                              <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.staff_code})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Leave Type *</label>
                          <select
                            required
                            value={formData.leave_type_id}
                            onChange={(e) => setFormData({...formData, leave_type_id: e.target.value})}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            <option value="">Select Leave Type</option>
                            {leaveTypes.map(lt => (
                              <option key={lt.id} value={lt.id}>{lt.leave_name} ({lt.default_days} days)</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                            <input
                              type="date"
                              required
                              value={formData.start_date}
                              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">End Date *</label>
                            <input
                              type="date"
                              required
                              value={formData.end_date}
                              onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Reason *</label>
                          <textarea
                            rows={3}
                            required
                            value={formData.reason}
                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Please provide reason for leave..."
                          />
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
                    Submit Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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

export default LeaveManagement;