CREATE TABLE `payment_vouchers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `voucher_number` varchar(50) NOT NULL,
  `payee_id` int(11) NOT NULL,
  `payee_type` enum('supplier','staff','customer') NOT NULL,
  `voucher_date` date NOT NULL,
  `payment_method` enum('cash','bank') NOT NULL,
  `bank_account_id` int(11) DEFAULT NULL,
  `narration` text,
  `total_amount` decimal(15,2) NOT NULL,
  `company_id` int(11) NOT NULL,
  `created_by` varchar(255) NOT NULL,
  `status` enum('draft','pending_approval','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `voucher_number` (`voucher_number`),
  KEY `company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `payment_voucher_line_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `payment_voucher_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `gl_account_id` int(11) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `payment_voucher_id` (`payment_voucher_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
