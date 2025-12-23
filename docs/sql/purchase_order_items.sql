CREATE TABLE purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    item_id INT NOT NULL,

    description VARCHAR(255) NULL,

    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,

    line_amount DECIMAL(15,2) NOT NULL,

    vat_applicable TINYINT(1) DEFAULT 0,
    vat_rate DECIMAL(5,2) NULL,
    vat_amount DECIMAL(15,2) DEFAULT 0,

    line_total DECIMAL(15,2) NOT NULL,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
    INDEX (item_id)
);
