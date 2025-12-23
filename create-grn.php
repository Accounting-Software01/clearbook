<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->purchase_order_id) || !isset($data->lines) || !is_array($data->lines)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input data.']);
    exit();
}

$conn->begin_transaction();

try {
    // 1. Create GRN Header
    $grn_date = $data->grn_date ?? date('Y-m-d');
    // This is a placeholder for user ID, should be from session in a real app
    $created_by = 1; 
    $po_id = $data->purchase_order_id;

    // Generate GRN Number (e.g., GRN-YYYYMMDD-ID)
    // This is a simple way, a more robust method might be needed
    $grnSql = "INSERT INTO goods_received_notes (purchase_order_id, grn_number, grn_date, created_by) VALUES (?, '', ?, ?)";
    $grnStmt = $conn->prepare($grnSql);
    $grnStmt->bind_param("isi", $po_id, $grn_date, $created_by);
    $grnStmt->execute();
    $grn_id = $grnStmt->insert_id;
    $grnStmt->close();

    // Update GRN number
    $grn_number = 'GRN-' . date('Ymd') . '-' . $grn_id;
    $updateGrnNumSql = "UPDATE goods_received_notes SET grn_number = ? WHERE id = ?";
    $updateGrnNumStmt = $conn->prepare($updateGrnNumSql);
    $updateGrnNumStmt->bind_param("si", $grn_number, $grn_id);
    $updateGrnNumStmt->execute();
    $updateGrnNumStmt->close();

    // 2. Create GRN Items
    $grnItemSql = "INSERT INTO goods_received_note_items (grn_id, po_item_id, quantity_received) VALUES (?, ?, ?)";
    $grnItemStmt = $conn->prepare($grnItemSql);

    foreach ($data->lines as $line) {
        $grnItemStmt->bind_param("iid", $grn_id, $line->po_item_id, $line->quantity_received);
        $grnItemStmt->execute();
    }
    $grnItemStmt->close();

    // 3. Update Purchase Order Status
    // Check if all items are fully received
    $checkStatusSql = "SELECT 
        (SELECT SUM(quantity) FROM purchase_order_items WHERE purchase_order_id = ?) as total_ordered,
        (SELECT SUM(grni.quantity_received) 
         FROM goods_received_note_items grni
         JOIN purchase_order_items poi ON grni.po_item_id = poi.id
         WHERE poi.purchase_order_id = ?) as total_received";
    
    $statusStmt = $conn->prepare($checkStatusSql);
    $statusStmt->bind_param("ii", $po_id, $po_id);
    $statusStmt->execute();
    $statusResult = $statusStmt->get_result()->fetch_assoc();
    $statusStmt->close();

    $new_status = 'Partially Received';
    if ((float)$statusResult['total_received'] >= (float)$statusResult['total_ordered']) {
        $new_status = 'Closed'; // or 'Fully Received'
    }

    $updatePoSql = "UPDATE purchase_orders SET status = ? WHERE id = ?";
    $updatePoStmt = $conn->prepare($updatePoSql);
    $updatePoStmt->bind_param("si", $new_status, $po_id);
    $updatePoStmt->execute();
    $updatePoStmt->close();

    $conn->commit();

    http_response_code(201);
    echo json_encode(['success' => true, 'grn_id' => $grn_id, 'grn_number' => $grn_number, 'new_po_status' => $new_status]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to create Goods Received Note.',
        'details' => $e->getMessage()
    ]);
}

$conn->close();
?>