CREATE TABLE `supplier_invoice_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_invoice_id` int(11) NOT NULL,
  `po_item_id` int(11) DEFAULT NULL COMMENT 'Link to the specific item on the Purchase Order',
  `raw_material_id` int(11) NOT NULL COMMENT 'The item being invoiced',
  `description` varchar(255) DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_invoice_items_invoice` (`supplier_invoice_id`),
  KEY `fk_invoice_items_po_item` (`po_item_id`),
  KEY `fk_invoice_items_raw_material` (`raw_material_id`),
  CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`supplier_invoice_id`) REFERENCES `supplier_invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invoice_items_po_item` FOREIGN KEY (`po_item_id`) REFERENCES `purchase_order_items` (`id`),
  CONSTRAINT `fk_invoice_items_raw_material` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
