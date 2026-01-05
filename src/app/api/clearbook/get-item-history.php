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

if (empty($_GET['item_id']) || empty($_GET['company_id']) || empty($_GET['item_type'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Item ID, Company ID, and Item Type are required']);
    exit;
}

$item_id = $_GET['item_id'];
$company_id = $_GET['company_id'];
$item_type = $_GET['item_type']; // e.g., 'raw_material'
$user_role = isset($_GET['user_role']) ? $_GET['user_role'] : 'staff';

global $conn;

$transactions = [];

// For now, we only support raw_materials
if ($item_type === 'raw_material') {
    // Get Received Items
    $query_received = "SELECT ir.quantity_received, ir.unit_cost, ir.created_at as date, 'Received' as type, CONCAT('PO-', ir.purchase_order_id) as description
                       FROM inventory_received ir
                       WHERE ir.raw_material_id = ? AND ir.company_id = ?";
    $stmt_received = $conn->prepare($query_received);
    $stmt_received->bind_param("is", $item_id, $company_id);
    $stmt_received->execute();
    $result_received = $stmt_received->get_result();
    while ($row = $result_received->fetch_assoc()) {
        $row['quantity'] = $row['quantity_received'];
        unset($row['quantity_received']);
        $transactions[] = $row;
    }
    $stmt_received->close();

    // Get Issued Items
    $query_issued = "SELECT mi.quantity, mi.issuance_date as date, 'Issued' as type, 'Production Order' as description
                     FROM material_issuances mi
                     WHERE mi.material_id = ? AND mi.company_id = ?";
    $stmt_issued = $conn->prepare($query_issued);
    $stmt_issued->bind_param("is", $item_id, $company_id);
    $stmt_issued->execute();
    $result_issued = $stmt_issued->get_result();
    while ($row = $result_issued->fetch_assoc()) {
        $row['quantity'] = -$row['quantity']; // Issued quantity is negative
        $transactions[] = $row;
    }
    $stmt_issued->close();
}

// Sort transactions by date
usort($transactions, function($a, $b) {
    return strtotime($a['date']) - strtotime($b['date']);
});

// Calculate running balance and format output
$running_quantity = 0;
$history = [];
$is_first = true;

foreach ($transactions as $transaction) {
    $quantity = floatval($transaction['quantity']);
    $price = ($user_role !== 'staff' && isset($transaction['unit_cost'])) ? floatval($transaction['unit_cost']) : 0;
    
    if ($is_first && $quantity > 0) {
        // Treat the first positive transaction as the opening balance for display
        $opening_balance_entry = [
            'date' => $transaction['date'],
            'type' => 'Opening Balance',
            'description' => 'Initial Stock',
            'quantity' => $quantity,
            'price' => $price,
            'value' => $price * $quantity,
        ];
        $history[] = $opening_balance_entry;
        $running_quantity = $quantity;
        $is_first = false;
    } else {
        $running_quantity += $quantity;
        $entry = [
            'date' => $transaction['date'],
            'type' => $transaction['type'],
            'description' => $transaction['description'],
            'quantity' => $quantity,
            'price' => $price,
            'value' => $price * $quantity,
        ];
        $history[] = $entry;
    }
}

// Add a final balance row
if (!empty($history)) {
    $last_transaction = end($history);
    $balance_entry = [
        'date' => date('Y-m-d H:i:s'),
        'type' => 'Balance',
        'description' => 'Current Stock',
        'quantity' => $running_quantity,
        'price' => null, // Price is not applicable for a balance summary
        'value' => null, // Value is not applicable for a balance summary
    ];
    $history[] = $balance_entry;
}


$conn->close();

http_response_code(200);
echo json_encode(['status' => 'success', 'history' => $history]);
?>
