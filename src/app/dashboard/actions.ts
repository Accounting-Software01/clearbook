
'use server';

import { chartOfAccounts } from '@/lib/chart-of-accounts';
import { format } from 'date-fns';

const API_BASE_URL = 'https://hariindustries.net/busa-api/database';

// Helper to format currency in Naira
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
};

// Unified fetch function
async function getDashboardData() {
    try {
        const res = await fetch(`${API_BASE_URL}/dashboard.php`);
        if (!res.ok) {
            throw new Error(`API request failed with status ${res.status}`);
        }
        const data = await res.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data;
    } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        // Re-throw a more generic error to the client
        throw new Error('Could not fetch dashboard data from the backend.');
    }
}


// Fetch Overview Data
export async function getDashboardOverview() {
    const data = await getDashboardData();
    
    if (!data.overview) {
        throw new Error("Dashboard data from backend is missing 'overview' section.");
    }

    const { totalRevenue, netProfit, totalAssets, cashBalance } = data.overview;
    
    return {
        totalRevenue: formatCurrency(parseFloat(totalRevenue || '0')),
        netProfit: formatCurrency(parseFloat(netProfit || '0')),
        totalAssets: formatCurrency(parseFloat(totalAssets || '0')),
        cashBalance: formatCurrency(parseFloat(cashBalance || '0'))
    };
}

// Fetch Recent Activities
export async function getRecentActivities() {
    const data = await getDashboardData();
    
    if (!Array.isArray(data.activities)) {
         throw new Error("Dashboard data from backend is missing 'activities' array.");
    }
    
    // We only want to show a few recent transactions
    return data.activities.slice(0, 5).map((activity: any) => ({
        ...activity,
        amount: formatCurrency(parseFloat(activity.amount || '0'))
    }));
}
