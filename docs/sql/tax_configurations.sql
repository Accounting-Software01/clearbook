
CREATE TABLE IF NOT EXISTS `tax_configurations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `company_id` int(11) NOT NULL,
  `tax_name` varchar(255) NOT NULL,
  `tax_rate` decimal(10,2) NOT NULL,
  `tax_type` enum('VAT','WHT') NOT NULL,
  `payable_account_code` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
