export interface InventoryItem {
    id: number;
    name: string;
    sku: string;
    category: string;
    unit_of_measure: string;
    unit_cost: number; 
    quantity: number; 
    item_type: 'product' | 'raw_material';
    total_value?: number; // Calculated on the client, so optional here
}
