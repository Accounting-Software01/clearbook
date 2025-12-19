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
require_once __DIR__ . '/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

/************************************
 * INPUT VALIDATION
 ************************************/
$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->company_id) ||
    !isset($data->supplier_id) ||
    !isset($data->order_date) ||
    !isset($data->lines) ||
    !isset($data->created_by_user_id)
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Incomplete data. Required fields: company_id, supplier_id, order_date, lines, created_by_user_id"
    ]);
    exit();
}

if (!is_array($data->lines) || count($data->lines) === 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "A purchase order must have at least one line item."]);
    exit();
}

/************************************
 * DATA PREPARATION
 ************************************/
$company_id = trim($data->company_id);
$supplier_id = (int)$data->supplier_id;
$order_date = $data->order_date;
$expected_delivery_date = $data->expected_delivery_date ?? null;
$notes = $data->notes ?? null;
$user_id = (int)$data->created_by_user_id;

$subtotal = 0;
foreach ($data->lines as $line) {
    $quantity = (float)($line->quantity ?? 0);
    $rate = (float)($line->rate ?? 0);
    if ($quantity <= 0 || $rate < 0 || empty(trim($line->item_description))) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid line item found. All lines must have a description and a quantity greater than zero."]);
        exit();
    }
    $subtotal += $quantity * $rate;
}
$total_amount = $subtotal; // Assuming no tax for now

/************************************
 * DATABASE TRANSACTION
 ************************************/
$conn->begin_transaction();

try {
    // 1. Generate PO Number
    $year = date('Y');
    $seqSql = "SELECT MAX(CAST(SUBSTRING(po_number, 9) AS UNSIGNED)) as max_no FROM purchase_orders WHERE po_number LIKE ?";
    $like = 'PO-' . $year . '%';
    $seqStmt = $conn->prepare($seqSql);
    $seqStmt->bind_param("s", $like);
    $seqStmt->execute();
    $res = $seqStmt->get_result()->fetch_assoc();
    $seqStmt->close();
    $nextNo = ($res['max_no'] ?? 0) + 1;
    $po_number = 'PO-' . $year . '-' . str_pad($nextNo, 5, '0', STR_PAD_LEFT);

    // 2. Insert Purchase Order Header
    $poSql = "INSERT INTO purchase_orders (company_id, po_number, supplier_id, order_date, expected_delivery_date, subtotal, total_amount, status, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)";
    $poStmt = $conn->prepare($poSql);
    $poStmt->bind_param(
        "ssissddsi",
        $company_id,
        $po_number,
        $supplier_id,
        $order_date,
        $expected_delivery_date,
        $subtotal,
        $total_amount,
        $notes,
        $user_id
    );
    $poStmt->execute();
    $poId = $poStmt->insert_id;
    $poStmt->close();

    // 3. Insert Purchase Order Lines
    $lineSql = "INSERT INTO purchase_order_lines (purchase_order_id, item_description, quantity, rate, total) VALUES (?, ?, ?, ?, ?)";
    $lineStmt = $conn->prepare($lineSql);

    foreach ($data->lines as $line) {
        $quantity = (float)$line->quantity;
        $rate = (float)$line->rate;
        $line_total = $quantity * $rate;
        $lineStmt->bind_param(
            "isddd",
            $poId,
            $line->item_description,
            $quantity,
            $rate,
            $line_total
        );
        $lineStmt->execute();
    }
    $lineStmt->close();

    // 4. Commit Transaction
    $conn->commit();

    // 5. Fetch Created PO for Response (Optional but good practice)
    $selectSql = "SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ?";
    $finalStmt = $conn->prepare($selectSql);
    $finalStmt->bind_param("i", $poId);
    $finalStmt->execute();
    $createdPo = $finalStmt->get_result()->fetch_assoc();
    $finalStmt->close();

    // Respond
    http_response_code(201);
    echo json_encode([
        "success" => true, 
        "message" => "Purchase Order created successfully.",
        "purchase_order" => $createdPo
    ]);

} catch (Throwable $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to create purchase order due to a server error.",
        "details" => $e->getMessage()
    ]);
}

$conn->close();
?>
