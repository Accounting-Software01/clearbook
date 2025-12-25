CREATE TABLE `goods_received_notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` varchar(50) NOT NULL,
  `purchase_order_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `grn_number` varchar(50) NOT NULL,
  `received_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Completed' COMMENT 'e.g., Pending Approval, Completed, Cancelled',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_grn_number_company` (`company_id`, `grn_number`),
  KEY `fk_grn_po` (`purchase_order_id`),
  KEY `fk_grn_supplier` (`supplier_id`),
  CONSTRAINT `fk_grn_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders` (`id`),
  CONSTRAINT `fk_grn_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
