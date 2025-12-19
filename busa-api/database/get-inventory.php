<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config.php';
require_once '../auth.php'; // We'll need this for role-based security

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database Connection Failed: " . $conn->connect_error]);
    exit();
}

$companyId = isset($_GET['companyId']) ? $_GET['companyId'] : null;
$itemType = isset($_GET['type']) ? $_GET['type'] : null; // 'product' or 'raw_material'

// 1. Authentication & Authorization
$user = get_user_from_token();
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "User not authenticated."]);
    exit();
}

if (!$companyId || !$itemType) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required parameters: companyId and type."]);
    exit();
}

// 2. Role-Based Security on the Backend
$isStoreManager = isset($user['role']) && $user['role'] === 'store_manager';

// We only select the unitCost if the user is NOT a store manager.
// This is a critical security enhancement.
$selectFields = "id, code, name, quantity";
if (!$isStoreManager) {
    $selectFields .= ", unitCost";
}

// 3. A Single, Parameterized Query
$sql = "SELECT $selectFields FROM items WHERE companyId = ? AND type = ? ORDER BY name ASC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "SQL Prepare Failed: " . $conn->error]);
    exit();
}

$stmt->bind_param("is", $companyId, $itemType);
$stmt->execute();
$result = $stmt->get_result();

$items = [];
while ($row = $result->fetch_assoc()) {
    // As a fallback, ensure unitCost is not in the output for store managers
    if ($isStoreManager) {
        $row['unitCost'] = 0;
    }
    $items[] = $row;
}

echo json_encode($items);

$stmt->close();
$conn->close();
?>