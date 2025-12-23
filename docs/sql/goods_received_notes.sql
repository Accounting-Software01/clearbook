CREATE TABLE goods_received_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    grn_number VARCHAR(30) NOT NULL,
    grn_date DATE NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (grn_number),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
);
