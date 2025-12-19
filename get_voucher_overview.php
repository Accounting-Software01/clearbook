<?php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

if (!isset($_GET['company_id']) || trim($_GET['company_id']) === '') {
    http_response_code(400);
    echo json_encode(["error" => "company_id is required"]);
    exit();
}

$companyId = trim($_GET['company_id']);

// Corrected SQL: Fetches pending count from journal_vouchers and lock status from companies table.
$sql = "
    SELECT 
        (SELECT COUNT(*) FROM journal_vouchers WHERE company_id = ? AND status = 'pending') as pending_count,
        (SELECT payment_form_locked FROM companies WHERE id = ?) as is_locked;
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "SQL Prepare Failed", "details" => $conn->error]);
    exit();
}

// Bind companyId to both placeholders in the query.
$stmt->bind_param("ss", $companyId, $companyId);
$stmt->execute();
$result = $stmt->get_result();
$overview = $result->fetch_assoc();

if ($overview) {
    // Ensure is_locked is treated as a boolean.
    $overview['is_locked'] = (bool)$overview['is_locked'];
    $overview['pending_count'] = (int)$overview['pending_count'];
} else {
    // Handle case where company_id might not be found. Default to a safe state.
    $overview = ['pending_count' => 0, 'is_locked' => true]; 
}

$stmt->close();
$conn->close();

http_response_code(200);
// The React frontend expects the data directly, not nested.
echo json_encode($overview);
exit();
?>