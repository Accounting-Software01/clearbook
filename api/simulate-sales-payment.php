<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- CORS & headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- DB connection ---
include_once 'db_connect.php';
$in_transaction = false;

try {
    $data = json_decode(file_get_contents("php://input"));

    // --- Validate input ---
    if (!isset($data->company_id, $data->invoice_id, $data->user_id)) {
        throw new Exception("Incomplete data. company_id, invoice_id, and user_id are required.");
    }

    $company_id = (string)$data->company_id;
    $invoice_id = (int)$data->invoice_id;
    $user_id = (int)$data->user_id;
    $payment_date = date('Y-m-d'); // Use current date for simulation

    // --- Start transaction ---
    $conn->begin_transaction();
    $in_transaction = true;

    // --- STEP 1: Fetch invoice details ---
    $inv_stmt = $conn->prepare("SELECT customer_id, total_amount, status FROM sales_invoices WHERE id=? AND company_id=?");
    if (!$inv_stmt) throw new Exception("Failed to prepare invoice fetch: " . $conn->error);
    $inv_stmt->bind_param("is", $invoice_id, $company_id);
    $inv_stmt->execute();
    $result = $inv_stmt->get_result();
    $invoice = $result->fetch_assoc();
    $inv_stmt->close();

    if (!$invoice) throw new Exception("Invoice not found.");
    if ($invoice['status'] === 'PAID' || $invoice['status'] === 'CANCELLED') {
        throw new Exception("Invoice is already in a final state ({$invoice['status']}).");
    }

    $customer_id = $invoice['customer_id'];
    $amount_paid = (float)$invoice['total_amount'];

    // --- STEP 2: Create a receipt record (assuming a 'receipts' table exists) ---
    // Note: This is a simplified receipt. You might have a more complex structure.
    $receipt_sql = "INSERT INTO receipts (company_id, customer_id, receipt_date, amount_received, payment_method, reference, created_by_id) VALUES (?, ?, ?, ?, 'Simulated', ?, ?)";
    $receipt_stmt = $conn->prepare($receipt_sql);
    if (!$receipt_stmt) throw new Exception("Failed to prepare receipt: " . $conn->error);
    $ref = 'INV-' . str_pad($invoice_id, 5, '0', STR_PAD_LEFT);
    $receipt_stmt->bind_param("ssdsis", $company_id, $customer_id, $payment_date, $amount_paid, $ref, $user_id);
    if (!$receipt_stmt->execute()) throw new Exception("Failed to create receipt record: " . $receipt_stmt->error);
    $receipt_id = $conn->insert_id;

    // --- STEP 3: Update the sales invoice ---
    $update_sql = "UPDATE sales_invoices SET status = 'PAID', amount_due = 0 WHERE id = ? AND company_id = ?";
    $update_stmt = $conn->prepare($update_sql);
    if (!$update_stmt) throw new Exception("Failed to prepare invoice update: " . $conn->error);
    $update_stmt->bind_param("is", $invoice_id, $company_id);
    if (!$update_stmt->execute()) throw new Exception("Failed to update invoice status: " . $update_stmt->error);

    // --- STEP 4: Create Journal Voucher & Lines ---
    $cash_account_id = '101110'; // Assuming Cash on Hand
    $ar_account_id = '101210';   // Accounts Receivable

    // 4a. Journal Voucher
    $jv_narration = "Payment receipt for Invoice #$ref";
    $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, entry_date, source, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'SALES', 'RECEIPT', ?, 'receipts', ?, ?, ?, 'posted')";
    $jv_stmt = $conn->prepare($jv_sql);
    if (!$jv_stmt) throw new Exception("Prepare JV failed: " . $conn->error);
    $jv_stmt->bind_param("sisisdd", $company_id, $user_id, $payment_date, $receipt_id, $jv_narration, $amount_paid, $amount_paid);
    if (!$jv_stmt->execute()) throw new Exception("Journal voucher insert failed: " . $jv_stmt->error);
    $voucher_id = $conn->insert_id;

    // 4b. Journal Lines
    $jvl_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_type, payee_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $jvl_stmt = $conn->prepare($jvl_sql);
    if (!$jvl_stmt) throw new Exception("Prepare JVL failed: " . $conn->error);

    // Debit Cash, Credit A/R
    $lines = [
        ['account_id' => $cash_account_id, 'debit' => $amount_paid, 'credit' => 0, 'desc' => "Cash receipt for $ref"],
        ['account_id' => $ar_account_id, 'debit' => 0, 'credit' => $amount_paid, 'desc' => "A/R clearing for $ref"]
    ];

    foreach ($lines as $line) {
        if (!$jvl_stmt->bind_param("siisddsis", $company_id, $user_id, $voucher_id, $line['account_id'], $line['debit'], $line['credit'], 'customer', $customer_id, $line['desc'])) {
            throw new Exception("JVL bind failed: " . $jvl_stmt->error);
        }
        if (!$jvl_stmt->execute()) throw new Exception("JVL insert failed: " . $jvl_stmt->error);
    }

    // --- Commit transaction ---
    $conn->commit();
    $in_transaction = false;

    echo json_encode(["success" => true, "message" => "Payment simulated successfully."]);

} catch (Exception $e) {
    if ($in_transaction) $conn->rollback();
    http_response_code(400); // Use 400 for client-side correctable errors
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
} finally {
    // Close all statements that were prepared
    foreach(['receipt_stmt', 'update_stmt', 'jv_stmt', 'jvl_stmt'] as $stmt_name) {
        if (isset($$stmt_name) && $$stmt_name instanceof mysqli_stmt) $$stmt_name->close();
    }
    if (isset($conn)) $conn->close();
}
?>