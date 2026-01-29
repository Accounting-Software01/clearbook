<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ .'/../../php_error.log');

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/lib/dbentry.php';

function get_account_code_by_role($conn, $company_id, $role) {
    $stmt = $conn->prepare("SELECT account_code FROM chart_of_accounts WHERE company_id = ? AND system_role = ?");
    if (!$stmt) throw new Exception("DB Error preparing statement to get account code by role: " . $conn->error, 500);
    $stmt->bind_param("ss", $company_id, $role);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($row = $result->fetch_assoc()) {
        $stmt->close();
        return $row['account_code'];
    }
    $stmt->close();
    throw new Exception("GL Account with system role '{$role}' not found in Chart of Accounts.", 404);
}

function handle_production_request($conn) {
    $method = $_SERVER['REQUEST_METHOD'];
    $request_body = null;
    $company_id = '';

    if ($method === 'GET') {
        $company_id = $_GET['company_id'] ?? null;
    } else {
        $request_body_raw = file_get_contents('php://input');
        $request_body = json_decode($request_body_raw);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON body.", 400);
        }
        $company_id = $request_body->company_id ?? null;
    }

    if (empty($company_id)) {
        throw new Exception("Company ID is required.", 400);
    }
    
    $db_entry = new DBEntry($conn);

    switch ($method) {
        case 'GET':
            if (isset($_GET['production_order_id'])) {
                // --- GET FULL DETAILS FOR ONE ORDER ---
                $order_id = (int)$_GET['production_order_id'];
                $details = [];

                $stmt = $conn->prepare("SELECT po.*, p.name AS product_name, b.bom_code, b.bom_version FROM production_orders po JOIN products p ON po.product_id = p.id JOIN boms b ON po.bom_id = b.id WHERE po.id = ? AND po.company_id = ?");
                $stmt->bind_param("is", $order_id, $company_id);
                $stmt->execute();
                $header = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if(empty($header)) throw new Exception("Production Order not found.", 404);

                if ($header['status'] === 'Pending') {
                    // For PENDING orders, calculate PLANNED costs from BOM
                    $details['header'] = $header;
                    $details['journals'] = []; // No journals yet

                    $components_stmt = $conn->prepare("SELECT rm.name as material_name, bc.quantity, rm.average_unit_cost, rm.unit_of_measure as uom FROM bom_components bc JOIN raw_materials rm ON bc.item_id = rm.id WHERE bc.bom_id = ?");
                    $components_stmt->bind_param("i", $header['bom_id']);
                    $components_stmt->execute();
                    $components = $components_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                    $components_stmt->close();

                    $total_material_cost = 0;
                    $consumption = [];
                    foreach($components as $c) {
                        $quantity_consumed = $c['quantity'] * $header['quantity_to_produce'];
                        $total_material_cost += $quantity_consumed * $c['average_unit_cost'];
                        $consumption[] = [
                            'material_name' => $c['material_name'],
                            'quantity_consumed' => $quantity_consumed,
                            'unit_cost_at_consumption' => $c['average_unit_cost']
                        ];
                    }
                    $details['consumption'] = $consumption;

                    $overheads_stmt = $conn->prepare("SELECT * FROM bom_overheads WHERE bom_id = ?");
                    $overheads_stmt->bind_param("i", $header['bom_id']);
                    $overheads_stmt->execute();
                    $overheads = $overheads_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                    $overheads_stmt->close();

                    $total_overhead_cost = 0;
                    $costs = [];
                    foreach($overheads as $o) {
                         $cost_var = 0;
                        switch($o['cost_method']) {
                            case 'per_unit': $cost_var = $o['cost'] * $header['quantity_to_produce']; break;
                            case 'per_batch': $cost_var = $o['cost']; break;
                            case 'percentage_of_material': $cost_var = $total_material_cost * ($o['cost'] / 100.0); break;
                        }
                        $total_overhead_cost += $cost_var;
                        $costs[] = [
                            'cost_type' => (stripos($o['overhead_name'], 'labor') !== false) ? 'Labor' : 'Overhead',
                            'description' => 'Planned: ' . $o['overhead_name'],
                            'amount' => $cost_var
                        ];
                    }
                    $details['costs'] = $costs;
                    
                    // Update header with calculated costs
                    $details['header']['total_material_cost'] = $total_material_cost;
                    $details['header']['total_overhead_cost'] = $total_overhead_cost;
                    $details['header']['total_production_cost'] = $total_material_cost + $total_overhead_cost;

                } else {
                    // For IN PROGRESS or COMPLETED orders, fetch ACTUAL, AGGREGATED costs
                    $details['header'] = $header;

                    // Use SUM() and GROUP BY to fix duplicates
                    $stmt = $conn->prepare("SELECT rm.name as material_name, SUM(poc.quantity_consumed) as quantity_consumed, poc.unit_cost_at_consumption FROM production_order_consumption poc JOIN raw_materials rm ON poc.material_id = rm.id WHERE poc.production_order_id = ? GROUP BY rm.name, poc.unit_cost_at_consumption");
                    $stmt->bind_param("i", $order_id);
                    $stmt->execute();
                    $details['consumption'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                    $stmt->close();
                    
                    $stmt = $conn->prepare("SELECT cost_type, description, SUM(amount) as amount FROM production_order_costs WHERE production_order_id = ? GROUP BY cost_type, description");
                    $stmt->bind_param("i", $order_id);
                    $stmt->execute();
                    $details['costs'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                    $stmt->close();

                    $stmt = $conn->prepare("SELECT * FROM journal_vouchers WHERE reference_id = ? AND reference_type = 'Production'");
                    $stmt->bind_param("i", $order_id);
                    $stmt->execute();
                    $details['journals'] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                    $stmt->close();
                }

                return ['success' => true, 'data' => $details];

            } else {
                // --- GET LIST OF ALL ORDERS ---
                $stmt = $conn->prepare("SELECT po.*, p.name AS product_name FROM production_orders po JOIN products p ON po.product_id = p.id WHERE po.company_id = ? ORDER BY po.creation_date DESC");
                $stmt->bind_param("s", $company_id);
                $stmt->execute();
                $result = $stmt->get_result();
                $data = $result->fetch_all(MYSQLI_ASSOC);
                $stmt->close();
                return ['success' => true, 'data' => $data];
            }

        case 'POST':
            // Correct POST logic remains here...
            if (!isset($request_body->user_id, $request_body->bom_id, $request_body->quantity_to_produce)) {
                throw new Exception("Missing fields: user_id, bom_id, quantity_to_produce.", 400);
            }
            $bom_id = (int)$request_body->bom_id;
            $quantity = (float)$request_body->quantity_to_produce;
            $user_id = $request_body->user_id;
            $notes = $request_body->notes ?? null;
            
            $bom_stmt = $conn->prepare("SELECT finished_good_id FROM boms WHERE id = ? AND company_id = ?");
            $bom_stmt->bind_param("is", $bom_id, $company_id);
            $bom_stmt->execute();
            $bom_result = $bom_stmt->get_result();
            if ($bom_row = $bom_result->fetch_assoc()) {
                $product_id = (int)$bom_row['finished_good_id'];
            } else {
                 throw new Exception("BOM not found.", 404);
            }
            $bom_stmt->close();

            $stmt = $conn->prepare("INSERT INTO production_orders (company_id, product_id, bom_id, quantity_to_produce, notes, created_by_id, `status`) VALUES (?, ?, ?, ?, ?, ?, 'Pending')");
            $stmt->bind_param("siidss", $company_id, $product_id, $bom_id, $quantity, $notes, $user_id);
            if (!$stmt->execute()) throw new Exception("DB Error creating production order: " . $stmt->error, 500);
            
            return ['success' => true, 'message' => 'Production order created!', 'production_order_id' => $stmt->insert_id];

        case 'PUT':
            // Correct PUT logic starts here...
             if (!isset($request_body->production_order_id, $request_body->status, $request_body->user_id)) {
                throw new Exception("Order ID, status, and user_id are required.", 400);
            }
            $order_id = (int)$request_body->production_order_id;
            $status = $request_body->status;
            $user_id = $request_body->user_id;

            $order_stmt = $conn->prepare("SELECT * FROM production_orders WHERE id = ? AND company_id = ?");
            $order_stmt->bind_param("is", $order_id, $company_id);
            $order_stmt->execute();
            $order = $order_stmt->get_result()->fetch_assoc();
            $order_stmt->close();
            if (!$order) throw new Exception("Production Order #{$order_id} not found.", 404);

            if ($status === 'In Progress' && $order['status'] === 'Pending') {
                // --- MOVE ORDER TO WORK-IN-PROGRESS ---
                $rm_account_code = get_account_code_by_role($conn, $company_id, 'INVENTORY_RAW_MATERIAL');
                $wip_account_code = get_account_code_by_role($conn, $company_id, 'INVENTORY_WIP');

                $components_stmt = $conn->prepare("SELECT bc.item_id, bc.quantity, rm.average_unit_cost FROM bom_components bc JOIN raw_materials rm ON bc.item_id = rm.id WHERE bc.bom_id = ?");
                $components_stmt->bind_param("i", $order['bom_id']);
                $components_stmt->execute();
                $components = $components_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $components_stmt->close();

                $total_material_cost = 0;
                $consumption_stmt = $conn->prepare("INSERT INTO production_order_consumption (production_order_id, material_id, quantity_consumed, unit_cost_at_consumption) VALUES (?, ?, ?, ?)");
                // NEW LINE 217 (Correct)
                $update_rm_stmt = $conn->prepare("UPDATE raw_materials SET quantity_on_hand = quantity_on_hand - ? WHERE id = ? AND company_id = ?");

                foreach ($components as $c) {
                    $quantity_consumed = $c['quantity'] * $order['quantity_to_produce'];
                    $cost = $quantity_consumed * $c['average_unit_cost'];
                    $total_material_cost += $cost;

                    $consumption_stmt->bind_param("iidd", $order_id, $c['item_id'], $quantity_consumed, $c['average_unit_cost']);
                    if (!$consumption_stmt->execute()) throw new Exception("DB Error inserting consumption: " . $consumption_stmt->error, 500);
                    
                   
                    $update_rm_stmt->bind_param("dis", $quantity_consumed, $c['item_id'], $company_id);

                    if (!$update_rm_stmt->execute()) throw new Exception("DB Error updating raw material inventory: " . $update_rm_stmt->error, 500);
                }
                $consumption_stmt->close();
                $update_rm_stmt->close();

                if($total_material_cost > 0) {
                    $sub_entries = [
                        ['account' => $wip_account_code, 'type' => 'Debit', 'amount' => $total_material_cost, 'narration' => 'Material Cost for Prod. Order #' . $order_id],
                        ['account' => $rm_account_code, 'type' => 'Credit', 'amount' => $total_material_cost, 'narration' => 'Material Consumption for Prod. Order #' . $order_id]
                    ];
                    $db_entry->create_journal_entry($company_id, 'Production', "WIP Materials for PO#{$order_id}", $order_id, $sub_entries, null, $total_material_cost, $user_id);
                }
                
               
                $update_order_stmt = $conn->prepare(
                    "UPDATE production_orders 
                     SET status = ?, total_material_cost = ? 
                     WHERE id = ? AND company_id = ?"
                );
                
                if (!$update_order_stmt) {
                    throw new Exception("Prepare failed (update order): " . $conn->error);
                }
                
                $new_status = 'In Progress';
                
                $update_order_stmt->bind_param(
                    "sdis",
                    $new_status,
                    $total_material_cost,
                    $order_id,
                    $company_id
                );
                
                $update_order_stmt->execute();
                $update_order_stmt->close();

                return ['success' => true, 'message' => 'Order status updated to In Progress. Materials moved to WIP.'];

            } elseif ($status === 'Completed' && $order['status'] === 'In Progress') {
                // --- COMPLETE THE PRODUCTION ORDER ---
                $wip_account_code = get_account_code_by_role($conn, $company_id, 'INVENTORY_WIP');
                $fg_account_code = get_account_code_by_role($conn, $company_id, 'INVENTORY_FINISHED_GOODS');
                
                $total_material_cost = (float)$order['total_material_cost'];
                $total_overhead_cost = 0;
                $sub_entries = [];

                $overheads_stmt = $conn->prepare("SELECT * FROM bom_overheads WHERE bom_id = ?");
                $overheads_stmt->bind_param("i", $order['bom_id']);
                $overheads_stmt->execute();
                $overheads = $overheads_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $overheads_stmt->close();

                $cost_insert_stmt = $conn->prepare("INSERT INTO production_order_costs (production_order_id, cost_type, description, amount) VALUES (?, ?, ?, ?)");
                
                foreach($overheads as $o) {
                    $cost_var = 0;
                    switch($o['cost_method']) {
                        case 'per_unit': $cost_var = $o['cost'] * $order['quantity_to_produce']; break;
                        case 'per_batch': $cost_var = $o['cost']; break;
                        case 'percentage_of_material': $cost_var = $total_material_cost * ($o['cost'] / 100.0); break;
                    }
                    if ($cost_var > 0) {
                        $total_overhead_cost += $cost_var;
                        if (empty($o['gl_account'])) {
                            throw new Exception("The 'gl_account' is not set for the overhead '{$o['overhead_name']}' in the BOM settings.", 400);
                        }
                        $overhead_account_code = $o['gl_account'];
                        $sub_entries[] = ['account' => $overhead_account_code, 'type' => 'Credit', 'amount' => $cost_var, 'narration' => 'Applied Overhead: ' . $o['overhead_name']];

                        $cost_type_var = (stripos($o['overhead_name'], 'labor') !== false) ? 'Labor' : 'Overhead';
                        $desc_var = "Applied: " . $o['overhead_name'];
                        $cost_insert_stmt->bind_param("issd", $order_id, $cost_type_var, $desc_var, $cost_var);
                        $cost_insert_stmt->execute();
                    }
                }
                $cost_insert_stmt->close();
                
                if ($total_material_cost > 0) {
                    $sub_entries[] = ['account' => $wip_account_code, 'type' => 'Credit', 'amount' => $total_material_cost, 'narration' => 'Transfer from WIP to Finished Goods'];
                }

                $total_production_cost = $total_material_cost + $total_overhead_cost;
                
               // --- PASTE THIS NEW CODE IN ITS PLACE ---
if ($total_production_cost > 0) {
    // 1. INSERT THE MASTER VOUCHER
    $jv_narration = "Cost of Goods Manufactured for Production Order #{$order_id}";
    $jv_number = "PROD-" . $order_id;
    $entry_date = date('Y-m-d');
    $user_id_int = intval($user_id);

    $jv_sql = "INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, reference_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Production', ?, 'PROD', ?, 'Production', ?, ?, ?, 'posted')";
    $jv_stmt = $conn->prepare($jv_sql);
    if (!$jv_stmt) throw new Exception("Voucher prepare failed: " . $conn->error);
    
    $jv_stmt->bind_param("sissisdd", $company_id, $user_id_int, $jv_number, $entry_date, $order_id, $jv_narration, $total_production_cost, $total_production_cost);
    if(!$jv_stmt->execute()) throw new Exception("Failed to insert journal voucher: " . $jv_stmt->error);
    $voucher_id = $jv_stmt->insert_id;
    $jv_stmt->close();

    // 2. INSERT THE VOUCHER LINES
    // Add the main debit for Finished Goods to the sub_entries array
    array_unshift($sub_entries, [
        'account' => $fg_account_code, 
        'type' => 'Debit', 
        'amount' => $total_production_cost, 
        'narration' => 'Cost of Goods Manufactured for PO#' . $order_id
    ]);

    $line_sql = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $line_stmt = $conn->prepare($line_sql);
    if (!$line_stmt) throw new Exception("Line prepare failed: " . $conn->error);
    
    foreach ($sub_entries as $line) {
        $debit = ($line['type'] === 'Debit') ? $line['amount'] : 0.00;
        $credit = ($line['type'] === 'Credit') ? $line['amount'] : 0.00;
        $line_stmt->bind_param("siisdds", $company_id, $user_id_int, $voucher_id, $line['account'], $debit, $credit, $line['narration']);
        if(!$line_stmt->execute()) throw new Exception("Failed to insert journal voucher line: " . $line_stmt->error);
    }
    $line_stmt->close();
}
// --- END PASTE ---


                // --- PASTE THIS NEW BLOCK IN ITS PLACE ---

// CRITICAL: Update finished good inventory and re-calculate weighted average cost
$product_id = (int)$order['product_id'];
$quantity_produced = (float)$order['quantity_to_produce'];

if ($quantity_produced > 0) {
    // 1. Get current stock values, locking the row for safety
    $prod_stmt = $conn->prepare("SELECT quantity_on_hand, average_unit_cost FROM products WHERE id=? AND company_id=? FOR UPDATE");
    if (!$prod_stmt) throw new Exception("Prepare failed (get product): " . $conn->error);
    $prod_stmt->bind_param("is", $product_id, $company_id);
    $prod_stmt->execute();
    $prod_row = $prod_stmt->get_result()->fetch_assoc();
    $prod_stmt->close();
    
    $old_qty = (float)($prod_row['quantity_on_hand'] ?? 0);
    $old_avg_cost = (float)($prod_row['average_unit_cost'] ?? 0);

    // 2. Calculate new total quantity and new weighted average cost
    $new_qty = $old_qty + $quantity_produced;
    $new_avg_cost = 0;
    if ($new_qty > 0) {
        // New Average Cost = (Value of Old Stock + Value of New Stock) / New Total Quantity
        $new_avg_cost = (($old_qty * $old_avg_cost) + $total_production_cost) / $new_qty;
    }

    // 3. Update the products table with both the new quantity and the new average cost
    $update_prod_stmt = $conn->prepare("UPDATE products SET quantity_on_hand = ?, average_unit_cost = ? WHERE id = ? AND company_id = ?");
    if (!$update_prod_stmt) throw new Exception("Prepare failed (update product): " . $conn->error);
    $update_prod_stmt->bind_param("ddis", $new_qty, $new_avg_cost, $product_id, $company_id);
    if (!$update_prod_stmt->execute()) throw new Exception("DB Error updating finished good inventory: " . $update_prod_stmt->error);
    $update_prod_stmt->close();
}
// --- END PASTE ---

                
              
              
                $update_order_stmt = $conn->prepare("UPDATE production_orders SET `status` = 'Completed', completion_date = NOW(), total_overhead_cost = ?, total_production_cost = ? WHERE id = ? AND company_id = ?");

                $update_order_stmt->bind_param("ddis", $total_overhead_cost, $total_production_cost, $order_id, $company_id);

                $update_order_stmt->execute();
                $update_order_stmt->close();
                
                return ['success' => true, 'message' => 'Production Order Completed!'];
            } else {
                 throw new Exception("Invalid status transition from {$order['status']} to {$status}.", 409);
            }
            break;
        default:
            throw new Exception("Method not allowed.", 405);
    }
}

try {
    $conn->begin_transaction(MYSQLI_TRANS_START_READ_WRITE);
    $response = handle_production_request($conn);
    $conn->commit();
    http_response_code(200);
    echo json_encode($response);
} catch (Exception $e) {
    $conn->rollback();
    $code = $e->getCode() ?: 500;
    $code = is_int($code) && $code >= 400 && $code < 600 ? $code : 500;
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
} finally {
    if (isset($conn)) $conn->close();
}
?>