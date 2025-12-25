<?php
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Company ID is required.']);
    exit;
}

$company_id = $_GET['company_id'];

$query = "
    SELECT 
        si.id, 
        si.invoice_number, 
        s.name as supplier_name, 
        si.invoice_date, 
        si.due_date, 
        si.total_amount, 
        si.status 
    FROM 
        supplier_invoices si
    JOIN 
        suppliers s ON si.supplier_id = s.id
    WHERE 
        si.company_id = ?
    ORDER BY 
        si.invoice_date DESC
";

$stmt = $mysqli->prepare($query);
$stmt->bind_param("s", $company_id);
$stmt->execute();
$result = $stmt->get_result();
$invoices = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if ($invoices) {
    echo json_encode($invoices);
} else {
    echo json_encode([]); // Return empty array if no invoices found
}

$mysqli->close();
