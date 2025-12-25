<?php
require_once 'api.php';
require_once 'db.php'; // Ensures a $mysqli connection is available

// Set the content type to JSON
header('Content-Type: application/json');

// Get company_id from query parameters, which is required for all queries.
$company_id = $_GET['company_id'] ?? null;
if (!$company_id) {
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'company_id is required.']);
    exit;
}

// Get grn_id from query parameters. If it exists, we fetch a single GRN.
$grn_id = $_GET['id'] ?? null;

$response = [];

try {
    if ($grn_id) {
        // Fetch a single GRN with its items
        $stmt = $mysqli->prepare(
            "SELECT g.id, g.grn_number, g.received_date, s.name as supplier_name, po.po_number " .
            "FROM goods_received_notes g " .
            "JOIN suppliers s ON g.supplier_id = s.id " .
            "JOIN purchase_orders po ON g.purchase_order_id = po.id " .
            "WHERE g.id = ? AND g.company_id = ?"
        );
        $stmt->bind_param("is", $grn_id, $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $grn = $result->fetch_assoc();

        if ($grn) {
            $item_stmt = $mysqli->prepare(
                "SELECT i.id, i.quantity_received, rm.name as raw_material_name, poi.description " .
                "FROM goods_received_note_items i " .
                "JOIN raw_materials rm ON i.raw_material_id = rm.id " .
                "JOIN purchase_order_items poi ON i.po_item_id = poi.id " .
                "WHERE i.grn_id = ? AND i.company_id = ?"
            );
            $item_stmt->bind_param("is", $grn_id, $company_id);
            $item_stmt->execute();
            $items_result = $item_stmt->get_result();
            $items = [];
            while ($row = $items_result->fetch_assoc()) {
                $items[] = $row;
            }
            $grn['items'] = $items;
            $response['grn'] = $grn;
        } else {
            http_response_code(404); // Not Found
            $response = ['status' => 'error', 'message' => 'GRN not found.'];
        }
    } else {
        // Fetch a list of all GRNs for the company
        $stmt = $mysqli->prepare(
            "SELECT g.id, g.grn_number, g.received_date, s.name as supplier_name, po.po_number, g.status " .
            "FROM goods_received_notes g " .
            "JOIN suppliers s ON g.supplier_id = s.id " .
            "JOIN purchase_orders po ON g.purchase_order_id = po.id " .
            "WHERE g.company_id = ? ORDER BY g.received_date DESC"
        );
        $stmt->bind_param("s", $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $grns = [];
        while ($row = $result->fetch_assoc()) {
            $grns[] = $row;
        }
        $response['grns'] = $grns;
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred while fetching data: ' . $e->getMessage()
    ]);
}

$mysqli->close();
