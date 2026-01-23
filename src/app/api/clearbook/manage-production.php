<?php
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../../../php_error.log');
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/lib/dbentry.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function handle_production_request($conn) {
    $method = $_SERVER['REQUEST_METHOD'];
    $request_body = null;
    $company_id = '';

    if ($method === 'GET') {
        $company_id = isset($_GET['company_id']) ? $_GET['company_id'] : null;
    } else {
        $request_body_raw = file_get_contents('php://input');
        $request_body = json_decode($request_body_raw);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON body.", 400);
        }
        $company_id = isset($request_body->company_id) ? $request_body->company_id : null;
    }

    if (empty($company_id)) {
        throw new Exception("Company ID is required.", 400);
    }

    switch ($method) {
        case 'GET':
            $stmt = $conn->prepare("SELECT po.*, p.name AS product_name FROM production_orders po JOIN products p ON po.product_id = p.id WHERE po.company_id = ? ORDER BY po.creation_date DESC");
            $stmt->bind_param("s", $company_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $data = $result->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
            return ['success' => true, 'data' => $data];

        case 'POST':
            if (!isset($request_body->user_id, $request_body->bom_id, $request_body->quantity_to_produce)) {
                throw new Exception("Missing fields: user_id, bom_id, quantity_to_produce.", 400);
            }
            $bom_id = (int)$request_body->bom_id;
            $quantity = (float)$request_body->quantity_to_produce;
            $internal_user_id = (int)$request_body->user_id;
            $notes = isset($request_body->notes) ? $request_body->notes : null;
            $product_id = null;
            $bom_stmt = $conn->prepare("SELECT finished_good_id FROM boms WHERE id = ? AND company_id = ?");
            $bom_stmt->bind_param("is", $bom_id, $company_id);
            $bom_stmt->execute();
            $bom_result = $bom_stmt->get_result();
            if ($bom_row = $bom_result->fetch_assoc()) $product_id = (int)$bom_row['finished_good_id'];
            $bom_stmt->close();
            if ($product_id === null) throw new Exception("BOM not found.", 404);

            $stmt = $conn->prepare("INSERT INTO production_orders (company_id, product_id, bom_id, quantity_to_produce, notes, created_by_id) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("siidsi", $company_id, $product_id, $bom_id, $quantity, $notes, $internal_user_id);
            if (!$stmt->execute()) throw new Exception("DB Error: " . $stmt->error, 500);
            $new_order_id = $stmt->insert_id;
            $stmt->close();

            $total_planned_overhead_cost = 0;
            $temp_material_cost = 0;
            $components_stmt = $conn->prepare("SELECT SUM(bc.quantity * rm.average_unit_cost) as total FROM bom_components bc JOIN raw_materials rm ON bc.item_id = rm.id WHERE bc.bom_id = ?");
            $components_stmt->bind_param("i", $bom_id);
            $components_stmt->execute();
            $temp_material_cost_result = $components_stmt->get_result()->fetch_assoc();
            if ($temp_material_cost_result && $temp_material_cost_result['total']) $temp_material_cost = $temp_material_cost_result['total'] * $quantity;
            $components_stmt->close();

            $overheads_stmt = $conn->prepare("SELECT * FROM bom_overheads WHERE bom_id = ?");
            $overheads_stmt->bind_param("i", $bom_id);
            $overheads_stmt->execute();
            $overheads = $overheads_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $overheads_stmt->close();

            // Corrected Loop for Costs
            $cost_insert_stmt = $conn->prepare("INSERT INTO production_order_costs (production_order_id, cost_type, description, amount) VALUES (?, ?, ?, ?)");
            $cost_insert_stmt->bind_param("issd", $new_order_id, $cost_type_var, $desc_var, $cost_var);
            foreach($overheads as $o) {
                $cost_var = 0;
                switch($o['cost_method']) {
                    case 'per_unit': $cost_var = $o['cost'] * $quantity; break;
                    case 'per_batch': $cost_var = $o['cost']; break;
                    case 'percentage_of_material': $cost_var = $temp_material_cost * ($o['cost'] / 100.0); break;
                }
                $total_planned_overhead_cost += $cost_var;
                $cost_type_var = (stripos($o['overhead_name'], 'labor') !== false) ? 'direct' : 'misc';
                $desc_var = "Planned: " . $o['overhead_name'];
                if(!$cost_insert_stmt->execute()) throw new Exception("DB Error inserting cost record: " . $cost_insert_stmt->error, 500);
            }
            $cost_insert_stmt->close();

            if ($total_planned_overhead_cost > 0) {
                $update_order_stmt = $conn->prepare("UPDATE production_orders SET planned_labor_cost = ? WHERE id = ?");
                $update_order_stmt->bind_param("di", $total_planned_overhead_cost, $new_order_id);
                $update_order_stmt->execute();
                $update_order_stmt->close();
            }

            return ['success' => true, 'message' => 'Production order created!', 'production_order_id' => $new_order_id];

        case 'PUT':
            if (!isset($request_body->production_order_id, $request_body->status, $request_body->user_id)) {
                throw new Exception("Order ID, status, user_id required.", 400);
            }
            $order_id = (int)$request_body->production_order_id;
            $status = $request_body->status;
            $user_id = (int)$request_body->user_id;

            $update_stmt = $conn->prepare("UPDATE production_orders SET status = ?, completion_date = IF(? = 'Completed', NOW(), completion_date) WHERE id = ? AND company_id = ?");
            $update_stmt->bind_param("ssis", $status, $status, $order_id, $company_id);
            if (!$update_stmt->execute()) throw new Exception("DB Error: " . $update_stmt->error, 500);
            $update_stmt->close();

            if ($status === 'Completed') {
                $order_stmt = $conn->prepare("SELECT bom_id, quantity_to_produce, product_id FROM production_orders WHERE id = ?");
                $order_stmt->bind_param("i", $order_id);
                $order_stmt->execute();
                $order = $order_stmt->get_result()->fetch_assoc();
                $order_stmt->close();

                $total_material_cost = 0;
                $sub_entries = [];
                $fg_account = null;

                // Fetch FG and RM GL Account IDs
                $fg_gl_account_id = null;
                $rm_gl_account_id = null;

                $gl_accounts_stmt = $conn->prepare("SELECT id, system_role FROM chart_of_accounts WHERE company_id = ? AND system_role IN (?, ?)");
                if (!$gl_accounts_stmt) { throw new Exception("DB Error preparing GL accounts statement: " . $conn->error, 500); }
                $gl_role_fg = 'INVENTORY_FINISHED_GOODS';
                $gl_role_rm = 'INVENTORY_RAW_MATERIAL';
                $gl_accounts_stmt->bind_param("sss", $company_id, $gl_role_fg, $gl_role_rm);
                $gl_accounts_stmt->execute();
                $gl_accounts_result = $gl_accounts_stmt->get_result();
                while ($row = $gl_accounts_result->fetch_assoc()) {
                    if ($row['system_role'] === 'INVENTORY_FINISHED_GOODS') { $fg_gl_account_id = $row['id']; }
                    if ($row['system_role'] === 'INVENTORY_RAW_MATERIAL') { $rm_gl_account_id = $row['id']; }
                }
                $gl_accounts_stmt->close();

                if (is_null($fg_gl_account_id)) { throw new Exception("Finished Goods GL Account (INVENTORY_FINISHED_GOODS) not found in Chart of Accounts.", 404); }
                if (is_null($rm_gl_account_id)) { throw new Exception("Raw Material GL Account (INVENTORY_RAW_MATERIAL) not found in Chart of Accounts.", 404); }

                // Modified components_stmt query
                $components_stmt = $conn->prepare("SELECT bc.item_id, bc.quantity, rm.average_unit_cost FROM bom_components bc JOIN raw_materials rm ON bc.item_id = rm.id WHERE bc.bom_id = ?");
                if (!$components_stmt) {
                    throw new Exception("DB Error preparing components statement: " . $conn->error, 500);
                }
                $components_stmt->bind_param("i", $order['bom_id']);
                $components_stmt->execute();
                $components = $components_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $components_stmt->close();

                // Corrected Loop for Consumption
                $consumption_stmt = $conn->prepare("INSERT INTO production_order_consumption (production_order_id, material_id, quantity_consumed, unit_cost_at_consumption) VALUES (?, ?, ?, ?)");
                if (!$consumption_stmt) {
                    throw new Exception("DB Error preparing consumption statement: " . $conn->error, 500);
                }
                $consumption_stmt->bind_param("iidd", $order_id, $material_id_var, $quantity_consumed_var, $unit_cost_var);
                foreach ($components as $c) {
                    $material_id_var = $c['item_id'];
                    $quantity_consumed_var = $c['quantity'] * $order['quantity_to_produce'];
                    $unit_cost_var = $c['average_unit_cost'];
                    $cost = $quantity_consumed_var * $unit_cost_var;
                    $total_material_cost += $cost;
                    $fg_account = $fg_gl_account_id; // Set fg_account from fetched GL ID
                    if (!$consumption_stmt->execute()) throw new Exception("DB Error inserting consumption: " . $consumption_stmt->error, 500);
                    $sub_entries[] = ['account' => $rm_gl_account_id, 'type' => 'Credit', 'amount' => $cost, 'narration' => 'Material Consumption for Prod. Order #' . $order_id];
                }
                $consumption_stmt->close();

                $overhead_costs_stmt = $conn->prepare("SELECT poc.amount, bo.gl_account, bo.overhead_name FROM production_order_costs poc JOIN bom_overheads bo ON poc.description = CONCAT('Planned: ', bo.overhead_name) WHERE poc.production_order_id = ?");
                if (!$overhead_costs_stmt) {
                    throw new Exception("DB Error preparing overhead costs statement: " . $conn->error, 500);
                }
                $overhead_costs_stmt->bind_param("i", $order_id);
                $overhead_costs_stmt->execute();
                $logged_overheads = $overhead_costs_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $overhead_costs_stmt->close();
                $total_overhead_cost = 0;
                foreach ($logged_overheads as $lo) {
                    $total_overhead_cost += $lo['amount'];
                    $sub_entries[] = ['account' => $lo['gl_account'], 'type' => 'Credit', 'amount' => $lo['amount'], 'narration' => 'Applied Overhead: ' . $lo['overhead_name'] . ' for Prod. Order #' . $order_id];
                }

                $total_production_cost = $total_material_cost + $total_overhead_cost;

                if($fg_account && $total_production_cost > 0) {
                    $sub_entries[] = ['account' => $fg_account, 'type' => 'Debit', 'amount' => $total_production_cost, 'narration' => 'Finished Goods from Prod. Order #' . $order_id];
                    $db_entry = new DBEntry($conn);
                    $db_entry->create_journal_entry($company_id, 'Production', 'Cost of Goods for Prod. Order #' . $order_id, $order_id, $sub_entries, null, $total_production_cost, $user_id);
                }
            }

            return ['success' => true, 'message' => 'Order status updated to ' . $status];

        default:
            throw new Exception("Method not allowed.", 405);
    }
}

try {
    // Corrected the path for require_once to db_connect.php
    require_once __DIR__ . '/db_connect.php'; // Ensure correct path for db_connect.php relative to manage-production.php
    require_once __DIR__ . '/lib/dbentry.php'; // Ensure correct path for dbentry.php relative to manage-production.php

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') $conn->begin_transaction();
    $response = handle_production_request($conn);
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') $conn->commit();
    echo json_encode($response);
} catch (Exception $e) {
    if ($conn->autocommit(false) === false) $conn->rollback(); // Updated check for active transaction
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>