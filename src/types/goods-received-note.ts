'''import { PurchaseOrder } from './purchase-order';
import { Supplier } from './supplier';

export interface GRNLine {
  id: string;
  po_line_id?: string; // Link back to the purchase order line
  item_description: string;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
}

export interface GoodsReceivedNote {
  id: string;
  grn_number: string; // e.g., GRN-2024-001
  purchase_order?: PurchaseOrder;
  supplier: Supplier;
  received_date: string;
  lines: GRNLine[];
  total_received_value: number;
  notes?: string;
  is_invoiced: boolean;
  company_id: string;
  created_by_user_id: string;
  created_at: string;
}
'''