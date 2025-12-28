<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../src/app/api/db_connect.php';
require_once __DIR__ . '/../src/app/api/logers.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

set_exception_handler('handle_error');

function get_wht_account_id($conn, $company_id) {
    // Fetches the account ID for Withholding Tax Payable using its universal code.
    $stmt = $conn->prepare("SELECT a.account_id FROM accounts a JOIN chart_of_accounts_templates t ON a.template_account_id = t.id WHERE a.company_id = ? AND t.code = '202020'");
    if (!$stmt) throw new Exception("DB prepare failed: " . $conn->error, 500);
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception("Withholding Tax Payable account (code 202020) not found for this company. Please ensure it's created from the template.", 404);
    }
    $account = $result->fetch_assoc();
    $stmt->close();
    return $account['account_id'];
}

function get_supplier_ap_account_id($conn, $company_id, $supplier_id) {
    $stmt = $conn->prepare("SELECT ap_account_id FROM suppliers WHERE company_id = ? AND id = ?");
    if (!$stmt) throw new Exception("DB prepare failed: " . $conn->error, 500);
    $stmt->bind_param("si", $company_id, $supplier_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception("Supplier not found.", 404);
    }
    $supplier = $result->fetch_assoc();
    $stmt->close();
    if (empty($supplier['ap_account_id'])) {
        throw new Exception("Supplier does not have an Accounts Payable account configured.", 400);
    }
    return $supplier['ap_account_id'];
}

function generate_voucher_number($conn, $prefix = 'PV') {
    $year = date('Y');
    $like = $prefix . '-' . $year . '-';
    $sql = "SELECT MAX(CAST(SUBSTRING(voucher_number, " . (strlen($like) + 1) . ") AS UNSIGNED)) AS max_no FROM journal_vouchers WHERE voucher_number LIKE ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("DB prepare failed: " . $conn->error, 500);
    $search_like = $like . '%';
    $stmt->bind_param("s", $search_like);
    $stmt->execute();
    $res = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $next_no = ($res['max_no'] ?? 0) + 1;
    return $like . str_pad($next_no, 5, '0', STR_PAD_LEFT);
}

try {
    global $conn;
    $data = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON data received', 400);
    }

    $company_id = $data['company_id'] ?? null;
    $user_id = $data['user_id'] ?? null;
    $payment_account_id = $data['payment_account_id'] ?? null;
    $wht_rate = $data['wht_rate'] ?? 0;
    $payments = $data['payments'] ?? [];

    if (!$company_id || !$user_id || !$payment_account_id || empty($payments)) {
        throw new Exception('Missing required parameters.', 400);
    }

    $wht_account_id = get_wht_account_id($conn, $company_id);
    $created_voucher_ids = [];

    $conn->begin_transaction();

    try {
        // Prepare statements outside the loop
        $voucherSql = "INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Payment Workbench', CURDATE(), 'PV', ?, 'Supplier', ?, ?, ?, 'posted')";
        $voucherStmt = $conn->prepare($voucherSql);
        if (!$voucherStmt) throw new Exception('Voucher prepare failed: ' . $conn->error, 500);

        $lineSql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_id, payee_type, description) VALUES (?, ?, ?, ?, ?, ?, ?, 'Supplier', ?)";
        $lineStmt = $conn->prepare($lineSql);
        if (!$lineStmt) throw new Exception('Line prepare failed: ' . $conn->error, 500);

        $updateInvoiceSql = "UPDATE supplier_invoices SET status = 'Paid', journal_voucher_id = ? WHERE id = ? AND company_id = ?";
        $updateInvoiceStmt = $conn->prepare($updateInvoiceSql);
        if (!$updateInvoiceStmt) throw new Exception('Invoice update prepare failed: ' . $conn->error, 500);

        foreach ($payments as $payment) {
            $supplier = $payment['supplier'];
            $gross_amount = (float)$payment['totalAmount'];
            $supplier_id = (int)$supplier['id'];

            $supplier_ap_account_id = get_supplier_ap_account_id($conn, $company_id, $supplier_id);

            $wht_amount = round($gross_amount * ($wht_rate / 100), 2);
            $net_payment = $gross_amount - $wht_amount;

            $voucher_number = generate_voucher_number($conn);
            $narration = $payment['purpose'];

            // Insert voucher header
            $voucherStmt->bind_param("sisssdd", $company_id, $user_id, $voucher_number, $supplier_id, $narration, $gross_amount, $gross_amount);
            $voucherStmt->execute();
            $voucher_id = $voucherStmt->insert_id;

            // Line 1: Debit Accounts Payable (Supplier)
            $desc1 = "Payment to close invoices for " . $supplier['name'];
            $lineStmt->bind_param("siisddis", $company_id, $user_id, $voucher_id, $supplier_ap_account_id, $gross_amount, 0.00, $supplier_id, $desc1);
            $lineStmt->execute();

            // Line 2: Credit WHT Payable
            if ($wht_amount > 0) {
                $desc2 = "WHT deduction for payment to " . $supplier['name'];
                $lineStmt->bind_param("siisddis", $company_id, $user_id, $voucher_id, $wht_account_id, 0.00, $wht_amount, $supplier_id, $desc2);
                $lineStmt->execute();
            }
            
            // Line 3: Credit Bank/Cash Account
            $desc3 = "Net payment to " . $supplier['name'];
            $lineStmt->bind_param("siisddis", $company_id, $user_id, $voucher_id, $payment_account_id, 0.00, $net_payment, $supplier_id, $desc3);
            $lineStmt->execute();

            // Update invoices
            foreach ($payment['invoices'] as $invoice) {
                $invoice_id = (int)$invoice['id'];
                $updateInvoiceStmt->bind_param("iis", $voucher_id, $invoice_id, $company_id);
                $updateInvoiceStmt->execute();
            }

            $created_voucher_ids[] = $voucher_number;
        }

        $voucherStmt->close();
        $lineStmt->close();
        $updateInvoiceStmt->close();
        
        $conn->commit();

        echo json_encode([
            'status' => 'success',
            'message' => 'Payment schedule processed successfully.',
            'created_voucher_ids' => $created_voucher_ids
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e; // Re-throw to be caught by the outer try-catch
    }

} catch (Exception $e) {
    // This will be handled by the set_exception_handler('handle_error')
    handle_error($e);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>