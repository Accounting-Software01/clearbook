<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../../utils.php'; // Includes findAccountIdByName and createJournalEntry

header("Content-Type: application/json");

// --- CORS Headers ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['company_id']) || !isset($data['items']) || !is_array($data['items'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid company_id or items array.']);
    exit;
}
if (empty($data['items'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Items array cannot be empty.']);
    exit;
}

$company_id = $data['company_id'];
$items = $data['items'];

global $conn;
$conn->begin_transaction();

try {
    $processed_ids = ['created' => [], 'updated' => []];
    $account_map = [
        'Raw Materials Inventory' => 'Inventory - Raw Materials',
        'Work-in-Progress (WIP) Inventory' => 'Inventory - Work-in-Progress',
        'Finished Goods Inventory' => 'Inventory - Finished Goods',
        'Packaging Materials Inventory' => 'Inventory - Packaging Materials',
        'Consumables & Production Supplies' => 'Inventory - Spare Parts & Consumables',
        'Spare Parts & Maintenance Inventory' => 'Inventory - Spare Parts & Consumables',
        'Fuel & Energy Inventory' => 'Inventory - Other',
        'Returned Goods / Reverse Inventory' => 'Inventory - Other',
        'Obsolete, Expired & Scrap Inventory' => 'Inventory - Other',
        'Goods-in-Transit Inventory' => 'Inventory - Other',
        'Promotional & Marketing Inventory' => 'Inventory - Other',
        'Safety Stock / Buffer Inventory' => 'Inventory - Other',
        'Rejected / Quality-Hold Inventory' => 'Inventory - Other',
        'Third-Party / Consignment Inventory' => 'Inventory - Other',
    ];

    $opening_equity_account_id = findAccountIdByName($conn, 'Opening Balance Equity', $company_id);
    if (!$opening_equity_account_id) {
        throw new Exception("Critical: 'Opening Balance Equity' account not found for your company.");
    }

    foreach ($items as $item) {
        $required_fields = ['name', 'category', 'item_type', 'quantity', 'unit_cost'];
        foreach ($required_fields as $field) {
            if (!isset($item[$field])) throw new Exception("Missing field in an item: {$field}");
        }

        $item_id         = isset($item['id']) && is_numeric($item['id']) ? (int)$item['id'] : null;
        $name            = trim($item['name']);
        $category        = $item['category'];
        $item_type       = $item['item_type'];
        $unit_of_measure = $item['unit_of_measure'] ?? '';
        $sku             = $item['sku'] ?? null;
        $opening_balance = (float)$item['quantity'];
        $cost            = (float)$item['unit_cost'];

        if (!in_array($item_type, ['raw_material', 'finished_good'], true)) {
            throw new Exception("Invalid item_type in item: {$item_type}");
        }
        $table_name = $item_type === 'raw_material' ? 'raw_materials' : 'products';

        if (!isset($account_map[$category])) {
            throw new Exception("Inventory category '{$category}' is not mapped to a General Ledger account.");
        }
        $inventory_account_name = $account_map[$category];
        $inventory_account_id = findAccountIdByName($conn, $inventory_account_name, $company_id);
        if (!$inventory_account_id) {
            throw new Exception("GL account '{$inventory_account_name}' not found for category '{$category}'.");
        }

        if ($item_id) { // --- UPDATE EXISTING ITEM ---
            $stmt = $conn->prepare("UPDATE {$table_name} SET quantity_on_hand = ?, average_unit_cost = ? WHERE id = ? AND company_id = ?");
            $stmt->bind_param("ddis", $opening_balance, $cost, $item_id, $company_id);
            if (!$stmt->execute()) {
                throw new Exception("Failed to update item ID {$item_id}: " . $stmt->error);
            }
            if ($stmt->affected_rows === 0) {
                // This could happen if the item doesn't exist for that company, which is an error condition.
                throw new Exception("Item with ID {$item_id} not found for this company or no changes were made.");
            }
            $processed_ids['updated'][] = $item_id;
            $stmt->close();
        } else { // --- CREATE NEW ITEM ---
            $stmt = $conn->prepare("INSERT INTO {$table_name} (company_id, name, sku, category, unit_of_measure, inventory_account_id, quantity_on_hand, average_unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssidd", $company_id, $name, $sku, $category, $unit_of_measure, $inventory_account_id, $opening_balance, $cost);
            if (!$stmt->execute()) {
                if ($conn->errno === 1062) {
                    throw new Exception("An item with SKU '{$sku}' already exists.", 409);
                }
                throw new Exception("Failed to insert new item '{$name}': " . $stmt->error);
            }
            $new_item_id = $stmt->insert_id;
            $processed_ids['created'][] = $new_item_id;
            $stmt->close();
        }
        
        // --- CREATE JOURNAL ENTRY FOR THE OPENING BALANCE ---
        if ($opening_balance > 0 && $cost > 0) {
            $total_value = $opening_balance * $cost;
            createJournalEntry($conn, $company_id, "Opening balance for item: {$name}", $total_value, $inventory_account_id, $opening_equity_account_id);
        }
    }

    $conn->commit();
    http_response_code(201);
    echo json_encode([
        'status' => 'success',
        'message' => 'Inventory opening balances recorded successfully.',
        'processed_ids' => $processed_ids
    ]);

} catch (Exception $e) {
    $conn->rollback();
    $code = is_int($e->getCode()) && $e->getCode() >= 400 ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => 'Operation failed',
        'error_details' => $e->getMessage()
    ]);
}

$conn->close();
?>
