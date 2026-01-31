<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- CORS and Header config ---
$allowed_origins = ["https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev", "https://clearbook-olive.vercel.app"];
if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    header("Vary: Origin");
}
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// --- Includes and Setup ---
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
    // --- 1. Get Account Details (using the correct identifiers) ---
    // Get the Accounts Payable account details by its system role.
    $ap_account_details = get_account_details($conn, $data->company_id, null, null, 'accounts_payable');
    if (!$ap_account_details || !isset($ap_account_details['account_code'])) {
        throw new Exception('CRITICAL: The system role "accounts_payable" has not been assigned or has no account_code.');
    }
    // CORRECTED: We need the account_code, not the internal ID.
    $ap_account_code = $ap_account_details['account_code'];

    // Get the payment account name for the narration string.
    $payment_account_info = get_account_details($conn, $data->company_id, null, $data->payment_account_id, null);
    if (!$payment_account_info) {
        throw new Exception("The selected payment account (Code: {$data->payment_account_id}) could not be found.");
    }
    // CORRECTED: The account_id to be inserted is the code sent from the frontend.
    $payment_account_code = $data->payment_account_id;

    // --- 2. Generate a unique Voucher Number ---
    $voucher_number = 'CPV-' . time() . '-' . $data->bill_id;

    // --- 3. Create Journal Voucher Header ---
    $jv_narration = "Payment for Bill #{$data->bill_id}";
    $debit_credit_total = floatval($data->amount);
    
    $jv_sql = "INSERT INTO journal_vouchers 
                (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) 
              VALUES (?, ?, ?, 'Bill Payment', ?, 'PAY', ?, 'bills', ?, ?, ?, 'posted')";

    $jv_stmt = $conn->prepare($jv_sql);
    if ($jv_stmt === false) {
        throw new Exception("Failed to prepare JV header statement: " . $conn->error);
    }

    $user_id_int = intval($data->user_id);
    $bill_id_int = intval($data->bill_id);

    $jv_stmt->bind_param("sisssidd", $data->company_id, $user_id_int, $voucher_number, $data->payment_date, $bill_id_int, $jv_narration, $debit_credit_total, $debit_credit_total);
    $jv_stmt->execute();
    $jv_id = $jv_stmt->insert_id;
    $jv_stmt->close();

    // --- 4. Create Journal Voucher Lines ---
    $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, description, payee_id, payee_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $zero_amount = 0.00;

    // DEBIT ENTRY: Reduce Accounts Payable
    $jvl_stmt_debit = $conn->prepare($jvl_sql);
    if ($jvl_stmt_debit === false) throw new Exception('Failed to prepare debit line: ' . $conn->error);
    $debit_desc = "Payment to supplier for Bill #{$data->bill_id}";
    $payee_type_supplier = 'supplier';
    $supplier_id_int = intval($data->supplier_id);
    // CORRECTED: Changed bind_param type from 'i' to 's' for account_id and used the account_code.
    $jvl_stmt_debit->bind_param("siisddsis", $data->company_id, $user_id_int, $jv_id, $ap_account_code, $data->amount, $zero_amount, $debit_desc, $supplier_id_int, $payee_type_supplier);
    $jvl_stmt_debit->execute();
    $jvl_stmt_debit->close();

    // CREDIT ENTRY: Decrease Cash/Bank
    $jvl_stmt_credit = $conn->prepare($jvl_sql);
    if ($jvl_stmt_credit === false) throw new Exception('Failed to prepare credit line: ' . $conn->error);
    $credit_desc = "Credit from {$payment_account_info['account_name']} for Bill #{$data->bill_id}";
    $null_payee_id = null;
    $null_payee_type = null;
    // CORRECTED: Changed bind_param type from 'i' to 's' for account_id and used the account_code.
    $jvl_stmt_credit->bind_param("siisddsis", $data->company_id, $user_id_int, $jv_id, $payment_account_code, $zero_amount, $data->amount, $credit_desc, $null_payee_id, $null_payee_type);
    $jvl_stmt_credit->execute();
    $jvl_stmt_credit->close();
    
    // --- 5. Update Bill Status ---
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
    echo json_encode(['success' => true, 'message' => 'Payment recorded successfully and journal posted.', 'jv_id' => $jv_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Transaction failed: ' . $e->getMessage(), 'line' => $e->getLine()]);
} finally {
    if (isset($conn) && $conn->ping()) {
        $conn->close();
    }
}
?>