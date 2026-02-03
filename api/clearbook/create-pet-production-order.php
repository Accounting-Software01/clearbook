<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->company_id) ||
    !isset($data->pet_bom_id) ||
    !isset($data->quantity_to_produce) ||
    !isset($data->order_date)
) {
    http_response_code(400);
    echo json_encode(array("message" => "Incomplete data. Required: company_id, pet_bom_id, quantity_to_produce, order_date"));
    return;
}

// Basic validation
if (empty($data->company_id) || empty($data->pet_bom_id) || !is_numeric($data->quantity_to_produce) || $data->quantity_to_produce <= 0) {
    http_response_code(400);
    echo json_encode(array("message" => "Invalid data provided for production order."));
    return;
}

try {
    $query = "INSERT INTO pet_production_orders (company_id, pet_bom_id, quantity_to_produce, order_date, status) VALUES (?, ?, ?, ?, 'Planned')";
    
    $stmt = $db->prepare($query);
    $stmt->bind_param("sids", $data->company_id, $data->pet_bom_id, $data->quantity_to_produce, $data->order_date);

    if ($stmt->execute()) {
        $new_order_id = $db->insert_id;
        http_response_code(201);
        echo json_encode(array("message" => "Production order created successfully.", "order_id" => $new_order_id));
    } else {
        throw new Exception("Database execution failed: " . $stmt->error);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Failed to create production order: " . $e->getMessage()));
}

?>