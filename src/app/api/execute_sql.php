<?php
// This is a temporary script to execute a SQL file.
// It will be deleted after use.

header('Content-Type: text/plain');

// Include the existing database connection
require_once __DIR__ . '/db_connect.php';

global $conn; // Use the global mysqli connection object

// Path to the SQL file from the root of the project
$sql_file_path = __DIR__ . '/../../../docs/sql/product_price_tiers.sql';

echo "Attempting to execute SQL script: {$sql_file_path}\n";

if (!file_exists($sql_file_path)) {
    http_response_code(404);
    die("ERROR: SQL file not found at path: {$sql_file_path}\n");
}

$sql_content = file_get_contents($sql_file_path);
if ($sql_content === false) {
    http_response_code(500);
    die("ERROR: Could not read the SQL file.\n");
}

// Execute the multi-statement SQL query
if ($conn->multi_query($sql_content)) {
    echo "SUCCESS: SQL script executed successfully.\n";
    // It's important to clear results from multi_query
    while ($conn->next_result()) {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    }
} else {
    http_response_code(500);
    echo "ERROR: Failed to execute SQL script.\n";
    echo "Error details: " . $conn->error . "\n";
}

$conn->close();

?>