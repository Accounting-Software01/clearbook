CREATE TABLE `bom_overheads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_id` int(11) NOT NULL,
  `overhead_name` varchar(100) NOT NULL,
  `cost_category` varchar(50) NOT NULL,
  `cost_method` varchar(50) NOT NULL,
  `cost` decimal(15,8) NOT NULL,
  `gl_account` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
