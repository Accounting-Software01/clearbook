<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set headers for CORS and JSON response
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include the database connection script
require_once __DIR__ . '/db_connect.php';


// Function to send a standardized JSON response and exit
function send_json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Ensure company_id is provided
if (!isset($_GET['company_id'])) {
    send_json_response(['message' => 'Company ID is required.'], 400);
}

$company_id = $_GET['company_id'];


try {
    // 1. Calculate weighted average costs for raw materials from SUPPLIER INVOICES
    $avg_costs = [];
    $avg_cost_stmt = $conn->prepare("
        SELECT
            sii.raw_material_id AS item_id,
            SUM(sii.quantity * sii.unit_price) / NULLIF(SUM(sii.quantity), 0) AS weighted_average_cost
        FROM supplier_invoice_items sii
        JOIN supplier_invoices si ON sii.supplier_invoice_id = si.id
        WHERE si.company_id = ? AND sii.quantity > 0
        GROUP BY sii.raw_material_id
    ");
    $avg_cost_stmt->bind_param("s", $company_id); // company_id is varchar
    $avg_cost_stmt->execute();
    $avg_cost_result = $avg_cost_stmt->get_result();
    while ($row = $avg_cost_result->fetch_assoc()) {
        if ($row['weighted_average_cost'] !== null) {
            $avg_costs[$row['item_id']] = (float)$row['weighted_average_cost'];
        }
    }
    $avg_cost_stmt->close();

    // 2. Fetch all inventory items (raw materials, semi-finished, and finished goods)
    $items = [];
    $item_sql = "
        -- Raw Materials and Semi-Finished Goods
        SELECT
            id,
            name,
            category,
            CASE
                WHEN category IN ('Semi_finished', 'Sub-assemblies', 'Intermediate Products') THEN 'semi_finished'
                ELSE 'raw_material'
            END AS item_type,
            quantity_on_hand,
            average_unit_cost AS unit_cost
        FROM raw_materials
        WHERE company_id = ?

        UNION ALL

        -- Finished Goods (Products)
        SELECT
            id,
            name,
            category,
            'product' AS item_type,
            quantity_on_hand,
            average_unit_cost AS unit_cost 
        FROM products
        WHERE company_id = ?
    ";
    $item_stmt = $conn->prepare($item_sql);
    $item_stmt->bind_param("ss", $company_id, $company_id);
    $item_stmt->execute();
    $item_result = $item_stmt->get_result();
    $all_items_map = []; // For easier lookups later
    while ($item = $item_result->fetch_assoc()) {
        // Override cost for raw materials with the calculated average cost
        if ($item['item_type'] === 'raw_material' && isset($avg_costs[$item['id']])) {
            $item['unit_cost'] = $avg_costs[$item['id']];
        }
        // Standardize data types
        $item['id'] = (string)$item['id'];
        $item['category'] = (string)$item['category'];
        $item['quantity_on_hand'] = (float)$item['quantity_on_hand'];
        $item['unit_cost'] = (float)$item['unit_cost'];
        $items[] = $item;
        $all_items_map[$item['id']] = $item;
    }
    $item_stmt->close();

    // 3. Fetch PET BOMs and their components
    $boms = [];
    $bom_components = [];
    
    // Pre-fetch all components
    $comp_stmt = $conn->prepare("
    SELECT
        pbc.pet_bom_id,
        pbc.component_item_id,
        pbc.quantity_required,
        pbc.unit_of_measure
    FROM pet_bom_components pbc
    JOIN pet_boms pb ON pbc.pet_bom_id = pb.id
    WHERE pb.company_id = ?
");

    $comp_stmt->bind_param("s", $company_id);
    $comp_stmt->execute();
    $comp_result = $comp_stmt->get_result();
    while ($comp = $comp_result->fetch_assoc()) {
        $component_item_id = (string)$comp['component_item_id'];
        $comp['quantity_required'] = (float)$comp['quantity_required'];
        $comp['component_item_name'] = isset($all_items_map[$component_item_id]) ? $all_items_map[$component_item_id]['name'] : 'Unknown Item';
        $bom_components[$comp['pet_bom_id']][] = $comp;
    }
    $comp_stmt->close();
    
    // Fetch parent BOMs
    $bom_stmt = $conn->prepare("
        SELECT
            pb.id,
            pb.bom_name,
            pb.output_item_id,
            pb.production_stage
        FROM pet_boms pb
        WHERE pb.company_id = ?
    ");
    $bom_stmt->bind_param("s", $company_id);
    $bom_stmt->execute();
    $bom_result = $bom_stmt->get_result();
    while ($bom = $bom_result->fetch_assoc()) {
        $bom_id = (string)$bom['id'];
        $output_item_id = (string)$bom['output_item_id'];
        $bom['id'] = $bom_id;
        $bom['output_item_name'] = isset($all_items_map[$output_item_id]) ? $all_items_map[$output_item_id]['name'] : 'Unknown Item';
        $bom['components'] = isset($bom_components[$bom_id]) ? $bom_components[$bom_id] : [];
        $boms[] = $bom;
    }
    $bom_stmt->close();

    // 4. Fetch all PET Production Orders
    $orders = [];
    $order_stmt = $conn->prepare("
        SELECT
            po.id,
            po.pet_bom_id,
            b.bom_name,
            po.order_date,
            po.quantity_to_produce,
            po.quantity_produced,
            po.quantity_defective,
            po.status,
            po.cost_per_unit_produced
        FROM pet_production_orders po
        JOIN pet_boms b ON po.pet_bom_id = b.id
        WHERE po.company_id = ?
        ORDER BY po.order_date DESC, po.id DESC
    ");
    $order_stmt->bind_param("s", $company_id);
    $order_stmt->execute();
    $order_result = $order_stmt->get_result();
    while ($order = $order_result->fetch_assoc()) {
        $order['id'] = (string)$order['id'];
        $order['pet_bom_id'] = (string)$order['pet_bom_id'];
        $order['quantity_to_produce'] = (float)$order['quantity_to_produce'];
        $order['quantity_produced'] = isset($order['quantity_produced']) ? (float)$order['quantity_produced'] : null;
        $order['quantity_defective'] = isset($order['quantity_defective']) ? (float)$order['quantity_defective'] : null;
        $order['cost_per_unit_produced'] = isset($order['cost_per_unit_produced']) ? (float)$order['cost_per_unit_produced'] : null;
        $orders[] = $order;
    }
    $order_stmt->close();

    // 5. Assemble final response
    $response_data = [
        'items' => $items,
        'boms' => $boms,
        'orders' => $orders,
        'message' => 'Data fetched successfully'
    ];
    send_json_response($response_data);

} catch (Exception $e) {
    send_json_response(['message' => 'An error occurred: ' . $e->getMessage()], 500);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>