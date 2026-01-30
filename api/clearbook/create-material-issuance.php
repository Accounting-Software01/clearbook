<?php
$allowed_origins = [
    "https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev",
    "https://clearbook-olive.vercel.app"
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
}

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// 🔴 THIS IS THE FIX
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

function get_account_code_by_name($conn, $account_name, $company_id) {
    $stmt = $conn->prepare("SELECT account_code FROM chart_of_accounts WHERE account_name = ? AND company_id = ?");
    $stmt->bind_param("ss", $account_name, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        return $row['account_code'];
    }
    return null;
}

switch ($method) {
    case 'POST':
        handle_create($conn);
        break;
    case 'PUT':
        handle_update($conn);
        break;
    case 'DELETE':
        handle_delete($conn);
        break;
    default:
        header('HTTP/1.0 405 Method Not Allowed');
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        break;
}

function handle_create($conn) {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->company_id, $data->user_id, $data->raw_material_id, $data->quantity_issued, $data->unit_cost, $data->expense_account_code, $data->issue_date) || $data->quantity_issued <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input data.']);
        return;
    }

    $conn->begin_transaction();

    try {
        $stock_stmt = $conn->prepare("SELECT quantity_on_hand FROM raw_materials WHERE id = ? AND company_id = ? FOR UPDATE");
        $stock_stmt->bind_param("is", $data->raw_material_id, $data->company_id);
        $stock_stmt->execute();
        $material = $stock_stmt->get_result()->fetch_assoc();

        if (!$material || $material['quantity_on_hand'] < $data->quantity_issued) {
            throw new Exception('Insufficient stock.');
        }

        $update_stock_stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?");
        $update_stock_stmt->bind_param("di", $data->quantity_issued, $data->raw_material_id);
        if (!$update_stock_stmt->execute()) {
            throw new Exception("Failed to update inventory: " . $update_stock_stmt->error);
        }

        $total_cost = $data->quantity_issued * $data->unit_cost;
        $insert_issuance_stmt = $conn->prepare(
            "INSERT INTO material_issuances (company_id, user_id, raw_material_id, quantity_issued, unit_cost, total_cost, expense_account_code, issue_date, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $insert_issuance_stmt->bind_param("siiddssss", $data->company_id, $data->user_id, $data->raw_material_id, $data->quantity_issued, $data->unit_cost, $total_cost, $data->expense_account_code, $data->issue_date, $data->reference);
        if (!$insert_issuance_stmt->execute()) {
            throw new Exception("Failed to create issuance record: " . $insert_issuance_stmt->error);
        }
        $issuance_id = $conn->insert_id;

        $rm_account_code = get_account_code_by_name($conn, 'Inventory - Raw Materials', $data->company_id);
        if (!$rm_account_code) {
            throw new Exception("'Inventory - Raw Materials' account not found.");
        }
        
        $narration = "Material Issuance #{$issuance_id}. Ref: " . ($data->reference ?: 'N/A');

        // Create Journal Voucher
        $voucher_number = 'MI-' . $issuance_id;
        $jv_stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Material Issuance', ?, 'Journal Voucher', ?, 'material_issuances', ?, ?, ?, 'posted')");
        $jv_stmt->bind_param("sisssidd", $data->company_id, $data->user_id, $voucher_number, $data->issue_date, $issuance_id, $narration, $total_cost, $total_cost);
        if(!$jv_stmt->execute()){
             throw new Exception("Failed to create journal voucher: " . $jv_stmt->error);
        }
        $voucher_id = $conn->insert_id;
        
        // Debit Expense Account
        $jvl_debit_stmt = $conn->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, description) VALUES (?, ?, ?, ?, ?, 'Expense for issued materials')");
        $jvl_debit_stmt->bind_param("siisd", $data->company_id, $data->user_id, $voucher_id, $data->expense_account_code, $total_cost);
        if(!$jvl_debit_stmt->execute()){
            throw new Exception("Failed to create debit line: " . $jvl_debit_stmt->error);
        }

        // Credit Inventory Account
        $jvl_credit_stmt = $conn->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, credit, description) VALUES (?, ?, ?, ?, ?, 'Reduction in raw material inventory')");
        $jvl_credit_stmt->bind_param("siisd", $data->company_id, $data->user_id, $voucher_id, $rm_account_code, $total_cost);
        if(!$jvl_credit_stmt->execute()){
            throw new Exception("Failed to create credit line: " . $jvl_credit_stmt->error);
        }
        
        $link_journal_stmt = $conn->prepare("UPDATE material_issuances SET journal_entry_id = ? WHERE id = ?");
        $link_journal_stmt->bind_param("ii", $voucher_id, $issuance_id);
        if (!$link_journal_stmt->execute()) {
             throw new Exception("Failed to link journal entry to issuance: " . $link_journal_stmt->error);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Material issued successfully.', 'id' => $issuance_id, 'journal_id' => $voucher_id]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function handle_delete($conn) {
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->id, $data->company_id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Issuance ID and Company ID are required.']);
        return;
    }

    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("SELECT * FROM material_issuances WHERE id = ? AND company_id = ? FOR UPDATE");
        $stmt->bind_param("is", $data->id, $data->company_id);
        $stmt->execute();
        $issuance = $stmt->get_result()->fetch_assoc();

        if (!$issuance) {
            throw new Exception('Material issuance record not found.');
        }

        $update_stock_stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?");
        $update_stock_stmt->bind_param("di", $issuance['quantity_issued'], $issuance['raw_material_id']);
        if (!$update_stock_stmt->execute()) {
            throw new Exception('Failed to restore inventory.');
        }

        if ($issuance['journal_entry_id']) {
            $delete_jvl_stmt = $conn->prepare("DELETE FROM journal_voucher_lines WHERE voucher_id = ? AND company_id = ?");
            $delete_jvl_stmt->bind_param("is", $issuance['journal_entry_id'], $issuance['company_id']);
            if(!$delete_jvl_stmt->execute()){
                throw new Exception('Failed to delete journal voucher lines.');
            }
            $delete_jv_stmt = $conn->prepare("DELETE FROM journal_vouchers WHERE id = ? AND company_id = ?");
            $delete_jv_stmt->bind_param("is", $issuance['journal_entry_id'], $issuance['company_id']);
             if (!$delete_jv_stmt->execute()) {
                throw new Exception('Failed to delete corresponding journal entry.');
            }
        }
        
        $delete_issuance_stmt = $conn->prepare("DELETE FROM material_issuances WHERE id = ?");
        $delete_issuance_stmt->bind_param("i", $data->id);
        if (!$delete_issuance_stmt->execute()) {
            throw new Exception('Failed to delete issuance record.');
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Material issuance deleted successfully.']);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function handle_update($conn) {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->id, $data->company_id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Issuance ID and Company ID are required.']);
        return;
    }
    
    $conn->begin_transaction();
    
    try {
        $stmt = $conn->prepare("SELECT * FROM material_issuances WHERE id = ? AND company_id = ? FOR UPDATE");
        $stmt->bind_param("is", $data->id, $data->company_id);
        $stmt->execute();
        $old_issuance = $stmt->get_result()->fetch_assoc();

        if (!$old_issuance) {
            throw new Exception('Original material issuance record not found.');
        }

        // Reverse old transaction
        $restore_stock_stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?");
        $restore_stock_stmt->bind_param("di", $old_issuance['quantity_issued'], $old_issuance['raw_material_id']);
        if (!$restore_stock_stmt->execute()) throw new Exception('Failed to reverse old inventory.');

        if ($old_issuance['journal_entry_id']) {
            $delete_jvl_stmt = $conn->prepare("DELETE FROM journal_voucher_lines WHERE voucher_id = ? AND company_id = ?");
            $delete_jvl_stmt->bind_param("is", $old_issuance['journal_entry_id'], $old_issuance['company_id']);
            $delete_jvl_stmt->execute();
            
            $delete_jv_stmt = $conn->prepare("DELETE FROM journal_vouchers WHERE id = ? AND company_id = ?");
            $delete_jv_stmt->bind_param("is", $old_issuance['journal_entry_id'], $old_issuance['company_id']);
            $delete_jv_stmt->execute();
        }

        // Create new transaction
        $raw_material_id = $data->raw_material_id ?? $old_issuance['raw_material_id'];
        $quantity_issued = $data->quantity_issued ?? $old_issuance['quantity_issued'];
        $unit_cost = $data->unit_cost ?? $old_issuance['unit_cost'];
        $expense_account_code = $data->expense_account_code ?? $old_issuance['expense_account_code'];
        $issue_date = $data->issue_date ?? $old_issuance['issue_date'];
        $reference = $data->reference ?? $old_issuance['reference'];
        $user_id = $data->user_id ?? $old_issuance['user_id'];
        $total_cost = $quantity_issued * $unit_cost;

        $stock_stmt = $conn->prepare("SELECT quantity_on_hand FROM raw_materials WHERE id = ? AND company_id = ? FOR UPDATE");
        $stock_stmt->bind_param("is", $raw_material_id, $data->company_id);
        $stock_stmt->execute();
        $material = $stock_stmt->get_result()->fetch_assoc();

        if (!$material || $material['quantity_on_hand'] < $quantity_issued) {
            throw new Exception('Insufficient stock for updated issuance.');
        }
        
        $update_stock_stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?");
        $update_stock_stmt->bind_param("di", $quantity_issued, $raw_material_id);
        if (!$update_stock_stmt->execute()) throw new Exception('Failed to update new inventory.');

        $rm_account_code = get_account_code_by_name($conn, 'Inventory - Raw Materials', $data->company_id);
        if (!$rm_account_code) throw new Exception("'Inventory - Raw Materials' account not found.");
        
        $narration = "Updated Material Issuance #{$data->id}. Ref: " . ($reference ?: 'N/A');
        
        $voucher_number = 'MI-U-' . $data->id;
        $jv_stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Material Issuance', ?, 'Journal Voucher', ?, 'material_issuances', ?, ?, ?, 'posted')");
        $jv_stmt->bind_param("sisssidd", $data->company_id, $user_id, $voucher_number, $issue_date, $data->id, $narration, $total_cost, $total_cost);
        if(!$jv_stmt->execute()) throw new Exception("Failed to create new journal voucher: " . $jv_stmt->error);
        $voucher_id = $conn->insert_id;

        $jvl_debit_stmt = $conn->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, description) VALUES (?, ?, ?, ?, ?, 'Expense for issued materials')");
        $jvl_debit_stmt->bind_param("siisd", $data->company_id, $user_id, $voucher_id, $expense_account_code, $total_cost);
        if(!$jvl_debit_stmt->execute()) throw new Exception("Failed to create new debit line: " . $jvl_debit_stmt->error);

        $jvl_credit_stmt = $conn->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, credit, description) VALUES (?, ?, ?, ?, ?, 'Reduction in raw material inventory')");
        $jvl_credit_stmt->bind_param("siisd", $data->company_id, $user_id, $voucher_id, $rm_account_code, $total_cost);
        if(!$jvl_credit_stmt->execute()) throw new Exception("Failed to create new credit line: " . $jvl_credit_stmt->error);

        $update_issuance_stmt = $conn->prepare(
            "UPDATE material_issuances SET raw_material_id=?, quantity_issued=?, unit_cost=?, total_cost=?, expense_account_code=?, issue_date=?, reference=?, journal_entry_id=? WHERE id=?"
        );
        $update_issuance_stmt->bind_param("idddsssii", $raw_material_id, $quantity_issued, $unit_cost, $total_cost, $expense_account_code, $issue_date, $reference, $voucher_id, $data->id);
        if (!$update_issuance_stmt->execute()) throw new Exception("Failed to update issuance record.");

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Material issuance updated successfully.']);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
?>