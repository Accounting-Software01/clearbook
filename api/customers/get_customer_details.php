<?php
// api/customers/get_customer_details.php

// --- Basic Setup ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

// --- Includes ---
include_once '../db_connect.php';

// --- Validation ---
if (!isset($_GET['company_id']) || !isset($_GET['customer_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID and Customer ID are required."]);
    exit();
}

$company_id = (string)$_GET['company_id'];
$customer_id = (string)$_GET['customer_id']; // This is the unique varchar ID, e.g., CUS-xxxx

// --- Database Interaction ---
try {
    // --- 1. Fetch Customer Profile ---
    $profile_sql = "SELECT * FROM customers WHERE customer_id = ? AND company_id = ?";
    $stmt_profile = $conn->prepare($profile_sql);
    $stmt_profile->bind_param("ss", $customer_id, $company_id);
    $stmt_profile->execute();
    $result_profile = $stmt_profile->get_result();
    
    $customer_profile = $result_profile->fetch_assoc();

    if (!$customer_profile) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Customer not found."]);
        exit();
    }

    $customer_int_id = $customer_profile['id'];

    // --- 2. Calculate Customer Balance ---
    $balance_sql = "
        SELECT 
            COALESCE(SUM(jvl.debit), 0) - COALESCE(SUM(jvl.credit), 0) AS balance
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jvl.payee_id = ?
          AND jvl.payee_type = 'customer'
          AND jv.company_id = ?
    ";
    $stmt_balance = $conn->prepare($balance_sql);
    $stmt_balance->bind_param("is", $customer_int_id, $company_id);
    $stmt_balance->execute();
    $result_balance = $stmt_balance->get_result();
    $balance_data = $result_balance->fetch_assoc();
    $customer_balance = (float)($balance_data['balance'] ?? 0);

    $customer_profile['balance'] = $customer_balance;

    // --- 3. Fetch Recent Transactions ---
    $transactions_sql = "
        SELECT 
            jv.voucher_date,
            jv.voucher_number,
            jv.narration,
            jvl.debit,
            jvl.credit,
            jv.voucher_type
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jvl.payee_id = ?
          AND jvl.payee_type = 'customer'
          AND jv.company_id = ?
        ORDER BY jv.voucher_date DESC, jv.created_at DESC
        LIMIT 50;
    ";
    $stmt_transactions = $conn->prepare($transactions_sql);
    $stmt_transactions->bind_param("is", $customer_int_id, $company_id);
    $stmt_transactions->execute();
    $result_transactions = $stmt_transactions->get_result();
    
    $transactions_array = [];
    while ($row = $result_transactions->fetch_assoc()) {
        $transactions_array[] = $row;
    }

    // --- 4. Fetch Recent Sales Invoices ---
    $invoices_sql = "
        SELECT 
            invoice_number,
            invoice_date,
            due_date,
            total_amount,
            amount_due,
            status
        FROM sales_invoices
        WHERE customer_id = ?
          AND company_id = ?
        ORDER BY invoice_date DESC
        LIMIT 10;
    ";
    $stmt_invoices = $conn->prepare($invoices_sql);
    $stmt_invoices->bind_param("ss", $customer_id, $company_id);
    $stmt_invoices->execute();
    $result_invoices = $stmt_invoices->get_result();
    
    $sales_invoices_array = [];
    while ($row_invoice = $result_invoices->fetch_assoc()) {
        $sales_invoices_array[] = $row_invoice;
    }

    // --- 5. Assemble the Final Response ---
    $response_data = [
        'profile' => $customer_profile,
        'transactions' => $transactions_array,
        'sales_invoices' => $sales_invoices_array,
    ];

    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $response_data]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}

$conn->close();
?>