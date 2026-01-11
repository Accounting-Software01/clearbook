export interface UnpaidInvoice {
    id: number;
    invoice_number: string;
    supplier_name: string;
    invoice_date: string;
    due_date: string;
    total_amount: string;
    status: string;
    vatAmount: number;
    whtAmount: number;
}
