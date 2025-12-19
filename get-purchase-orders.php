<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit();
}

try {
    // Main query to get purchase orders and supplier name
    $sql = "
        SELECT 
            po.id, 
            po.po_number, 
            po.order_date, 
            po.expected_delivery_date, 
            po.total_amount, 
            po.status,
            s.id as supplier_id,
            s.name as supplier_name
        FROM 
            purchase_orders po
        JOIN 
            suppliers s ON po.supplier_id = s.id
        WHERE 
            po.company_id = ?
        ORDER BY 
            po.order_date DESC, po.id DESC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $purchase_orders = [];
    while ($po = $result->fetch_assoc()) {
        // Sub-query to get lines for each purchase order
        $lineSql = "SELECT id, item_description, quantity, rate, total FROM purchase_order_lines WHERE purchase_order_id = ?";
        $lineStmt = $conn->prepare($lineSql);
        $lineStmt->bind_param("i", $po['id']);
        $lineStmt->execute();
        $linesResult = $lineStmt->get_result();
        $lines = [];
        while ($line = $linesResult->fetch_assoc()) {
            $lines[] = $line;
        }
        $lineStmt->close();

        // Structure the response object
        $purchase_orders[] = [
            'id' => $po['id'],
            'po_number' => $po['po_number'],
            'order_date' => $po['order_date'],
            'expected_delivery_date' => $po['expected_delivery_date'],
            'total_amount' => (float)$po['total_amount'],
            'status' => $po['status'],
            'supplier' => [
                'id' => $po['supplier_id'],
                'name' => $po['supplier_name']
            ],
            'lines' => $lines
        ];
    }

    $stmt->close();

    http_response_code(200);
    echo json_encode(['success' => true, 'purchase_orders' => $purchase_orders]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "An error occurred while fetching purchase orders.",
        "details" => $e->getMessage()
    ]);
}

$conn->close();
?>
