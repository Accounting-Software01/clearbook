CREATE TABLE goods_received_note_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grn_id INT NOT NULL,
    po_item_id INT NOT NULL,
    quantity_received DECIMAL(12,2) NOT NULL,

    FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id),
    FOREIGN KEY (po_item_id) REFERENCES purchase_order_items(id)
);
