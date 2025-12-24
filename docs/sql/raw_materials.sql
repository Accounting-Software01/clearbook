CREATE TABLE raw_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_of_measure VARCHAR(20) NOT NULL,
    preferred_supplier_id INT NULL,
    standard_cost DECIMAL(15, 2) DEFAULT 0.00,
    status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY (company_id, item_code),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (preferred_supplier_id) REFERENCES suppliers(id)
);
