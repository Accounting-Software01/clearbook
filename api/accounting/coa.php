<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../db_connect.php';

// ────────────────────────────────────────────────
// Headers & CORS
// ────────────────────────────────────────────────
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ────────────────────────────────────────────────
// Read & validate input
// ────────────────────────────────────────────────
$data = json_decode(file_get_contents("php://input"));

if (empty($data->company_id) || empty($data->user_id) || empty($data->customerId) ||
    empty($data->items) || empty($data->salesReturnAccount) ||
    empty($data->accountsReceivableAccount) || empty($data->returnType)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required fields"]);
    exit;
}

// ────────────────────────────────────────────────
// Sanitize & prepare scalar inputs
// ────────────────────────────────────────────────
$company_id     = trim(filter_var($data->company_id, FILTER_SANITIZE_STRING));
$user_id        = filter_var($data->user_id, FILTER_VALIDATE_INT);
// [FIX #1] Customer ID must be an integer.

$customer_id = filter_var($data->customerId, FILTER_SANITIZE_STRING);

$credit_note_date = trim(filter_var($data->creditNoteDate ?? '', FILTER_SANITIZE_STRING));
$reason         = trim(filter_var($data->reason ?? '', FILTER_SANITIZE_STRING));
$notes          = trim(filter_var($data->notes ?? '', FILTER_SANITIZE_STRING));
$terms          = trim(filter_var($data->terms ?? '', FILTER_SANITIZE_STRING));

$related_invoice_id = !empty($data->invoiceId) ? filter_var($data->invoiceId, FILTER_VALIDATE_INT) : null;

// These are account CODES, so they are strings. This is correct.
$sales_return_account     = trim(filter_var($data->salesReturnAccount, FILTER_SANITIZE_STRING));
$accounts_receivable_account = trim(filter_var($data->accountsReceivableAccount, FILTER_SANITIZE_STRING));
$return_type              = trim(filter_var($data->returnType, FILTER_SANITIZE_STRING));

$items = $data->items;

// Add validation checks for filtered IDs
if ($user_id === false || $customer_id === false) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid user_id or customer_id. Must be integers."]);
    exit;
}

// ────────────────────────────────────────────────
// Generate next credit note number
// ────────────────────────────────────────────────
$cn_prefix = 'CN-';
$stmt = $conn->prepare("SELECT credit_note_number FROM credit_notes WHERE company_id = ? ORDER BY id DESC LIMIT 1");
$stmt->bind_param("s", $company_id);
$stmt->execute();
$result = $stmt->get_result();
$new_seq = 1;

if ($row = $result->fetch_assoc()) {
    $last_seq = (int) str_replace($cn_prefix, '', $row['credit_note_number']);
    $new_seq = $last_seq + 1;
}
$credit_note_number = $cn_prefix . str_pad($new_seq, 5, '0', STR_PAD_LEFT);
$stmt->close();

// ────────────────────────────────────────────────
// Calculate totals (backend enforced)
// ────────────────────────────────────────────────
$subtotal = 0.0; $total_tax = 0.0; $total_discount = 0.0;
foreach ($items as $item) {
    $subtotal += (float)($item->quantity ?? 0) * (float)($item->unit_price ?? 0);
    $total_tax += (float)($item->tax_amount ?? 0);
    $total_discount += (float)($item->discount ?? 0);
}
$total_amount = $subtotal - $total_discount + $total_tax;

// ────────────────────────────────────────────────
// Transaction starts here
// ────────────────────────────────────────────────
$conn->begin_transaction();

