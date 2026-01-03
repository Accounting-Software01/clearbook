<?php
// api/allocate-payment.php

// --- BASIC SETUP ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- INCLUDES ---
include_once 'db_connect.php';

try {
    $data = json_decode(file_get_contents("php://input"));

    // --- VALIDATION ---
    if (
        !isset($data->company_id) || !isset($data->user_id) || !isset($data->customer_id) || 
        !isset($data->payment_date) || !isset($data->payment_amount) || !isset($data->bank_account_id) || 
        !isset($data->invoices) || !is_array($data->invoices) || empty($data->invoices)
    ) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Incomplete payment allocation data provided."]);
        exit();
    }

    // Validate that the sum of amounts to apply equals the total payment amount
    $total_applied_amount = 0;
    foreach ($data->invoices as $inv) {
        if (!isset($inv->invoice_id) || !isset($inv->amount_to_apply)) {
             http_response_code(400);
             echo json_encode(["success" => false, "error" => "Invalid invoice allocation format."]);
             exit();
        }
        $total_applied_amount += (float)$inv->amount_to_apply;
    }

    if (bccomp((string)$total_applied_amount, (string)$data->payment_amount, 2) !== 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Total applied amount does not match the payment amount."]);
        exit();
    }

    /************************************
     * EXTRACT & PREPARE DATA
     ************************************/
    $company_id = (string)$data->company_id;
    $user_id = (int)$data->user_id;
    $customer_id = (int)$data->customer_id;
    $payment_date = $data->payment_date;
    $payment_amount = (float)$data->payment_amount;
    $bank_account_id = (string)$data->bank_account_id; // e.g., '101120'
    $narration = $data->narration ?? "Payment from customer";
    $invoices_to_apply = $data->invoices;

    // --- ACCOUNT MAPPING ---
    $accounts_receivable_id = '101210';

    /************************************
     * START TRANSACTION
     ************************************/
    $conn->begin_transaction();

    // --- STEP 1: CREATE JOURNAL VOUCHER ---
    $jv_narration = "Customer Payment Allocation. " . $narration;
    $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, entry_date, source, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'PAYMENT', 'CASH_RECEIPT', ?, 'customers', ?, ?, ?, 'posted')";
    $jv_stmt = $conn->prepare($jv_sql);
    $jv_stmt->bind_param("sisisdd", $company_id, $user_id, $payment_date, $customer_id, $jv_narration, $payment_amount, $payment_amount);
    $jv_stmt->execute();
    $voucher_id = $conn->insert_id;

    // --- STEP 2: CREATE JOURNAL VOUCHER LINES ---
    $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_type, payee_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $jvl_stmt = $conn->prepare($jvl_sql);
    $zero_val = 0.00;

    // Debit the Bank Account that received the money
    $debit_desc = "Cash/Bank deposit for customer payment";
    $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $bank_account_id, $payment_amount, $zero_val, null, null, $debit_desc);
    $jvl_stmt->execute();

    // Credit Accounts Receivable for the customer
    $credit_desc = "Credit A/R for customer payment";
    $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $accounts_receivable_id, $zero_val, $payment_amount, 'customer', $customer_id, $credit_desc);
    $jvl_stmt->execute();

    // --- STEP 3: UPDATE INVOICES ---
    $update_invoice_sql = "UPDATE sales_invoices SET amount_paid = amount_paid + ?, amount_due = amount_due - ?, status = ? WHERE id = ? AND company_id = ?";
    $update_invoice_stmt = $conn->prepare($update_invoice_sql);

    $get_invoice_sql = "SELECT amount_due FROM sales_invoices WHERE id = ? AND company_id = ?";
    $get_invoice_stmt = $conn->prepare($get_invoice_sql);

    foreach ($invoices_to_apply as $invoice) {
        $invoice_id = (int)$invoice->invoice_id;
        $amount_to_apply = (float)$invoice->amount_to_apply;

        // Get current amount_due to determine final status
        $get_invoice_stmt->bind_param("is", $invoice_id, $company_id);
        $get_invoice_stmt->execute();
        $result = $get_invoice_stmt->get_result();
        $inv_data = $result->fetch_assoc();

        if (!$inv_data) {
            throw new Exception("Invoice with ID {$invoice_id} not found for your company.");
        }

        $new_amount_due = (float)$inv_data['amount_due'] - $amount_to_apply;
        
        // Determine new status
        $new_status = (bccomp((string)$new_amount_due, '0', 2) <= 0) ? 'PAID' : 'PARTIAL';
        
        $update_invoice_stmt->bind_param("ddsiss", $amount_to_apply, $amount_to_apply, $new_status, $invoice_id, $company_id);
        $update_invoice_stmt->execute();
    }

    /************************************
     * COMMIT TRANSACTION & RESPOND
     ************************************/
    $conn->commit();

    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Payment allocated successfully.", "voucher_id" => $voucher_id]);

} catch (Exception $e) {
    if ($conn->errno) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "An internal server error occurred.", "details" => $e->getMessage()]);
} finally {
    if (isset($jv_stmt)) $jv_stmt->close();
    if (isset($jvl_stmt)) $jvl_stmt->close();
    if (isset($get_invoice_stmt)) $get_invoice_stmt->close();
    if (isset($update_invoice_stmt)) $update_invoice_stmt->close();
    if (isset($conn)) $conn->close();
}
?>