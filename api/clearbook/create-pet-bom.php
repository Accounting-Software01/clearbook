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
    !isset($data->bom_name) ||
    !isset($data->output_item_id) ||
    !isset($data->production_stage) ||
    !isset($data->components) ||
    !is_array($data->components)
) {
    http_response_code(400);
    echo json_encode(array("message" => "Incomplete data for BOM creation."));
    return;
}

$db->begin_transaction();

try {
    // 1. Insert into pet_boms
    $bom_query = "INSERT INTO pet_boms (company_id, bom_name, output_item_id, production_stage) VALUES (?, ?, ?, ?)";
    $bom_stmt = $db->prepare($bom_query);
    $bom_stmt->bind_param("ssis", $data->company_id, $data->bom_name, $data->output_item_id, $data->production_stage);
    
    if (!$bom_stmt->execute()) {
        throw new Exception("Failed to create BOM: " . $bom_stmt->error);
    }

    $pet_bom_id = $db->insert_id;

    // 2. Insert into pet_bom_components
    $comp_query = "INSERT INTO pet_bom_components (pet_bom_id, component_item_id, quantity_required) VALUES (?, ?, ?)";
    $comp_stmt = $db->prepare($comp_query);

    foreach ($data->components as $component) {
        if (!isset($component->component_item_id) || !isset($component->quantity_required)) {
            throw new Exception("Incomplete data for a component.");
        }
        $comp_stmt->bind_param("iid", $pet_bom_id, $component->component_item_id, $component->quantity_required);
        if (!$comp_stmt->execute()) {
            throw new Exception("Failed to add component: " . $comp_stmt->error);
        }
    }

    // Commit transaction
    $db->commit();

    http_response_code(201);
    echo json_encode(array("message" => "PET BOM created successfully.", "bom_id" => $pet_bom_id));

} catch (Exception $e) {
    $db->rollback();
    http_response_code(500);
    echo json_encode(array("message" => "BOM creation failed: " . $e->getMessage()));
}

?>