// lib/api.ts

const API_BASE_URL = 'https://hariindustries.net/api/clearbook';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get company ID from storage (set during login)
 */
const getCompanyId = (): string => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('company_id') || 
               sessionStorage.getItem('company_id') || 
               'KASIM123'; // Fallback for testing
    }
    return 'KASIM123';
};

/**
 * Get auth token from storage
 */
const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
};

/**
 * Set company ID in storage (call after login)
 */
export const setCompanyId = (companyId: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('company_id', companyId);
    }
};

/**
 * Set auth token (call after login)
 */
export const setAuthToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
    }
};

/**
 * Clear all auth data (call on logout)
 */
export const clearAuthData = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('company_id');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('company_id');
    }
};

// ============================================
// LOADING STATE MANAGEMENT
// ============================================

let activeRequests = 0;
let loadingCallbacks: ((isLoading: boolean) => void)[] = [];

export const onLoadingChange = (callback: (isLoading: boolean) => void) => {
    loadingCallbacks.push(callback);
    return () => {
        loadingCallbacks = loadingCallbacks.filter(cb => cb !== callback);
    };
};

const setLoading = (isLoading: boolean) => {
    if (isLoading) {
        activeRequests++;
    } else {
        activeRequests--;
    }
    const globalLoading = activeRequests > 0;
    loadingCallbacks.forEach(cb => cb(globalLoading));
};

// ============================================
// CORE API FUNCTION
// ============================================

/**
 * A centralized API fetch function.
 * All frontend requests to the backend API should use this function.
 * It automatically includes credentials, company ID, auth token, 
 * and handles JSON parsing and error formatting.
 *
 * @param endpoint The API endpoint to call (e.g., '/StaffController.php').
 * @param options The standard `fetch` options object.
 * @returns The parsed JSON response from the API.
 * @throws An error with a user-friendly message if the request fails.
 */
export async function api<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/${endpoint}`;
    const companyId = getCompanyId();
    const authToken = getAuthToken();
    
    // Show loading indicator
    setLoading(true);
    
    // Prepare headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Company-Id': companyId,
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers as Record<string, string>,
    };
    
    // Add auth token if exists
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const defaultOptions: RequestInit = {
        credentials: 'include',
        headers,
    };

    // Merge default options with any provided options
    const finalOptions = { ...defaultOptions, ...options };
    finalOptions.headers = headers;
    
    // Add request timeout (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    finalOptions.signal = controller.signal;

    try {
        const response = await fetch(url, finalOptions);
        clearTimeout(timeoutId);
        
        // Try to parse the response body
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { message: await response.text() };
        }

        // Handle unauthorized access
        if (response.status === 401) {
            clearAuthData();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            throw new Error('Session expired. Please login again.');
        }

        // Handle forbidden access
        if (response.status === 403) {
            throw new Error('You do not have permission to perform this action.');
        }

        // Handle not found
        if (response.status === 404) {
            throw new Error('The requested resource was not found.');
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP Error: ${response.status}`);
        }

        return data;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timeout. Please check your connection and try again.');
        }
        if (error.message === 'Failed to fetch') {
            throw new Error('Network error. Please check your internet connection.');
        }
        throw new Error(error.message || 'An unexpected network error occurred.');
    } finally {
        setLoading(false);
    }
}

// ============================================
// API RESPONSE HANDLER
// ============================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export const handleApiResponse = <T>(
    response: ApiResponse<T>, 
    successMessage?: string
): T => {
    if (!response.success) {
        throw new Error(response.message || response.error || 'Request failed');
    }
    
    if (successMessage) {
        console.log(`[API Success] ${successMessage}`);
    }
    
    return response.data as T;
};

// ============================================
// HR DEPARTMENT APIS
// ============================================

/**
 * Get all departments
 */
export const getDepartments = async () => {
    const response = await api<ApiResponse<any[]>>('/DepartmentController.php');
    return response.data || [];
};

/**
 * Get single department by ID
 */
export const getDepartment = async (id: number) => {
    const response = await api<ApiResponse<any>>(`/DepartmentController.php?id=${id}`);
    return response.data || null;
};

/**
 * Create new department
 */
