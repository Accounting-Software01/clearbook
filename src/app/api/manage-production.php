<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * SIMPLE LOGGER
 ************************************/
function log_error(string $tag, string $message, $user_id = null, string $company_id = null): void
{
    error_log(json_encode([
        'time' => date('Y-m-d H:i:s'),
        'tag' => $tag,
        'message' => $message,
        'user_id' => $user_id,
        'company_id' => $company_id
    ]));
}

/************************************
 * VOUCHER NUMBER GENERATOR
 * Format: HARI123-2025-000001
 ************************************/
function generate_voucher_number(mysqli $conn, string $company_id): string
{
    $year = date('Y');
    $prefix = "{$company_id}-{$year}";

    $stmt = $conn->prepare("
        SELECT voucher_number
        FROM journal_vouchers
        WHERE company_id = ?
          AND voucher_number LIKE CONCAT(?, '-%')
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmt->bind_param("ss", $company_id, $prefix);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $parts = explode('-', $row['voucher_number']);
        $last_seq = (int) end($parts);
        $next_seq = str_pad($last_seq + 1, 6, '0', STR_PAD_LEFT);
    } else {
        $next_seq = '000001';
    }

    return "{$company_id}-{$year}-{$next_seq}";
}

/************************************
 * POST JOURNAL ENTRY
 ************************************/
