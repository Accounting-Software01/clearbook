'use client'
// Base URL for new ClearBook endpoints
const CLEARBOOK_API_BASE_URL = 'https://hariindustries.net/api/clearbook';

export const apiEndpoints = {
  // Customer Endpoints
  getCustomersInfo: (companyId: string) => `${CLEARBOOK_API_BASE_URL}/get_customers_info.php?company_id=${companyId}`,
  
  // ADDED: The missing endpoint for getting customer details.
  // Constructs the URL with company_id, customer_id, and user_id as per your requirement.
  getCustomerDetails: (companyId: string, customerId: string, userId: number | string) => 
    `${CLEARBOOK_API_BASE_URL}/get_customer_details.php?company_id=${companyId}&customer_id=${customerId}&user_id=${userId}`,

  getCustomersLedger: (companyId: string) => `${CLEARBOOK_API_BASE_URL}/get-customer-ledger.php?company_id=${companyId}`,
  getCustomerTrail: `${CLEARBOOK_API_BASE_URL}/get-customer-trail.php`,
  
  // Item & Inventory Endpoints
  registerItem: `${CLEARBOOK_API_BASE_URL}/register-item.php`,
  recordInventoryOpeningBalance: `${CLEARBOOK_API_BASE_URL}/record-inventory-opening-balance.php`,
  getSellableItems: `${CLEARBOOK_API_BASE_URL}/get-sellable-items.php`,
  
  // Sales Endpoints
  getSalesInvoices: `${CLEARBOOK_API_BASE_URL}/get-sales-invoices.php`,
  salesInvoice: `${CLEARBOOK_API_BASE_URL}/sales-invoice.php`,
};