export const createDepartment = async (departmentData: any) => {
    return await api<ApiResponse>('/DepartmentController.php', {
        method: 'POST',
        body: JSON.stringify(departmentData)
    });
};

/**
 * Update department
 */
export const updateDepartment = async (id: number, departmentData: any) => {
    return await api<ApiResponse>('/DepartmentController.php', {
        method: 'PUT',
        body: JSON.stringify({ ...departmentData, id })
    });
};

/**
 * Delete department (soft delete)
 */
export const deleteDepartment = async (id: number) => {
    return await api<ApiResponse>('/DepartmentController.php', {
        method: 'DELETE',
        body: JSON.stringify({ id })
    });
};

// ============================================
// HR POSITION APIS
// ============================================

/**
 * Get all positions
 */
export const getPositions = async (departmentId?: number) => {
    let url = '/PositionController.php';
    if (departmentId) {
        url += `?department_id=${departmentId}`;
    }
    const response = await api<ApiResponse<any[]>>(url);
    return response.data || [];
};

/**
 * Get single position by ID
 */
export const getPosition = async (id: number) => {
    const response = await api<ApiResponse<any>>(`/PositionController.php?id=${id}`);
    return response.data || null;
};

/**
 * Create new position
 */
export const createPosition = async (positionData: any) => {
    return await api<ApiResponse>('/PositionController.php', {
        method: 'POST',
        body: JSON.stringify(positionData)
    });
};

/**
 * Update position
 */
export const updatePosition = async (id: number, positionData: any) => {
    return await api<ApiResponse>('/PositionController.php', {
        method: 'PUT',
        body: JSON.stringify({ ...positionData, id })
    });
};

/**
 * Delete position (soft delete)
 */
export const deletePosition = async (id: number) => {
    return await api<ApiResponse>('/PositionController.php', {
        method: 'DELETE',
        body: JSON.stringify({ id })
    });
};

// ============================================
// HR STAFF APIS
// ============================================

/**
 * Get all staff members
 * @param params - Optional filters (department_id, status, search, page, limit)
 */
export const getStaff = async (params?: {
    department_id?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}) => {
    let url = '/StaffController.php';
    if (params) {
        const queryParams = new URLSearchParams();
        if (params.department_id) queryParams.append('department_id', params.department_id.toString());
        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        
        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }
    }
    const response = await api<ApiResponse<any[]>>(url);
    return response;
};

/**
 * Get single staff member by ID
 */
export const getStaffById = async (id: number) => {
    const response = await api<ApiResponse<any>>(`/StaffController.php?id=${id}`);
    return response.data || null;
};

/**
 * Create new staff member
 */
export const createStaff = async (staffData: any) => {
    return await api<ApiResponse>('/StaffController.php', {
        method: 'POST',
        body: JSON.stringify(staffData)
    });
};

/**
 * Update staff member
 */
export const updateStaff = async (id: number, staffData: any) => {
    return await api<ApiResponse>('/StaffController.php', {
        method: 'PUT',
        body: JSON.stringify({ ...staffData, id })
    });
};

/**
 * Delete staff member (soft delete)
 */
export const deleteStaff = async (id: number) => {
    return await api<ApiResponse>('/StaffController.php', {
        method: 'DELETE',
        body: JSON.stringify({ id })
    });
};

// ============================================
// HR SALARY STRUCTURE APIS
// ============================================

/**
 * Get salary structure for a staff member
 */
export const getSalaryStructure = async (staffId: number) => {
    const response = await api<ApiResponse<any>>(`/SalaryStructureController.php?staff_id=${staffId}`);
    return response.data || null;
};

/**
 * Create/Update salary structure
 */
export const saveSalaryStructure = async (salaryData: any) => {
    return await api<ApiResponse>('/SalaryStructureController.php', {
        method: 'POST',
        body: JSON.stringify(salaryData)
    });
};

// ============================================
// HR PAYROLL APIS
// ============================================

/**
 * Get payroll for a specific month
 */
export const getPayroll = async (month: string) => {
    const response = await api<ApiResponse<any>>(`/PayrollController.php?month=${month}`);
    return response;
};

/**
 * Generate payroll for a month
 */
export const generatePayroll = async (month: string) => {
    return await api<ApiResponse>('/PayrollController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', month })
    });
};

