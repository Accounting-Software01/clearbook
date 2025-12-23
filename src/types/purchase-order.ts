export interface Supplier {
    id: string;
    name: string;
}

export interface PurchaseOrderLine {
    id: string;
    item_description: string; // Corrected from description
    quantity: number;
    rate: number; // Corrected from unit_price
    total: number; // Corrected from line_total
    quantity_received?: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  order_date: string;
  expected_delivery_date: string;
  total_amount: number;
  status: string;
  supplier: Supplier;
  lines: PurchaseOrderLine[];
}
