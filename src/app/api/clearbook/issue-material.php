<?php
require_once __DIR__ . '/db_connect.php';

header("Content-Type: application/json");

// CORS Headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // Cache for 1 day
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
    }
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

global $conn;
$data = json_decode(file_get_contents('php://input'), true);

// Basic validation
$required_fields = ['material_id', 'quantity', 'user_id', 'company_id'];
foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "Missing required field: {$field}"]);
        exit;
    }
}

$material_id = (int)$data['material_id'];
$quantity = (float)$data['quantity'];
$user_id = (int)$data['user_id'];
$company_id = $data['company_id'];

try {
    // --- Authorization Check ---
    $role_stmt = $conn->prepare("SELECT role FROM users WHERE id = ? AND company_id = ?");
    $role_stmt->bind_param("is", $user_id, $company_id);
    $role_stmt->execute();
    $role_result = $role_stmt->get_result();
    if ($role_result->num_rows === 0) {
        throw new Exception("User not found.", 404);
    }
    $user_role = $role_result->fetch_assoc()['role'];

    if ($user_role !== 'admin' && $user_role !== 'staff') {
        throw new Exception('You are not authorized to perform this action.', 403);
    }
    // --- End Authorization Check ---

    $conn->begin_transaction();

    // 1. Get current stock and cost
    $stmt = $conn->prepare("SELECT quantity_on_hand, average_unit_cost FROM raw_materials WHERE id = ? AND company_id = ?");
    $stmt->bind_param("is", $material_id, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception("Material not found.");
    }
    $material = $result->fetch_assoc();
    $current_stock = $material['quantity_on_hand'];
    $unit_cost = $material['average_unit_cost'];

    if ($current_stock < $quantity) {
        throw new Exception("Not enough stock to issue.");
    }

    // 2. Update raw_materials table
    $new_stock = $current_stock - $quantity;
    $stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = ? WHERE id = ?");
    $stmt->bind_param("di", $new_stock, $material_id);
    $stmt->execute();

    // 3. Record the transaction
    $stmt = $conn->prepare("INSERT INTO material_issues (material_id, quantity_issued, issued_by_user_id, unit_cost_at_issue, company_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("idiis", $material_id, $quantity, $user_id, $unit_cost, $company_id);
    $stmt->execute();

    $conn->commit();

    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Material issued successfully']);

} catch (Exception $e) {
    $conn->rollback();
    $errorCode = is_int($e->getCode()) && $e->getCode() >= 400 && $e->getCode() < 600 ? $e->getCode() : 500;
    http_response_code($errorCode);
    echo json_encode(['status' => 'error', 'message' => 'Operation failed', 'details' => $e->getMessage()]);
}

$conn->close();
?>