/**
 * Approve payroll for a month
 */
export const approvePayroll = async (month: string) => {
    return await api<ApiResponse>('/PayrollController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'approve', month })
    });
};

/**
 * Post payroll to journal vouchers
 */
export const postPayrollToJournals = async (month: string, createdBy: number) => {
    return await api<ApiResponse>('/PayrollController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'post_to_journals', month, created_by: createdBy })
    });
};


// ============================================
// HR PAYSLIP APIS
// ============================================

/**
 * Get payslips for a staff member or all
 */
export const getPayslips = async (staffId?: number, month?: string) => {
    let url = '/PayslipController.php';
    const params = new URLSearchParams();
    if (staffId) params.append('staff_id', staffId.toString());
    if (month) params.append('month', month);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await api<ApiResponse<any[]>>(url);
    return response;
};

/**
 * Generate payslip for a staff member
 */
export const generatePayslip = async (staffId: number, month: string) => {
    return await api<ApiResponse>('/PayslipController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'generate', staff_id: staffId, month })
    });
};

/**
 * Download payslip as PDF
 */
export const downloadPayslip = async (payslipId: number) => {
    const url = `${API_BASE_URL}/PayslipController.php?id=${payslipId}&download=pdf`;
    window.open(url, '_blank');
};

// ============================================
// HR LEAVE MANAGEMENT APIS
// ============================================

/**
 * Get leave types
 */
export const getLeaveTypes = async () => {
    const response = await api<ApiResponse<any[]>>('/LeaveController.php?action=types');
    return response.data || [];
};

/**
 * Get leave requests (all or by staff)
 */
export const getLeaveRequests = async (staffId?: number, status?: string) => {
    let url = '/LeaveController.php?action=requests';
    if (staffId) url += `&staff_id=${staffId}`;
    if (status) url += `&status=${status}`;
    const response = await api<ApiResponse<any[]>>(url);
    return response;
};

/**
 * Create leave request
 */
export const createLeaveRequest = async (leaveData: any) => {
    return await api<ApiResponse>('/LeaveController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', ...leaveData })
    });
};

/**
 * Approve leave request
 */
export const approveLeaveRequest = async (leaveId: number, approvedBy: number) => {
    return await api<ApiResponse>('/LeaveController.php', {
        method: 'PUT',
        body: JSON.stringify({ action: 'approve', id: leaveId, approved_by: approvedBy })
    });
};

/**
 * Reject leave request
 */
export const rejectLeaveRequest = async (leaveId: number, reason: string) => {
    return await api<ApiResponse>('/LeaveController.php', {
        method: 'PUT',
        body: JSON.stringify({ action: 'reject', id: leaveId, rejection_reason: reason })
    });
};

/**
 * Get leave balances for a staff member
 */
export const getLeaveBalances = async (staffId: number, year?: number) => {
    let url = `/LeaveController.php?action=balances&staff_id=${staffId}`;
    if (year) url += `&year=${year}`;
    const response = await api<ApiResponse<any[]>>(url);
    return response.data || [];
};

// ============================================
// HR ATTENDANCE APIS
// ============================================

/**
 * Get attendance for a specific date
 */
export const getAttendance = async (date: string, departmentId?: number) => {
    let url = `/AttendanceController.php?date=${date}`;
    if (departmentId) url += `&department_id=${departmentId}`;
    const response = await api<ApiResponse<any>>(url);
    return response;
};

/**
 * Mark attendance for a staff member
 */
export const markAttendance = async (attendanceData: any) => {
    return await api<ApiResponse>('/AttendanceController.php', {
        method: 'POST',
        body: JSON.stringify(attendanceData)
    });
};

/**
 * Get attendance report for a month
 */
export const getAttendanceReport = async (month: string, staffId?: number) => {
    let url = `/AttendanceController.php?action=report&month=${month}`;
    if (staffId) url += `&staff_id=${staffId}`;
    const response = await api<ApiResponse<any>>(url);
    return response;
};

// ============================================
// HR DASHBOARD & REPORTS APIS
// ============================================

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
    const response = await api<ApiResponse<any>>('/DashboardController.php');
    return response;
};

