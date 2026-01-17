<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$company_id = $_GET['company_id'] ?? null;
$customer_id = $_GET['customer_id'] ?? null;

if (!$company_id || !$customer_id) {
    http_response_code(400);
    echo json_encode(['error' => 'company_id and customer_id are required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT id, invoice_number, invoice_date, total_amount, amount_due
        FROM sales_invoices 
        WHERE company_id = ? AND customer_id = ? AND status NOT IN ('PAID', 'CANCELLED')
        ORDER BY invoice_date DESC
    ");
    $stmt->execute([$company_id, $customer_id]);
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($invoices);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
