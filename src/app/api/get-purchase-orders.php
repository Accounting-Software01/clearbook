<?php
require_once 'db_connect.php';
require_once 'auth_check.php';

/************************************
 * HEADERS & PREFLIGHT
 ************************************/
header("Access-Control-Allow-Origin: *"); // In production, replace * with your specific domain
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * ROUTING & AUTHENTICATION
 ************************************/
$user = get_user_session();
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Authentication required']);
    exit;
}

$company_id = $user['company_id'];
$supplier_id = $_GET['supplier_id'] ?? null;

/************************************
 * API LOGIC
 ************************************/
$sql = "SELECT po.id, po.po_number, po.order_date, po.total_amount, po.status, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.company_id = ?";

if ($supplier_id) {
    $sql .= " AND po.supplier_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $company_id, $supplier_id);
} else {
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $company_id);
}

$stmt->execute();
$result = $stmt->get_result();
$purchase_orders = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode(['success' => true, 'purchase_orders' => $purchase_orders]);
?>
