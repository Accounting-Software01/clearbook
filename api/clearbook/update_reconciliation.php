<?php
// api/clearbook/update_reconciliation.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

$reconciliation_id = $data['reconciliation_id'] ?? null;
$company_id = $data['company_id'] ?? null;
$cleared_ids = $data['cleared_transaction_ids'] ?? null;
$status = $data['status'] ?? null;
$notes = $data['notes'] ?? null;

if (!$reconciliation_id || !$company_id || !is_array($cleared_ids)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: reconciliation_id, company_id, and cleared_transaction_ids array.']);
    exit();
}

$conn->begin_transaction();

try {
    // 1. Delete existing lines for this reconciliation
    $delete_sql = "DELETE FROM bank_reconciliation_lines WHERE reconciliation_id = ? AND company_id = ?";
    $delete_stmt = $conn->prepare($delete_sql);
    if ($delete_stmt === false) throw new Exception('Prepare failed (delete): ' . $conn->error);
    $delete_stmt->bind_param('is', $reconciliation_id, $company_id);
    $delete_stmt->execute();
    $delete_stmt->close();

    // 2. Insert the new set of cleared lines
    if (!empty($cleared_ids)) {
        $insert_sql = "INSERT INTO bank_reconciliation_lines (reconciliation_id, company_id, transaction_id, is_cleared) VALUES (?, ?, ?, 1)";
        $insert_stmt = $conn->prepare($insert_sql);
        if ($insert_stmt === false) throw new Exception('Prepare failed (insert): ' . $conn->error);
        
        foreach ($cleared_ids as $transaction_id) {
            $insert_stmt->bind_param('isi', $reconciliation_id, $company_id, $transaction_id);
            if (!$insert_stmt->execute()) {
                throw new Exception('Execute failed (insert): ' . $insert_stmt->error);
            }
        }
        $insert_stmt->close();
    }
    
    // 3. (Optional) Update the status and notes on the main reconciliation record
    if ($status || $notes !== null) {
        $update_parts = [];
        $bind_types = '';
        $bind_values = [];

        if ($status) {
            $update_parts[] = "status = ?";
            $bind_types .= 's';
            $bind_values[] = $status;
        }
        if ($notes !== null) {
            $update_parts[] = "notes = ?";
            $bind_types .= 's';
            $bind_values[] = $notes;
        }

        if (!empty($update_parts)) {
            $bind_values[] = $reconciliation_id;
            $bind_values[] = $company_id;
            $bind_types .= 'is';

            $update_sql = "UPDATE bank_reconciliations SET " . implode(', ', $update_parts) . " WHERE id = ? AND company_id = ?";
            $update_stmt = $conn->prepare($update_sql);
            if ($update_stmt === false) throw new Exception('Prepare failed (update): ' . $conn->error);
            
            $update_stmt->bind_param($bind_types, ...$bind_values);
            if (!$update_stmt->execute()) {
                throw new Exception('Execute failed (update): ' . $update_stmt->error);
            }
            $update_stmt->close();
        }
    }

    $conn->commit();
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Reconciliation updated successfully.']);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update reconciliation.', 'details' => $e->getMessage()]);
}

$conn->close();
?>