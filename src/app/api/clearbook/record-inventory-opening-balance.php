<?php
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '1');

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/utils.php'; // Includes findAccountIdByName

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
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}
// --- End CORS Headers ---

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

$json_data = file_get_contents("php://input");
$data = json_decode($json_data, true);

// --- Validation ---
if (!isset($data['company_id']) || !isset($data['user_id']) || !isset($data['items']) || !is_array($data['items']) || empty($data['items'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid data: company_id, user_id, and a non-empty array of items are required.']);
    exit;
}

$company_id = (int)$data['company_id'];
$user_id = (int)$data['user_id'];
$items = $data['items'];
$today_date = date("Y-m-d");

global $conn;

// --- Start Transaction ---
$conn->begin_transaction();

try {
    // --- Account Definitions ---
    $opening_balance_equity_account_name = 'Opening Balance Equity';
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

    // --- Find Equity Account ID ---
    $opening_balance_equity_account_id = findAccountIdByName($conn, $opening_balance_equity_account_name, $company_id);
    if (!$opening_balance_equity_account_id) {
        throw new Exception("The '$opening_balance_equity_account_name' account is not configured.");
    }
    
    $total_value = 0;
    $journal_debits = [];

    // --- Process Each Item ---
    foreach ($items as $item) {
        if (empty($item['name']) || !isset($item['quantity']) || !isset($item['unit_cost']) || empty($item['item_type']) || empty($item['category'])) {
            throw new Exception("Invalid data for one or more items. Name, quantity, unit cost, item type, and category are required.");
        }

        $item_type = $item['item_type'];
        $table_name = ($item_type === 'raw_material') ? 'raw_materials' : 'finished_goods';
        $item_value = floatval($item['quantity']) * floatval($item['unit_cost']);
        $total_value += $item_value;

        // --- Map Category to Account & Find ID ---
        $account_name_to_find = $account_map[$item['category']] ?? null;
        if (!$account_name_to_find) {
            throw new Exception("The inventory category '{$item['category']}' is not mapped to a GL account.");
        }
        $inventory_asset_account_id = findAccountIdByName($conn, $account_name_to_find, $company_id);
        if (!$inventory_asset_account_id) {
            throw new Exception("The GL account '{$account_name_to_find}' could not be found for category '{$item['category']}'.");
        }

        // 1. Create the Inventory Item
        $stmt = $conn->prepare(
            "INSERT INTO {$table_name} (company_id, name, sku, category, unit_of_measure, quantity_on_hand, average_unit_cost, inventory_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("issssddi",
            $company_id,
            $item['name'],
            $item['sku'],
            $item['category'],
            $item['unit_of_measure'],
            $item['quantity'],
            $item['unit_cost'],
            $inventory_asset_account_id
        );
        $stmt->execute();
        $item_id = $conn->insert_id;
        $stmt->close();

        // 2. Create Stock Adjustment Entry
        $stmt = $conn->prepare("INSERT INTO stock_adjustments (company_id, item_id, item_type, adjustment_date, type, quantity, unit_cost, reason, recorded_by) VALUES (?, ?, ?, ?, 'addition', ?, ?, 'Opening Balance', ?)");
        $stmt->bind_param("iisdsdi",
            $company_id,
            $item_id,
            $item_type,
            $today_date,
            $item['quantity'],
            $item['unit_cost'],
            $user_id
        );
        $stmt->execute();
        $stmt->close();
        
        // 3. Aggregate Debits for the Journal
        if (!isset($journal_debits[$inventory_asset_account_id])) {
            $journal_debits[$inventory_asset_account_id] = 0;
        }
        $journal_debits[$inventory_asset_account_id] += $item_value;
    }

    // --- Create Journal Voucher ---
    if ($total_value > 0) {
        $stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, voucher_date, description, created_by) VALUES (?, ?, 'Inventory Opening Balance', ?)");
        $stmt->bind_param("issi", $company_id, $today_date, $user_id);
        $stmt->execute();
        $journal_voucher_id = $conn->insert_id;
        $stmt->close();

        foreach ($journal_debits as $account_id => $amount) {
            $stmt = $conn->prepare("INSERT INTO journal_voucher_lines (journal_voucher_id, account_id, type, amount, description) VALUES (?, ?, 'DEBIT', ?, 'Inventory Opening Balance')");
            $stmt->bind_param("iid", $journal_voucher_id, $account_id, $amount);
            $stmt->execute();
            $stmt->close();
        }
        
        $stmt = $conn->prepare("INSERT INTO journal_voucher_lines (journal_voucher_id, account_id, type, amount, description) VALUES (?, ?, 'CREDIT', ?, 'Inventory Opening Balance')");
        $stmt->bind_param("iid", $journal_voucher_id, $opening_balance_equity_account_id, $total_value);
        $stmt->execute();
        $stmt->close();
    }

    // --- Commit Transaction ---
    $conn->commit();
    http_response_code(201);
    echo json_encode(['status' => 'success', 'message' => 'Opening balances recorded successfully.']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to record opening balances.', 'error_details' => $e->getMessage()]);
}

$conn->close();
?>