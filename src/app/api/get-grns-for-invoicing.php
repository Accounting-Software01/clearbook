<?php
require_once 'db.php'; 

header('Content-Type: application/json');

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required']);
    exit;
}

// This query now includes a check to see if an invoice already exists for each GRN.
// It also fetches all necessary IDs for invoice creation.
$query = "
    SELECT 
        g.id, 
        g.grn_number, 
        g.received_date, 
        s.name as supplier_name, 
        po.po_number, 
        g.status,
        g.supplier_id,
        g.purchase_order_id,
        CASE WHEN si.id IS NOT NULL THEN 1 ELSE 0 END as is_invoiced 
    FROM goods_received_notes g
    JOIN suppliers s ON g.supplier_id = s.id
    JOIN purchase_orders po ON g.purchase_order_id = po.id
    LEFT JOIN supplier_invoices si ON g.id = si.grn_id AND si.company_id = g.company_id
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

$mysqli->close();
?>