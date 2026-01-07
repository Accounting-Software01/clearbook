'use client'
// Base URL for new ClearBook endpoints
const CLEARBOOK_API_BASE_URL = 'https://hariindustries.net/api/clearbook';

export const apiEndpoints = {
  // UPDATED: Pointing to the new customer endpoint
  getCustomers: (companyId: string) => `${CLEARBOOK_API_BASE_URL}/get_customers.php?company_id=${companyId}`,
  getCustomersInfo: (companyId: string) => `${CLEARBOOK_API_BASE_URL}/get_customers_info.php?company_id=${companyId}`,
  getCustomersLedger: (companyId: string) => `${CLEARBOOK_API_BASE_URL}/get-customer-ledger.php?company_id=${companyId}`,
  registerItem: `${CLEARBOOK_API_BASE_URL}/register-item.php`,
  recordInventoryOpeningBalance: `${CLEARBOOK_API_BASE_URL}/record-inventory-opening-balance.php`,

  // --- Other endpoints (unchanged for now) ---
  getSellableItems: `${CLEARBOOK_API_BASE_URL}/get-sellable-items.php`,
  getSalesInvoices: `${CLEARBOOK_API_BASE_URL}/get-sales-invoices.php`,
  getCustomerTrail: `${CLEARBOOK_API_BASE_URL}/get-customer-trail.php`,
  salesInvoice: `${CLEARBOOK_API_BASE_URL}/sales-invoice.php`,
};
