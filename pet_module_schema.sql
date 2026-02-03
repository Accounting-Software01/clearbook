-- Corrected and Compatible SQL Schema for the PET Production Module
-- Version 3: Adds explicit ENGINE and CHARSET to match the existing database environment.

-- Table to store the Bill of Materials (recipes) for PET products.
CREATE TABLE pet_boms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id VARCHAR(20) NOT NULL,
    bom_name VARCHAR(255) NOT NULL,
    output_item_id INT(11) NOT NULL,
    production_stage ENUM('injection', 'blowing') NOT NULL,

    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (output_item_id) REFERENCES raw_materials(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table to store the components (ingredients) for each PET BOM.
CREATE TABLE pet_bom_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_bom_id INT NOT NULL,
    component_item_id INT(11) NOT NULL,
    quantity_required DECIMAL(10, 5) NOT NULL,

    FOREIGN KEY (pet_bom_id) REFERENCES pet_boms(id) ON DELETE CASCADE,
    FOREIGN KEY (component_item_id) REFERENCES raw_materials(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table to track individual production jobs for the PET module.
CREATE TABLE pet_production_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pet_bom_id INT NOT NULL,
    company_id VARCHAR(20) NOT NULL,
    order_date DATE NOT NULL,
    quantity_to_produce DECIMAL(12, 2) NOT NULL,
    quantity_produced DECIMAL(12, 2),
    status ENUM('Planned', 'In Progress', 'Completed') NOT NULL DEFAULT 'Planned',
    total_material_cost DECIMAL(15, 5),
    cost_per_unit_produced DECIMAL(15, 5),

    FOREIGN KEY (pet_bom_id) REFERENCES pet_boms(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
