<?php
/************************************
 * ERROR REPORTING (DEV)
 ************************************/
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

/************************************
 * HEADERS
 ************************************/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * DB CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

/************************************
 * READ & VALIDATE INPUT
 ************************************/
$data = json_decode(file_get_contents("php://input"));

$required_fields = [
    'customer_id', 'invoice_date', 'due_date', 'sales_items',
    'total_amount', 'user_id', 'company_id'
];

foreach ($required_fields as $field) {
    if (!isset($data->$field)) {
        http_response_code(400);
        echo json_encode([ "success" => false, "error" => "Incomplete data. Missing field: {$field}" ]);
        exit();
    }
}

if (count($data->sales_items) < 1) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'An invoice must have at least one item.']);
    exit();
}

/************************************
 * EXTRACT DATA
 ************************************/
$customer_id = $data->customer_id;
$invoice_date = $data->invoice_date;
$due_date = $data->due_date;
$narration = $data->narration ?? 'Sale';
$sales_items = $data->sales_items;
$total_amount = (float)$data->total_amount;
$user_id = (int)$data->user_id;
$company_id = $data->company_id;

// --- ACCOUNT MAPPING (IMPORTANT!) ---
// These should be configurable in a settings table in the future.
$accounts_receivable_id = '1201'; // Default for "Accounts Receivable"
$sales_revenue_id = '4101';       // Default for "Sales Revenue"

/************************************
 * START TRANSACTION
 ************************************/
$conn->begin_transaction();

try {
    // 1. GENERATE INVOICE NUMBER
    $year_month = date('Ym');
    $inv_sql = "SELECT MAX(CAST(SUBSTRING(invoice_number, 9) AS UNSIGNED)) as max_no FROM sales_invoices WHERE invoice_number LIKE ?";
    $like_pattern = "INV-{$year_month}-%";
    $inv_stmt = $conn->prepare($inv_sql);
    $inv_stmt->bind_param("s", $like_pattern);
    $inv_stmt->execute();
    $res = $inv_stmt->get_result()->fetch_assoc();
    $inv_stmt->close();
    $next_no = ($res['max_no'] ?? 0) + 1;
    $invoice_number = "INV-{$year_month}-" . str_pad($next_no, 4, '0', STR_PAD_LEFT);

    // 2. INSERT INVOICE HEADER
    $inv_header_sql = "INSERT INTO sales_invoices (invoice_number, customer_id, invoice_date, due_date, total_amount, narration, company_id, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    $header_stmt = $conn->prepare($inv_header_sql);
    $header_stmt->bind_param('ssssdsis', $invoice_number, $customer_id, $invoice_date, $due_date, $total_amount, $narration, $company_id, $user_id);
    $header_stmt->execute();
    $invoice_id = $header_stmt->insert_id;
    $header_stmt->close();

    // 3. INSERT INVOICE ITEMS
    $inv_items_sql = "INSERT INTO sales_invoice_items (invoice_id, item_id, description, quantity, unit_price, company_id) VALUES (?, ?, ?, ?, ?, ?)";
    $items_stmt = $conn->prepare($inv_items_sql);
    foreach ($sales_items as $item) {
        $items_stmt->bind_param('issdds', $invoice_id, $item->item_id, $item->item_name, $item->quantity, $item->unit_price, $company_id);
        $items_stmt->execute();
    }
    $items_stmt->close();

    // 4. POST TO JOURNAL
    require_once __DIR__ . '/post_to_journal.php';
    $journal_narration = "Sale to customer; Invoice #{$invoice_number}";
    $journal_lines = [
        [
            "accountId" => $accounts_receivable_id,
            "debit" => $total_amount,
            "credit" => 0
        ],
        [
            "accountId" => $sales_revenue_id,
            "debit" => 0,
            "credit" => $total_amount
        ]
    ];

    $journal_result = postToJournal(
        $conn, $company_id, $user_id, $invoice_date,
        $journal_narration, $journal_lines
    );

    if (!$journal_result['success']) {
        throw new Exception("Failed to post to journal: " . $journal_result['error'] ?? 'Unknown error from postToJournal');
    }
    
    $voucher_id = $journal_result['voucher_id'];

    // 5. Link Journal Voucher to Invoice
    $link_sql = "UPDATE sales_invoices SET journal_voucher_id = ? WHERE id = ?";
    $link_stmt = $conn->prepare($link_sql);
    $link_stmt->bind_param("ii", $voucher_id, $invoice_id);
    $link_stmt->execute();
    $link_stmt->close();

    // 6. COMMIT TRANSACTION
    $conn->commit();

    // 7. PREPARE RESPONSE
    // In a real app, you would fetch the full invoice details to return.
    // For now, construct a minimal response.
    $customer_name = "Customer"; // Fetch if needed
    $response_invoice = [
        'id' => (string)$invoice_id,
        'invoice_number' => $invoice_number,
        'customer_id' => $customer_id,
        'customer_name' => $customer_name,
        'invoice_date' => $invoice_date,
        'due_date' => $due_date,
        'total_amount' => $total_amount,
        'amount_due' => $total_amount, // Initially, full amount is due
        'status' => 'Unpaid',
        'previous_balance' => 0, // Placeholder, needs logic to calculate
        'current_invoice_balance' => $total_amount,
        'total_balance' => $total_amount, // Placeholder
    ];

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "invoice_id" => $invoice_id,
        "invoice_number" => $invoice_number,
        "journal_voucher_id" => $voucher_id,
        "invoice" => $response_invoice
    ]);

} catch (Throwable $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to create sales invoice.",
        "details" => $e->getMessage(),
        "line" => $e->getLine(),
        "file" => $e->getFile()
    ]);
}

/************************************
 * CLOSE CONNECTION
 ************************************/
$conn->close();
?>