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
    $sql = "SELECT id, name, contact_person, email, phone, address FROM customers WHERE company_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$company_id]);
    
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($customers);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Failed to fetch customers.", "details" => $e->getMessage()));
}
?>
