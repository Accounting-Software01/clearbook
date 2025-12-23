CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    po_number VARCHAR(30) NOT NULL,
    supplier_id INT NOT NULL,

    po_date DATE NOT NULL,
    expected_delivery_date DATE NULL,

    currency VARCHAR(10) NOT NULL,
    payment_terms VARCHAR(50) NULL,

    subtotal DECIMAL(15,2) DEFAULT 0,
    vat_total DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,

    status ENUM('Draft','Submitted','Approved','Cancelled') DEFAULT 'Draft',

    remarks TEXT NULL,

    created_by INT NOT NULL,
    approved_by INT NULL,
    approved_at DATETIME NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (company_id, po_number),
    INDEX (supplier_id)
);
