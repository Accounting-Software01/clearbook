<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../db_connect.php';

// Drop the table if it exists to ensure the new schema is applied
$conn->query("DROP TABLE IF EXISTS bom_operations");

$sql = "
CREATE TABLE IF NOT EXISTS bom_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_id INT NOT NULL,
    company_id VARCHAR(20) NOT NULL,
    sequence INT NOT NULL,
    operation_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_id) REFERENCES boms(id) ON DELETE CASCADE
);
";

if ($conn->query($sql) === TRUE) {
    echo json_encode(["message" => "Table bom_operations created successfully with the new schema."]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error creating table: " . $conn->error]);
}

$conn->close();
