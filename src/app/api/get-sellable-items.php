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
    $sql = "SELECT id, name, unit_cost as unit_price FROM inventory_items WHERE company_id = ? AND item_type = 'product'";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$company_id]);
    
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($items);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Failed to fetch sellable items.", "details" => $e->getMessage()));
}
?>
