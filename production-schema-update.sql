-- ====================================================================
-- SCHEMA UPDATE FOR ADDITIONAL PRODUCTION COSTS
-- ====================================================================

--
-- Add a column to store the planned labor cost directly in the main order table.
--
ALTER TABLE `production_orders`
ADD COLUMN `planned_labor_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Planned direct labor cost for the entire order';

--
-- Create a new table to track all other itemized costs associated with a production order.
-- This includes direct expenses, overheads, and any other miscellaneous costs.
--
CREATE TABLE `production_order_costs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `production_order_id` INT NOT NULL,
  `cost_type` ENUM('direct', 'misc') NOT NULL COMMENT 'Categorizes the cost (Direct Expense or Miscellaneous)',
  `description` VARCHAR(255) NOT NULL COMMENT 'A brief description of the cost (e.g., Tool Rental, Factory Overhead Allocation)',
  `amount` DECIMAL(10, 2) NOT NULL COMMENT 'The planned amount for this specific cost',
  -- Foreign key to ensure costs are linked to a valid production order.
  -- ON DELETE CASCADE means if the production order is deleted, these associated cost records are also automatically deleted.
  FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
