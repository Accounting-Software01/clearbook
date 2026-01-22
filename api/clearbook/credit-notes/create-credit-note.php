<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../db_connect.php';

// --- CORS & Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Logic ---
$data = json_decode(file_get_contents("php://input"));

// Basic validation
if (empty($data->company_id) || empty($data->user_id) || empty($data->customerId) || empty($data->items)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required fields."]);
    exit;
}

// CORRECTED: Sanitize user_id as a string
$company_id = filter_var($data->company_id, FILTER_SANITIZE_STRING);
$user_id = filter_var($data->user_id, FILTER_SANITIZE_STRING); 
$customer_id = filter_var($data->customerId, FILTER_VALIDATE_INT);
$credit_note_date = filter_var($data->creditNoteDate, FILTER_SANITIZE_STRING);
$related_invoice_id = isset($data->invoiceId) ? filter_var($data->invoiceId, FILTER_VALIDATE_INT) : null;
$reason = filter_var($data->reason, FILTER_SANITIZE_STRING);
$notes = filter_var($data->notes, FILTER_SANITIZE_STRING);
$terms = filter_var($data->terms, FILTER_SANITIZE_STRING);
$items = $data->items;

// ... (Generate Credit Note Number logic remains the same)
$cn_prefix = 'CN-';
$sql_last_cn = "SELECT credit_note_number FROM credit_notes WHERE company_id = ? ORDER BY id DESC LIMIT 1";
$stmt_last_cn = $conn->prepare($sql_last_cn);
$stmt_last_cn->bind_param("s", $company_id);
$stmt_last_cn->execute();
$result_last_cn = $stmt_last_cn->get_result();
if ($last_cn_row = $result_last_cn->fetch_assoc()) {
    $last_number = (int) str_replace($cn_prefix, '', $last_cn_row['credit_note_number']);
    $new_number = $last_number + 1;
} else {
    $new_number = 1;
}
$credit_note_number = $cn_prefix . str_pad($new_number, 5, '0', STR_PAD_LEFT);
$stmt_last_cn->close();

// Backend Calculation remains the same...
$subtotal = 0;
$total_tax = 0;
$total_discount = 0;

foreach ($items as $item) {
    $quantity = (float)$item->quantity;
    $unit_price = (float)$item->unit_price;
    $discount = isset($item->discount) ? (float)$item->discount : 0;
    $tax_rate = isset($item->tax_rate) ? (float)$item->tax_rate : 0;
    
    $line_subtotal = $quantity * $unit_price;
    $line_tax = ($line_subtotal - $discount) * ($tax_rate / 100);

    $subtotal += $line_subtotal;
    $total_tax += $line_tax;
    $total_discount += $discount;
}
$total_amount = $subtotal - $total_discount + $total_tax;

$conn->begin_transaction();

try {
    // Insert into credit_notes table
    // CORRECTED: The bind_param type for user_id is now 's' for string.
    $sql_cn = "INSERT INTO credit_notes (company_id, customer_id, created_by_id, credit_note_number, credit_note_date, related_invoice_id, reason, notes, terms_and_conditions, subtotal, total_tax, total_discount, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')";
    $stmt_cn = $conn->prepare($sql_cn);
    $stmt_cn->bind_param("sisssssssdddd", $company_id, $customer_id, $user_id, $credit_note_number, $credit_note_date, $related_invoice_id, $reason, $notes, $terms, $subtotal, $total_tax, $total_discount, $total_amount);
    
    if (!$stmt_cn->execute()) {
        throw new Exception("Failed to create credit note: " . $stmt_cn->error);
    }
    
    $credit_note_id = $stmt_cn->insert_id;
    $stmt_cn->close();

    // Insert into credit_note_items table (remains the same)
    $sql_item = "INSERT INTO credit_note_items (credit_note_id, item_id, item_name, quantity, unit_price, discount, tax_rate, tax_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt_item = $conn->prepare($sql_item);

    foreach ($items as $item) {
        $item_id = isset($item->id) ? filter_var($item->id, FILTER_VALIDATE_INT) : null;
        $item_name = filter_var($item->item_name, FILTER_SANITIZE_STRING);
        $quantity = (float)$item->quantity;
        $unit_price = (float)$item->unit_price;
        $discount = isset($item->discount) ? (float)$item->discount : 0;
        $tax_rate = isset($item->tax_rate) ? (float)$item->tax_rate : 0;
        
        $line_subtotal = $quantity * $unit_price;
        $tax_amount = ($line_subtotal - $discount) * ($tax_rate / 100);
        $line_total = $line_subtotal - $discount + $tax_amount;

        $stmt_item->bind_param("iisdddddd", $credit_note_id, $item_id, $item_name, $quantity, $unit_price, $discount, $tax_rate, $tax_amount, $line_total);
        
        if(!$stmt_item->execute()){
             throw new Exception("Failed to save item: " . $stmt_item->error);
        }
    }
    $stmt_item->close();

    $conn->commit();
    
    http_response_code(201);
    echo json_encode(["success" => true, "message" => "Credit Note created successfully as draft.", "credit_note_id" => $credit_note_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Internal Server Error", "details" => $e->getMessage()]);
} finally {
    $conn->close();
}
