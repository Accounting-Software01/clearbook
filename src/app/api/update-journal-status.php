<?php
/************************************
 * HEADERS & PREFLIGHT
 ************************************/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Environment Flag ---
define('IS_PRODUCTION', false);

/************************************
 * DATABASE CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php';

/************************************
 * READ & VALIDATE INPUT
 ************************************/
$raw = file_get_contents("php://input");
$data = json_decode($raw);

if (json_last_error() !== JSON_ERROR_NONE || !isset($data->company_id, $data->voucher_id, $data->status) || empty(trim($data->company_id))) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid or incomplete request data."]);
    exit();
}

$companyId = trim($data->company_id);
$voucherId = $data->voucher_id;
$status = $data->status;

// Validate status
$allowed_statuses = ['approved', 'rejected'];
if (!in_array($status, $allowed_statuses)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid status provided. Must be 'approved' or 'rejected'."]);
    exit();
}

/************************************
 * DATABASE TRANSACTION
 ************************************/
$conn->begin_transaction();

try {
    // Check if the voucher exists and belongs to the company
    $checkStmt = $conn->prepare("SELECT status FROM journal_vouchers WHERE id = ? AND company_id = ?");
    // Use 's' for string company_id
    $checkStmt->bind_param("is", $voucherId, $companyId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    
    if ($result->num_rows === 0) {
        throw new Exception("Voucher not found or access denied.");
    }
    
    $voucher = $result->fetch_assoc();
    $checkStmt->close();

    if ($voucher['status'] === $status) {
        $conn->commit();
        echo json_encode(["success" => true, "message" => "Voucher was already in the requested state."]);
        exit();
    }

    // Update the voucher status
    $updateStmt = $conn->prepare("UPDATE journal_vouchers SET status = ? WHERE id = ?");
    $updateStmt->bind_param("si", $status, $voucherId);
    if (!$updateStmt->execute()) {
        throw new Exception("Failed to update voucher status.");
    }
    $updateStmt->close();

    // If approving, post to the general ledger
    if ($status === 'approved') {
        $linesStmt = $conn->prepare("SELECT account_id, debit, credit FROM journal_voucher_lines WHERE voucher_id = ?");
        $linesStmt->bind_param("i", $voucherId);
        $linesStmt->execute();
        $lines = $linesStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $linesStmt->close();
        
        $glStmt = $conn->prepare("INSERT INTO general_ledger (account_id, company_id, entry_date, debit, credit, description, transaction_type, reference_id) VALUES (?, ?, (SELECT entry_date FROM journal_vouchers WHERE id = ?), ?, ?, (SELECT narration FROM journal_vouchers WHERE id = ?), 'journal', ?)");

        foreach ($lines as $line) {
            // Use 's' for company_id
            $glStmt->bind_param("ssiddsi", $line['account_id'], $companyId, $voucherId, $line['debit'], $line['credit'], $voucherId, $voucherId);
            if (!$glStmt->execute()) {
                throw new Exception("Failed to post to General Ledger for account " . $line['account_id']);
            }
        }
        $glStmt->close();
    }

    $conn->commit();

    http_response_code(200);
    echo json_encode(["success" => true]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Transaction failed.",
        "details" => IS_PRODUCTION ? null : $e->getMessage()
    ]);
}

$conn->close();
?>