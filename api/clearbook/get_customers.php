<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once 'db_connect.php';

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['error' => 'company_id is required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, customer_name FROM customers WHERE company_id = ? AND status = 'Active' ORDER BY customer_name ASC");
    $stmt->execute([$company_id]);
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($customers);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
