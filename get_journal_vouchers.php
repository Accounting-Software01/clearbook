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
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20; // Default to 20 records

$sql = "
    SELECT 
        id, 
        voucher_number, 
        entry_date, 
        narration, 
        total_debits, 
        status, 
        is_locked 
    FROM journal_vouchers 
    WHERE company_id = ? 
    ORDER BY entry_date DESC, id DESC
    LIMIT ?
";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["error" => "SQL Prepare Failed", "details" => $conn->error]);
    exit();
}

$stmt->bind_param("si", $companyId, $limit);
$stmt->execute();
$result = $stmt->get_result();

$vouchers = [];
while ($row = $result->fetch_assoc()) {
    $vouchers[] = $row;
}

$stmt->close();
$conn->close();

http_response_code(200);
echo json_encode([
    "success" => true,
    "data" => $vouchers
]);
exit();
?>