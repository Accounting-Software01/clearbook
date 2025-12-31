-- ====================================================================
-- SCHEMA FOR PRODUCTION MANAGEMENT
-- ====================================================================

--
-- Main table to track the overall status and details of a production order.
--
CREATE TABLE `production_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` VARCHAR(255) NOT NULL COMMENT 'Links to the company running the production',
  `product_id` INT NOT NULL COMMENT 'The finished good being produced (from inventory_items)',
  `quantity_to_produce` DECIMAL(10, 2) NOT NULL COMMENT 'The target quantity of the finished good',
  `status` ENUM('Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `creation_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `start_date` TIMESTAMP NULL COMMENT 'Timestamp for when production actually began',
  `completion_date` TIMESTAMP NULL COMMENT 'Timestamp for when production was finished',
  `notes` TEXT COMMENT 'Special instructions or notes for the production run',
  `created_by_id` INT NULL COMMENT 'The user who initiated the order',
  -- Foreign key constraints
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_product_id` (`product_id`),
  INDEX `idx_created_by_id` (`created_by_id`)
  -- Note: Actual FOREIGN KEY constraints can be added if referential integrity is enforced.
  -- FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`),
  -- FOREIGN KEY (`product_id`) REFERENCES `inventory_items`(`id`),
  -- FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Tracks the specific raw materials consumed during a production run.
-- This table links the production order to the items in the inventory.
--
CREATE TABLE `production_order_consumption` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `production_order_id` INT NOT NULL,
  `material_id` INT NOT NULL COMMENT 'The raw material or sub-component being consumed (from inventory_items)',
  `quantity_consumed` DECIMAL(10, 2) NOT NULL COMMENT 'The quantity of the raw material used',
  `unit_cost_at_consumption` DECIMAL(10, 2) NOT NULL COMMENT 'The unit cost of the material at the time of consumption for accurate accounting',
  -- Foreign key constraint to automatically delete consumption records if the parent order is deleted.
  FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE,
  INDEX `idx_material_id` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
