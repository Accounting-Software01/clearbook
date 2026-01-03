<?php
// api/cancel-invoice.php

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
    if (!isset($data->invoice_id) || !isset($data->company_id) || !isset($data->user_id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invoice ID, Company ID, and User ID are required."]);
        exit();
    }

    $invoice_id = (int)$data->invoice_id;
    $company_id = (string)$data->company_id;
    $user_id = (int)$data->user_id;

    /************************************
     * START TRANSACTION
     ************************************/
    $conn->begin_transaction();

    // --- STEP 1: FETCH AND VALIDATE THE INVOICE ---
    $get_invoice_sql = "SELECT * FROM sales_invoices WHERE id = ? AND company_id = ? FOR UPDATE";
    $get_invoice_stmt = $conn->prepare($get_invoice_sql);
    $get_invoice_stmt->bind_param("is", $invoice_id, $company_id);
    $get_invoice_stmt->execute();
    $invoice = $get_invoice_stmt->get_result()->fetch_assoc();
    $get_invoice_stmt->close();

    if (!$invoice) {
        throw new Exception("Invoice not found or you do not have permission to access it.");
    }

    if ($invoice['status'] !== 'ISSUED') {
        throw new Exception("Invoice cannot be cancelled. Status is '{$invoice['status']}'. Only 'ISSUED' invoices without payments can be cancelled.");
    }

    // --- STEP 2: FIND THE ORIGINAL JOURNAL VOUCHER ---
    $get_jv_sql = "SELECT * FROM journal_vouchers WHERE reference_id = ? AND reference_type = 'sales_invoices' AND company_id = ? AND status = 'posted'";
    $get_jv_stmt = $conn->prepare($get_jv_sql);
    $get_jv_stmt->bind_param("is", $invoice_id, $company_id);
    $get_jv_stmt->execute();
    $original_voucher = $get_jv_stmt->get_result()->fetch_assoc();
    $get_jv_stmt->close();

    if (!$original_voucher) {
        throw new Exception("Could not find the original posted journal voucher for this invoice. Cannot proceed with cancellation.");
    }
    $original_voucher_id = $original_voucher['id'];

    // --- STEP 3: CREATE THE REVERSING JOURNAL VOUCHER ---
    $reversal_date = date('Y-m-d');
    $reversal_narration = "Reversal of Invoice #{$invoice['invoice_number']}";
    $reversal_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, entry_date, source, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'SALES_REVERSAL', 'SALES_INVOICE', ?, 'sales_invoices', ?, ?, ?, 'posted')";
    $reversal_stmt = $conn->prepare($reversal_sql);
    $reversal_stmt->bind_param("sisisdd", $company_id, $user_id, $reversal_date, $invoice_id, $reversal_narration, $original_voucher['total_debits'], $original_voucher['total_credits']);
    $reversal_stmt->execute();
    $reversal_voucher_id = $conn->insert_id;
    $reversal_stmt->close();

    // --- STEP 4: CREATE REVERSING JOURNAL LINES ---
    $get_lines_sql = "SELECT * FROM journal_voucher_lines WHERE voucher_id = ? AND company_id = ?";
    $get_lines_stmt = $conn->prepare($get_lines_sql);
    $get_lines_stmt->bind_param("is", $original_voucher_id, $company_id);
    $get_lines_stmt->execute();
    $original_lines = $get_lines_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $get_lines_stmt->close();

    $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_type, payee_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $jvl_stmt = $conn->prepare($jvl_sql);

    foreach ($original_lines as $line) {
        $reversal_desc = "Reversal: " . $line['description'];
        // Swap debit and credit
        $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $reversal_voucher_id, $line['account_id'], $line['credit'], $line['debit'], $line['payee_type'], $line['payee_id'], $reversal_desc);
        $jvl_stmt->execute();
    }
    $jvl_stmt->close();

    // --- STEP 5: RESTOCK INVENTORY ---
    $get_items_sql = "SELECT item_id, quantity FROM sales_invoice_items WHERE invoice_id = ?";
    $get_items_stmt = $conn->prepare($get_items_sql);
    $get_items_stmt->bind_param("i", $invoice_id);
    $get_items_stmt->execute();
    $items_to_restock = $get_items_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $get_items_stmt->close();

    $restock_sql = "UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ? WHERE id = ? AND company_id = ?";
    $restock_stmt = $conn->prepare($restock_sql);
    foreach ($items_to_restock as $item) {
        $restock_stmt->bind_param("dis", $item['quantity'], $item['item_id'], $company_id);
        $restock_stmt->execute();
    }
    $restock_stmt->close();

    // --- STEP 6: UPDATE INVOICE STATUS ---
    $update_invoice_sql = "UPDATE sales_invoices SET status = 'CANCELLED', amount_due = 0 WHERE id = ? AND company_id = ?";
    $update_invoice_stmt = $conn->prepare($update_invoice_sql);
    $update_invoice_stmt->bind_param("is", $invoice_id, $company_id);
    $update_invoice_stmt->execute();
    $update_invoice_stmt->close();

    /************************************
     * COMMIT TRANSACTION & RESPOND
     ************************************/
    $conn->commit();

    http_response_code(200);
    echo json_encode(["success" => true, "message" => "Invoice #{$invoice['invoice_number']} has been successfully cancelled and all entries reversed."]);

} catch (Exception $e) {
    if ($conn->errno) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "An internal server error occurred.", "details" => $e->getMessage()]);
} finally {
    // Statements are closed inside the try block
    if (isset($conn)) {
        $conn->close();
    }
}
?>