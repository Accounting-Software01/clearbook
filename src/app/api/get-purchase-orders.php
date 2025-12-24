<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}

// Using empty() for a more robust check, as hinted from other files.
if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID is required.']);
    exit();
}
$company_id = $_GET['company_id'];

if (isset($_GET['id'])) {
    // Fetch a single purchase order with its items
    $po_id = (int)$_GET['id'];
    
    try {
        $headerSql = "SELECT po.*, s.name as supplier_name 
                      FROM purchase_orders po 
                      JOIN suppliers s ON po.supplier_id = s.id 
                      WHERE po.id = ? AND po.company_id = ?";
        $headerStmt = $conn->prepare($headerSql);
        $headerStmt->bind_param("is", $po_id, $company_id);
        $headerStmt->execute();
        $headerResult = $headerStmt->get_result();
        $poHeader = $headerResult->fetch_assoc();
        
        if ($poHeader) {
            $itemsSql = "SELECT * FROM purchase_order_items WHERE purchase_order_id = ?";
            $itemsStmt = $conn->prepare($itemsSql);
            $itemsStmt->bind_param("i", $po_id);
            $itemsStmt->execute();
            $itemsResult = $itemsStmt->get_result();
            $poHeader['items'] = $itemsResult->fetch_all(MYSQLI_ASSOC);
            $itemsStmt->close();

            echo json_encode($poHeader);
        } else {
            http_response_code(404);
            // Provide a more specific error when the item isn't found for the given company
            echo json_encode(['success' => false, 'error' => 'Purchase Order not found or does not belong to the specified company.']);
        }
        $headerStmt->close();

    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error fetching single PO: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'An internal server error occurred while fetching purchase order details.']);
    }

} else {
    // Fetch all purchase orders for the company
    try {
        $sql = "SELECT po.id, po.po_number, po.po_date, po.expected_delivery_date, po.total_amount, po.status, s.id as supplier_id, s.name as supplier_name
                FROM purchase_orders po
                JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.company_id = ?
                ORDER BY po.po_date DESC, po.id DESC";
    
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $purchaseOrders = $result->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode($purchaseOrders);
        $stmt->close();

    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error fetching all POs: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => 'An internal server error occurred while fetching purchase orders.']);
    }
}

$conn->close();
?>
