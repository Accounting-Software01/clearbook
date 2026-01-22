CREATE TABLE `bom_components` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `component_type` varchar(50) NOT NULL,
  `quantity` decimal(15,5) NOT NULL,
  `waste_percentage` decimal(8,5) DEFAULT 0.00000,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`),
  KEY `item_id` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;