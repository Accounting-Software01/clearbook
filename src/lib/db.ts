const API_BASE_URL = 'https://hariindustries.net/clearbook/';

// Function to create a payment voucher
export const createPaymentVoucher = async (voucherData: any) => {
    try {
        const response = await fetch(`${API_BASE_URL}/payment_voucher.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(voucherData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create payment voucher');
        }

        const result = await response.json();
        return result.voucherNumber;
    } catch (error) {
        console.error("Error creating payment voucher: ", error);
        throw error;
    }
};

// Function to get suppliers
export const getSuppliers = async (companyId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/suppliers.php?company_id=${companyId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch suppliers');
        }

        const result = await response.json();
        return result.data || []; 
    } catch (error) {
        console.error("Error getting suppliers: ", error);
        throw error;
    }
};

// Function to get a list of journal vouchers
export const getJournalVouchers = async (companyId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/get_journal_vouchers.php?company_id=${companyId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch journal vouchers');
        }

        const result = await response.json();
        return result.data || [];
    } catch (error) {
        console.error("Error getting journal vouchers: ", error);
        throw error;
    }
};

// Corrected Function to get voucher overview
export const getVoucherOverview = async (companyId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/get_voucher_overview.php?company_id=${companyId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch voucher overview');
        }
        const result = await response.json();
        return result || { pending_count: 0, is_locked: false };
    } catch (error) {
        console.error("Error getting voucher overview: ", error);
        throw error;
    }
};

// Function to set global lock
export const setGlobalLock = async (companyId: string, lockStatus: boolean) => {
    try {
        const response = await fetch(`${API_BASE_URL}/set_global_lock.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ company_id: companyId, lock_status: lockStatus }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to set global lock');
        }

        return await response.json();
    } catch (error) {
        console.error("Error setting global lock: ", error);
        throw error;
    }
};

// Function to update voucher status
export const updateVoucherStatus = async (voucherId: string, data: { status?: string; isLocked?: boolean }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/voucher_actions.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: voucherId, ...data }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update voucher status');
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating voucher status: ", error);
        throw error;
    }
};
