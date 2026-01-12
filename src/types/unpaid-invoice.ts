export interface UnpaidInvoice {
    supplier_invoice_id: number;
    id: number; // Keeping id for compatibility if used elsewhere
    invoice_number: string;
    supplier_name: string;
    invoice_date: string;
    due_date: string;
    invoice_total: string;
    total_amount: string; // Keeping for compatibility
    status: string;
    expected_vat: string;
    vatAmount: number;
    whtAmount: number;
    glAccountCode?: string;
    accountName?: string;
}
