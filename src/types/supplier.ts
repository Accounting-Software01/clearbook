'''export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms: 'cash' | '7_days' | '15_days' | '30_days' | '45_days' | '60_days';
  default_payable_account: string; // This will be an account code from the chart of accounts
  company_id: string;
  created_at: string;
  updated_at: string;
}
'''