export interface Language {
    dashboard: string;
    transactions: string;
    newPayment: string;
    journalEntry: string;
    financialReports: string;
    generalLedger: string;
    trialBalance: string;
    profitLoss: string;
    balanceSheet: string;
    cashFlow: string;
    inventory: string;
    drugsAndSupplies: string;
    customers: string;
    suppliers: string;
    vendors: string;
    sales: string;
    procurement: string;
    logout: string;
}

const hospitalLanguage: Language = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    newPayment: "New Journal Entry",
    journalEntry: "Journal Entry",
    financialReports: "Financial Reports",
    generalLedger: "General Ledger",
    trialBalance: "Trial Balance",
    profitLoss: "Profit & Loss",
    balanceSheet: "Balance Sheet",
    cashFlow: "Cash Flow",
    inventory: "Inventory",
    drugsAndSupplies: "Drugs & Supplies",
    customers: "Patients",
    suppliers: "Vendors",
    vendors: "Vendors",
    sales: "Billing",
    procurement: "Procurement",
    logout: "Logout",
};

const manufacturingLanguage: Language = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    newPayment: "New Journal Entry",
    journalEntry: "Journal Entry",
    financialReports: "Financial Reports",
    generalLedger: "General Ledger",
    trialBalance: "Trial Balance",
    profitLoss: "Profit & Loss",
    balanceSheet: "Balance Sheet",
    cashFlow: "Cash Flow",
    inventory: "Inventory",
    drugsAndSupplies: "Drugs & Supplies",
    customers: "Customers",
    suppliers: "Suppliers",
    vendors: "Vendors",
    sales: "Sales",
    procurement: "Procurement",
    logout: "Logout",
};

export const getLanguageMapping = (companyType: string): Language => {
    switch (companyType) {
        case 'hospital':
            return hospitalLanguage;
        case 'manufacturing':
            return manufacturingLanguage;
        default:
            return hospitalLanguage; // Default to hospital language
    }
};