try {
    // 1. Create credit note header
    $sql = "INSERT INTO credit_notes (company_id, customer_id, created_by_id, credit_note_number, credit_note_date, related_invoice_id, reason, notes, terms_and_conditions, subtotal, total_tax, total_discount, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'posted')";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Credit note prepare failed: " . $conn->error);

    // [FIX #2] Corrected the bind_param type string to match the query and data types.
    $stmt->bind_param("ssissssssdddd", $company_id, $customer_id, $user_id, $credit_note_number, $credit_note_date, $related_invoice_id, $reason, $notes, $terms, $subtotal, $total_tax, $total_discount, $total_amount);
    $stmt->execute();
    $credit_note_id = $stmt->insert_id;
    $stmt->close();

    if (empty($credit_note_id)) {
        throw new Exception("Credit note creation failed, no insert ID returned. Check data types.");
    }

    // 2. Insert credit note line items
    $sql_item = "INSERT INTO credit_note_items (credit_note_id, item_id, item_name, quantity, unit_price, `discount`, tax_rate, tax_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt_item = $conn->prepare($sql_item);
    if (!$stmt_item) throw new Exception("Items prepare failed: " . $conn->error);

    foreach ($items as $item) {
        $item_id = (int)($item->id ?? 0);
        $item_name = (string)($item->item_name ?? '');
        $qty = (float)($item->quantity ?? 0);
        $price = (float)($item->unit_price ?? 0);
        $disc = (float)($item->discount ?? 0);
        $tax_amt = (float)($item->tax_amount ?? 0);
        $tax_rate = 0.0;
        $line_total = $qty * $price - $disc + $tax_amt;

        $stmt_item->bind_param("iisdddddd", $credit_note_id, $item_id, $item_name, $qty, $price, $disc, $tax_rate, $tax_amt, $line_total);
        if (!$stmt_item->execute()) throw new Exception("Failed to insert item #$item_id: " . $stmt_item->error);
    }
    $stmt_item->close();

  // 3. Create journal voucher
$narration = "Credit Note $credit_note_number – Customer return. Reason: $reason";

// Generate voucher_number (required, NOT NULL + UNIQUE)
$v_prefix = 'JV-' . date('Ym') . '-';  // e.g. JV-202601-

// Prepare the LIKE pattern as a variable
$like_pattern = $v_prefix . '%';

$stmt_seq = $conn->prepare("
    SELECT voucher_number 
    FROM journal_vouchers 
    WHERE company_id = ? AND voucher_number LIKE ? 
    ORDER BY id DESC LIMIT 1
");
$stmt_seq->bind_param("ss", $company_id, $like_pattern);  // ← now safe
$stmt_seq->execute();
$result_seq = $stmt_seq->get_result();
$new_v_seq = 1;
if ($row = $result_seq->fetch_assoc()) {
    $last_part = substr($row['voucher_number'], -4); // last 4 digits
    $new_v_seq = (int)$last_part + 1;
}
$voucher_number = $v_prefix . str_pad($new_v_seq, 4, '0', STR_PAD_LEFT);
$stmt_seq->close();
// Use correct column names from your DESCRIBE: source + reference_id
// Use correct column names from your DESCRIBE: source + reference_id
// [THE FIX]: Added `voucher_type` to the INSERT query.
$sql_jv = "
    INSERT INTO journal_vouchers 
    (company_id, created_by_id, entry_date, source, reference_id, narration, voucher_number, voucher_type)
    VALUES (?, ?, ?, 'credit_note', ?, ?, ?, ?)
";

$stmt_jv = $conn->prepare($sql_jv);
if ($stmt_jv === false) {
    throw new Exception("Journal voucher prepare failed: " . $conn->error);
}

// [THE FIX]: Added a variable for voucher_type and updated the bind_param call.
$voucher_type = 'Journal Voucher'; // Provide a default value for the mandatory field.

$stmt_jv->bind_param(
    "sisisss",          // Added 's' for the new voucher_type string
    $company_id,        
    $user_id,           
    $credit_note_date,  
    $credit_note_id,    
    $narration,         
    $voucher_number,
    $voucher_type       // Added the new variable
);

if (!$stmt_jv->execute()) {
    throw new Exception("Journal voucher execute failed: " . $stmt_jv->error);
}

$jv_id = $stmt_jv->insert_id;
if ($jv_id <= 0) {
    throw new Exception("Journal voucher inserted but no valid ID returned");
}

$stmt_jv->close();

// 4. Create journal lines
$sql_line = "
    INSERT INTO journal_voucher_lines 
    (company_id, user_id, voucher_id, account_id, debit, credit)
    VALUES 
        (?, ?, ?, ?, ?, 0.00),      -- Debit entry
        (?, ?, ?, ?, 0.00, ?)       -- Credit entry
";

$stmt_line = $conn->prepare($sql_line);
if ($stmt_line === false) {
    throw new Exception("Journal lines prepare failed: " . $conn->error);
}

// [THE FIX]: The bind_param call now provides exactly 10 variables
// to match the 10 '?' placeholders in the SQL query.

$stmt_line->bind_param(
    "siisdsiisd",  // Corrected: 10 characters for 10 variables
    // Parameters for the Debit entry
    $company_id, 
    $user_id, 
    $jv_id, 
    $sales_return_account, 
    $total_amount, 
    // Parameters for the Credit entry
    $company_id, 
    $user_id, 
    $jv_id, 
    $accounts_receivable_account, 
    $total_amount
);

if (!$stmt_line->execute()) {
    // The new error message points here, so check your column names if it fails again
    throw new Exception("Journal lines execute failed: " . $stmt_line->error);
}

if ($stmt_line->affected_rows !== 2) {
    throw new Exception("Expected 2 journal lines to be inserted, but " . $stmt_line->affected_rows . " were.");
}

$stmt_line->close();

// 5. Return stock to inventory
    $sql_stock = "UPDATE products SET quantity_on_hand = quantity_on_hand + ? WHERE id = ? AND company_id = ?";
    $stmt_stock = $conn->prepare($sql_stock);
    if (!$stmt_stock) throw new Exception("Stock update prepare failed: " . $conn->error);
    foreach ($items as $item) {
        $prod_id = filter_var($item->id ?? 0, FILTER_VALIDATE_INT);
        $qty_ret = (float)($item->quantity ?? 0);
        if ($prod_id > 0 && $qty_ret > 0) {
            $stmt_stock->bind_param("dis", $qty_ret, $prod_id, $company_id);
            if (!$stmt_stock->execute()) throw new Exception("Failed to update stock for product $prod_id");
        }
    }
    $stmt_stock->close();

  // 6. Update related invoice (if exists)
if ($related_invoice_id) {
    $sql_inv = "
        UPDATE sales_invoices 
        SET 
            amount_due = GREATEST(amount_due - ?, 0.00),
            status = CASE 
                WHEN amount_due - ? <= 0 THEN 'PAID' 
                ELSE status 
            END
        WHERE id = ? AND company_id = ?
    ";

    $stmt_inv = $conn->prepare($sql_inv);
    if (!$stmt_inv) {
        throw new Exception("Invoice update prepare failed: " . $conn->error);
    }

    // Bind: d (total_amount), d (total_amount again for CASE), i (id), s (company_id)
    $stmt_inv->bind_param("ddis", $total_amount, $total_amount, $related_invoice_id, $company_id);
    
    if (!$stmt_inv->execute()) {
        throw new Exception("Failed to update invoice: " . $stmt_inv->error);
    }

    $stmt_inv->close();
}

    $conn->commit();

    http_response_code(201);
    echo json_encode(["success" => true, "message" => "Credit note created and posted successfully", "credit_note_id" => $credit_note_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Transaction failed", "message" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>