/**
 * Get payroll report
 */
export const getPayrollReport = async (month: string, departmentId?: number) => {
    let url = `/ReportsController.php?type=payroll&month=${month}`;
    if (departmentId) url += `&department_id=${departmentId}`;
    const response = await api<ApiResponse<any>>(url);
    return response;
};

/**
 * Get staff report
 */
export const getStaffReport = async (departmentId?: number, status?: string) => {
    let url = `/ReportsController.php?type=staff`;
    if (departmentId) url += `&department_id=${departmentId}`;
    if (status) url += `&status=${status}`;
    const response = await api<ApiResponse<any>>(url);
    return response;
};

/**
 * Get tax report (PAYE, Pension, NHF)
 */
export const getTaxReport = async (month: string) => {
    const response = await api<ApiResponse<any>>(`/ReportsController.php?type=tax&month=${month}`);
    return response;
};

// ============================================
// STAFF PORTAL APIS (for QR code login)
// ============================================

/**
 * Authenticate staff via QR token
 */
export const authenticateStaff = async (token: string, staffId: number) => {
    return await api<ApiResponse>('/PortalController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'authenticate', token, staff_id: staffId })
    });
};

/**
 * Get staff portal dashboard data
 */
export const getPortalDashboard = async () => {
    const response = await api<ApiResponse<any>>('/PortalController.php?action=dashboard');
    return response;
};

/**
 * Get staff payslips from portal
 */
export const getPortalPayslips = async () => {
    const response = await api<ApiResponse<any[]>>('/PortalController.php?action=payslips');
    return response;
};

/**
 * Request leave from portal
 */
export const portalLeaveRequest = async (leaveData: any) => {
    return await api<ApiResponse>('/PortalController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'leave_request', ...leaveData })
    });
};

/**
 * Update staff profile from portal
 */
export const updatePortalProfile = async (profileData: any) => {
    return await api<ApiResponse>('/PortalController.php', {
        method: 'PUT',
        body: JSON.stringify({ action: 'update_profile', ...profileData })
    });
};

// ============================================
// AUTHENTICATION APIS
// ============================================

/**
 * Login user
 */
export const login = async (email: string, password: string) => {
    const response = await api<ApiResponse<{ token: string; company_id: string; user: any }>>('/AuthController.php', {
        method: 'POST',
        body: JSON.stringify({ action: 'login', email, password })
    });
    
    if (response.success && response.data) {
        setAuthToken(response.data.token);
        setCompanyId(response.data.company_id);
    }
    
    return response;
};

/**
 * Logout user
 */
export const logout = async () => {
    try {
        await api('/AuthController.php', {
            method: 'POST',
            body: JSON.stringify({ action: 'logout' })
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearAuthData();
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
    const response = await api<ApiResponse<any>>('/AuthController.php?action=me');
    return response.data || null;
};

// ============================================
// EXPORT ALL APIS AS A SINGLE OBJECT
// ============================================

export const hrAPI = {
    // Auth
    login,
    logout,
    getCurrentUser,
    
    // Departments
    getDepartments,
    getDepartment,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    
    // Positions
    getPositions,
    getPosition,
    createPosition,
    updatePosition,
    deletePosition,
    
    // Staff
    getStaff,
    getStaffById,
    createStaff,
    updateStaff,
    deleteStaff,
    
    // Salary
    getSalaryStructure,
    saveSalaryStructure,
    
    // Payroll
    getPayroll,
    generatePayroll,
    approvePayroll,
    postPayrollToJournals,
    
    // Payslip
    getPayslips,
    generatePayslip,
    downloadPayslip,
    
    // Leave
    getLeaveTypes,
    getLeaveRequests,
    createLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    getLeaveBalances,
    
    // Attendance
    getAttendance,
    markAttendance,
    getAttendanceReport,
    
    // Reports
    getDashboardStats,
    getPayrollReport,
    getStaffReport,
    getTaxReport,
    
    // Portal
    authenticateStaff,
    getPortalDashboard,
    getPortalPayslips,
    portalLeaveRequest,
    updatePortalProfile,
    
    // Utilities
    setCompanyId,
    setAuthToken,
    clearAuthData,
    onLoadingChange
};

export default api;
