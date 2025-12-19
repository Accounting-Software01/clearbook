<?php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw);

if (!isset($data->company_id) || !isset($data->lock_status)) {
    http_response_code(400);
    echo json_encode(["error" => "company_id and lock_status are required"]);
    exit();
}

$companyId = $data->company_id;
$lockStatus = (int)$data->lock_status; // 0 for unlock, 1 for lock

// Corrected SQL: Update a specific column in the 'companies' table.
// This assumes you have a 'companies' table with a 'payment_form_locked' column (TINYINT or BOOLEAN).
// If your table/column is named differently, please adjust the query.
$sql = "UPDATE companies SET payment_form_locked = ? WHERE id = ?";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "SQL Prepare Failed", "details" => $conn->error]);
    exit();
}

// Bind parameters: integer for lock status, integer for company ID
$stmt->bind_param("ii", $lockStatus, $companyId);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Form lock status updated successfully."]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Failed to update form lock status"]);
}

$stmt->close();
$conn->close();
exit();
?>