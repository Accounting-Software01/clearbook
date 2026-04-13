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
    { "id": "101000", "code": "101000", "name": "Cash & Cash Equivalents (AUTO)", "type": "Asset" },
    { "id": "101100", "code": "101100", "name": "Cash at Bank - Main Account", "type": "Asset" },
    { "id": "101110", "code": "101110", "name": "Cash at Bank - Operations Account", "type": "Asset" },
    { "id": "101120", "code": "101120", "name": "Cash at Bank - Sales Collection Account", "type": "Asset" },
    { "id": "101130", "code": "101130", "name": "Cash at Hand - Head Office", "type": "Asset" },
    { "id": "101140", "code": "101140", "name": "Cash at Hand - Factory", "type": "Asset" },
    { "id": "101150", "code": "101150", "name": "Cash at Hand - Depot Branches", "type": "Asset" },
    { "id": "102000", "code": "102000", "name": "Accounts Receivable (AUTO)", "type": "Asset" },
    { "id": "102100", "code": "102100", "name": "Trade Receivables - Customers", "type": "Asset" },
    { "id": "102200", "code": "102200", "name": "Staff Debtors", "type": "Asset" },
    { "id": "102300", "code": "102300", "name": "Other Receivables", "type": "Asset" },
    { "id": "102400", "code": "102400", "name": "Prepayments (AUTO)", "type": "Asset" },
    { "id": "102410", "code": "102410", "name": "Prepayments - Insurance", "type": "Asset" },
    { "id": "102420", "code": "102420", "name": "Prepayments - Rent", "type": "Asset" },
    { "id": "102430", "code": "102430", "name": "Prepayments - Other", "type": "Asset" },
    { "id": "103000", "code": "103000", "name": "Inventory Control (AUTO)", "type": "Asset" },
    { "id": "103100", "code": "103100", "name": "Inventory - PET Preforms (Raw Material)", "type": "Asset" },
    { "id": "103101", "code": "103101", "name": "Inventory - Master Batch (Colouring Agent)", "type": "Asset" },
    { "id": "103102", "code": "103102", "name": "Inventory - Bottle Caps", "type": "Asset" },
    { "id": "103103", "code": "103103", "name": "Inventory - Labels (75cl)", "type": "Asset" },
    { "id": "103104", "code": "103104", "name": "Inventory - Labels (50cl)", "type": "Asset" },
    { "id": "103105", "code": "103105", "name": "Inventory - Labels (33cl)", "type": "Asset" },
    { "id": "103106", "code": "103106", "name": "Inventory - Shrink Wrap 70μ", "type": "Asset" },
    { "id": "103107", "code": "103107", "name": "Inventory - Shrink Wrap 60μ", "type": "Asset" },
    { "id": "103108", "code": "103108", "name": "Inventory - Gum/Glue", "type": "Asset" },
    { "id": "103110", "code": "103110", "name": "Inventory - Spare Parts & Consumables", "type": "Asset" },
    { "id": "103200", "code": "103200", "name": "Inventory - Work-in-Progress", "type": "Asset" },
    { "id": "103300", "code": "103300", "name": "Inventory - Finished Goods (75cl x12)", "type": "Asset" },
    { "id": "103301", "code": "103301", "name": "Inventory - Finished Goods (50cl x12)", "type": "Asset" },
    { "id": "103302", "code": "103302", "name": "Inventory - Finished Goods (50cl x20)", "type": "Asset" },
    { "id": "103303", "code": "103303", "name": "Inventory - Finished Goods (33cl x20)", "type": "Asset" },
    { "id": "103310", "code": "103310", "name": "Inventory - Packaging Materials", "type": "Asset" },
    { "id": "104000", "code": "104000", "name": "Property Plant & Equipment (AUTO)", "type": "Asset" },
    { "id": "104100", "code": "104100", "name": "Land", "type": "Asset" },
    { "id": "104200", "code": "104200", "name": "Buildings", "type": "Asset" },
    { "id": "104300", "code": "104300", "name": "Preform Machine", "type": "Asset" },
    { "id": "104301", "code": "104301", "name": "Blower Machine", "type": "Asset" },
    { "id": "104302", "code": "104302", "name": "Molds", "type": "Asset" },
    { "id": "104303", "code": "104303", "name": "Production Line", "type": "Asset" },
    { "id": "104304", "code": "104304", "name": "75cl Label Cylinder", "type": "Asset" },
    { "id": "104305", "code": "104305", "name": "Generating Set", "type": "Asset" },
    { "id": "104306", "code": "104306", "name": "Cooling Tower", "type": "Asset" },
    { "id": "104400", "code": "104400", "name": "Motor Vehicles", "type": "Asset" },
    { "id": "104500", "code": "104500", "name": "Office Equipment", "type": "Asset" },
    { "id": "104600", "code": "104600", "name": "Furniture & Fixtures", "type": "Asset" },
    { "id": "104700", "code": "104700", "name": "Capital Work-in-Progress (CWIP)", "type": "Asset" },
    { "id": "105200", "code": "105200", "name": "Accumulated Depreciation (AUTO)", "type": "Asset" },
    { "id": "105210", "code": "105210", "name": "Accum. Dep. - Preform Machine", "type": "Asset" },
    { "id": "105211", "code": "105211", "name": "Accum. Dep. - Blower Machine", "type": "Asset" },
    { "id": "105212", "code": "105212", "name": "Accum. Dep. - Molds", "type": "Asset" },
    { "id": "105213", "code": "105213", "name": "Accum. Dep. - 75cl Label Cylinder", "type": "Asset" },
    { "id": "105214", "code": "105214", "name": "Accum. Dep. - Generating Set", "type": "Asset" },
    { "id": "105215", "code": "105215", "name": "Accum. Dep. - Cooling Tower", "type": "Asset" },
    { "id": "201000", "code": "201000", "name": "Accounts Payable (AUTO)", "type": "Liability" },
    { "id": "201100", "code": "201100", "name": "Trade Creditors - Suppliers", "type": "Liability" },
    { "id": "201200", "code": "201200", "name": "Accrued Expenses", "type": "Liability" },
    { "id": "201300", "code": "201300", "name": "Payroll Payables", "type": "Liability" },
    { "id": "201400", "code": "201400", "name": "Statutory Payables (AUTO)", "type": "Liability" },
    { "id": "201410", "code": "201410", "name": "VAT Output Payable", "type": "Liability" },
    { "id": "201420", "code": "201420", "name": "PAYE Tax Payable", "type": "Liability" },
    { "id": "201430", "code": "201430", "name": "Withholding Tax Payable", "type": "Liability" },
    { "id": "201440", "code": "201440", "name": "Pension Payable", "type": "Liability" },
    { "id": "201500", "code": "201500", "name": "Short-Term Loan - Bank OD", "type": "Liability" },
    { "id": "201600", "code": "201600", "name": "Long-Term Loan - Bank", "type": "Liability" },
    { "id": "301000", "code": "301000", "name": "Share Capital", "type": "Equity" },
    { "id": "302000", "code": "302000", "name": "Retained Earnings", "type": "Equity" },
    { "id": "303000", "code": "303000", "name": "Current Year Earnings", "type": "Equity" },
    { "id": "304000", "code": "304000", "name": "Opening Balance Equity", "type": "Equity" },
    { "id": "401000", "code": "401000", "name": "Sales - 75cl x12 Pack", "type": "Revenue" },
    { "id": "401001", "code": "401001", "name": "Sales - 50cl x12 Pack", "type": "Revenue" },
    { "id": "401002", "code": "401002", "name": "Sales - 50cl x20 Pack", "type": "Revenue" },
    { "id": "401003", "code": "401003", "name": "Sales - 33cl x20 Pack", "type": "Revenue" },
    { "id": "402000", "code": "402000", "name": "Sales Returns & Allowances", "type": "Revenue" },
    { "id": "403000", "code": "403000", "name": "Other Income", "type": "Revenue" },
    { "id": "501000", "code": "501000", "name": "Cost of Goods Sold - 75cl x12", "type": "Expense" },
    { "id": "501001", "code": "501001", "name": "Cost of Goods Sold - 50cl x12", "type": "Expense" },
    { "id": "501002", "code": "501002", "name": "Cost of Goods Sold - 50cl x20", "type": "Expense" },
    { "id": "501003", "code": "501003", "name": "Cost of Goods Sold - 33cl x20", "type": "Expense" },
    { "id": "502000", "code": "502000", "name": "Salaries and Wages - Production", "type": "Expense" },
    { "id": "502100", "code": "502100", "name": "Salaries and Wages - Admin", "type": "Expense" },
    { "id": "503000", "code": "503000", "name": "Rent Expense", "type": "Expense" },
    { "id": "504000", "code": "504000", "name": "Electricity - Production", "type": "Expense" },
    { "id": "504100", "code": "504100", "name": "Electricity - Admin General", "type": "Expense" },
    { "id": "505000", "code": "505000", "name": "Marketing Expenses", "type": "Expense" },
    { "id": "506000", "code": "506000", "name": "Depreciation Expense - Preform Machine", "type": "Expense" },
    { "id": "506001", "code": "506001", "name": "Depreciation Expense - Blower", "type": "Expense" },
    { "id": "506002", "code": "506002", "name": "Depreciation Expense - Molds", "type": "Expense" },
    { "id": "506003", "code": "506003", "name": "Depreciation Expense - 75cl Label Cylinder", "type": "Expense" },
    { "id": "506004", "code": "506004", "name": "Depreciation Expense - 50cl Lable Cylinder", "type": "Expense" },
    { "id": "506005", "code": "506005", "name": "Depreciation expense - 33cl Label Cylinder", "type": "Expense" },
    { "id": "506006", "code": "506006", "name": "Depreciation Expense - Generating Set", "type": "Expense" },
    { "id": "506007", "code": "506007", "name": "Depreciation Expense - Cooling Tower", "type": "Expense" },
    { "id": "507000", "code": "507000", "name": "Bank Charges", "type": "Expense" },
    { "id": "508000", "code": "508000", "name": "Insurance Expense", "type": "Expense" },
    { "id": "509000", "code": "509000", "name": "Maintenance Materials", "type": "Expense" },
    { "id": "509100", "code": "509100", "name": "Maintenance - Cottol Wool", "type": "Expense" },
    { "id": "509200", "code": "509200", "name": "Maintenance - Thinner (5L)", "type": "Expense" },
    { "id": "509300", "code": "509300", "name": "Maintenance - Ethanol (10L)", "type": "Expense" },
    { "id": "509400", "code": "509400", "name": "Maintenance - Soaps Cleaners", "type": "Expense" },
    { "id": "599999", "code": "599999", "name": "Miscellaneous Expenses", "type": "Expense" }
  ];
