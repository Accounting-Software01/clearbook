
// src/lib/api.ts

const API_BASE_URL = 'https://hariindustries.net/clearbook';

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server responded with status ${response.status}` }));
        throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (data.success === false) {
        throw new Error(data.error || 'API returned a failure status.');
    }
    // The actual data is often nested in a 'data' property
    return data.data || data;
}

// Interfaces
export interface JournalSettings {
  manualJournalsEnabled: boolean;
  requireApproval: boolean;
  allowBackdating: boolean;
  backdatingLimitDays: number;
  periodLockDate?: string | null;
  yearEndLockDate?: string | null;
  restrictedAccounts: string;
}

export interface Payee {
    id: string;
    name: string;
    type: string;
}

export interface JournalVoucher {
    id: number;
    voucher_number: string;
    entry_date: string;
    narration: string;
    total_debits: number;
    status: string;
}

export interface JournalEntryLine {
    id: number;
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
    payeeId?: string;
}

// API Functions

export const getJournalSettings = async (companyId: number, userId: string): Promise<JournalSettings> => {
    const response = await fetch(`${API_BASE_URL}/get_company_settings.php?company_id=${companyId}&user_id=${userId}`);
    return handleResponse<JournalSettings>(response);
};

export const updateJournalSettings = async (companyId: number, userId: string, settings: Partial<JournalSettings>): Promise<{ success: boolean, message: string }> => {
    const response = await fetch(`${API_BASE_URL}/update_company_settings.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, user_id: userId, ...settings })
    });
    return handleResponse<{ success: boolean, message: string }>(response);
};

// External PHP API
export const getPayees = async (companyId: number, userId: string): Promise<Payee[]> => {
    const response = await fetch(`${API_BASE_URL}/get-payees.php?company_id=${companyId}&user_id=${userId}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
};

export const getJournalVouchers = async (companyId: number, userId: string): Promise<JournalVoucher[]> => {
    const response = await fetch(`${API_BASE_URL}/get-journal-vouchers.php?company_id=${companyId}&user_id=${userId}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
};

export const getVoucherDetails = async (voucherId: number, companyId: number, userId: string): Promise<{ success: boolean, voucher: any, error?: string }> => {
    const response = await fetch(`${API_BASE_URL}/get_voucher_details.php?voucher_id=${voucherId}&company_id=${companyId}&user_id=${userId}`);
    return handleResponse<{ success: boolean, voucher: any, error?: string }>(response);
};

export const updateJournalStatus = async (voucherId: number, newStatus: 'approved' | 'rejected', companyId: number, userId: string): Promise<{ success: boolean, error?: string }> => {
    const response = await fetch(`${API_BASE_URL}/update-journal-status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, user_id: userId, voucher_id: voucherId, status: newStatus })
    });
    return handleResponse<{ success: boolean, error?: string }>(response);
};

export const postJournalEntry = async (payload: {
    entryDate: string;
    narration: string;
    lines: Omit<JournalEntryLine, 'payees'|'id'>[];
    company_id: number;
    user_id: string;
}): Promise<{ status: string; voucher_number: string; error?: string, success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/journal-entry.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return handleResponse<{ status: string; voucher_number: string; error?: string, success: boolean }>(response);
};
