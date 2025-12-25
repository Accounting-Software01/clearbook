<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Essential CORS headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://hariindustries.net'
    ];
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
    }
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/src/app/api/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed: " . ($conn->connect_error ?? 'Unknown error')]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

$company_id = $data['company_id'] ?? null;
$po_id = $data['purchase_order_id'] ?? null;
$grn_date = $data['grn_date'] ?? null;
$lines = $data['lines'] ?? [];

if (!$company_id || !$po_id || !$grn_date || empty($lines)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required parameters (company_id, purchase_order_id, grn_date, lines)."]);
    exit();
}

$conn->begin_transaction();

try {
    // Step 1: Get Purchase Order details (like supplier_id) to create the GRN header.
    $po_stmt = $conn->prepare("SELECT supplier_id FROM purchase_orders WHERE id = ? AND company_id = ?");
    $po_stmt->bind_param("is", $po_id, $company_id);
    $po_stmt->execute();
    $po_result = $po_stmt->get_result();
    if ($po_result->num_rows === 0) {
        throw new Exception("Purchase Order not found.");
    }
    $supplier_id = $po_result->fetch_assoc()['supplier_id'];
    $po_stmt->close();

    // Step 2: Create the main GRN record.
    // First, generate a unique GRN number.
    $grn_number_prefix = 'GRN-' . date('Ymd') . '-';
    $grn_number_stmt = $conn->prepare("SELECT COUNT(*) as count FROM goods_received_notes WHERE grn_number LIKE ? AND company_id = ?");
    $grn_number_search = $grn_number_prefix . '%';
    $grn_number_stmt->bind_param("ss", $grn_number_search, $company_id);
    $grn_number_stmt->execute();
    $grn_count = $grn_number_stmt->get_result()->fetch_assoc()['count'];
    $grn_number = $grn_number_prefix . str_pad($grn_count + 1, 4, '0', STR_PAD_LEFT);
    $grn_number_stmt->close();

    $grn_stmt = $conn->prepare("INSERT INTO goods_received_notes (grn_number, purchase_order_id, supplier_id, received_date, company_id, status) VALUES (?, ?, ?, ?, ?, 'Completed')");
    $grn_stmt->bind_param("siiss", $grn_number, $po_id, $supplier_id, $grn_date, $company_id);
    $grn_stmt->execute();
    $grn_id = $conn->insert_id;
    if ($grn_id === 0) {
        throw new Exception("Failed to create the Goods Received Note header.");
    }
    $grn_stmt->close();

    // Step 3: Loop through each received item to update inventory and records.
    $item_info_stmt = $conn->prepare("SELECT raw_material_id, quantity, quantity_received FROM purchase_order_items WHERE id = ?");
    $grn_item_stmt = $conn->prepare("INSERT INTO goods_received_note_items (grn_id, po_item_id, raw_material_id, quantity_received) VALUES (?, ?, ?, ?)");
    $update_po_item_stmt = $conn->prepare("UPDATE purchase_order_items SET quantity_received = quantity_received + ? WHERE id = ?");
    $update_stock_stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?");

    foreach ($lines as $line) {
        $po_item_id = $line['po_item_id'];
        $qty_received_now = $line['quantity_received'];

        // Get item details from the original PO to validate and get raw_material_id
        $item_info_stmt->bind_param("i", $po_item_id);
        $item_info_stmt->execute();
        $item_result = $item_info_stmt->get_result();
        if ($item_result->num_rows === 0) throw new Exception("PO item ID {$po_item_id} not found.");
        $item_row = $item_result->fetch_assoc();
        $raw_material_id = $item_row['raw_material_id'];
        
        // Validation: cannot receive more than what was ordered
        if ($qty_received_now > ($item_row['quantity'] - $item_row['quantity_received'])) {
            throw new Exception("Cannot receive more than ordered for item ID {$po_item_id}.");
        }

        // Add a line item to the GRN for tracking
        $grn_item_stmt->bind_param("iiid", $grn_id, $po_item_id, $raw_material_id, $qty_received_now);
        $grn_item_stmt->execute();

        // Update the received quantity on the original PO line item
        $update_po_item_stmt->bind_param("di", $qty_received_now, $po_item_id);
        $update_po_item_stmt->execute();

        // CRITICAL: Update the inventory level for the raw material
        $update_stock_stmt->bind_param("di", $qty_received_now, $raw_material_id);
        $update_stock_stmt->execute();
    }
    
    $item_info_stmt->close();
    $grn_item_stmt->close();
    $update_po_item_stmt->close();
    $update_stock_stmt->close();

    // Step 4: Update the overall status of the Purchase Order.
    $po_status_stmt = $conn->prepare("SELECT SUM(quantity) as total_ordered, SUM(quantity_received) as total_received FROM purchase_order_items WHERE purchase_order_id = ?");
    $po_status_stmt->bind_param("i", $po_id);
    $po_status_stmt->execute();
    $status_result = $po_status_stmt->get_result()->fetch_assoc();
    $new_po_status = ($status_result['total_received'] >= $status_result['total_ordered']) ? 'Completed' : 'Partially Received';
    $po_status_stmt->close();

    $update_po_status_stmt = $conn->prepare("UPDATE purchase_orders SET status = ? WHERE id = ?");
    $update_po_status_stmt->bind_param("si", $new_po_status, $po_id);
    $update_po_status_stmt->execute();
    $update_po_status_stmt->close();

    // All steps succeeded, so commit the transaction.
    $conn->commit();

    http_response_code(201); // 201 Created
    echo json_encode(["success" => true, "message" => "GRN created successfully.", "grn_id" => $grn_id]);

} catch (Exception $e) {
    // If any step failed, roll back all database changes.
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "GRN creation failed: " . $e->getMessage()
    ]);
}

$conn->close();
?>