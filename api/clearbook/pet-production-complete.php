<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/db_connect.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->production_order_id) ||
    !isset($data->quantity_produced) ||
    !isset($data->company_id)
) {
    http_response_code(400);
    echo json_encode(array("message" => "Incomplete data. Required: production_order_id, quantity_produced, company_id"));
    return;
}

// Start transaction
$db->begin_transaction();

try {
    // 1. Get PET Order and BOM details
    $order_query = "SELECT pet_bom_id FROM pet_production_orders WHERE id = ? AND company_id = ?";
    $order_stmt = $db->prepare($order_query);
    // Corrected bind_param: production_order_id is int, company_id is string
    $order_stmt->bind_param("is", $data->production_order_id, $data->company_id);
    $order_stmt->execute();
    $order_result = $order_stmt->get_result();
    $order = $order_result->fetch_assoc();

    if (!$order) {
        throw new Exception("Production order not found.");
    }

    $bom_query = "SELECT output_item_id FROM pet_boms WHERE id = ?";
    $bom_stmt = $db->prepare($bom_query);
    $bom_stmt->bind_param("i", $order['pet_bom_id']);
    $bom_stmt->execute();
    $bom_result = $bom_stmt->get_result();
    $bom = $bom_result->fetch_assoc();

    if (!$bom) {
        throw new Exception("BOM not found for this order.");
    }
    
    $output_item_id = $bom['output_item_id'];

    // 2. Get BOM components
    $components_query = "SELECT component_item_id, quantity_required FROM pet_bom_components WHERE pet_bom_id = ?";
    $comp_stmt = $db->prepare($components_query);
    $comp_stmt->bind_param("i", $order['pet_bom_id']);
    $comp_stmt->execute();
    $components_result = $comp_stmt->get_result();
    
    $total_material_cost = 0;

    // 3. Consume input components
    while ($component = $components_result->fetch_assoc()) {
        $item_to_consume_query = "SELECT average_unit_cost, quantity_on_hand FROM raw_materials WHERE id = ? AND company_id = ? FOR UPDATE";
        $item_stmt = $db->prepare($item_to_consume_query);
        // Corrected bind_param: component_item_id is int, company_id is string
        $item_stmt->bind_param("is", $component['component_item_id'], $data->company_id);
        $item_stmt->execute();
        $item_result = $item_stmt->get_result();
        $item_to_consume = $item_result->fetch_assoc();

        if (!$item_to_consume) {
            throw new Exception("Component item with ID " . $component['component_item_id'] . " not found in inventory.");
        }

        $quantity_to_consume = $component['quantity_required'] * $data->quantity_produced;

        if ($item_to_consume['quantity_on_hand'] < $quantity_to_consume) {
            throw new Exception("Insufficient stock for component ID " . $component['component_item_id']);
        }

        $unit_cost_at_consumption = $item_to_consume['average_unit_cost'];
        $total_material_cost += $quantity_to_consume * $unit_cost_at_consumption;

        // Decrement stock
        $update_stock_query = "UPDATE raw_materials SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?";
        $update_stock_stmt = $db->prepare($update_stock_query);
        $update_stock_stmt->bind_param("di", $quantity_to_consume, $component['component_item_id']);
        $update_stock_stmt->execute();
    }

    // 4. Calculate cost of the output
    $cost_per_unit_produced = ($data->quantity_produced > 0) ? $total_material_cost / $data->quantity_produced : 0;

    // 5. Add output to inventory and update its cost
    $output_item_query = "SELECT average_unit_cost, quantity_on_hand FROM raw_materials WHERE id = ? AND company_id = ? FOR UPDATE";
    $output_item_stmt = $db->prepare($output_item_query);
    $output_item_stmt->bind_param("is", $output_item_id, $data->company_id);
    $output_item_stmt->execute();
    $output_item_result = $output_item_stmt->get_result();
    $current_output_item = $output_item_result->fetch_assoc();

    $old_qty = $current_output_item ? $current_output_item['quantity_on_hand'] : 0;
    $old_cost = $current_output_item ? $current_output_item['average_unit_cost'] : 0;

    // Increment stock
    $inc_stock_query = "UPDATE raw_materials SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?";
    $inc_stock_stmt = $db->prepare($inc_stock_query);
    $inc_stock_stmt->bind_param("di", $data->quantity_produced, $output_item_id);
    $inc_stock_stmt->execute();

    // Update average cost using weighted moving average
    $new_total_value = ($old_qty * $old_cost) + ($data->quantity_produced * $cost_per_unit_produced);
    $new_total_qty = $old_qty + $data->quantity_produced;
    $new_average_cost = ($new_total_qty > 0) ? $new_total_value / $new_total_qty : 0;

    $update_cost_query = "UPDATE raw_materials SET average_unit_cost = ? WHERE id = ?";
    $update_cost_stmt = $db->prepare($update_cost_query);
    $update_cost_stmt->bind_param("di", $new_average_cost, $output_item_id);
    $update_cost_stmt->execute();

    // 6. Finalize the PET order
    $finalize_order_query = "UPDATE pet_production_orders SET status = 'Completed', quantity_produced = ?, total_material_cost = ?, cost_per_unit_produced = ? WHERE id = ?";
    $finalize_stmt = $db->prepare($finalize_order_query);
    $finalize_stmt->bind_param("dddi", $data->quantity_produced, $total_material_cost, $cost_per_unit_produced, $data->production_order_id);
    $finalize_stmt->execute();

    // 7. Commit transaction
    $db->commit();

    http_response_code(200);
    echo json_encode(array(
        "message" => "Production order completed successfully.",
        "new_average_cost" => $new_average_cost
    ));

} catch (Exception $e) {
    $db->rollback();
    http_response_code(500);
    echo json_encode(array("message" => "Production completion failed: " . $e->getMessage()));
}

?>