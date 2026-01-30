<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/get_chart_of_account_id.php';

$data = json_decode(file_get_contents("php://input"));

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input.']);
    exit;
}

// --- Input Validation ---
$required_fields = ['bill_id', 'company_id', 'user_id', 'supplier_id', 'payment_date', 'amount', 'payment_account_id'];
foreach ($required_fields as $field) {
    if (empty($data->$field)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: {$field}"]);
        exit;
    }
}

$conn->begin_transaction();

try {
    // --- 1. Get Accounts Payable Account ID ---
    $accounts_payable_id = get_chart_of_account_id_by_name($conn, $data->company_id, 'Accounts Payable');
    if (!$accounts_payable_id) {
        throw new Exception('Accounts Payable account not found.');
    }

    // --- 2. Create Journal Voucher Header ---
    $jv_narration = "Payment for Bill #{$data->bill_id}";
    $jv_sql = "INSERT INTO journal_vouchers (company_id, voucher_date, narration, created_by) VALUES (?, ?, ?, ?)";
    $jv_stmt = $conn->prepare($jv_sql);
    $jv_stmt->bind_param("sssi", $data->company_id, $data->payment_date, $jv_narration, $data->user_id);
    $jv_stmt->execute();
    $jv_id = $jv_stmt->insert_id;
    $jv_stmt->close();

    if (!$jv_id) {
        throw new Exception("Failed to create journal voucher header.");
    }

    // --- 3. Create Journal Voucher Lines (Double Entry) ---
    $jvl_sql = "INSERT INTO journal_voucher_lines (jv_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)";
    $jvl_stmt = $conn->prepare($jvl_sql);

    // Debit Entry: Reduce liability to the supplier
    $debit_desc = "Debit Accounts Payable for Bill #{$data->bill_id}";
    $debit_amount = $data->amount;
    $credit_amount_for_debit = 0;
    $jvl_stmt->bind_param("isdds", $jv_id, $accounts_payable_id, $debit_amount, $credit_amount_for_debit, $debit_desc);
    $jvl_stmt->execute();

    // Credit Entry: Reduce cash/bank asset
    $payment_account_info = get_chart_of_account_id_by_name($conn, $data->company_id, null, $data->payment_account_id);
    $credit_desc = "Credit from {$payment_account_info['account_name']} for Bill payment";
    $debit_amount_for_credit = 0;
    $credit_amount = $data->amount;
    $jvl_stmt->bind_param("isdds", $jv_id, $payment_account_info['id'], $debit_amount_for_credit, $credit_amount, $credit_desc);
    $jvl_stmt->execute();

    $jvl_stmt->close();
    
    // --- 4. Update Bill Status ---
    // First, get the current total paid amount and total bill amount
    $bill_info_sql = "SELECT total_amount, amount_paid FROM bills WHERE id = ? AND company_id = ?";
    $bill_info_stmt = $conn->prepare($bill_info_sql);
    $bill_info_stmt->bind_param("is", $data->bill_id, $data->company_id);
    $bill_info_stmt->execute();
    $bill_info_result = $bill_info_stmt->get_result()->fetch_assoc();
    $total_amount = $bill_info_result['total_amount'];
    $current_paid = $bill_info_result['amount_paid'];
    $bill_info_stmt->close();

    $new_paid_amount = $current_paid + $data->amount;
    $new_status = ($new_paid_amount >= $total_amount) ? 'Paid' : 'Partially Paid';

    $update_bill_sql = "UPDATE bills SET amount_paid = ?, `status` = ? WHERE id = ? AND company_id = ?";
    $update_stmt = $conn->prepare($update_bill_sql);
    $update_stmt->bind_param("dsis", $new_paid_amount, $new_status, $data->bill_id, $data->company_id);
    $update_stmt->execute();
    $update_stmt->close();

    // --- Commit and Respond ---
    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Payment recorded successfully.', 'jv_id' => $jv_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Transaction failed: ' . $e->getMessage()]);
} finally {
    $conn->close();
}
