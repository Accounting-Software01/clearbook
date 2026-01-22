<?php
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); 

// --- Input Validation ---
if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required.']);
    exit;
}

$company_id = $_GET['company_id'];
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100; // Default limit to 100 trail items

// This query creates a detailed trail by joining invoices, items, and customers.
$sql = "SELECT 
    si.invoice_number, 
    si.invoice_date, 
    c.customer_name,
    si.total_amount, 
    sii.item_name,
    sii.quantity,
    sii.unit_price,
    (sii.quantity * sii.unit_price) AS line_subtotal,
    si.status
FROM sales_invoices si
JOIN customers c 
    ON si.customer_id = c.customer_id
    AND si.company_id = c.company_id
JOIN sales_invoice_items sii 
    ON si.id = sii.invoice_id
    AND si.company_id = sii.company_id
WHERE si.company_id = ?
ORDER BY si.invoice_date DESC, si.id DESC, sii.id ASC
LIMIT ?
";

$trail_items = [];

try {
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param('si', $company_id, $limit);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $trail_items[] = $row;
    }

    $stmt->close();
    echo json_encode($trail_items);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database query failed", "details" => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}

exit();
?>
