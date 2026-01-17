<?php
// api/clearbook/create_reconciliation_table.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php';

echo "<pre>";

$table_name = 'bank_reconciliations';

// NOTE: For the FOREIGN KEY on company_id to work, the `company_id` column in your `companies` table must have a UNIQUE index.
// You can add one with: ALTER TABLE `companies` ADD UNIQUE (`company_id`);

$sql = "CREATE TABLE IF NOT EXISTS `{$table_name}` (\n" .
"  `id` INT AUTO_INCREMENT PRIMARY KEY,\n" .
"  `company_id` VARCHAR(20) NOT NULL, /*-- Ensured VARCHAR(20) --*/\n" .
"  `account_id` INT NOT NULL,\n" .
"  `created_by_id` VARCHAR(255) NOT NULL,\n" .
"  `reconciliation_date` DATE NOT NULL,\n" .
"  `statement_date` DATE NOT NULL,\n" .
"  `statement_balance` DECIMAL(15, 2) NOT NULL,\n" .
"  `cleared_balance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,\n" .
"  `difference` DECIMAL(15, 2) GENERATED ALWAYS AS (`cleared_balance` - `statement_balance`) STORED,\n" .
"  `status` ENUM('draft', 'completed') NOT NULL DEFAULT 'draft',\n" .
"  `notes` TEXT,\n" .
"  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n" .
"  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n" .
"  FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON DELETE CASCADE, /*-- Corrected Foreign Key --*/\n" .
"  FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`) ON DELETE CASCADE\n" .
") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;";

if ($conn->query($sql) === TRUE) {
    echo "Table '{$table_name}' created successfully or already exists.\n";
} else {
    echo "Error creating table '{$table_name}': " . $conn->error . "\n";
}


$lines_table_name = 'bank_reconciliation_lines';

$lines_sql = "CREATE TABLE IF NOT EXISTS `{$lines_table_name}` (\n" .
"    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,\n" .
"    `reconciliation_id` INT NOT NULL,\n" .
"    `company_id` VARCHAR(20) NOT NULL, /*-- Added VARCHAR(20) --*/\n" .
"    `transaction_id` INT NOT NULL, \n" .
"    `is_cleared` BOOLEAN NOT NULL DEFAULT FALSE,\n" .
"    UNIQUE KEY `reconciliation_transaction` (`reconciliation_id`, `transaction_id`),
" .
"    FOREIGN KEY (`reconciliation_id`) REFERENCES `bank_reconciliations`(`id`) ON DELETE CASCADE,\n" .
"    FOREIGN KEY (`company_id`) REFERENCES `companies`(`company_id`) ON DELETE CASCADE /*-- Added Foreign Key --*/\n" .
") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;";

if ($conn->query($lines_sql) === TRUE) {
    echo "Table '{$lines_table_name}' created successfully or already exists.\n";
} else {
    echo "Error creating table '{$lines_table_name}': " . $conn->error . "\n";
}


$conn->close();

echo "</pre>";
?>