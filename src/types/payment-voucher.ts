export interface PaymentVoucherLineItem {
  lineNo: number;
  accountType: 'Expense' | 'Asset' | 'Liability';
  glAccountCode: string;
  accountName: string;
  lineDescription: string;
  costCenter: string;
  department: string;
  projectOrGrant?: string;
  debitAmount?: number;
  creditAmount?: number;
  vatApplicable: boolean;
  vatRate?: number;
  vatAmount?: number;
  whtApplicable: boolean;
  whtRate?: number;
  whtAmount?: number;
}

export type AuditTrailEntry = { 
  user: string; 
  action: string; 
  timestamp: string; 
  details?: any 
};

export interface PaymentVoucher {
  // A. Header
  id: string; // paymentVoucherNo, e.g., PV/2025/000145
  voucherDate: string; // ISO Date string
  paymentType: 'Bank' | 'Cash' | 'Mobile' | 'FX';
  paymentMode: 'Transfer' | 'Cheque' | 'Cash';
  currency: 'NGN' | 'USD' | 'GBP' | 'EUR';
  exchangeRate?: number; // Mandatory if currency is not base
  amountGross: number; // Auto-sum of line items
  amountNetPaid: number; // After tax deductions
  status: 'Draft' | 'Submitted' | 'Approved' | 'Posted';
  period: string; // e.g., "2025-01"

  // B. Payee Info
  payeeType: 'Supplier' | 'Staff' | 'Govt' | 'Other';
  payeeCode: string; // From master record
  payeeName: string; // Read-only from master
  payeeBankName?: string;
  payeeBankAccountNo?: string;
  payeeTaxId?: string; // TIN
  payeeAddress?: string;

  // C. Source Document
  sourceModule: 'AP' | 'Payroll' | 'Expense' | 'FA' | 'Treasury';
  sourceDocumentType: 'Invoice' | 'Advance' | 'Payroll' | 'Tax' | 'Loan';
  sourceDocumentNo: string;
  sourceDocumentDate?: string;
  narration: string; // Appears in GL

  // D. Line Items
  lineItems: PaymentVoucherLineItem[];

  // E. Tax Summary (Calculated and stored)
  totalVatDeducted: number;
  totalWhtDeducted: number;
  netPayable: number;
  vatPayableAccount: string; // GL Code
  whtPayableAccount: string; // GL Code

  // F. Payment Details
  bankOrCashAccount: string; // GL Code from Treasury list
  chequeNoOrRef?: string;
  paymentValueDate: string; // ISO Date string
  fxGainLossAccount?: string; // GL Code

  // G. Approval & Control
  preparedBy: string; // User ID or Name
  reviewedBy?: string;
  approvedBy?: string;
  approvalDate?: string;
  postingUser?: string;
  postingDate?: string;
  auditTrail: AuditTrailEntry[];
}
