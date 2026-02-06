<?php
// api/clearbook/get-pet-material-flow-report.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/db_connect.php';

if ($conn === null) {
    http_response_code(500);
    echo json_encode(["message" => "Database connection failed."]);
    exit();
}

$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : '';
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';

if (empty($company_id) || empty($start_date) || empty($end_date)) {
    http_response_code(400);
    echo json_encode(["message" => "Missing required parameters: company_id, start_date, and end_date."]);
    exit();
}

try {
    $orders_sql = "
        SELECT 
            ppo.id,
            ppo.order_date,
            ppo.pet_bom_id,
            pb.bom_name,
            rm.name as output_item_name,
            ppo.quantity_to_produce, 
            ppo.quantity_produced,   
            ppo.quantity_defective,  
            ppo.cost_per_unit_produced
        FROM pet_production_orders ppo
        JOIN pet_boms pb ON ppo.pet_bom_id = pb.id
        JOIN raw_materials rm ON pb.output_item_id = rm.id
        WHERE ppo.company_id = ? 
        AND ppo.status = 'Completed'
        AND ppo.order_date BETWEEN ? AND ?
        ORDER BY ppo.order_date DESC
    ";

    $stmt = $conn->prepare($orders_sql);
    if ($stmt === false) {
        throw new Exception("Prepare failed (orders_sql): " . $conn->error);
    }
    $stmt->bind_param("sss", $company_id, $start_date, $end_date);
    $stmt->execute();
    $orders_result = $stmt->get_result();

    $report_data = [];

    $components_sql = "
        SELECT 
            pbc.component_item_id,
            rm.name as component_name,
            pbc.quantity_required,
            rm.unit_of_measure
        FROM pet_bom_components pbc
        JOIN raw_materials rm ON pbc.component_item_id = rm.id
        WHERE pbc.pet_bom_id = ?
    ";
    $comp_stmt = $conn->prepare($components_sql);
    if ($comp_stmt === false) {
        throw new Exception("Prepare failed (components_sql): " . $conn->error);
    }

    while ($order = $orders_result->fetch_assoc()) {
        $actual_good_qty = (float)$order['quantity_produced'];
        $actual_defective_qty = (float)$order['quantity_defective'];
        $total_output = $actual_good_qty + $actual_defective_qty;
        $cost_per_good_unit = (float)$order['cost_per_unit_produced'];

        $total_material_cost_for_order = $cost_per_good_unit * $actual_good_qty;

        $cost_per_single_total_unit = ($total_output > 0) ? $total_material_cost_for_order / $total_output : 0;
        $value_of_loss = $cost_per_single_total_unit * $actual_defective_qty;

        $comp_stmt->bind_param("i", $order['pet_bom_id']);
        $comp_stmt->execute();
        $components_result = $comp_stmt->get_result();

        $inputs_consumed = [];
        while($component = $components_result->fetch_assoc()) {
            $quantity_consumed = (float)$component['quantity_required'] * $total_output;
            $inputs_consumed[] = [
                "component_name" => $component['component_name'],
                "quantity_consumed" => $quantity_consumed,
                "unit_of_measure" => $component['unit_of_measure']
            ];
        }

        $report_data[] = [
            "order_id" => $order['id'],
            "order_date" => $order['order_date'],
            "bom_name" => $order['bom_name'],
            "output_item_name" => $order['output_item_name'],
            "output_planned_good" => (float)$order['quantity_to_produce'],
            "output_actual_good" => $actual_good_qty,
            "output_defective" => $actual_defective_qty,
            "value_of_loss" => $value_of_loss,
            "yield_percentage" => ($total_output > 0) ? ($actual_good_qty / $total_output) * 100 : 100,
            "inputs_consumed" => $inputs_consumed
        ];
    }
    
    $stmt->close();
    $comp_stmt->close();

    http_response_code(200);
    echo json_encode($report_data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "message" => "Failed to generate report: " . $e->getMessage()
    ]);
}
?>