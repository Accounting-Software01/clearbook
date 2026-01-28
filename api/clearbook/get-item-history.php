<?php
// ========================
// FULL DEBUGGING CONFIG
// ========================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set custom error & exception handlers
set_error_handler(function($severity, $message, $file, $line) {
    http_response_code(500);
    echo json_encode(['success' => false, 'type' => 'php_error', 'message' => $message, 'file' => $file, 'line' => $line]);
    exit;
});
set_exception_handler(function($exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'type' => 'exception', 'message' => $exception->getMessage(), 'file' => $exception->getFile(), 'line' => $exception->getLine()]);
    exit;
});

// ========================
// CORS & PREFLIGHT
// ========================
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = ['https://hariindustries.net', 'https://clearbook-olive.vercel.app'];
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ========================
// SCRIPT LOGIC
// ========================
require_once __DIR__ . '/db_connect.php';

$item_id    = $_GET['item_id'] ?? null;
$company_id = $_GET['company_id'] ?? null;
$item_type  = $_GET['item_type'] ?? null;
$user_role  = $_GET['user_role'] ?? 'staff';

if (!$item_id || !$company_id || !$item_type) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing item_id, company_id, or item_type.']);
    exit;
}

global $conn;

// Step 1: Build a UNION ALL query to fetch all transactions chronologically.
$sql_parts = [];
$params = [];
$types = "";

if ($item_type === 'raw_material') {
    $sql_parts[] = "(SELECT grn.received_date AS date, 'Goods Receipt' AS type, CONCAT('From GRN: ', grn.grn_number) AS description, gri.quantity_received AS quantity, gri.unit_price AS price, grn.id AS sort_key FROM goods_received_note_items gri JOIN goods_received_notes grn ON grn.id = gri.grn_id WHERE gri.raw_material_id = ? AND gri.company_id = ?)";
    array_push($params, $item_id, $company_id);
    $types .= "is";

    $sql_parts[] = "(SELECT po.creation_date AS date, 'Production Issue' AS type, CONCAT('To Production Order: ', po.id) AS description, -poc.quantity_consumed AS quantity, poc.unit_cost_at_consumption AS price, po.id AS sort_key FROM production_order_consumption poc JOIN production_orders po ON po.id = poc.production_order_id WHERE poc.material_id = ? AND po.company_id = ?)";
    array_push($params, $item_id, $company_id);
    $types .= "is";

    $sql_parts[] = "(SELECT ii.issue_date AS date, 'Manual Issue' AS type, CONCAT(ii.issue_type, IF(ii.reference IS NOT NULL, CONCAT(' - Ref: ', ii.reference), '')) AS description, -ii.quantity_issued AS quantity, ii.unit_cost AS price, ii.id AS sort_key FROM inventory_issuances ii WHERE ii.raw_material_id = ? AND ii.company_id = ?)";
    array_push($params, $item_id, $company_id);
    $types .= "is";

} elseif ($item_type === 'finished_good') {
    $sql_parts[] = "(SELECT po.completion_date AS date, 'Production Output' AS type, CONCAT('From Production Order: ', po.id) AS description, po.quantity_to_produce AS quantity, (po.total_material_cost + po.total_labor_cost + po.total_overhead_cost) / NULLIF(po.quantity_to_produce, 0) AS price, po.id AS sort_key FROM production_orders po WHERE po.product_id = ? AND po.company_id = ? AND po.status = 'Completed')";
    array_push($params, $item_id, $company_id);
    $types .= "is";

    $sql_parts[] = "(SELECT si.invoice_date AS date, 'Sale' AS type, CONCAT('Invoice ', si.invoice_number) AS description, -sii.quantity AS quantity, sii.unit_price AS price, si.id AS sort_key FROM sales_invoice_items sii JOIN sales_invoices si ON si.id = sii.invoice_id WHERE sii.item_id = ? AND sii.company_id = ?)";
    array_push($params, $item_id, $company_id);
    $types .= "is";
}

if (empty($sql_parts)) {
    echo json_encode(['status' => 'success', 'history' => []]);
    exit;
}

$full_sql = implode(" UNION ALL ", $sql_parts) . " ORDER BY date ASC, sort_key ASC";
$stmt = $conn->prepare($full_sql);
if (!$stmt) {
     http_response_code(500);
     echo json_encode(['status' => 'error', 'message' => 'SQL Prepare Failed: ' . $conn->error]);
     exit;
}
$stmt->bind_param($types, ...$params);
$stmt->execute();
$transactions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Step 1.5: Calculate and Set Opening Balance
$table_name = ($item_type === 'raw_material') ? 'raw_materials' : 'products';
$stmt_current = $conn->prepare("SELECT quantity_on_hand, average_unit_cost, created_at FROM {$table_name} WHERE id = ? AND company_id = ?");
$stmt_current->bind_param("is", $item_id, $company_id);
$stmt_current->execute();
$current_stock = $stmt_current->get_result()->fetch_assoc();
$stmt_current->close();

