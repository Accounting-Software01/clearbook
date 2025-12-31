<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

include_once 'db_connect.php';

$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(array("error" => "Company ID is required."));
    exit();
}

try {
    $sql = "SELECT si.id, si.invoice_number, si.invoice_date, si.due_date, c.name as customer_name, si.total_amount, si.amount_due, si.status FROM sales_invoices si JOIN customers c ON si.customer_id = c.id WHERE si.company_id = ? ORDER BY si.invoice_date DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$company_id]);
    
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($invoices);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Failed to fetch sales invoices.", "details" => $e->getMessage()));
}
?>
