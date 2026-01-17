<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../db_connect.php';

$alterQueries = [
    "ALTER TABLE boms ADD COLUMN scrap_percentage DECIMAL(5, 2) DEFAULT 0.00;",
    "ALTER TABLE boms ADD COLUMN prepared_by VARCHAR(255);",
    "ALTER TABLE boms ADD COLUMN approved_by VARCHAR(255);",
    "ALTER TABLE boms ADD COLUMN bom_type ENUM('Standard', 'Production', 'Engineering', 'Trial') DEFAULT 'Standard';"
];

$all_successful = true;
$error_messages = [];

foreach ($alterQueries as $sql) {
    // Check if the column already exists before trying to add it
    preg_match("/ADD COLUMN `?(\w+)`?/i", $sql, $matches);
    $column_name = $matches[1] ?? '';

    if ($column_name) {
        $check_sql = "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'boms' AND COLUMN_NAME = ?";
        $stmt = $conn->prepare($check_sql);
        $stmt->bind_param("s", $column_name);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            // Column already exists, so skip this query
            continue;
        }
    }

    if (!$conn->query($sql)) {
        $all_successful = false;
        $error_messages[] = $conn->error;
    }
}

if ($all_successful) {
    echo json_encode(["message" => "Table 'boms' updated successfully."]);
} else {
    http_response_code(500);
    echo json_encode(["message" => "Error updating table: ", "errors" => $error_messages]);
}

$conn->close();