$current_qty = (float)($current_stock['quantity_on_hand'] ?? 0.0);
$opening_avg_cost = (float)($current_stock['average_unit_cost'] ?? 0.0);
$earliest_date = $current_stock['created_at'] ?? date('Y-m-d H:i:s');

$total_txn_qty_change = array_sum(array_column($transactions, 'quantity'));
$opening_qty = $current_qty - $total_txn_qty_change;

// Step 2: Process transactions to build a running ledger
$ledger = [];
$running_qty = 0.0;
$running_avg_cost = 0.0;

// Re-calculate opening balance from scratch if there are transactions
if (!empty($transactions)) {
    // Recalculate a more accurate opening cost by working backwards from the end state.
    $temp_running_qty = $current_qty;
    $temp_running_value = $current_qty * $opening_avg_cost; // Start with the DB value, which is likely stale

    // This loop is just to find a better opening cost. It doesn't build the final ledger.
    foreach (array_reverse($transactions) as $txn) {
        $qty_change = (float)$txn['quantity'];
        $price = (float)$txn['price'];

        if ($qty_change > 0) { // Backing out a stock-in
            $value_change = $qty_change * $price;
            $temp_running_value -= $value_change;
            $temp_running_qty -= $qty_change;
        } else { // Backing out a stock-out
            $old_qty_before_out = $temp_running_qty - $qty_change; // e.g. 10 - (-5) = 15
            if ($old_qty_before_out != 0 && $temp_running_qty != 0) {
                 $cost_at_time_of_issue = $temp_running_value / $temp_running_qty; // This is the avg cost before the issue
                 $value_change = $qty_change * $cost_at_time_of_issue;
                 $temp_running_value -= $value_change;
            }
            $temp_running_qty -= $qty_change;
        }
    }
    
    $opening_qty = $temp_running_qty;
    // If there was an opening quantity, use the reverse-calculated value to get a better opening cost.
    if($opening_qty > 0.001) {
      $opening_avg_cost = $temp_running_value / $opening_qty;
    }
}

$running_qty = $opening_qty;
$running_avg_cost = $opening_avg_cost;

if ($opening_qty > 0.001) {
    $opening_entry = [
        'date' => $earliest_date,
        'type' => 'Opening Balance',
        'description' => 'Calculated opening balance',
        'quantity' => $opening_qty,
        'unit_cost' => $running_avg_cost,
        'total_value' => $opening_qty * $running_avg_cost,
        'balance_quantity' => $running_qty,
        'balance_avg_cost' => $running_avg_cost,
        'balance_total_value' => $running_qty * $running_avg_cost,
    ];
    if ($user_role === 'staff') {
        $opening_entry['unit_cost'] = null;
        $opening_entry['total_value'] = null;
        $opening_entry['balance_avg_cost'] = null;
        $opening_entry['balance_total_value'] = null;
    }
    $ledger[] = $opening_entry;
}

// Now process the actual transactions chronologically
foreach ($transactions as $txn) {
    $qty_change = (float)$txn['quantity'];
    $db_price = (float)$txn['price'];
    $old_qty = $running_qty;
    $old_avg_cost = $running_avg_cost;

    $transaction_cost = 0;

    if ($qty_change > 0) { // STOCK IN
        $transaction_cost = $db_price;
        $new_total_value = ($old_qty * $old_avg_cost) + ($qty_change * $transaction_cost);
        $running_qty = $old_qty + $qty_change;
        $running_avg_cost = ($running_qty != 0) ? $new_total_value / $running_qty : 0;
    } else { // STOCK OUT
        $transaction_cost = $old_avg_cost; 
        $running_qty = $old_qty + $qty_change;
    }

    $entry = [
        'date' => $txn['date'], 'type' => $txn['type'], 'description' => $txn['description'],
        'quantity' => $qty_change, 'unit_cost' => $transaction_cost, 'total_value' => $qty_change * $transaction_cost,
        'balance_quantity' => $running_qty, 'balance_avg_cost' => $running_avg_cost,
        'balance_total_value' => $running_qty * $running_avg_cost,
    ];

    if ($user_role === 'staff') {
        $entry['unit_cost'] = null; $entry['total_value'] = null;
        $entry['balance_avg_cost'] = null; $entry['balance_total_value'] = null;
    }
    $ledger[] = $entry;
}

// Self-healing has been removed as it is a dangerous practice.
// The responsibility for maintaining accurate average cost lies with the individual
// transaction scripts (e.g., create-grn.php, issue-material.php).

echo json_encode([
    'status' => 'success',
    'item_id' => $item_id,
    'item_type' => $item_type,
    'history' => $ledger
]);

$conn->close();
?>