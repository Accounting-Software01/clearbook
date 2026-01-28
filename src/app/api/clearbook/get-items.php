<?php
require_once __DIR__ . '/db_connect.php';

// ========================
// CONFIG & HEADERS
// ========================
header("Content-Type: application/json");
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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

// ========================
// SCRIPT LOGIC
// ========================

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Company ID is required']);
    exit;
}

$company_id = $_GET['company_id'];
global $conn;

/**
 * Calculates the accurate current stock and average cost for a single item 
 * by re-calculating its entire history. This logic mirrors get-item-history.php
 * to ensure 100% consistency.
 */
function calculate_item_state($item_id, $item_type, $company_id, $conn) {
    $sql_parts = [];
    $params = [];
    $types = "";

    // Building the query to get all transactions for the item
    if ($item_type === 'raw_material') {
        // Goods Receipts (Stock In)
        $sql_parts[] = "(SELECT grn.received_date AS date, gri.quantity_received AS quantity, gri.unit_price AS price, grn.id AS sort_key FROM goods_received_note_items gri JOIN goods_received_notes grn ON grn.id = gri.grn_id WHERE gri.raw_material_id = ? AND gri.company_id = ?)";
        array_push($params, $item_id, $company_id);
        $types .= "is";
        // Production Consumption (Stock Out)
        $sql_parts[] = "(SELECT po.creation_date AS date, -poc.quantity_consumed AS quantity, poc.unit_cost_at_consumption AS price, po.id AS sort_key FROM production_order_consumption poc JOIN production_orders po ON po.id = poc.production_order_id WHERE poc.material_id = ? AND po.company_id = ?)";
        array_push($params, $item_id, $company_id);
        $types .= "is";
        // Manual Issuances (Stock Out)
        $sql_parts[] = "(SELECT ii.issue_date AS date, -ii.quantity_issued AS quantity, ii.unit_cost AS price, ii.id AS sort_key FROM inventory_issuances ii WHERE ii.raw_material_id = ? AND ii.company_id = ?)";
        
        array_push($params, $item_id, $company_id);
        $types .= "is";
    } else { // 'product'
        // Production Output (Stock In)
        $sql_parts[] = "(SELECT po.completion_date AS date, po.quantity_to_produce AS quantity, (po.total_material_cost + po.total_labor_cost + po.total_overhead_cost) / NULLIF(po.quantity_to_produce, 0) AS price, po.id AS sort_key FROM production_orders po WHERE po.product_id = ? AND po.company_id = ? AND po.status = 'Completed')";
        array_push($params, $item_id, $company_id);
        $types .= "is";
        // Sales (Stock Out) - CORRECTED from sii.item_id to sii.product_id
                $sql_parts[] = "(
            SELECT si.invoice_date AS date,
                   -sii.quantity AS quantity,
                   sii.unit_price AS price,
                   si.id AS sort_key
            FROM sales_invoice_items sii
            JOIN sales_invoices si ON si.id = sii.invoice_id
            WHERE sii.product_id = ?
            AND si.company_id = ?
        )";
        
        array_push($params, $item_id, $company_id);
        $types .= "is";
    }

    if (empty($sql_parts)) {
        return ['quantity' => 0, 'unit_cost' => 0, 'total_value' => 0];
    }

    $full_sql = implode(" UNION ALL ", $sql_parts) . " ORDER BY date ASC, sort_key ASC";
    $stmt = $conn->prepare($full_sql);
    
    // Check for query preparation failure
    if (!$stmt) {
        // Log error and return null to indicate failure
        error_log("Failed to prepare statement: " . $conn->error);
        error_log("Failing SQL: " . $full_sql);
        return null; 
    }
    
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $transactions = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // This is the core weighted-average calculation logic, starting from zero.
    $running_qty = 0.0;
    $running_avg_cost = 0.0;

    foreach ($transactions as $txn) {
        $qty_change = (float)$txn['quantity'];
        $price = (float)$txn['price'];
        $old_qty = $running_qty;
        $old_avg_cost = $running_avg_cost;

        if ($qty_change > 0) { // Stock In
            $new_total_value = ($old_qty * $old_avg_cost) + ($qty_change * $price);
            $running_qty = $old_qty + $qty_change;
            $running_avg_cost = ($running_qty != 0) ? $new_total_value / $running_qty : 0;
        } else { // Stock Out
            // Note: The average cost does not change on a stock-out.
            $running_qty = $old_qty + $qty_change;
        }
    }

    return [
        'quantity' => $running_qty,
        'unit_cost' => $running_avg_cost,
        'total_value' => $running_qty * $running_avg_cost
    ];
}

$response = [
    'products' => [],
    'raw_materials' => []
];

$item_types = ['product', 'raw_material'];

foreach ($item_types as $item_type) {
    $table_name = ($item_type === 'product') ? 'products' : 'raw_materials';
    $key = ($item_type === 'product') ? 'products' : 'raw_materials';

    // 1. Get basic info (id, name, etc.) for all items of this type
    $query = "SELECT id, name, sku, category, unit_of_measure FROM {$table_name} WHERE company_id = ?";
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Query failed',
            'details' => $conn->error
        ]);
        exit;
    }
    
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

  // ...
    // 2. For each item, calculate its true state from its entire history
    foreach ($items as $item) {
        $calculated_state = calculate_item_state($item['id'], $item_type, $company_id, $conn);

        // ** THE FIX IS HERE **
        // If calculation fails or returns no history, create a default zero state 
        // instead of skipping the item.
        if (!$calculated_state) {
            $calculated_state = [
                'quantity' => 0,
                'unit_cost' => 0,
                'total_value' => 0
            ];
        }

        // Always add the item to the response, ensuring no product is ever skipped.
        $response[$key][] = [
            'id' => $item['id'],
            'name' => $item['name'],
            'sku' => $item['sku'],
            'category' => $item['category'],
            'unit_of_measure' => $item['unit_of_measure'],
            'item_type' => $item_type,
            'unit_cost' => $calculated_state['unit_cost'],
            'quantity' => $calculated_state['quantity'],
            'total_value' => $calculated_state['total_value'],
        ];
    }

}

$conn->close();

http_response_code(200);
echo json_encode($response);
?>