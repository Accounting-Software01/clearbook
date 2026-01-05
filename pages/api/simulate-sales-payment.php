<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

$env = "development";

// --- CORS & headers ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
        'https://clearbook-olive.vercel.app',
        'https://hariindustries.net'
    ];
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    }
} else {
    header("Access-Control-Allow-Origin: https://hariindustries.net");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once 'db_connect.php';

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

$conn = null;

try {
    $conn = $db; 
    $conn->begin_transaction();

    // --- Step 1: Get and Validate Input ---
    $data = json_decode(file_get_contents("php://input"));

    $company_id = $data->company_id ?? null;
    $user_id = $data->user_id ?? null;
    $invoice_id = $data->invoice_id ?? null;
    $amount_paid = $data->amount ?? 0;
    $payment_date = $data->payment_date ?? date('Y-m-d');
    $bank_account_ledger_id = $data->bank_account_id ?? null; // This is the ledger_id for the bank from the ledgers table

    if (!$company_id || !$user_id || !$invoice_id || !$bank_account_ledger_id || $amount_paid <= 0) {
        throw new Exception('Missing required payment details.', 400);
    }

    // --- Step 2: Fetch Invoice and Customer ID ---
    $stmt = $conn->prepare("SELECT customer_id, amount_due, invoice_number FROM sales_invoices WHERE id = ? AND company_id = ?");
    if (!$stmt) throw new Exception("Prepare failed (invoice fetch): " . $conn->error);
    $stmt->bind_param("is", $invoice_id, $company_id);
    $stmt->execute();
    $invoice_data = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$invoice_data) throw new Exception("Invoice not found.", 404);
    
    $customer_id_for_ledger = $invoice_data['customer_id']; // Use customer_id as the ledger for A/R
    $amount_due = (float)$invoice_data['amount_due'];

    if ($amount_paid > $amount_due) {
        throw new Exception("Payment amount cannot be greater than the amount due.", 400);
    }

    // --- Step 3: Create Journal Voucher ---
    $narration = "Payment received for Invoice #" . $invoice_data['invoice_number'];
    $stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, user_id, voucher_date, narration, status) VALUES (?, ?, ?, ?, 'POSTED')");
    if (!$stmt) throw new Exception("Prepare failed (journal insert): " . $conn->error);
    $stmt->bind_param("isss", $company_id, $user_id, $payment_date, $narration);
    $stmt->execute();
    $journal_voucher_id = $stmt->insert_id;
    $stmt->close();

    if($journal_voucher_id == 0) throw new Exception("Failed to create journal voucher.", 500);

    // --- Step 4: Create Journal Voucher Lines ---
    // DEBIT Bank Account (Asset Increase)
    // CREDIT Customer (as a sub-ledger of Accounts Receivable)
    $stmt = $conn->prepare("INSERT INTO journal_voucher_lines (journal_voucher_id, ledger_id, type, amount) VALUES (?, ?, 'DEBIT', ?), (?, ?, 'CREDIT', ?)");
    if (!$stmt) throw new Exception("Prepare failed (lines insert): " . $conn->error);
    $stmt->bind_param("iididi", $journal_voucher_id, $bank_account_ledger_id, $amount_paid, $journal_voucher_id, $customer_id_for_ledger, $amount_paid);
    $stmt->execute();
    $stmt->close();

    // --- Step 5: Update Invoice Status and Amount Due ---
    $new_amount_due = $amount_due - $amount_paid;
    $new_status = ($new_amount_due < 0.01) ? 'PAID' : 'PARTIAL';

    $stmt = $conn->prepare("UPDATE sales_invoices SET amount_due = ?, status = ? WHERE id = ?");
    if (!$stmt) throw new Exception("Prepare failed (invoice update): " . $conn->error);
    $stmt->bind_param("dsi", $new_amount_due, $new_status, $invoice_id);
    $stmt->execute();
    $stmt->close();

    // --- Step 6: Update Customer Balance (customer table)---
    $stmt = $conn->prepare("UPDATE customers SET balance = balance - ? WHERE id = ?");
    if (!$stmt) throw new Exception("Prepare failed (customer balance update): " . $conn->error);
    $stmt->bind_param("di", $amount_paid, $customer_id_for_ledger);
    $stmt->execute();
    $stmt->close();


    $conn->commit();

    respond(200, ['success' => true, 'message' => 'Payment recorded successfully.']);

} catch (Exception $e) {
    if ($conn && $conn->in_transaction) {
        $conn->rollback();
    }
    $code = $e->getCode() >= 400 ? $e->getCode() : 500;
    $error_details = ($env === "development") ? ["details" => $e->getMessage()] : [];
    respond($code, array_merge(["success" => false, "error" => $e->getMessage()], $error_details));
} finally {
    if ($conn) {
        $conn->close();
    }
}
