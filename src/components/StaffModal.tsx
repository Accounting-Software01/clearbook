'use client';

import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, MapPin, Briefcase, CreditCard, Heart,
  GraduationCap, Calendar, DollarSign, Upload, X, Save,
  Building2, Users, FileText, Shield, Truck
} from 'lucide-react';
import { api } from '@/lib/api';

interface StaffFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  staff?: any;
}

const StaffForm: React.FC<StaffFormProps> = ({ isOpen, onClose, onSave, staff }) => {
  const [activeSection, setActiveSection] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    middle_name: '',
    gender: 'Male',
    date_of_birth: '',
    marital_status: 'Single',
    nationality: 'Nigerian',
    state_of_origin: '',
    lga: '',
    
    // Identification
    national_id: '',
    kra_pin: '',
    nssf_no: '',
    nhif_no: '',
    
    // Contact
    personal_email: '',
    phone_number: '',
    residential_address: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    
    // Professional
    qualification: '',
    years_of_experience: 0,
    previous_company: '',
    
    // Family/Next of Kin
    next_of_kin: '',
    next_of_kin_phone: '',
    next_of_kin_relationship: '',
    
    // Employment
    hire_date: new Date().toISOString().split('T')[0],
    employee_type: 'Permanent',
    department_id: '',
    position_id: '',
    reporting_to: '',
    
    // Financial
    basic_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    meal_allowance: '',
    medical_allowance: '',
    currency_code: 'NGN',
    
    // Bank Details
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    sort_code: '',
    
    // Pension
    pension_admin: '',
    pension_number: '',
    
    // Status
    employment_status: 'Active'
  });

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      fetchPositions();
      fetchManagers();
      if (staff) {
        setFormData(staff);
      }
    }
  }, [isOpen, staff]);

  // ✅ CORRECTED: Using your fetch-based api function for GET
  const fetchDepartments = async () => {
    try {
      const response = await api<any>('/DepartmentController.php');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // ✅ CORRECTED: Using your fetch-based api function for GET
  const fetchPositions = async () => {
    try {
      const response = await api<any>('/PositionController.php');
      setPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  // ✅ CORRECTED: Using your fetch-based api function for GET
  const fetchManagers = async () => {
    try {
      const response = await api<any>('/StaffController.php');
      setManagers(response.data.filter((s: any) => s.position_id));
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  // ✅ CORRECTED: Using your fetch-based api function for POST/PUT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (staff) {
        // UPDATE staff - using PUT method
        await api('/StaffController.php', {
          method: 'PUT',
          body: JSON.stringify({ ...formData, id: staff.id })
        });
      } else {
        // CREATE staff - using POST method
        await api('/StaffController.php', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff member');
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'emergency', label: 'Emergency', icon: Heart },
    { id: 'professional', label: 'Professional', icon: GraduationCap },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'bank', label: 'Bank Details', icon: CreditCard },
    { id: 'pension', label: 'Pension', icon: Shield }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          <div className="bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="border-b border-gray-200 px-6 overflow-x-auto">
              <div className="flex space-x-4">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`
                        flex items-center space-x-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap
                        ${activeSection === section.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
                {/* Personal Information Section */}
                {activeSection === 'personal' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.first_name}
                          onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.last_name}
                          onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                        <input
                          type="text"
                          value={formData.middle_name}
                          onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <input
                          type="date"
                          required
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Marital Status</label>
                        <select
                          value={formData.marital_status}
                          onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nationality</label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">State of Origin</label>
                        <input
                          type="text"
                          value={formData.state_of_origin}
                          onChange={(e) => setFormData({...formData, state_of_origin: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">LGA</label>
                        <input
                          type="text"
                          value={formData.lga}
                          onChange={(e) => setFormData({...formData, lga: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">National ID</label>
                        <input
                          type="text"
                          required
                          value={formData.national_id}
                          onChange={(e) => setFormData({...formData, national_id: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">KRA PIN</label>
                        <input
                          type="text"
                          value={formData.kra_pin}
                          onChange={(e) => setFormData({...formData, kra_pin: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Section */}
                {activeSection === 'contact' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Personal Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.personal_email}
                          onChange={(e) => setFormData({...formData, personal_email: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone_number}
                          onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Residential Address</label>
                        <textarea
                          rows={3}
                          value={formData.residential_address}
                          onChange={(e) => setFormData({...formData, residential_address: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Emergency Contact Section */}
                {activeSection === 'emergency' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
                        <input
                          type="tel"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Relationship</label>
                        <input
                          type="text"
                          value={formData.emergency_contact_relationship}
                          onChange={(e) => setFormData({...formData, emergency_contact_relationship: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Professional Section */}
                {activeSection === 'professional' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Highest Qualification</label>
                        <input
                          type="text"
                          value={formData.qualification}
                          onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="B.Sc Computer Science, MBA, etc"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                        <input
                          type="number"
                          value={formData.years_of_experience}
                          onChange={(e) => setFormData({...formData, years_of_experience: parseInt(e.target.value)})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Previous Company</label>
                        <input
                          type="text"
                          value={formData.previous_company}
                          onChange={(e) => setFormData({...formData, previous_company: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Next of Kin</label>
                        <input
                          type="text"
                          value={formData.next_of_kin}
                          onChange={(e) => setFormData({...formData, next_of_kin: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Next of Kin Phone</label>
                        <input
                          type="tel"
                          value={formData.next_of_kin_phone}
                          onChange={(e) => setFormData({...formData, next_of_kin_phone: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Next of Kin Relationship</label>
                        <input
                          type="text"
                          value={formData.next_of_kin_relationship}
                          onChange={(e) => setFormData({...formData, next_of_kin_relationship: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Employment Section */}
                {activeSection === 'employment' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Hire Date</label>
                        <input
                          type="date"
                          required
                          value={formData.hire_date}
                          onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Employee Type</label>
                        <select
                          value={formData.employee_type}
                          onChange={(e) => setFormData({...formData, employee_type: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="Permanent">Permanent</option>
                          <option value="Contract">Contract</option>
                          <option value="Intern">Intern</option>
                          <option value="Casual">Casual</option>
                          <option value="Probation">Probation</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Department</label>
                        <select
                          required
                          value={formData.department_id}
                          onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select Department</option>
                          {departments.map((dept: any) => (
                            <option key={dept.id} value={dept.id}>{dept.dept_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Position</label>
                        <select
                          required
                          value={formData.position_id}
                          onChange={(e) => setFormData({...formData, position_id: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select Position</option>
                          {positions.map((pos: any) => (
                            <option key={pos.id} value={pos.id}>{pos.position_name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Reporting To</label>
                        <select
                          value={formData.reporting_to}
                          onChange={(e) => setFormData({...formData, reporting_to: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select Manager</option>
                          {managers.map((mgr: any) => (
                            <option key={mgr.id} value={mgr.id}>
                              {mgr.first_name} {mgr.last_name} ({mgr.position_name})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Employment Status</label>
                        <select
                          value={formData.employment_status}
                          onChange={(e) => setFormData({...formData, employment_status: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="Active">Active</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Terminated">Terminated</option>
                          <option value="Suspended">Suspended</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Section */}
                {activeSection === 'financial' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Basic Salary</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₦</span>
                          </div>
                          <input
                            type="number"
                            value={formData.basic_salary}
                            onChange={(e) => setFormData({...formData, basic_salary: e.target.value})}
                            className="pl-7 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Currency</label>
                        <select
                          value={formData.currency_code}
                          onChange={(e) => setFormData({...formData, currency_code: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="NGN">Nigerian Naira (₦)</option>
                          <option value="USD">US Dollar ($)</option>
                          <option value="GBP">British Pound (£)</option>
                          <option value="EUR">Euro (€)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Housing Allowance</label>
                        <input
                          type="number"
                          value={formData.housing_allowance}
                          onChange={(e) => setFormData({...formData, housing_allowance: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Transport Allowance</label>
                        <input
                          type="number"
                          value={formData.transport_allowance}
                          onChange={(e) => setFormData({...formData, transport_allowance: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Meal Allowance</label>
                        <input
                          type="number"
                          value={formData.meal_allowance}
                          onChange={(e) => setFormData({...formData, meal_allowance: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Medical Allowance</label>
                        <input
                          type="number"
                          value={formData.medical_allowance}
                          onChange={(e) => setFormData({...formData, medical_allowance: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Details Section */}
                {activeSection === 'bank' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                        <select
                          value={formData.bank_name}
                          onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select Bank</option>
                          <option value="Access Bank">Access Bank</option>
                          <option value="GTBank">GTBank</option>
                          <option value="First Bank">First Bank</option>
                          <option value="UBA">UBA</option>
                          <option value="Zenith Bank">Zenith Bank</option>
                          <option value="Stanbic IBTC">Stanbic IBTC</option>
                          <option value="Union Bank">Union Bank</option>
                          <option value="Fidelity Bank">Fidelity Bank</option>
                          <option value="Ecobank">Ecobank</option>
                          <option value="Polaris Bank">Polaris Bank</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Name</label>
                        <input
                          type="text"
                          value={formData.bank_account_name}
                          onChange={(e) => setFormData({...formData, bank_account_name: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Number</label>
                        <input
                          type="text"
                          value={formData.bank_account_number}
                          onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank Branch</label>
                        <input
                          type="text"
                          value={formData.bank_branch}
                          onChange={(e) => setFormData({...formData, bank_branch: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sort Code</label>
                        <input
                          type="text"
                          value={formData.sort_code}
                          onChange={(e) => setFormData({...formData, sort_code: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Pension Section */}
                {activeSection === 'pension' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Pension Administrator</label>
                        <select
                          value={formData.pension_admin}
                          onChange={(e) => setFormData({...formData, pension_admin: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select PFA</option>
                          <option value="ARM Pension">ARM Pension</option>
                          <option value="Stanbic IBTC Pension">Stanbic IBTC Pension</option>
                          <option value="Fidelity Pension">Fidelity Pension</option>
                          <option value="Premium Pension">Premium Pension</option>
                          <option value="Trustfund Pensions">Trustfund Pensions</option>
                          <option value="Leadway Pensure">Leadway Pensure</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Pension Number (PIN)</label>
                        <input
                          type="text"
                          value={formData.pension_number}
                          onChange={(e) => setFormData({...formData, pension_number: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Pension Contribution (Nigeria):</strong> Employee 8% | Employer 10% of monthly salary
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {staff ? 'Update Staff' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffForm;