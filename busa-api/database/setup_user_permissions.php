<?php
require_once '../../src/app/api/db_connect.php';

header('Content-Type: application/json');

$sql = "
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT 'Links to the user receiving the permission',
  `permission` VARCHAR(255) NOT NULL COMMENT 'The permission key (e.g., view_inventory)',
  `company_id` VARCHAR(255) NOT NULL,
  `creation_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_company_id` (`company_id`),
  UNIQUE KEY `unique_user_permission` (`user_id`, `permission`, `company_id`)
) COMMENT='Stores individual permission overrides for specific users.';
";

if (mysqli_query($conn, $sql)) {
    echo json_encode(['success' => true, 'message' => 'Table user_permissions created successfully or already exists.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Error creating table: ' . mysqli_error($conn)]);
}

mysqli_close($conn);
?>