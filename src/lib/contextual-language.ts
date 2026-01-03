'use client';

// Defines the shape of the language object, making it type-safe.
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
    customer: string; // The term for a single customer, e.g., Patient, Client
    customers: string; // The term for multiple customers, e.g., Patients, Clients
    suppliers: string;
    vendors: string;
    sales: string;
    procurement: string;
    logout: string;
    registerNewCustomer: string; // The full phrase for registering a new customer
}

// Language mapping for a hospital setting
const hospitalLanguage: Language = {
    dashboard: "Dashboard",
    transactions: "Transactions",
    newPayment: "New Payment",
    journalEntry: "Journal Entry",
    financialReports: "Financial Reports",
    generalLedger: "General Ledger",
    trialBalance: "Trial Balance",
    profitLoss: "Profit & Loss",
    balanceSheet: "Balance Sheet",
    cashFlow: "Cash Flow",
    inventory: "Inventory",
    drugsAndSupplies: "Drugs & Supplies",
    customer: "Patient",
    customers: "Patients",
    suppliers: "Suppliers",
    vendors: "Vendors",
    sales: "Billing",
    procurement: "Procurement",
    logout: "Logout",
    registerNewCustomer: "Register New Patient", // New phrase for hospitals
};

// Language mapping for a manufacturing setting
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
    customer: "Customer",
    customers: "Customers",
    suppliers: "Suppliers",
    vendors: "Vendors",
    sales: "Sales",
    procurement: "Procurement",
    logout: "Logout",
    registerNewCustomer: "Register New Customer", // New phrase for manufacturing
};

/**
 * Returns the appropriate language mapping based on the company type.
 * @param companyType The type of the company (e.g., 'hospital', 'manufacturing').
 * @returns A Language object.
 */
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
