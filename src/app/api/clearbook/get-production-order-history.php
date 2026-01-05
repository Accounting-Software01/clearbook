<?php
require_once __DIR__ . '/db_connect.php';

header("Content-Type: application/json");

// CORS Headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, OPTIONS");
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

if (empty($_GET['production_order_id']) || empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Production Order ID and Company ID are required']);
    exit;
}

$production_order_id = $_GET['production_order_id'];
$company_id = $_GET['company_id'];
$user_role = isset($_GET['user_role']) ? $_GET['user_role'] : 'staff';

global $conn;

$history = [];

$cost_column = $user_role !== 'staff' ? ', mi.unit_cost' : ', 0 as unit_cost';

$query = "SELECT mi.issuance_date as date, 'Issued' as type, rm.name as description, mi.quantity, mi.unit_cost
          FROM material_issuances mi
          JOIN raw_materials rm ON mi.material_id = rm.id
          WHERE mi.production_order_id = ? AND mi.company_id = ?
          ORDER BY mi.issuance_date ASC";

$stmt = $conn->prepare($query);
$stmt->bind_param("is", $production_order_id, $company_id);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $price = $user_role !== 'staff' ? floatval($row['unit_cost']) : 0;
    $quantity = floatval($row['quantity']);
    $history[] = [
        'date' => $row['date'],
        'type' => $row['type'],
        'description' => $row['description'],
        'quantity' => $quantity,
        'price' => $price,
        'value' => $price * $quantity,
    ];
}

$stmt->close();
$conn->close();

http_response_code(200);
echo json_encode(['status' => 'success', 'history' => $history]);
?>
