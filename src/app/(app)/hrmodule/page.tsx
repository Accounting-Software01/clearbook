'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  Calendar, 
  FileText, 
  TrendingUp,
  UserPlus,
  DollarSign,
  Clock,
  Bell,
  Download,
  Receipt
} from 'lucide-react';
import StaffList from '@/components/StaffList';
import PayrollProcessing from '@/components/PayrollProcessing';
import LeaveManagement from '@/components/LeaveManagement';
import AttendanceTracking from '@/components/AttendanceTracking';
import SalaryStructure from '@/components/SalaryStructure';
import Reports from '@/components/Reports';
import PayslipGenerator from '@/components/PayslipGenerator';
import { api } from '@/lib/api';

const HRModule = () => {
  const [activeTab, setActiveTab] = useState('staff');
  const [stats, setStats] = useState({
    totalStaff: 0,
    activePayroll: 0,
    pendingLeaves: 0,
    monthlyWage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // ✅ FIXED: Use correct API endpoint for dashboard stats
  const fetchDashboardStats = async () => {
    try {
      const response = await api<any>('/DashboardController.php');
      if (response.success) {
        setStats(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'payroll', label: 'Payroll Processing', icon: DollarSign },
    { id: 'payslip', label: 'Payslip Generator', icon: Receipt },
    { id: 'salary', label: 'Salary Structure', icon: CreditCard },
    { id: 'leave', label: 'Leave Management', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Stats Cards */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {loading ? '...' : stats.totalStaff}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Wage Bill</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {loading ? '...' : `₦${stats.monthlyWage.toLocaleString()}`}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Leave Requests</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {loading ? '...' : stats.pendingLeaves}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">This Month's Payroll</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {loading ? '...' : stats.activePayroll}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Tabs - Clean */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 bg-white rounded-t-lg">
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`
                    -ml-0.5 mr-2 h-4 w-4
                    ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'staff' && <StaffList />}
          {activeTab === 'payroll' && <PayrollProcessing />}
          {activeTab === 'payslip' && <PayslipGenerator />}
          {activeTab === 'salary' && <SalaryStructure />}
          {activeTab === 'leave' && <LeaveManagement />}
          {activeTab === 'attendance' && <AttendanceTracking />}
          {activeTab === 'reports' && <Reports />}
        </div>
      </div>
    </div>
  );
};

export default HRModule;
