<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-control-allow-headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../db_connect.php';

// First, drop the table if it exists to ensure the new schema is applied
$conn->query("DROP TABLE IF EXISTS bom_overheads");

$sql = "
CREATE TABLE IF NOT EXISTS bom_overheads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    company_id VARCHAR(20) NOT NULL,
    overhead_name VARCHAR(255) NOT NULL,
    cost_method ENUM('per_unit', 'per_batch', 'percentage_of_material') NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    gl_account VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE
);
";

if ($conn->query($sql) === TRUE) {
    echo json_encode(["message" => "Table bom_overheads created successfully with the new schema."]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error creating table: " . $conn->error]);
}

$conn->close();
