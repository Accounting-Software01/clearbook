<?php
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

require_once __DIR__ . '/db_connect.php';

$raw = file_get_contents("php://input");
$data = json_decode($raw);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON payload"]);
    exit();
}

// Basic validation
if (empty($data->companyId) || empty($data->voucherDate) || empty($data->payeeType) || empty($data->payeeCode) || empty($data->lineItems) || !is_array($data->lineItems)) {
    http_response_code(400);
    echo json_encode(["error" => "Incomplete payment voucher data."]);
    exit();
}

$conn->begin_transaction();

try {
    // 1. Create the Payment Voucher record
    $pv_sql = "INSERT INTO payment_vouchers (company_id, voucher_date, payee_type, payee_code, payee_name, narration, gross_amount, net_payable, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)";
    $pv_stmt = $conn->prepare($pv_sql);
    $pv_stmt->bind_param("ssssssdds", 
        $data->companyId, 
        $data->voucherDate, 
        $data->payeeType, 
        $data->payeeCode, 
        $data->payeeName, 
        $data->narration, 
        $data->grossAmount, 
        $data->netPayable, 
        $data->preparedBy
    );
    if (!$pv_stmt->execute()) {
        throw new Exception("Failed to create payment voucher: " . $pv_stmt->error);
    }
    $voucher_id = $conn->insert_id;
    $pv_stmt->close();

    // 2. Insert Line Items
    $line_sql = "INSERT INTO payment_voucher_lines (voucher_id, gl_account_code, description, debit_amount) VALUES (?, ?, ?, ?)";
    $line_stmt = $conn->prepare($line_sql);
    foreach ($data->lineItems as $line) {
        $line_stmt->bind_param("issd", $voucher_id, $line->glAccountCode, $line->lineDescription, $line->debitAmount);
        if (!$line_stmt->execute()) {
            throw new Exception("Failed to create voucher line: " . $line_stmt->error);
        }
    }
    $line_stmt->close();

    // 3. Post to Journal (simplified)
    // This part should be more robust, creating proper debit/credit entries
    // For now, we'll just create a placeholder entry
    $journal_sql = "INSERT INTO journal_vouchers (voucher_number, entry_date, narration, company_id, user_id, status) VALUES (?, ?, ?, ?, ?, 'auto-posted')";
    $journal_stmt = $conn->prepare($journal_sql);
    $jv_number = "JV-PV-" . $voucher_id;
    $journal_stmt->bind_param("sssss", $jv_number, $data->voucherDate, $data->narration, $data->companyId, $data->preparedBy);
    if (!$journal_stmt->execute()) {
        // This is not a critical failure for the user, so we just log it
        error_log("Failed to auto-post to journal for PV #$voucher_id: " . $journal_stmt->error);
    }
    $journal_stmt->close();

    $conn->commit();

    http_response_code(201);
    echo json_encode(["status" => "success", "message" => "Payment voucher created successfully.", "created_voucher_id" => $voucher_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Transaction failed", "details" => $e->getMessage()]);
}

$conn->close();
exit();
?>