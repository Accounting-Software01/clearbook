<?php
require_once __DIR__ . '/db_connect.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); 

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required.']);
    exit;
}

$company_id = $_GET['company_id'];

$sql = "SELECT id, invoice_id, item_name, quantity, total_price, created_at FROM sales_trail WHERE company_id = ? ORDER BY created_at DESC LIMIT 10";

if ($stmt = $conn->prepare($sql)) {
    $stmt->bind_param('s', $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $transactions = array();
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $transactions[] = $row;
        }
    }
    
    echo json_encode($transactions);
    $stmt->close();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $conn->error]);
}

$conn->close();
?>