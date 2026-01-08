<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- CORS & headers ---
header("Access-Control-Allow-Origin: *"); // Consider restricting this in production
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- DB connection ---
require_once 'db_connect.php';
$in_transaction = false;

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

try {
    $data = json_decode(file_get_contents("php://input"));

    // --- STEP 1: Validate input ---
    $required_fields = ['company_id', 'user_id', 'invoice_id', 'amount', 'payment_date', 'bank_account_id'];
    foreach ($required_fields as $field) {
        if (!isset($data->$field)) {
            throw new Exception("Incomplete data. Missing field: $field");
        }
    }

    $company_id = (string)$data->company_id;
    $user_id = (int)$data->user_id;
    $invoice_id = (int)$data->invoice_id;
    $amount_paid = (float)$data->amount;
    $payment_date = (new DateTime($data->payment_date))->format('Y-m-d');
    $bank_account_id = (int)$data->bank_account_id;
    $reference = isset($data->reference) ? (string)$data->reference : null;
    $narration = isset($data->narration) ? (string)$data->narration : 'Payment for Invoice';

    if ($amount_paid <= 0) {
        throw new Exception("Payment amount must be positive.");
    }

    // --- Start transaction ---
    $conn->begin_transaction();
    $in_transaction = true;

    // --- STEP 2: Fetch invoice and related data ---
    $inv_stmt = $conn->prepare("SELECT customer_id, total_amount, amount_due, status FROM sales_invoices WHERE id=? AND company_id=? FOR UPDATE");
    if (!$inv_stmt) throw new Exception("Prepare invoice fetch failed: " . $conn->error);
    $inv_stmt->bind_param("is", $invoice_id, $company_id);
    $inv_stmt->execute();
    $invoice = $inv_stmt->get_result()->fetch_assoc();
    $inv_stmt->close();

    if (!$invoice) throw new Exception("Invoice not found.");
    if ($invoice['status'] === 'PAID' || $invoice['status'] === 'CANCELLED') {
        throw new Exception("Invoice is already paid or cancelled.");
    }
    if ($amount_paid > (float)$invoice['amount_due']) {
        throw new Exception("Payment amount cannot be greater than the amount due.");
    }

    // --- STEP 3: Fetch Bank GL Account ---
    $bank_stmt = $conn->prepare("SELECT gl_account_code FROM bank_accounts WHERE id=? AND company_id=?");
    if (!$bank_stmt) throw new Exception("Prepare bank fetch failed: " . $conn->error);
    $bank_stmt->bind_param("is", $bank_account_id, $company_id);
    $bank_stmt->execute();
    $bank_account = $bank_stmt->get_result()->fetch_assoc();
    $bank_stmt->close();

    if (!$bank_account || empty($bank_account['gl_account_code'])) {
        throw new Exception("Receiving bank account is not configured or linked to a GL account.");
    }
    $cash_gl_code = $bank_account['gl_account_code'];
    $ar_gl_code = '101210'; // Accounts Receivable GL

    // --- STEP 4: Update Invoice Status & Amount Due ---
    $new_amount_due = (float)$invoice['amount_due'] - $amount_paid;
    $new_status = ($new_amount_due <= 0.005) ? 'PAID' : 'PARTIAL'; // Using a small tolerance for float comparison

    $update_inv_stmt = $conn->prepare("UPDATE sales_invoices SET status = ?, amount_due = ? WHERE id = ? AND company_id = ?");
    if (!$update_inv_stmt) throw new Exception("Prepare invoice update failed: " . $conn->error);
    $update_inv_stmt->bind_param("sdis", $new_status, $new_amount_due, $invoice_id, $company_id);
    if (!$update_inv_stmt->execute()) throw new Exception("Invoice update failed: " . $update_inv_stmt->error);
    $update_inv_stmt->close();

    // --- STEP 5: Create Journal Voucher ---
    $jv_narration = $narration;
    $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, entry_date, source, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'SALES', 'RECEIPT', ?, 'sales_invoices', ?, ?, ?, 'posted')";
    $jv_stmt = $conn->prepare($jv_sql);
    if (!$jv_stmt) throw new Exception("Prepare JV failed: " . $conn->error);
    $jv_stmt->bind_param("sisisdd", $company_id, $user_id, $payment_date, $invoice_id, $jv_narration, $amount_paid, $amount_paid);
    if (!$jv_stmt->execute()) throw new Exception("JV insert failed: " . $jv_stmt->error);
    $voucher_id = $conn->insert_id;

    // --- STEP 6: Create Journal Voucher Lines ---
    $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_type, payee_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $jvl_stmt = $conn->prepare($jvl_sql);
    if (!$jvl_stmt) throw new Exception("Prepare JVL failed: " . $jvl_stmt->error);

    $customer_id = $invoice['customer_id'];
    $lines = [
        ['account_id' => $cash_gl_code, 'debit' => $amount_paid, 'credit' => 0, 'desc' => "Debit for invoice payment #{$invoice_id}"],
        ['account_id' => $ar_gl_code, 'debit' => 0, 'credit' => $amount_paid, 'desc' => "Credit to clear A/R for invoice #{$invoice_id}"]
    ];

    foreach ($lines as $line) {
        $jvl_stmt->bind_param("siisddsis", $company_id, $user_id, $voucher_id, $line['account_id'], $line['debit'], $line['credit'], 'customer', $customer_id, $line['desc']);
        if (!$jvl_stmt->execute()) throw new Exception("JVL insert failed for account {$line['account_id']}: " . $jvl_stmt->error);
    }
    $jvl_stmt->close();

    // --- Commit transaction ---
    $conn->commit();
    $in_transaction = false;

    respond(200, ["success" => true, "message" => "Payment recorded successfully.", "new_status" => $new_status]);

} catch (Exception $e) {
    if ($in_transaction) $conn->rollback();
    respond(400, ["success" => false, "error" => $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>