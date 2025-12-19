<?php
/************************************
 * HEADERS & PREFLIGHT
 ************************************/
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * DATABASE CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php';

/************************************
 * READ & VALIDATE INPUT
 ************************************/
$raw = file_get_contents("php://input");
$data = json_decode($raw);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON payload"]);
    exit();
}

if (!isset($data->voucher_date, $data->narration, $data->company_id, $data->user_id, $data->lines) || !is_array($data->lines) || empty($data->lines)) {
    http_response_code(400);
    echo json_encode(["error" => "Incomplete request data: voucher_date, narration, company_id, user_id, and a non-empty lines array are required."]);
    exit();
}

/************************************
 * CALCULATE & VALIDATE TOTALS
 ************************************/
$total_debits = 0.0;
$total_credits = 0.0;

foreach ($data->lines as $line) {
    if (!isset($line->account_id, $line->amount, $line->type) || !in_array($line->type, ['debit', 'credit'])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid line item: each line must have account_id, amount, and a type ('debit' or 'credit')."]);
        exit();
    }
    if ($line->type === 'debit') {
        $total_debits += (float)$line->amount;
    } else {
        $total_credits += (float)$line->amount;
    }
}

// Use a small tolerance for floating point comparison
if (abs($total_debits - $total_credits) > 0.001) {
    http_response_code(400);
    echo json_encode(["error" => "Transaction is unbalanced. Total debits must equal total credits.", "debits" => $total_debits, "credits" => $total_credits]);
    exit();
}

/************************************
 * DATABASE LOGIC
 ************************************/
$conn->begin_transaction();

try {
    $voucher_no = "JV-" . time();
    $status = 'pending';
    $is_locked = 0;

    $sql_voucher = "INSERT INTO journal_vouchers (voucher_number, entry_date, narration, total_debits, total_credits, company_id, user_id, created_by_id, status, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt_voucher = $conn->prepare($sql_voucher);
    if (!$stmt_voucher) {
        throw new Exception("Voucher prepare failed: " . $conn->error);
    }
    
    $stmt_voucher->bind_param("ssddsssssi", $voucher_no, $data->voucher_date, $data->narration, $total_debits, $total_credits, $data->company_id, $data->user_id, $data->user_id, $status, $is_locked);

    if (!$stmt_voucher->execute()) {
        throw new Exception("Voucher execute failed: " . $stmt_voucher->error);
    }

    $voucher_id = $conn->insert_id;
    $stmt_voucher->close();

    // Process each line from the input
    $sql_line = "INSERT INTO journal_voucher_lines (voucher_id, account_id, debit, credit, description, company_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt_line = $conn->prepare($sql_line);
    if (!$stmt_line) {
        throw new Exception("Line prepare failed: " . $conn->error);
    }

    foreach ($data->lines as $line) {
        $debit = ($line->type === 'debit') ? (float)$line->amount : 0.0;
        $credit = ($line->type === 'credit') ? (float)$line->amount : 0.0;
        // Optional: you could add a description field to each line in the frontend
        $description = $line->description ?? 'Payment transaction';

        $stmt_line->bind_param("isddsss", $voucher_id, $line->account_id, $debit, $credit, $description, $data->company_id, $data->user_id);

        if (!$stmt_line->execute()) {
            throw new Exception("Line item execute failed: " . $stmt_line->error);
        }
    }

    $stmt_line->close();
    $conn->commit();

    http_response_code(201);
    echo json_encode(["success" => true, "voucher_number" => $voucher_no, "voucher_id" => $voucher_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database transaction failed", "details" => $e->getMessage()]);
}

$conn->close();
exit();
?>