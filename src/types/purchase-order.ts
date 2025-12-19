'''import { Supplier } from './supplier';

export interface PurchaseOrderLine {
  id: string;
  item_description: string;
  quantity: number;
  rate: number;
  tax_rate?: number; // Optional tax rate per line
  total: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string; // e.g., PO-2024-001
  supplier: Supplier;
  order_date: string;
  expected_delivery_date?: string;
  lines: PurchaseOrderLine[];
  subtotal: number;
  tax_total: number;
  total_amount: number;
  status: 'draft' | 'approved' | 'ordered' | 'partially_received' | 'fully_received' | 'cancelled';
  company_id: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}
'''