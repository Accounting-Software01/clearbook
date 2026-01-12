<?php
// Strict error reporting for development
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

$raw_payload = file_get_contents("php://input");
$data = json_decode($raw_payload);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid JSON payload."]);
    exit();
}

$required_fields = ['companyId', 'voucherDate', 'payeeType', 'payeeCode', 'payeeName', 'paymentType', 'currency', 'preparedBy', 'lineItems'];
foreach ($required_fields as $field) {
    if (empty($data->$field)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing required field: " . $field]);
        exit();
    }
}

if (!is_array($data->lineItems) || empty($data->lineItems)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Line items cannot be empty."]);
    exit();
}

$company_id = $data->companyId;
$user_email = $data->preparedBy;
$user_id = 1; // Placeholder for real user ID from auth token

$conn->begin_transaction();

try {
    // ===================================
    // 1. FETCH DYNAMIC CONFIGURATION
    // ===================================
    $wht_payable_acct = '';
    $input_vat_acct = '';

    $cfg_sql = "SELECT tax_name, payable_account_code, asset_account_code FROM tax_configurations WHERE company_id = ?";
    $cfg_stmt = $conn->prepare($cfg_sql);
    $cfg_stmt->bind_param("s", $company_id);
    $cfg_stmt->execute();
    $tax_configs = $cfg_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $cfg_stmt->close();
    
    foreach($tax_configs as $config) {
        if ($config['tax_name'] === 'WHT') $wht_payable_acct = $config['payable_account_code'];
        if ($config['tax_name'] === 'Input VAT') $input_vat_acct = $config['asset_account_code'];
    }
    if(empty($wht_payable_acct)) throw new Exception("WHT Payable account is not configured in tax_configurations.");
    if(empty($input_vat_acct)) throw new Exception("Input VAT account is not configured in tax_configurations.");

    $bank_cash_sql = "SELECT account_code FROM chart_of_accounts WHERE company_id = ? AND account_name = ? AND is_control_account = 1";
    $bc_stmt = $conn->prepare($bank_cash_sql);
    $bc_stmt->bind_param("ss", $company_id, $data->paymentType);
    $bc_stmt->execute();
    $payment_method_acct = $bc_stmt->get_result()->fetch_assoc()['account_code'] ?? null;
    $bc_stmt->close();
    if(empty($payment_method_acct)) throw new Exception("Control Account for payment method '{$data->paymentType}' not found.");

    // ===================================
    // 2. SERVER-SIDE RECALCULATION (WITH CLEAR NAMING)
    // ===================================
    $total_payment_value = 0; // VAT-inclusive total value being paid
    $total_vat_amount = 0;
    $total_wht_amount = 0;

    foreach ($data->lineItems as $line) {
        $total_payment_value += floatval($line->debitAmount ?? 0);
        $total_vat_amount += floatval($line->vatAmount ?? 0);
        $total_wht_amount += floatval($line->whtAmount ?? 0);
    }
    $total_net_of_vat = $total_payment_value - $total_vat_amount;
    $net_payment_to_bank = $total_payment_value - $total_wht_amount;

    $tolerance = 0.01;
    if (abs($total_net_of_vat - floatval($data->grossAmount)) > $tolerance || abs($net_payment_to_bank - floatval($data->netPayable)) > $tolerance) {
        throw new Exception("Data integrity check failed. Client/server calculations do not match.");
    }
    
    // ===================================
    // 3. CREATE PAYMENT VOUCHER HEADER & LINES
    // ===================================
    $pv_sql = "INSERT INTO payment_vouchers (company_id, voucher_date, payment_type, currency, payee_type, payee_code, payee_name, narration, gross_amount, total_vat, total_wht, net_payable, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)";
    $pv_stmt = $conn->prepare($pv_sql);
    // Note: we store `total_net_of_vat` in the `gross_amount` column, which is correct from an accounting perspective.
    $pv_stmt->bind_param("ssssssssdddds", $company_id, $data->voucherDate, $data->paymentType, $data->currency, $data->payeeType, $data->payeeCode, $data->payeeName, $data->narration, $total_net_of_vat, $total_vat_amount, $total_wht_amount, $net_payment_to_bank, $user_email);
    if (!$pv_stmt->execute()) throw new Exception("Failed to create payment voucher header: " . $pv_stmt->error);
    $voucher_id = $conn->insert_id;
    $pv_stmt->close();

    foreach ($data->lineItems as $line) {
        // Code to insert into payment_voucher_lines...
    }
    
    // ===================================
    // 4. CREATE JOURNAL VOUCHER & BALANCED ENTRIES
    // ===================================
    $jv_narration = "Payment Voucher #{$voucher_id}: {$data->narration}";
    $jv_number = "PV-" . $voucher_id;
    $journal_total = $total_payment_value;
    
    $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Payment Voucher', ?, 'PV', ?, 'payment_vouchers', ?, ?, ?, 'Draft')";
    $jv_stmt = $conn->prepare($jv_sql);
    $user_id_int = intval($user_id);
    $jv_stmt->bind_param("sisssisdd", $company_id, $user_id_int, $jv_number, $data->voucherDate, $voucher_id, $jv_narration, $journal_total, $journal_total);
    if (!$jv_stmt->execute()) throw new Exception("Failed to create journal voucher header: " . $jv_stmt->error);
    $jv_id = $conn->insert_id;
    $jv_stmt->close();
    
    $update_pv_sql = "UPDATE payment_vouchers SET jv_id = ? WHERE id = ?";
    $update_pv_stmt = $conn->prepare($update_pv_sql);
    $update_pv_stmt->bind_param("ii", $jv_id, $voucher_id);
    $update_pv_stmt->execute();
    $update_pv_stmt->close();
    
    $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, description, payee_id, payee_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $jvl_stmt = $conn->prepare($jvl_sql);
    $payee_id_int = intval($data->payeeCode);

    // --- Main Accounting Logic Switch ---
    if ($data->payeeType === 'Supplier') {
        // **AP SETTLEMENT FLOW** (VAT was booked at GRN)
        $sup_sql = "SELECT ap_account_id FROM suppliers WHERE id = ? AND company_id = ?";
        $sup_stmt = $conn->prepare($sup_sql);
        $sup_stmt->bind_param("is", $data->payeeCode, $company_id);
        $sup_stmt->execute();
        $ap_account_id = $sup_stmt->get_result()->fetch_assoc()['ap_account_id'] ?? null;
        $sup_stmt->close();
        if(empty($ap_account_id)) throw new Exception("Supplier AP account is not configured.");

        // a) Debit Accounts Payable (for the full VAT-inclusive amount being settled)
        $jvl_stmt->bind_param("siisddsis", $company_id, $user_id_int, $jv_id, $ap_account_id, $total_payment_value, 0.00, "AP Settlement for " . $data->payeeName, $payee_id_int, $data->payeeType);
        $jvl_stmt->execute();

    } else {
        // **DIRECT EXPENSE FLOW** (VAT & Expense booked now)
        foreach ($data->lineItems as $line) {
            $line_net_of_vat = floatval($line->debitAmount) - floatval($line->vatAmount);
            if ($line_net_of_vat > 0) {
                // a) Debit Expense Account
                $jvl_stmt->bind_param("siisddsis", $company_id, $user_id_int, $jv_id, $line->glAccountCode, $line_net_of_vat, 0.00, $line->lineDescription, $payee_id_int, $data->payeeType);
                $jvl_stmt->execute();
            }
            if (floatval($line->vatAmount) > 0) {
                // b) Debit Input VAT Account
                $jvl_stmt->bind_param("siisddsis", $company_id, $user_id_int, $jv_id, $input_vat_acct, floatval($line->vatAmount), 0.00, "Input VAT for: " . $line->lineDescription, $payee_id_int, $data->payeeType);
                $jvl_stmt->execute();
            }
        }
    }

    // --- Universal Credits (Apply to both flows) ---
    // c) Credit WHT Payable
    if ($total_wht_amount > 0) {
        $jvl_stmt->bind_param("siisddsis", $company_id, $user_id_int, $jv_id, $wht_payable_acct, 0.00, $total_wht_amount, "WHT withheld for " . $data->payeeName, $payee_id_int, $data->payeeType);
        $jvl_stmt->execute();
    }
    
    // d) Credit Bank/Cash
    $jvl_stmt->bind_param("siisddsis", $company_id, $user_id_int, $jv_id, $payment_method_acct, 0.00, $net_payment_to_bank, "Payment to " . $data->payeeName, $payee_id_int, $data->payeeType);
    $jvl_stmt->execute();

    $jvl_stmt->close();
    
    // ===================================
    // 5. COMMIT TRANSACTION & RESPOND
    // ===================================
    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "status" => "success", 
        "message" => "Payment voucher #" . $voucher_id . " created. Journal #" . $jv_id . " is ready for approval.", 
        "created_voucher_id" => $voucher_id,
        "journal_voucher_id" => $jv_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    error_log("Payment Voucher Creation Failed: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "Transaction failed: " . $e->getMessage()]);
}

$conn->close();
exit();
?>