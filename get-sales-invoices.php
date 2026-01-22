<?php
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json');
// Allow cross-origin requests
header("Access-Control-Allow-Origin: *"); 

// --- Input Validation ---
if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required.']);
    exit;
}

$company_id = $_GET['company_id'];
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 15; // Default limit to 15


$sql = "SELECT 
            si.id, 
            si.invoice_number, 
            si.invoice_date, 
            si.due_date, 
            c.customer_name as customer_name, 
            si.total_amount,
            si.amount_due,
            si.status
        FROM sales_invoices si
        LEFT JOIN customers c ON si.customer_id = c.customer_id COLLATE latin1_swedish_ci AND si.company_id = c.company_id COLLATE latin1_swedish_ci
        WHERE si.company_id = ? 
        ORDER BY si.invoice_date DESC, si.id DESC 
        LIMIT ?";

$invoices = [];

try {
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param('si', $company_id, $limit);
    $stmt->execute();
    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $invoices[] = $row;
    }

    $stmt->close();
    echo json_encode($invoices);

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
