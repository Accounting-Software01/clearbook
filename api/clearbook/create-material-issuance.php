<?php

CREATE TABLE `material_issuances` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `company_id` VARCHAR(20) NOT NULL,
    `user_id` INT,
    `raw_material_id` INT NOT NULL,
    `quantity_issued` DECIMAL(15, 4) NOT NULL,
    `unit_cost` DECIMAL(15, 4) NOT NULL,
    `total_cost` DECIMAL(15, 4) NOT NULL,
    `expense_account_code` VARCHAR(20) NOT NULL,
    `issue_date` DATE NOT NULL,
    `reference` TEXT,
    `journal_entry_id` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials`(`id`),
    FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE SET NULL)
    
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Access-Control-Allow-Headers,Content-Type,Access-Control-Allow-Methods, Authorization, X-Requested-With');

require_once __DIR__ . '/db_connect.php';

$db_entry = new DBEntry($conn);
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
        handle_create($conn, $db_entry);
        break;
    case 'PUT':
        handle_update($conn, $db_entry);
        break;
    case 'DELETE':
        handle_delete($conn, $db_entry);
        break;
    default:
        header('HTTP/1.0 405 Method Not Allowed');
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
        break;
}

function handle_create($conn, $db_entry) {
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
        $sub_entries = [
            ['account' => $data->expense_account_code, 'type' => 'Debit', 'amount' => $total_cost, 'narration' => 'Expense for issued materials'],
            ['account' => $rm_account_code, 'type' => 'Credit', 'amount' => $total_cost, 'narration' => 'Reduction in raw material inventory']
        ];
        
        $journal_entry_id = $db_entry->create_journal_entry($data->company_id, $data->issue_date, $narration, 'Material Issuance', $issuance_id, $sub_entries, $total_cost, $data->user_id);

        if (!$journal_entry_id) {
            throw new Exception("Failed to create journal entry.");
        }

        $link_journal_stmt = $conn->prepare("UPDATE material_issuances SET journal_entry_id = ? WHERE id = ?");
        $link_journal_stmt->bind_param("ii", $journal_entry_id, $issuance_id);
        if (!$link_journal_stmt->execute()) {
             throw new Exception("Failed to link journal entry to issuance: " . $link_journal_stmt->error);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Material issued successfully.', 'id' => $issuance_id, 'journal_id' => $journal_entry_id]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

function handle_delete($conn, $db_entry) {
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
            if (!$db_entry->delete_journal_entry($issuance['journal_entry_id'], $issuance['company_id'])) {
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

function handle_update($conn, $db_entry) {
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

        $restore_stock_stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?");
        $restore_stock_stmt->bind_param("di", $old_issuance['quantity_issued'], $old_issuance['raw_material_id']);
        if (!$restore_stock_stmt->execute()) throw new Exception('Failed to reverse old inventory.');

        if ($old_issuance['journal_entry_id']) {
            if (!$db_entry->delete_journal_entry($old_issuance['journal_entry_id'], $old_issuance['company_id'])) {
                throw new Exception('Failed to delete old journal entry.');
            }
        }

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
        $sub_entries = [
            ['account' => $expense_account_code, 'type' => 'Debit', 'amount' => $total_cost, 'narration' => 'Expense for issued materials'],
            ['account' => $rm_account_code, 'type' => 'Credit', 'amount' => $total_cost, 'narration' => 'Reduction in raw material inventory']
        ];
        
        $journal_entry_id = $db_entry->create_journal_entry($data->company_id, $issue_date, $narration, 'Material Issuance', $data->id, $sub_entries, $total_cost, $user_id);
        if (!$journal_entry_id) throw new Exception("Failed to create new journal entry.");

        $update_issuance_stmt = $conn->prepare(
            "UPDATE material_issuances SET raw_material_id=?, quantity_issued=?, unit_cost=?, total_cost=?, expense_account_code=?, issue_date=?, reference=?, journal_entry_id=? WHERE id=?"
        );
        $update_issuance_stmt->bind_param("idddsssii", $raw_material_id, $quantity_issued, $unit_cost, $total_cost, $expense_account_code, $issue_date, $reference, $journal_entry_id, $data->id);
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