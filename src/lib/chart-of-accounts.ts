import { api } from './api';

export interface Account {
    id: string;
    code: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    parent?: string;
};

export const fetchChartOfAccounts = async (companyId: number): Promise<Account[]> => {
    try {
        const accounts = await api.get(`/get_chart_of_accounts.php?company_id=${companyId}`);
        return accounts;
    } catch (error) {
        console.error("Failed to fetch chart of accounts from API:", error);
        // Fallback to static data if API fails
        return chartOfAccounts;
    }
};

export const chartOfAccounts: Account[] = [
    // Assets
    { id: '101100', code: '101100', name: 'Cash at Bank - Main Account', type: 'Asset' },
    { id: '101110', code: '101110', name: 'Cash at Bank - Operations Account', type: 'Asset' },
    { id: '101120', code: '101120', name: 'Cash at Bank - Sales Collection Account', type: 'Asset' },
    { id: '101130', code: '101130', name: 'Cash at Hand - Head Office', type: 'Asset' },
    { id: '101140', code: '101140', name: 'Cash at Hand - Factory', type: 'Asset' },
    { id: '101150', code: '101150', name: 'Cash at Hand - Depot/Branches', type: 'Asset' },

    { id: '101210', code: '101210', name: 'Accounts Receivable Control (AUTO)', type: 'Asset' },
    { id: '101200', code: '101200', name: 'Trade Receivables - Customers', type: 'Asset', parent: '101210' },
    { id: '101220', code: '101220', name: 'Staff Debtors', type: 'Asset', parent: '101210' },
    { id: '101230', code: '101230', name: 'Other Receivables', type: 'Asset', parent: '101210' },
    { id: '101240', code: '101240', name: 'Prepayments - Insurance', type: 'Asset', parent: '101210' },
    { id: '101250', code: '101250', name: 'Prepayments - Rent', type: 'Asset', parent: '101210' },
    { id: '101260', code: '101260', name: 'Prepayments - Other', type: 'Asset', parent: '101210' },

    { id: '101310', code: '101310', name: 'Inventory Control - Raw Materials (AUTO)', type: 'Asset' },
    { id: '101300', code: '101300', name: 'Inventory - Raw Materials', type: 'Asset', parent: '101310' },
    { id: '101370', code: '101370', name: 'Inventory - Spare Parts & Consumables', type: 'Asset', parent: '101310' },
    
    { id: '101330', code: '101330', name: 'Inventory Control - WIP (AUTO)', type: 'Asset' },
    { id: '101320', code: '101320', name: 'Inventory - Work-in-Progress', type: 'Asset', parent: '101330' },
    
    { id: '101350', code: '101350', name: 'Inventory Control - Finished Goods (AUTO)', type: 'Asset' },
    { id: '101340', code: '101340', name: 'Inventory - Finished Goods', type: 'Asset', parent: '101350' },
    { id: '101360', code: '101360', name: 'Inventory - Packaging Materials', type: 'Asset', parent: '101350' },

    { id: '101400', code: '101400', name: 'Inter-Branch Receivable (AUTO)', type: 'Asset' },
    { id: '101410', code: '101410', name: 'Withholding Tax Receivable', type: 'Asset' },
    { id: '101420', code: '101420', name: 'VAT Refundable (Input VAT)', type: 'Asset' },
    { id: '101430', code: '101430', name: 'Deposits with Suppliers', type: 'Asset' },

    { id: '102100', code: '102100', name: 'Property, Plant & Equipment Control (AUTO)', type: 'Asset' },
    { id: '102110', code: '102110', name: 'Land', type: 'Asset', parent: '102100' },
    { id: '102120', code: '102120', name: 'Buildings - Factory', type: 'Asset', parent: '102100' },
    { id: '102130', code: '102130', name: 'Buildings - Administrative', type: 'Asset', parent: '102100' },
    { id: '102140', code: '102140', name: 'Plant & Machinery - Production Lines', type: 'Asset', parent: '102100' },
    { id: '102150', code: '102150', name: 'Borehole & Water Treatment Facilities', type: 'Asset', parent: '102100' },
    { id: '102160', code: '102160', name: 'Factory Generators', type: 'Asset', parent: '102100' },
    { id: '102170', code: '102170', name: 'Motor Vehicles - Distribution', type: 'Asset', parent: '102100' },
    { id: '102180', code: '102180', name: 'Office Equipment', type: 'Asset', parent: '102100' },
    { id: '102190', code: '102190', name: 'Furniture & Fixtures', type: 'Asset', parent: '102100' },

    { id: '102200', code: '102200', name: 'Capital Work-in-Progress (CWIP)', type: 'Asset' },
    { id: '102300', code: '102300', name: 'Intangible Assets - Software', type: 'Asset' },
    { id: '102310', code: '102310', name: 'Accumulated Depreciation - Buildings', type: 'Asset' },
    { id: '102320', code: '102320', name: 'Accumulated Depreciation - Plant & Machinery', type: 'Asset' },
    { id: '102330', code: '102330', name: 'Accumulated Depreciation - Motor Vehicles', type: 'Asset' },
    { id: '102340', code: '102340', name: 'Accumulated Depreciation - Office Equipment', type: 'Asset' },
    { id: '102350', code: '102350', name: 'Impairment Loss Assets', type: 'Asset' },
    
    // Liabilities
    { id: '201010', code: '201010', name: 'Accounts Payable Control (AUTO)', type: 'Liability' },
    { id: '201020', code: '201020', name: 'Trade Creditors - Suppliers', type: 'Liability', parent: '201010' },
    { id: '201030', code: '201030', name: 'Accrued Expenses', type: 'Liability', parent: '201010' },
    { id: '201040', code: '201040', name: 'Accrued Payroll', type: 'Liability', parent: '201010' },
    
    { id: '201110', code: '201110', name: 'Payroll Control Account (AUTO)', type: 'Liability' },
    { id: '201210', code: '201210', name: 'VAT Output Payable', type: 'Liability' },
    { id: '201220', code: '201220', name: 'VAT Input Offset', type: 'Liability' },
    { id: '201230', code: '201230', name: 'PAYE Tax Payable', type: 'Liability' },
    { id: '201240', code: '201240', name: 'Withholding Tax (WHT) Payable', type: 'Liability' },
    { id: '201250', code: '201250', name: 'Corporate Income Tax Payable', type: 'Liability' },
    { id: '201260', code: '201260', name: 'Pension Payable', type: 'Liability' },
    { id: '201270', code: '201270', name: 'NHF Payable', type: 'Liability' },
    { id: '201280', code: '201280', name: 'NSITF Payable', type: 'Liability' },
    { id: '201290', code: '201290', name: 'Other Statutory Deductions Payable', type: 'Liability' },
    { id: '201300', code: '201300', name: 'Short-Term Loan - Bank OD', type: 'Liability' },
    { id: '201310', code: '201310', name: 'Current Portion of Long-Term Loan', type: 'Liability' },
    { id: '201400', code: '201400', name: 'Inter-Branch Payable (AUTO)', type: 'Liability' },
    { id: '202100', code: '202100', name: 'Long-Term Loan - Bank', type: 'Liability' },
    
    // Equity
    { id: '301000', code: '301000', name: 'Share Capital', type: 'Equity' },
    { id: '302000', code: '302000', name: 'Retained Earnings', type: 'Equity' },
    { id: '303000', code: '303000', name: 'Current Year Earnings', type: 'Equity' },
    
    // Revenue
    { id: '401000', code: '401000', name: 'Sales - Finished Goods', type: 'Revenue' },
    { id: '402000', code: '402000', name: 'Sales Returns and Allowances', type: 'Revenue' },
    { id: '403000', code: '403000', name: 'Other Income', type: 'Revenue' },
    
    // Expenses
    { id: '501000', code: '501000', name: 'Cost of Goods Sold', type: 'Expense' },
    { id: '502000', code: '502000', name: 'Salaries and Wages', type: 'Expense' },
    { id: '503000', code: '503000', name: 'Rent Expense', type: 'Expense' },
    { id: '504000', code: '504000', name: 'Utilities', type: 'Expense' },
    { id: '505000', code: '505000', name: 'Marketing Expenses', type: 'Expense' },
    { id: '506000', code: '506000', name: 'Depreciation Expense', type: 'Expense' },
    { id: '507000', code: '507000', name: 'Bank Charges', type: 'Expense' },
    { id: '599999', code: '599999', name: 'Miscellaneous Expenses', type: 'Expense' },
];
