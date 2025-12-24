<?php
// temp_create_table.php
require_once 'src/app/api/db_connect.php';
global $conn;

$sql_file_path = 'docs/sql/raw_materials.sql';

if (!file_exists($sql_file_path)) {
    die("Error: SQL file not found at " . $sql_file_path);
}

$sql = file_get_contents($sql_file_path);

if ($conn->multi_query($sql)) {
    do {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());
    echo "Table 'raw_materials' created successfully.";
} else {
    echo "Error creating table: " . $conn->error;
}

$conn->close();
?>