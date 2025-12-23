
export interface Supplier {
  id: string;
  code: string;
  name: string;
  type: 'Individual' | 'Company';
  status: 'Active' | 'Inactive' | 'Blacklisted';
  country?: string;
  currency?: string;
  ap_account_id: string;

  contact_person?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;

  billing_address?: string;
  city?: string;
  state?: string;

  default_bank_account?: boolean;
  bank_name?: string;
  account_name?: string;
  account_number?: string;

  payment_terms: 'Net 7' | 'Net 14' | 'Net 30' | 'Cash';
  preferred_payment_method?: 'Bank' | 'Cash' | 'Cheque';

  tin_number?: string;
  vat_registered: 'Yes' | 'No';
  vat_number?: string;
  default_vat_tax_category?: 'Goods' | 'Services' | 'Exempt';
  wht_applicable: 'Yes' | 'No';
  withholding_tax_rate?: number;

  company_id: string;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}
