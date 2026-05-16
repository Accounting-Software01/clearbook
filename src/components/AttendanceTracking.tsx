'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { api, hrAPI } from '@/lib/api';

interface AttendanceRecord {
  id: number;
  staff_id: number;
  attendance_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
  overtime_hours: number;
  late_minutes: number;
  early_departure_minutes: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Leave' | 'Weekend';
  notes: string | null;
}

interface StaffMember {
  id: number;
  staff_code: string;
  first_name: string;
  last_name: string;
  dept_name: string;
  department_id: number;
  position_name: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  totalStaff: number;
  attendanceRate: number;
}

const AttendanceTracking = () => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState<AttendanceSummary>({
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    totalStaff: 0,
    attendanceRate: 0
  });
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    fetchAttendance();
    fetchStaff();
    fetchDepartments();
  }, [selectedDate]);

  // ✅ FIXED: Use fetch-based API calls
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await api<any>(`/AttendanceController.php?date=${selectedDate}`);
      if (response.success) {
        setAttendance(response.data?.attendance || []);
        setSummary(response.data?.summary || {
          present: 0,
          absent: 0,
          late: 0,
          onLeave: 0,
          totalStaff: 0,
          attendanceRate: 0
        });
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await hrAPI.getStaff();
      if (response.success) {
        setStaff(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api<any>('/DepartmentController.php');
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // ✅ FIXED: POST request for updating attendance
  const updateAttendance = async (staffId: number, status: string, notes: string = '') => {
    try {
      await api('/AttendanceController.php', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: staffId,
          attendance_date: selectedDate,
          status: status,
          clock_in_time: status === 'Present' ? new Date().toLocaleTimeString() : null,
          clock_out_time: status === 'Present' ? new Date().toLocaleTimeString() : null,
          notes: notes
        })
      });
      fetchAttendance();
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance');
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Present': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Absent': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'Late': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'Leave': return <Calendar className="h-5 w-5 text-blue-500" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'Present': 'bg-green-100 text-green-800',
      'Absent': 'bg-red-100 text-red-800',
      'Late': 'bg-yellow-100 text-yellow-800',
      'Leave': 'bg-blue-100 text-blue-800',
      'Half Day': 'bg-orange-100 text-orange-800',
      'Holiday': 'bg-purple-100 text-purple-800',
      'Weekend': 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const exportToCSV = () => {
    const headers = ['Staff Code', 'Staff Name', 'Department', 'Status', 'Clock In', 'Clock Out', 'Hours', 'Notes'];
    const rows = filteredStaff.map(employee => {
      const record = attendance.find(a => a.staff_id === employee.id);
      return [
        employee.staff_code,
        `${employee.first_name} ${employee.last_name}`,
        employee.dept_name || 'N/A',
        record?.status || 'Absent',
        record?.clock_in_time || '-',
        record?.clock_out_time || '-',
        record?.total_hours || '-',
        record?.notes || '-'
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredStaff = staff.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.staff_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDepartment === 'all' || employee.department_id.toString() === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Attendance Tracking</h2>
          <p className="text-sm text-gray-500">Track daily staff attendance and working hours</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchAttendance}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              Today
            </button>
          </div>
          <button
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Staff</dt>
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
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Present</dt>
                  <dd className="text-2xl font-semibold text-green-600">{summary.present}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Absent</dt>
                  <dd className="text-2xl font-semibold text-red-600">{summary.absent}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Late</dt>
                  <dd className="text-2xl font-semibold text-yellow-600">{summary.late}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">On Leave</dt>
                  <dd className="text-2xl font-semibold text-blue-600">{summary.onLeave}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Rate */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-md font-medium text-gray-900">Attendance Rate</h3>
          <span className="text-2xl font-bold text-blue-600">{summary.attendanceRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-600 rounded-full h-4 transition-all duration-500"
            style={{ width: `${summary.attendanceRate}%` }}
          ></div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h3 className="text-md font-medium text-gray-900">Staff Attendance Details</h3>
            <div className="flex space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2"
              >
                <option value="all">All Departments</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>{dept.dept_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No staff members found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clock Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((employee) => {
                  const record = attendance.find(a => a.staff_id === employee.id);
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-700">
                              {employee.first_name?.[0]}{employee.last_name?.[0]}
                            </span>
                          </div>
                          <div className="ml-3">
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
                        {record?.clock_in_time || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record?.clock_out_time || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record?.total_hours || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(record?.status || 'Absent')}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record?.status || 'Absent')}`}>
                            {record?.status || 'Absent'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={record?.status || 'Absent'}
                          onChange={(e) => updateAttendance(employee.id, e.target.value)}
                          className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 px-2 py-1"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                          <option value="Leave">On Leave</option>
                          <option value="Half Day">Half Day</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-sm text-gray-500">
                    Showing {filteredStaff.length} of {staff.length} staff members
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracking;