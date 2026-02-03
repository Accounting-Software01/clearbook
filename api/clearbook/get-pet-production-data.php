<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

$database = new Database();
$db = $database->getConnection();

$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : die();

$output = [
    'items' => [],
    'boms' => [],
    'orders' => []
];

try {
    // 1. Fetch relevant inventory items from raw_materials table
    $items_query = "SELECT id, name, item_type, quantity_on_hand, average_unit_cost as unit_cost FROM raw_materials WHERE company_id = ? AND item_type IN ('raw_material', 'semi_finished', 'product')";
    $items_stmt = $db->prepare($items_query);
    $items_stmt->bind_param("s", $company_id);
    $items_stmt->execute();
    $items_result = $items_stmt->get_result();
    while($row = $items_result->fetch_assoc()) {
        $output['items'][] = $row;
    }

    // 2. Fetch PET BOMs and their components, joining with raw_materials
    $boms_query = "SELECT pb.id, pb.bom_name, pb.output_item_id, i.name as output_item_name, pb.production_stage FROM pet_boms pb JOIN raw_materials i ON pb.output_item_id = i.id WHERE pb.company_id = ?";
    $boms_stmt = $db->prepare($boms_query);
    $boms_stmt->bind_param("s", $company_id);
    $boms_stmt->execute();
    $boms_result = $boms_stmt->get_result();
    $boms_map = [];
    while($row = $boms_result->fetch_assoc()) {
        $row['components'] = [];
        $boms_map[$row['id']] = $row;
    }

    $components_query = "SELECT pbc.pet_bom_id, pbc.component_item_id, i.name as component_item_name, pbc.quantity_required FROM pet_bom_components pbc JOIN raw_materials i ON pbc.component_item_id = i.id JOIN pet_boms pb ON pbc.pet_bom_id = pb.id WHERE pb.company_id = ?";
    $comp_stmt = $db->prepare($components_query);
    $comp_stmt->bind_param("s", $company_id);
    $comp_stmt->execute();
    $comp_result = $comp_stmt->get_result();
    while($row = $comp_result->fetch_assoc()) {
        if (isset($boms_map[$row['pet_bom_id']])) {
            $boms_map[$row['pet_bom_id']]['components'][] = $row;
        }
    }
    $output['boms'] = array_values($boms_map);

    // 3. Fetch PET Production Orders
    $orders_query = "SELECT ppo.id, ppo.pet_bom_id, pb.bom_name, ppo.order_date, ppo.quantity_to_produce, ppo.quantity_produced, ppo.status, ppo.cost_per_unit_produced FROM pet_production_orders ppo JOIN pet_boms pb ON ppo.pet_bom_id = pb.id WHERE ppo.company_id = ? ORDER BY ppo.order_date DESC";
    $orders_stmt = $db->prepare($orders_query);
    $orders_stmt->bind_param("s", $company_id);
    $orders_stmt->execute();
    $orders_result = $orders_stmt->get_result();
    while($row = $orders_result->fetch_assoc()) {
        $output['orders'][] = $row;
    }

    http_response_code(200);
    echo json_encode($output);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("message" => "Failed to fetch PET production data: " . $e->getMessage()));
}

?>