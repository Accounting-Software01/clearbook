<?php
// src/app/api/execute-schema.php

require_once 'db_connect.php';
global $conn;

header('Content-Type: application/json');

// Basic security: check for a specific query parameter to prevent accidental execution
if (!isset($_GET['execute']) || $_GET['execute' !== 'true') {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden: You must provide the correct execution parameter.']);
    exit;
}

$sql_file_path = '../../docs/sql/raw_materials.sql'; // Adjusted path

if (!file_exists($sql_file_path)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'SQL file not found at ' . realpath($sql_file_path)]);
    exit;
}

$sql = file_get_contents($sql_file_path);

if ($conn->multi_query($sql)) {
    // Important to clear results for multi_query
    do {
        if ($result = $conn->store_result()) {
            $result->free();
        }
    } while ($conn->more_results() && $conn->next_result());
    
    echo json_encode(['success' => true, 'message' => 'Table `raw_materials` created successfully.']);

} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error creating table: ' . $conn->error]);
}

$conn->close();

// Self-delete this file after execution
// unlink(__FILE__);

?>