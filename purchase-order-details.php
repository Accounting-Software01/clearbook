<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

if (!isset($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Purchase Order ID is required.']);
    exit();
}

$po_id = (int)$_GET['id'];

$conn->begin_transaction();

try {
    // Fetch PO Header
    $headerSql = "SELECT po.*, s.name as supplier_name 
                  FROM purchase_orders po 
                  JOIN suppliers s ON po.supplier_id = s.id 
                  WHERE po.id = ?";
    $headerStmt = $conn->prepare($headerSql);
    $headerStmt->bind_param("i", $po_id);
    $headerStmt->execute();
    $headerResult = $headerStmt->get_result();
    $poHeader = $headerResult->fetch_assoc();
    $headerStmt->close();

    if (!$poHeader) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Purchase Order not found.']);
        $conn->rollback();
        exit();
    }

    // Fetch PO Lines
    $linesSql = "SELECT *, 
                 (SELECT SUM(quantity_received) FROM goods_received_note_items WHERE po_item_id = poi.id) as quantity_received
                 FROM purchase_order_items poi 
                 WHERE poi.purchase_order_id = ?";
    $linesStmt = $conn->prepare($linesSql);
    $linesStmt->bind_param("i", $po_id);
    $linesStmt->execute();
    $linesResult = $linesStmt->get_result();
    $poLines = $linesResult->fetch_all(MYSQLI_ASSOC);
    $linesStmt->close();

    $poHeader['lines'] = $poLines;

    $conn->commit();

    http_response_code(200);
    echo json_encode($poHeader);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch purchase order details.',
        'details' => $e->getMessage()
    ]);
}

$conn->close();
?>