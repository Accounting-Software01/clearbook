<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

if ($conn->connect_error) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data['company_id'], $data['purchase_order_id'], $data['grn_date'], $data['lines']) || empty($data['lines'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input. Required fields: company_id, purchase_order_id, grn_date, and a non-empty lines array.']);
    exit();
}

$company_id = $data['company_id'];
$po_id = $data['purchase_order_id'];
$grn_date = $data['grn_date'];
$received_lines = $data['lines'];

$conn->begin_transaction();

try {
    // 1. Create the GRN header
    $grn_number = ""; // We'll generate this
    $stmt_grn_num = $conn->prepare("SELECT MAX(CAST(SUBSTRING(grn_number, 5) AS UNSIGNED)) as max_grn FROM goods_received_notes WHERE company_id = ?");
    $stmt_grn_num->bind_param("s", $company_id);
    $stmt_grn_num->execute();
    $result = $stmt_grn_num->get_result()->fetch_assoc();
    $next_grn_num = ($result['max_grn'] ?? 0) + 1;
    $grn_number = 'GRN-' . str_pad($next_grn_num, 5, '0', STR_PAD_LEFT);
    $stmt_grn_num->close();

    $stmt_grn = $conn->prepare("INSERT INTO goods_received_notes (company_id, grn_number, purchase_order_id, grn_date, status) VALUES (?, ?, ?, ?, 'Completed')");
    $stmt_grn->bind_param("ssis", $company_id, $grn_number, $po_id, $grn_date);
    if (!$stmt_grn->execute()) throw new Exception("Failed to create GRN header: " . $stmt_grn->error);
    $grn_id = $conn->insert_id;
    $stmt_grn->close();

    $total_ordered = 0;
    $total_received_previously_and_now = 0;

    // 2. Insert GRN items and update PO item received quantities
    $stmt_grn_item = $conn->prepare("INSERT INTO grn_items (grn_id, po_item_id, quantity_received) VALUES (?, ?, ?)");
    $stmt_update_po_item = $conn->prepare("UPDATE purchase_order_items SET quantity_received = quantity_received + ? WHERE id = ?");
    
    foreach ($received_lines as $line) {
        $po_item_id = $line['po_item_id'];
        $qty_received_now = $line['quantity_received'];

        // Insert into grn_items
        $stmt_grn_item->bind_param("iid", $grn_id, $po_item_id, $qty_received_now);
        if (!$stmt_grn_item->execute()) throw new Exception("Failed to create GRN item: " . $stmt_grn_item->error);

        // Update purchase_order_items
        $stmt_update_po_item->bind_param("di", $qty_received_now, $po_item_id);
        if (!$stmt_update_po_item->execute()) throw new Exception("Failed to update PO item quantity: " . $stmt_update_po_item->error);
    }
    $stmt_grn_item->close();
    $stmt_update_po_item->close();

    // 3. Update the overall PO status
    $stmt_check_po = $conn->prepare(
        "SELECT SUM(poi.quantity) as total_ordered, SUM(poi.quantity_received) as total_received 
         FROM purchase_order_items poi 
         WHERE poi.purchase_order_id = ?"
    );
    $stmt_check_po->bind_param("i", $po_id);
    $stmt_check_po->execute();
    $po_totals = $stmt_check_po->get_result()->fetch_assoc();
    $stmt_check_po->close();

    $new_po_status = 'Partially Received';
    if ($po_totals['total_received'] >= $po_totals['total_ordered']) {
        $new_po_status = 'Completed';
    }

    $stmt_update_po = $conn->prepare("UPDATE purchase_orders SET status = ? WHERE id = ?");
    $stmt_update_po->bind_param("si", $new_po_status, $po_id);
    if (!$stmt_update_po->execute()) throw new Exception("Failed to update PO status: " . $stmt_update_po->error);
    $stmt_update_po->close();

    $conn->commit();
    echo json_encode(['success' => true, 'grn_id' => $grn_id, 'grn_number' => $grn_number]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    error_log("GRN Creation Failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Transaction failed: ' . $e->getMessage()]);
}

$conn->close();
?>
