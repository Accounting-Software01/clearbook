<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/utils.php'; // Includes findAccountIdByName and createJournalEntry

header("Content-Type: application/json");

// --- CORS Headers ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
    exit(0);
}
// --- End CORS Headers ---

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

// --- Validation ---
$required_fields = ['name', 'category', 'unit_of_measure', 'company_id', 'item_type', 'opening_balance', 'cost'];
foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "Missing required field: {$field}"]);
        exit;
    }
}

$item_type = $data['item_type'];
if ($item_type !== 'raw_material' && $item_type !== 'finished_good') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid item_type. Must be \'raw_material\' or \'finished_good\'.']);
    exit;
}

// --- Data Extraction ---
$company_id = (int)$data['company_id'];
$name = $data['name'];
$sku = $data['sku'] ?? null;
$category = $data['category'];
$unit_of_measure = $data['unit_of_measure'];
$opening_balance = (float)$data['opening_balance'];
$cost = (float)$data['cost'];
$table_name = ($item_type === 'raw_material') ? 'raw_materials' : 'finished_goods';

global $conn;

// --- Start Transaction ---
$conn->begin_transaction();

try {
    // --- Account Mapping ---
    $account_map = [
        'Raw Materials Inventory' => 'Inventory - Raw Materials',
        'Work-in-Progress (WIP) Inventory' => 'Inventory - Work-in-Progress',
        'Finished Goods Inventory' => 'Inventory - Finished Goods',
        'Packaging Materials Inventory' => 'Inventory - Packaging Materials',
        'Consumables & Production Supplies' => 'Inventory - Spare Parts & Consumables',
        'Spare Parts & Maintenance Inventory' => 'Inventory - Spare Parts & Consumables',
        'Fuel & Energy Inventory' => 'Inventory - Fuel & Energy',
        'Returned Goods / Reverse Inventory' => 'Inventory - Returned Goods',
        'Obsolete, Expired & Scrap Inventory' => 'Inventory - Obsolete & Scrap',
        'Goods-in-Transit Inventory' => 'Inventory - Goods-in-Transit',
        'Promotional & Marketing Inventory' => 'Inventory - Promotional Materials',
        'Safety Stock / Buffer Inventory' => 'Inventory - Safety Stock',
        'Rejected / Quality-Hold Inventory' => 'Inventory - Quality-Hold',
        'Third-Party / Consignment Inventory' => 'Inventory - Consignment',
    ];

    $account_name_to_find = $account_map[$category] ?? null;
    if (!$account_name_to_find) {
        throw new Exception("The inventory category '{$category}' is not mapped to a GL account.");
    }
    
    $inventory_account_id = findAccountIdByName($conn, $account_name_to_find, $company_id);
    if (!$inventory_account_id) {
        throw new Exception("The GL account '{$account_name_to_find}' could not be found.");
    }

    $open_balance_equity_account_id = findAccountIdByName($conn, 'Opening Balance Equity', $company_id);
    if (!$open_balance_equity_account_id) {
        throw new Exception("The GL account 'Opening Balance Equity' could not be found.");
    }
    
    // --- Database Insertion ---
    $stmt = $conn->prepare(
        "INSERT INTO {$table_name} (company_id, name, sku, category, unit_of_measure, inventory_account_id, quantity_on_hand, average_unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    if ($stmt === false) throw new Exception("Prepare statement failed: " . $conn->error);

    $stmt->bind_param("issssidd", 
        $company_id, $name, $sku, $category, $unit_of_measure, $inventory_account_id, $opening_balance, $cost
    );

    if (!$stmt->execute()) {
        if ($conn->errno === 1062) { // Duplicate entry
            throw new Exception('This SKU is already in use. Please choose a different one.', 409);
        } else {
            throw new Exception($stmt->error);
        }
    }
    
    $new_id = $stmt->insert_id;
    $stmt->close();

    // --- Create Journal Entry for Opening Balance ---
    if ($opening_balance > 0) {
        $total_value = $opening_balance * $cost;
        $narration = "Opening balance for new item: {$name}";
        $debit_account_id = $inventory_account_id;
        $credit_account_id = $open_balance_equity_account_id;

        createJournalEntry($conn, $company_id, $narration, $total_value, $debit_account_id, $credit_account_id);
    }

    // --- Commit Transaction ---
    $conn->commit();

    http_response_code(201);
    echo json_encode(['status' => 'success', 'message' => ucfirst(str_replace('_', ' ', $item_type)) . ' registered successfully.', 'id' => $new_id]);

} catch (Exception $e) {
    $conn->rollback();
    $error_code = $e->getCode() === 409 ? 409 : 500;
    http_response_code($error_code);
    echo json_encode(['status' => 'error', 'message' => 'Operation failed', 'details' => $e->getMessage()]);
}

$conn->close();
?>