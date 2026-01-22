CREATE TABLE `bom_operations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bom_id` int(11) NOT NULL,
  `sequence` int(11) NOT NULL,
  `operation_name` varchar(255) NOT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `bom_id` (`bom_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;