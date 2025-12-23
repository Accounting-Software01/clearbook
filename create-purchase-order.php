
<?php
/************************************
 * ERROR REPORTING
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
// Assuming db_connect.php sets up $conn
require_once 'src/app/api/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

/************************************
 * INPUT VALIDATION
 ************************************/
$data = json_decode(file_get_contents("php://input"));

$required_fields = [
    'company_id', 'supplier_id', 'po_date', 'currency', 'created_by', 'lines'
];
foreach ($required_fields as $field) {
    if (!isset($data->$field)) {
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "error" => "Incomplete data. Missing field: " . $field
        ]);
        exit();
    }
}

if (!is_array($data->lines) || count($data->lines) === 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "A purchase order must have at least one line item."]);
    exit();
}

/************************************
 * DATA PREPARATION
 ************************************/
$company_id = (int)$data->company_id;
$supplier_id = (int)$data->supplier_id;
$po_date = $data->po_date;
$expected_delivery_date = $data->expected_delivery_date ?? null;
$currency = $data->currency;
$payment_terms = $data->payment_terms ?? null;
$remarks = $data->remarks ?? null;
$created_by = (int)$data->created_by;
$status = 'Draft'; // Initial status

$total_subtotal = 0;
$total_vat = 0;
$grand_total = 0;

foreach ($data->lines as $line) {
    if (!isset($line->item_id) || !isset($line->quantity) || !isset($line->unit_price)) {
         http_response_code(400);
         echo json_encode(["success" => false, "error" => "Invalid line item. Each line must have item_id, quantity, and unit_price."]);
         exit();
    }
    $quantity = (float)$line->quantity;
    $unit_price = (float)$line->unit_price;
    
    $line_amount = $quantity * $unit_price;
    $vat_amount = 0;

    if (isset($line->vat_applicable) && $line->vat_applicable) {
        $vat_rate = isset($line->vat_rate) ? (float)$line->vat_rate : 0;
        $vat_amount = $line_amount * ($vat_rate / 100);
    }
    
    $line_total = $line_amount + $vat_amount;

    $total_subtotal += $line_amount;
    $total_vat += $vat_amount;
    $grand_total += $line_total;
}


/************************************
 * DATABASE TRANSACTION
 ************************************/
$conn->begin_transaction();

try {
    // 1. Generate PO Number
    $year = date('Y');
    $seqSql = "SELECT MAX(CAST(SUBSTRING(po_number, 9) AS UNSIGNED)) as max_no FROM purchase_orders WHERE company_id = ? AND po_number LIKE ?";
    $like = 'PO-' . $year . '%';
    $seqStmt = $conn->prepare($seqSql);
    $seqStmt->bind_param("is", $company_id, $like);
    $seqStmt->execute();
    $res = $seqStmt->get_result()->fetch_assoc();
    $seqStmt->close();
    $nextNo = ($res['max_no'] ?? 0) + 1;
    $po_number = 'PO-' . $year . '-' . str_pad($nextNo, 4, '0', STR_PAD_LEFT);

    // 2. Insert Purchase Order Header
    $poSql = "INSERT INTO purchase_orders 
              (company_id, po_number, supplier_id, po_date, expected_delivery_date, currency, payment_terms, subtotal, vat_total, total_amount, status, remarks, created_by) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $poStmt = $conn->prepare($poSql);
    $poStmt->bind_param(
        "isissssdddssi",
        $company_id,
        $po_number,
        $supplier_id,
        $po_date,
        $expected_delivery_date,
        $currency,
        $payment_terms,
        $total_subtotal,
        $total_vat,
        $grand_total,
        $status,
        $remarks,
        $created_by
    );
    $poStmt->execute();
    $poId = $poStmt->insert_id;
    $poStmt->close();

    // 3. Insert Purchase Order Items
    $itemSql = "INSERT INTO purchase_order_items 
                (purchase_order_id, item_id, description, quantity, unit_price, line_amount, vat_applicable, vat_rate, vat_amount, line_total) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $itemStmt = $conn->prepare($itemSql);

    foreach ($data->lines as $line) {
        $item_id = (int)$line->item_id;
        $description = $line->description ?? null;
        $quantity = (float)$line->quantity;
        $unit_price = (float)$line->unit_price;
        $line_amount = $quantity * $unit_price;
        
        $vat_applicable = (isset($line->vat_applicable) && $line->vat_applicable) ? 1 : 0;
        $vat_rate = ($vat_applicable) ? (float)($line->vat_rate ?? 0) : null;
        $vat_amount = ($vat_applicable) ? $line_amount * ($vat_rate / 100) : 0;

        $line_total = $line_amount + $vat_amount;

        $itemStmt->bind_param(
            "iisdddiddd",
            $poId,
            $item_id,
            $description,
            $quantity,
            $unit_price,
            $line_amount,
            $vat_applicable,
            $vat_rate,
            $vat_amount,
            $line_total
        );
        $itemStmt->execute();
    }
    $itemStmt->close();

    // 4. Commit Transaction
    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "success" => true, 
        "message" => "Purchase Order created successfully.",
        "po_id" => $poId,
        "po_number" => $po_number
    ]);

} catch (Throwable $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to create purchase order.",
        "details" => $e->getMessage()
    ]);
}

$conn->close();
?>
