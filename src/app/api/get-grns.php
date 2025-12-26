
<?php
require_once 'db.php'; // Assuming this connects to your database ($mysqli)

header('Content-Type: application/json');

$company_id = $_GET['company_id'] ?? null;
$grn_id = $_GET['id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required']);
    exit;
}

if ($grn_id) {
    // --- Fetch a Single GRN with Details ---
    getSingleGrnDetails($mysqli, $company_id, $grn_id);
} else {
    // --- Fetch a List of GRNs ---
    getGrnList($mysqli, $company_id);
}

$mysqli->close();

/**
 * Fetches the main list of all GRNs for the company.
 */
function getGrnList($mysqli, $company_id) {
    $query = "
        SELECT 
            g.id, 
            g.grn_number, 
            g.received_date, 
            s.name as supplier_name, 
            po.po_number, 
            g.status
        FROM goods_received_notes g
        JOIN suppliers s ON g.supplier_id = s.id
        JOIN purchase_orders po ON g.purchase_order_id = po.id
        WHERE g.company_id = ?
        ORDER BY g.received_date DESC
    ";
    
    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $grns = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo json_encode(['grns' => $grns]);
}

/**
 * Fetches all details for a specific GRN, including its items
 * and checks if an invoice has already been created for it.
 */
function getSingleGrnDetails($mysqli, $company_id, $grn_id) {
    // Main GRN details query
    $query = "
        SELECT 
            g.id, 
            g.grn_number, 
            g.received_date, 
            s.name as supplier_name, 
            po.po_number, 
            g.supplier_id,                 -- Added for invoice creation
            g.purchase_order_id,           -- Added for invoice creation
            CASE WHEN si.id IS NOT NULL THEN 1 ELSE 0 END as is_invoiced -- Check if invoice exists
        FROM goods_received_notes g
        JOIN suppliers s ON g.supplier_id = s.id
        JOIN purchase_orders po ON g.purchase_order_id = po.id
        LEFT JOIN supplier_invoices si ON g.id = si.grn_id AND si.company_id = g.company_id
        WHERE g.company_id = ? AND g.id = ?
    ";

    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("si", $company_id, $grn_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $grn = $result->fetch_assoc();
    $stmt->close();

    if (!$grn) {
        http_response_code(404);
        echo json_encode(['error' => 'GRN not found']);
        return;
    }

    // Query for GRN items
    $items_query = "
        SELECT 
            gri.id, 
            rm.name as raw_material_name, 
            poi.description,
            gri.quantity_received
        FROM goods_received_note_items gri
        JOIN raw_materials rm ON gri.raw_material_id = rm.id
        JOIN purchase_order_items poi ON gri.po_item_id = poi.id
        WHERE gri.grn_id = ?
    ";
    $items_stmt = $mysqli->prepare($items_query);
    $items_stmt->bind_param("i", $grn_id);
    $items_stmt->execute();
    $items_result = $items_stmt->get_result();
    $grn['items'] = $items_result->fetch_all(MYSQLI_ASSOC);
    $items_stmt->close();

    echo json_encode(['grn' => $grn]);
}
