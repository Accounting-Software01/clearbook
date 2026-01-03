<?php
// api/sales-invoice.php

// --- BASIC SETUP ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- INCLUDES ---
include_once 'db_connect.php';

// --- MAIN LOGIC ---
try {
    $data = json_decode(file_get_contents("php://input"));

    // --- VALIDATION ---
    if (!isset($data->customer_id) || !isset($data->invoice_date) || !isset($data->due_date) || !isset($data->sales_items) || !is_array($data->sales_items) || empty($data->sales_items) || !isset($data->grand_total) || !isset($data->status) || !isset($data->user_id) || !isset($data->company_id)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Incomplete invoice data provided."]);
        exit();
    }

    /************************************
     * EXTRACT & PREPARE DATA
     ************************************/
    $customer_id = (int)$data->customer_id;
    $company_id = (string)$data->company_id;
    $user_id = (int)$data->user_id;
    $invoice_date = $data->invoice_date;
    $due_date = $data->due_date;
    $notes = $data->narration ?? 'Sales Invoice';
    $sales_items = $data->sales_items;
    $status = ($data->status === 'Posted') ? 'ISSUED' : 'DRAFT';
    $subtotal = (float)($data->sub_total ?? 0);
    $discount_amount = (float)($data->total_discount ?? 0);
    $tax_amount = (float)($data->total_vat ?? 0);
    $total_amount = (float)($data->grand_total ?? 0);
    $amount_due = $total_amount;

    // --- ACCOUNT MAPPING ---
    $accounts_receivable_id = '101210';
    $sales_revenue_id = '401000';
    $sales_discount_id = '402000';
    $vat_payable_id = '201210';
    $cogs_account_id = '501000';
    $inventory_account_id = '101340';

    /************************************
     * START TRANSACTION
     ************************************/
    $conn->begin_transaction();

    $total_cogs = 0;
    if ($status === 'ISSUED') {
        $check_stock_sql = "SELECT quantity_on_hand, unit_cost FROM inventory_items WHERE id = ? AND company_id = ?";
        $check_stock_stmt = $conn->prepare($check_stock_sql);
        foreach ($sales_items as $key => $item) {
            $check_stock_stmt->bind_param("is", $item->item_id, $company_id);
            $check_stock_stmt->execute();
            $result = $check_stock_stmt->get_result();
            $inventory_item = $result->fetch_assoc();

            if (!$inventory_item) {
                throw new Exception("Item '{$item->item_name}' not found in inventory.");
            }
            if ($item->quantity > $inventory_item['quantity_on_hand']) {
                throw new Exception("Not enough stock for '{$item->item_name}'. Requested: {$item->quantity}, Available: {$inventory_item['quantity_on_hand']}.");
            }
            $sales_items[$key]->unit_cost = (float)$inventory_item['unit_cost'];
            $total_cogs += $item->quantity * $sales_items[$key]->unit_cost;
        }
        $check_stock_stmt->close();
    }

    $inv_sql = "INSERT INTO sales_invoices (company_id, customer_id, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_due, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $inv_stmt = $conn->prepare($inv_sql);
    $inv_stmt->bind_param("sisssddddss", $company_id, $customer_id, $invoice_date, $due_date, $subtotal, $tax_amount, $discount_amount, $total_amount, $amount_due, $status, $notes);
    $inv_stmt->execute();
    $invoice_id = $conn->insert_id;

    $invoice_number = 'INV-' . str_pad($invoice_id, 5, '0', STR_PAD_LEFT);
    $update_inv_sql = "UPDATE sales_invoices SET invoice_number = ? WHERE id = ?";
    $update_inv_stmt = $conn->prepare($update_inv_sql);
    $update_inv_stmt->bind_param("si", $invoice_number, $invoice_id);
    $update_inv_stmt->execute();

    $item_sql = "INSERT INTO sales_invoice_items (invoice_id, item_id, quantity, unit_price, discount, vat, item_name) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $item_stmt = $conn->prepare($item_sql);
    foreach ($sales_items as $item) {
        $item_stmt->bind_param("isiddds", $invoice_id, $item->item_id, $item->quantity, $item->unit_price, $item->discount, $item->vat, $item->item_name);
        $item_stmt->execute();
    }

    if ($status === 'ISSUED') {
        $jv_narration = "Sale and COGS for Invoice: " . $invoice_number;
        $sales_journal_total = $subtotal + $tax_amount;
        $jv_total_debits_credits = $sales_journal_total + $total_cogs;

        $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, entry_date, source, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'SALES', 'SALES_INVOICE', ?, 'sales_invoices', ?, ?, ?, 'posted')";
        $jv_stmt = $conn->prepare($jv_sql);
        $jv_stmt->bind_param("sisisdd", $company_id, $user_id, $invoice_date, $invoice_id, $jv_narration, $jv_total_debits_credits, $jv_total_debits_credits);
        $jv_stmt->execute();
        $voucher_id = $conn->insert_id;

        $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_type, payee_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $jvl_stmt = $conn->prepare($jvl_sql);
        $zero_val = 0.00;
        $null_val = null;

        // Sales Entries
        $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $accounts_receivable_id, $total_amount, $zero_val, 'customer', $customer_id, "A/R for Invoice {$invoice_number}");
        $jvl_stmt->execute();
        if ($discount_amount > 0) {
            $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $sales_discount_id, $discount_amount, $zero_val, $null_val, $null_val, "Discount on Invoice {$invoice_number}");
            $jvl_stmt->execute();
        }
        $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $sales_revenue_id, $zero_val, $subtotal, $null_val, $null_val, "Sales revenue for {$invoice_number}");
        $jvl_stmt->execute();
        if ($tax_amount > 0) {
            $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $vat_payable_id, $zero_val, $tax_amount, $null_val, $null_val, "VAT on Invoice {$invoice_number}");
            $jvl_stmt->execute();
        }

        // **REVISED**: COGS Entry Per Line Item
        foreach ($sales_items as $item) {
            $line_cogs = $item->quantity * $item->unit_cost;
            if ($line_cogs > 0) {
                $cogs_narration = "COGS for {$item->quantity} x {$item->item_name} @ {$item->unit_cost}";
                // Debit COGS
                $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $cogs_account_id, $line_cogs, $zero_val, $null_val, $null_val, $cogs_narration);
                $jvl_stmt->execute();
                // Credit Inventory
                $jvl_stmt->bind_param("siiisddis", $company_id, $user_id, $voucher_id, $inventory_account_id, $zero_val, $line_cogs, $null_val, $null_val, $cogs_narration);
                $jvl_stmt->execute();
            }
        }

        // Update Inventory Quantity
        $inv_update_sql = "UPDATE inventory_items SET quantity_on_hand = quantity_on_hand - ? WHERE id = ? AND company_id = ?";
        $inv_update_stmt = $conn->prepare($inv_update_sql);
        foreach ($sales_items as $item) {
            $inv_update_stmt->bind_param("dis", $item->quantity, $item->item_id, $company_id);
            $inv_update_stmt->execute();
        }
    }

    /************************************
     * COMMIT TRANSACTION & RESPOND
     ************************************/
    $conn->commit();

    // **REVISED**: Added company_id filter for security
    $select_sql = "SELECT si.*, c.name as customer_name FROM sales_invoices si JOIN customers c ON si.customer_id = c.id WHERE si.id = ? AND si.company_id = ?";
    $select_stmt = $conn->prepare($select_sql);
    $select_stmt->bind_param("is", $invoice_id, $company_id);
    $select_stmt->execute();
    $result = $select_stmt->get_result();
    $new_invoice = $result->fetch_assoc();

    http_response_code(201);
    echo json_encode(["success" => true, "invoice" => $new_invoice]);

} catch (Exception $e) {
    if ($conn->errno) {
        $conn->rollback();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "An internal server error occurred.", "details" => $e->getMessage()]);
} finally {
    if (isset($inv_stmt)) $inv_stmt->close();
    if (isset($update_inv_stmt)) $update_inv_stmt->close();
    if (isset($item_stmt)) $item_stmt->close();
    if (isset($jv_stmt)) $jv_stmt->close();
    if (isset($jvl_stmt)) $jvl_stmt->close();
    if (isset($inv_update_stmt)) $inv_update_stmt->close();
    if (isset($select_stmt)) $select_stmt->close();
    if (isset($conn)) $conn->close();
}
?>