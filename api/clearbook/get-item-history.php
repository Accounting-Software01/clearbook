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
    // Fallback for development environments
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
    // Goods Received (Stock In)
    $sql_parts[] = "(
        SELECT
            grn.received_date AS date,
            'Goods Receipt' AS type,
            CONCAT('From GRN: ', grn.grn_number) AS description,
            gri.quantity_received AS quantity,
            gri.unit_price AS price
        FROM goods_received_note_items gri
        JOIN goods_received_notes grn ON grn.id = gri.grn_id
        WHERE gri.raw_material_id = ? AND gri.company_id = ?
    )";
    array_push($params, $item_id, $company_id);
    $types .= "is";

    // Issued to Production (Stock Out)
    $sql_parts[] = "(
        SELECT
            po.creation_date AS date,
            'Production Issue' AS type,
            CONCAT('To Production Order: ', po.id) AS description,
            -poc.quantity_consumed AS quantity,
            poc.unit_cost_at_consumption AS price
        FROM production_order_consumption poc
        JOIN production_orders po ON po.id = poc.production_order_id
        WHERE poc.material_id = ? AND po.company_id = ?
    )";
    array_push($params, $item_id, $company_id);
    $types .= "is";

    // Manual Issuances (Stock Out)
    $sql_parts[] = "(
        SELECT
            ii.issue_date AS date,
            'Manual Issue' AS type,
            CONCAT(ii.issue_type, IF(ii.reference IS NOT NULL, CONCAT(' - Ref: ', ii.reference), '')) AS description,
            -ii.quantity_issued AS quantity,
            ii.unit_cost AS price
        FROM inventory_issuances ii
        WHERE ii.raw_material_id = ? AND ii.company_id = ?
    )";
    array_push($params, $item_id, $company_id);
    $types .= "is";

} elseif ($item_type === 'finished_good') {
    // Production Output (Stock In)
    $sql_parts[] = "(
        SELECT
            po.completion_date AS date,
            'Production Output' AS type,
            CONCAT('From Production Order: ', po.id) AS description,
            po.quantity_to_produce AS quantity,
            (po.total_material_cost + po.total_labor_cost + po.total_overhead_cost) / NULLIF(po.quantity_to_produce, 0) AS price
        FROM production_orders po
        WHERE po.product_id = ? AND po.company_id = ? AND po.status = 'Completed'
    )";
    array_push($params, $item_id, $company_id);
    $types .= "is";

    // Sales (Stock Out)
    $sql_parts[] = "(
        SELECT
            si.invoice_date AS date,
            'Sale' AS type,
            CONCAT('Invoice ', si.invoice_number) AS description,
            -sii.quantity AS quantity,
            sii.unit_price AS price -- This is sales price, for stock out, we will use running avg cost
        FROM sales_invoice_items sii
        JOIN sales_invoices si ON si.id = sii.invoice_id
        WHERE sii.item_id = ? AND sii.company_id = ?
    )";
    array_push($params, $item_id, $company_id);
    $types .= "is";
}

if (empty($sql_parts)) {
    echo json_encode(['status' => 'success', 'history' => []]);
    exit;
}

$full_sql = implode(" UNION ALL ", $sql_parts) . " ORDER BY date ASC, type ASC"; // Added type to sort order for stability
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
$running_qty = $opening_qty;
$running_avg_cost = $opening_avg_cost;

// Add the calculated Opening Balance as the first entry
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

// Now process the actual transactions
foreach ($transactions as $txn) {
    $qty_change = (float)$txn['quantity'];
    $db_price = (float)$txn['price'];
    $old_qty = $running_qty;
    $old_avg_cost = $running_avg_cost;

    $transaction_cost = 0;

    if ($qty_change > 0) { // STOCK IN
        $transaction_cost = $db_price;
        $running_qty = $old_qty + $qty_change;
        if ($running_qty != 0) {
            $running_avg_cost = (($old_qty * $old_avg_cost) + ($qty_change * $transaction_cost)) / $running_qty;
        } else {
            $running_avg_cost = $transaction_cost;
        }
    } else { // STOCK OUT
        $transaction_cost = $old_avg_cost; // Use the running average cost for the cost of goods sold/issued
        $running_qty = $old_qty + $qty_change;
        // The average cost of remaining stock doesn't change on a stock-out event.
    }

    $value_change = $qty_change * $transaction_cost;

    $entry = [
        'date' => $txn['date'],
        'type' => $txn['type'],
        'description' => $txn['description'],
        'quantity' => $qty_change,
        'unit_cost' => $transaction_cost,
        'total_value' => $value_change,
        'balance_quantity' => $running_qty,
        'balance_avg_cost' => $running_avg_cost,
        'balance_total_value' => $running_qty * $running_avg_cost,
    ];

    if ($user_role === 'staff') {
        $entry['unit_cost'] = null;
        $entry['total_value'] = null;
        $entry['balance_avg_cost'] = null;
        $entry['balance_total_value'] = null;
    }
    
    $ledger[] = $entry;
}

echo json_encode([
    'status' => 'success',
    'item_id' => $item_id,
    'item_type' => $item_type,
    'history' => $ledger
]);

$conn->close();
?>
