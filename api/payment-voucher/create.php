<?php
// api/payment-voucher/create.php
header('Content-Type: application/json');

require_once '../../src/app/api/db_connect.php';
require_once '../../src/app/api/logers.php';

$data = json_decode(file_get_contents('php://input'), true);

// === HARD CONTROLS & VALIDATION ===
if (!$data) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload.']);
    exit;
}

$required_fields = ['company_id', 'voucherDate', 'paymentType', 'payeeType', 'payeeCode', 'narration', 'lineItems', 'bankOrCashAccount', 'netPayable', 'preparedBy'];
foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        echo json_encode(['status' => 'error', 'message' => "Field '{$field}' is missing or empty."]);
        exit;
    }
}

if (!is_array($data['lineItems']) || count($data['lineItems']) === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Line items are required.']);
    exit;
}

$company_id = $data['company_id'];
$user_id = $data['preparedBy']; // Assuming email is a suitable identifier for created_by

mysqli_begin_transaction($conn);

try {
    // 1. INSERT INTO payment_vouchers (The Header)
    $stmt = mysqli_prepare($conn, "INSERT INTO payment_vouchers (
        company_id, voucher_date, payment_type, payment_mode, currency, exchange_rate, 
        payee_type, payee_code, payee_name, narration, source_module, source_document_no, 
        gross_amount, total_vat, total_wht, net_payable, status, prepared_by, bank_cash_account_code
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?)");
    
    mysqli_stmt_bind_param($stmt, "sssssdssssssddddss",
        $company_id,
        $data['voucherDate'],
        $data['paymentType'],
        $data['paymentMode'],
        $data['currency'],
        $data['exchangeRate'],
        $data['payeeType'],
        $data['payeeCode'],
        $data['payeeName'],
        $data['narration'],
        $data['sourceModule'],
        $data['sourceDocumentNo'],
        $data['grossAmount'],
        $data['totalVAT'],
        $data['totalWHT'],
        $data['netPayable'],
        $user_id,
        $data['bankOrCashAccount']
    );
    mysqli_stmt_execute($stmt);
    $pv_id = mysqli_insert_id($conn);
    mysqli_stmt_close($stmt);

    if (!$pv_id) {
        throw new Exception("Failed to create payment voucher header.");
    }

    // 2. INSERT INTO payment_voucher_line_items
    $line_stmt = mysqli_prepare($conn, "INSERT INTO payment_voucher_line_items (
        payment_voucher_id, account_type, gl_account_code, line_description, 
        cost_center, debit_amount, credit_amount, vat_applicable, vat_rate, vat_amount, 
        wht_applicable, wht_rate, wht_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($data['lineItems'] as $item) {
        mysqli_stmt_bind_param($line_stmt, "isssdddiidiid",
            $pv_id,
            $item['accountType'],
            $item['glAccountCode'],
            $item['lineDescription'],
            $item['costCenter'],
            $item['debitAmount'],
            $item['creditAmount'],
            $item['vatApplicable'],
            $item['vatRate'],
            $item['vatAmount'],
            $item['whtApplicable'],
            $item['whtRate'],
            $item['whtAmount']
        );
        mysqli_stmt_execute($line_stmt);
    }
    mysqli_stmt_close($line_stmt);

    // 3. GENERATE JOURNAL VOUCHER (JV) - The Core Posting Logic
    // Create JV Header
    $jv_narration = "Payment Voucher #{$pv_id}: " . $data['narration'];
    $jv_stmt = mysqli_prepare($conn, "INSERT INTO journal_vouchers (company_id, voucher_date, narration, source_document, source_id, status, created_by) VALUES (?, ?, ?, 'PV', ?, 'Awaiting Approval', ?)");
    mysqli_stmt_bind_param($jv_stmt, "sssis", $company_id, $data['voucherDate'], $jv_narration, $pv_id, $user_id);
    mysqli_stmt_execute($jv_stmt);
    $jv_id = mysqli_insert_id($conn);
    mysqli_stmt_close($jv_stmt);
    
    if (!$jv_id) {
        throw new Exception("Failed to create journal voucher header.");
    }
    
    // JV Line Items Logic (PHASE 2 LOGIC)
    $jv_line_stmt = mysqli_prepare($conn, "INSERT INTO journal_voucher_lines (journal_voucher_id, gl_account_code, narration, debit, credit) VALUES (?, ?, ?, ?, ?)");

    // Debit Entries (Expenses, Assets etc.)
    foreach ($data['lineItems'] as $item) {
        // Debit the Expense/Asset Account
        $debit_narration = $item['lineDescription'] ?: $data['narration'];
        mysqli_stmt_bind_param($jv_line_stmt, "issdd", $jv_id, $item['glAccountCode'], $debit_narration, $item['debitAmount'], $credit_val = 0.00);
        mysqli_stmt_execute($jv_line_stmt);

        // Debit VAT Input Account if applicable
        if ($item['vatAmount'] > 0) {
            $vat_input_acct = '12050'; // Hardcoded: Get from settings
            $vat_narration = "VAT on " . $item['lineDescription'];
            mysqli_stmt_bind_param($jv_line_stmt, "issdd", $jv_id, $vat_input_acct, $vat_narration, $item['vatAmount'], $credit_val = 0.00);
            mysqli_stmt_execute($jv_line_stmt);
        }
    }

    // Credit Entries (WHT, Bank/Cash)
    // Credit WHT Payable Account
    if ($data['totalWHT'] > 0) {
        $wht_payable_acct = '21020'; // Hardcoded: Get from settings
        $wht_narration = "WHT withheld for " . $data['payeeName'];
        mysqli_stmt_bind_param($jv_line_stmt, "issdd", $jv_id, $wht_payable_acct, $wht_narration, $debit_val = 0.00, $data['totalWHT']);
        mysqli_stmt_execute($jv_line_stmt);
    }
    
    // Credit Bank/Cash Account
    $bank_credit_narration = "Payment to " . $data['payeeName'];
    mysqli_stmt_bind_param($jv_line_stmt, "issdd", $jv_id, $data['bankOrCashAccount'], $bank_credit_narration, $debit_val = 0.00, $data['netPayable']);
    mysqli_stmt_execute($jv_line_stmt);
    
    mysqli_stmt_close($jv_line_stmt);
    
    // --- End of PHASE 2 LOGIC ---

    mysqli_commit($conn);
    
    log_action('create', "Created Payment Voucher #{$pv_id} and Journal #{$jv_id}", $user_id, $company_id, 'PaymentVoucher');

    echo json_encode([
        'status' => 'success', 
        'message' => "Payment Voucher #{$pv_id} created and submitted for approval.",
        'created_voucher_id' => $pv_id
    ]);

} catch (Exception $e) {
    mysqli_rollback($conn);
    log_action('error', "PV Creation Failed: " . $e->getMessage(), $user_id, $company_id, 'PaymentVoucher');
    echo json_encode(['status' => 'error', 'message' => "Transaction failed: " . $e->getMessage()]);
}

mysqli_close($conn);
?>