function post_journal_entry(mysqli $conn, array $data): array
{
    try {
        $required = ['company_id','user_id','entry_date','source','entries','reference_id','reference_type'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }

        if (!is_array($data['entries']) || count($data['entries']) < 2) {
            throw new Exception("Journal must have at least two lines.");
        }

        $company_id   = $data['company_id'];
        $user_id      = (int)$data['user_id'];
        $entry_date   = $data['entry_date'];
        $narration    = $data['notes'] ?? '';
        $voucher_type = $data['voucher_type'] ?? 'Production';
        $source       = $data['source'];
        $reference_id = $data['reference_id'];
        $reference_type = $data['reference_type'];

        $voucher_number = $data['reference_number']
            ?? generate_voucher_number($conn, $company_id);

        $total_debit = 0;
        $total_credit = 0;
        foreach ($data['entries'] as $e) {
            $total_debit += (float)($e['debit'] ?? 0);
            $total_credit += (float)($e['credit'] ?? 0);
        }

        if (round($total_debit, 2) !== round($total_credit, 2)) {
            throw new Exception("Journal not balanced.");
        }

        $stmt = $conn->prepare("
            INSERT INTO journal_vouchers
            (company_id, entry_date, narration, voucher_number, source, status,
             created_by_id, total_debits, total_credits, reference_id, reference_type, voucher_type)
            VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?, ?, ?)
        ");

        $stmt->bind_param(
            "ssssiddssss",
            $company_id,
            $entry_date,
            $narration,
            $voucher_number,
            $source,
            $user_id,
            $total_debit,
            $total_credit,
            $reference_id,
            $reference_type,
            $voucher_type
        );

        if (!$stmt->execute()) {
            throw new Exception($stmt->error);
        }

        $journal_id = $stmt->insert_id;
        $stmt->close();

        $line_stmt = $conn->prepare("
            INSERT INTO journal_voucher_lines
            (company_id, user_id, voucher_id, account_id, debit, credit, description, payee_id, payee_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        foreach ($data['entries'] as $line) {
            $desc = $line['description'] ?? null;
            $payee_id = $line['payee_id'] ?? null;
            $payee_type = $line['payee_type'] ?? null;

            $line_stmt->bind_param(
                "siisddsis",
                $company_id,
                $user_id,
                $journal_id,
                $line['account_id'],
                $line['debit'],
                $line['credit'],
                $desc,
                $payee_id,
                $payee_type
            );
            $line_stmt->execute();
        }
        $line_stmt->close();

        return ['success' => true, 'journal_id' => $journal_id];

    } catch (Exception $e) {
        log_error('JournalPostingError', $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/************************************
 * ACCOUNT LOOKUP
 ************************************/
function get_account_id_by_name($conn, $name, $company_id) {
    $stmt = $conn->prepare("SELECT id FROM chart_of_accounts WHERE account_name = ? AND company_id = ?");
    $stmt->bind_param("ss", $name, $company_id);
    $stmt->execute();
    $res = $stmt->get_result();
    return $res->fetch_assoc()['id'] ?? null;
}

/* =========================
   SWITCH CONTINUES UNCHANGED
   (Your POST / PUT logic is already correct)
   ========================= */


switch ($method) {
    case 'GET':
        if (isset($_GET['company_id'])) {
            $company_id = $_GET['company_id'];
            // Correctly join with `products` table
            $query = "SELECT po.*, p.name AS product_name 
                      FROM production_orders po
                      JOIN products p ON po.product_id = p.id
                      WHERE po.company_id = ?";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("s", $company_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $orders = $result->fetch_all(MYSQLI_ASSOC);
            http_response_code(200);
            echo json_encode($orders);
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Company ID is required."]);
        }
        break;

    case 'POST': // Create Production Order
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->company_id, $data->product_id, $data->quantity_to_produce, $data->user_id)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing required fields."]);
            exit;
        }

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("INSERT INTO production_orders (company_id, product_id, quantity_to_produce, created_by_id, status, planned_labor_cost, notes) VALUES (?, ?, ?, ?, 'Pending', ?, ?)");
            $planned_labor_cost = $data->planned_labor_cost ?? 0;
            $notes = $data->notes ?? null;
            $stmt->bind_param("siisds", $data->company_id, $data->product_id, $data->quantity_to_produce, $data->user_id, $planned_labor_cost, $notes);
            $stmt->execute();
            $production_order_id = $stmt->insert_id;

            $total_material_cost = 0;
            if (isset($data->materials)) {
                foreach ($data->materials as $material) {
                    // Correctly get cost from `raw_materials` table
                    $cost_stmt = $conn->prepare("SELECT average_unit_cost FROM raw_materials WHERE id = ? AND company_id = ?");
                    $cost_stmt->bind_param("is", $material->id, $data->company_id);
                    $cost_stmt->execute();
                    $cost_result = $cost_stmt->get_result();
                    if ($cost_row = $cost_result->fetch_assoc()) {
                        $unit_cost = $cost_row['average_unit_cost'];
                        $total_material_cost += $material->quantity * $unit_cost;
                        $consump_stmt = $conn->prepare("INSERT INTO production_order_consumption (production_order_id, material_id, quantity_consumed, unit_cost_at_consumption) VALUES (?, ?, ?, ?)");
                        $consump_stmt->bind_param("iidd", $production_order_id, $material->id, $material->quantity, $unit_cost);
                        $consump_stmt->execute();
                    } else {
                        throw new Exception("Could not find raw material ID: " . $material->id);
                    }
                }
            }
            
            $cost_stmt = $conn->prepare("INSERT INTO production_order_costs (production_order_id, cost_type, description, amount) VALUES (?, ?, ?, ?)");
            if (isset($data->direct_expenses)) {
                foreach ($data->direct_expenses as $expense) {
                    $type = 'direct';
                    $cost_stmt->bind_param("issd", $production_order_id, $type, $expense->description, $expense->amount);
                    $cost_stmt->execute();
                }
            }
            if (isset($data->misc_costs)) {
                foreach ($data->misc_costs as $cost) {
                    $type = 'misc';
                    $cost_stmt->bind_param("issd", $production_order_id, $type, $cost->description, $cost->amount);
                    $cost_stmt->execute();
                }
            }

            if ($total_material_cost > 0) {
                $wip_account_id = get_account_id_by_name($conn, 'Inventory - Work-in-Progress', $data->company_id);
                $raw_materials_account_id = get_account_id_by_name($conn, 'Inventory - Raw Materials', $data->company_id);



                 if (!$wip_account_id || !$raw_materials_account_id) {
                     throw new Exception("WIP or Raw Materials account not found.");
                 }
                 $narration = "Material consumption for Production Order #" . $production_order_id;
                 $lines = [
                     ['account_id' => (string)$wip_account_id, 'debit' => $total_material_cost, 'credit' => 0],
                     ['account_id' => (string)$raw_materials_account_id, 'debit' => 0, 'credit' => $total_material_cost]
                 ];

                 $journal_data = [
                    'company_id' => $data->company_id,
                    'user_id' => $data->user_id,
                    'entry_date' => date('Y-m-d'),
                    'source' => 'Production',
                    'notes' => $narration,
                    'entries' => $lines,
                    'reference_id' => $production_order_id,       // Add reference fields
                    'reference_type' => 'production_orders',
                    'voucher_type' => 'Production'
                ];
                $journal_result = post_journal_entry($conn, $journal_data);
                if (!$journal_result['success']) {
                    throw new Exception("Failed to post journal entry: " . ($journal_result['error'] ?? 'Unknown error'));
                }
            }
            
            $conn->commit();
            http_response_code(201);
            echo json_encode(["status" => "success", "message" => "Production order created.", "id" => $production_order_id]);

        } catch (Exception $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Order creation failed: " . $e->getMessage()]);
        }
        break;

    case 'PUT': // Update Production Order Status
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->production_order_id, $data->company_id, $data->status)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing fields for update."]);
            exit;
        }

        if ($data->status === 'In Progress') {
            $stmt = $conn->prepare("UPDATE production_orders SET status = 'In Progress', start_date = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?");
            $stmt->bind_param("is", $data->production_order_id, $data->company_id);
            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(["status" => "success", "message" => "Order status updated to In Progress."]);
            } else {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Failed to update status."]);
            }

        } elseif ($data->status === 'Completed') {
             if (!isset($data->user_id)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "User ID is required for completion."]);
                exit;
            }

            $conn->begin_transaction();
            try {
                // Calculate costs
                $cost_stmt1 = $conn->prepare("SELECT SUM(quantity_consumed * unit_cost_at_consumption) as total FROM production_order_consumption WHERE production_order_id = ?");
                $cost_stmt1->bind_param("i", $data->production_order_id);
                $cost_stmt1->execute();
                $material_cost = $cost_stmt1->get_result()->fetch_assoc()['total'] ?? 0;

                $cost_stmt2 = $conn->prepare("SELECT planned_labor_cost FROM production_orders WHERE id = ?");
                $cost_stmt2->bind_param("i", $data->production_order_id);
                $cost_stmt2->execute();
                $labor_cost = $cost_stmt2->get_result()->fetch_assoc()['planned_labor_cost'] ?? 0;

                $cost_stmt3 = $conn->prepare("SELECT SUM(amount) as total FROM production_order_costs WHERE production_order_id = ?");
                $cost_stmt3->bind_param("i", $data->production_order_id);
                $cost_stmt3->execute();
                $other_costs = $cost_stmt3->get_result()->fetch_assoc()['total'] ?? 0;

                $total_production_cost = $material_cost + $labor_cost + $other_costs;

                if ($total_production_cost <= 0) {
                     throw new Exception("Total production cost is zero or less. Nothing to journal.");
                }

                $wip_account_id = get_account_id_by_name($conn, 'Inventory - Work-in-Progress', $data->company_id);
                $finished_goods_account_id = get_account_id_by_name($conn, 'Inventory - Finished Goods', $data->company_id);

                
                if (!$wip_account_id || !$finished_goods_account_id) {
                    throw new Exception("WIP or Finished Goods account not found.");
                }

                $narration = "Completion of Production Order #" . $data->production_order_id;
                $lines = [
                    ['account_id' => (string)$finished_goods_account_id, 'debit' => $total_production_cost, 'credit' => 0],
                    ['account_id' => (string)$wip_account_id, 'debit' => 0, 'credit' => $total_production_cost]
                ];
                
                $journal_data = [
                    'company_id' => $data->company_id,
                    'user_id' => $data->user_id,
                    'entry_date' => date('Y-m-d'),
                    'source' => 'Production',
                    'notes' => $narration,
                    'entries' => $lines,
                    'reference_id' => $data->production_order_id, // Add reference fields
                    'reference_type' => 'production_orders',
                    'voucher_type' => 'Production'
                ];
                $journal_result = post_journal_entry($conn, $journal_data);
                if (!$journal_result['success']) {
                    throw new Exception("Journal entry posting failed: " . ($journal_result['error'] ?? 'Unknown error'));
                }

                $update_stmt = $conn->prepare("UPDATE production_orders SET status = 'Completed', completion_date = CURRENT_TIMESTAMP WHERE id = ?");
                $update_stmt->bind_param("i", $data->production_order_id);
                $update_stmt->execute();

                $conn->commit();
                http_response_code(200);
                echo json_encode(["status" => "success", "message" => "Production order completed and final journal entry posted."]);

            } catch (Exception $e) {
                $conn->rollback();
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => "Production completion failed: " . $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid status provided."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Method not allowed"]);
        break;
}

$conn->close();
?>