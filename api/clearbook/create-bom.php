<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON received. Error: ' . json_last_error_msg()]);
    exit();
}

$required_fields = ['company_id', 'user_id', 'finished_good_id', 'bom_code', 'bom_version', 'components'];
foreach ($required_fields as $field) {
    if (empty($data->$field)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit();
    }
}

$conn->begin_transaction();

try {
    $stmt_check = $conn->prepare("SELECT id FROM boms WHERE company_id = ? AND finished_good_id = ? AND bom_version = ?");
    $stmt_check->bind_param("sis", $data->company_id, $data->finished_good_id, $data->bom_version);
    $stmt_check->execute();
    $result_check = $stmt_check->get_result();
    if ($result_check->num_rows > 0) {
        throw new Exception("A BOM with this version ('" . $data->bom_version . "') already exists for this product.");
    }
    $stmt_check->close();

    $stmt_bom = $conn->prepare(
        "INSERT INTO boms (
            company_id, finished_good_id, bom_code, bom_version, total_standard_cost, status, uom,
            batch_size, effective_from, notes, scrap_percentage, prepared_by,
            approved_by, bom_type, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $effective_from = isset($data->effective_from) ? trim($data->effective_from) : date('Y-m-d');
    if (!empty($effective_from)) {
        $timestamp = strtotime($effective_from);
        $effective_from = ($timestamp !== false) ? date('Y-m-d', $timestamp) : date('Y-m-d');
    }

    $stmt_bom->bind_param(
        "sisssdsdssdsssi",
        $data->company_id,
        $data->finished_good_id,
        $data->bom_code,
        $data->bom_version,
        $data->total_standard_cost,
        $data->status,
        $data->uom,
        $data->batch_size,
        $effective_from,
        $data->notes,
        $data->scrap_percentage,
        $data->prepared_by,
        $data->approved_by,
        $data->bom_type,
        $data->user_id
    );

    if (!$stmt_bom->execute()) {
        throw new Exception("BOM insertion failed: " . $stmt_bom->error);
    }
    $bom_id = $conn->insert_id;
    $stmt_bom->close();

    if (!empty($data->components) && is_array($data->components)) {
        $stmt_comp = $conn->prepare(
            "INSERT INTO bom_components (
                bom_id, item_id, component_type, quantity, waste_percentage, consumption_uom
            ) VALUES (?, ?, ?, ?, ?, ?)"
        );
        foreach ($data->components as $comp) {
            $stmt_comp->bind_param(
                "iisdds",
                $bom_id,
                $comp->item_id,
                $comp->component_type,
                $comp->quantity,
                $comp->waste_percentage,
                $comp->consumption_uom
            );
            if (!$stmt_comp->execute()) {
                throw new Exception("Component insertion failed: " . $stmt_comp->error);
            }
        }
        $stmt_comp->close();
    }

    // Updated section for bom_operations
    if (!empty($data->operations) && is_array($data->operations)) {
        $stmt_ops = $conn->prepare(
            "INSERT INTO bom_operations (
                bom_id, sequence, operation_name, sequence_per_hour, no_of_hours, 
                qty_per_set, good_qty, defect_qty, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($data->operations as $op) {
            $stmt_ops->bind_param(
                "iisddddds", // Updated data types
                $bom_id,
                $op->sequence,
                $op->operation_name,
                $op->sequence_per_hour,
                $op->no_of_hours,
                $op->qty_per_set,
                $op->good_qty,
                $op->defect_qty,
                $op->notes
            );
            if (!$stmt_ops->execute()) {
                throw new Exception("Operation insertion failed: " . $stmt_ops->error);
            }
        }
        $stmt_ops->close();
    }

     if (!empty($data->overheads) && is_array($data->overheads)) {
        $stmt_ovh = $conn->prepare(
            "INSERT INTO bom_overheads (
                bom_id, overhead_name, cost_category, cost_method, cost, gl_account
            ) VALUES (?, ?, ?, ?, ?, ?)"
        );
        foreach ($data->overheads as $ovh) {
            $stmt_ovh->bind_param(
                "isssds",
                $bom_id,
                $ovh->overhead_name,
                $ovh->cost_category,
                $ovh->cost_method,
                $ovh->cost,
                $ovh->gl_account
            );
            if (!$stmt_ovh->execute()) {
                 throw new Exception("Overhead insertion failed: " . $stmt_ovh->error);
            }
        }
        $stmt_ovh->close();
    }

    $conn->commit();
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'BOM created successfully',
        'bom_id' => $bom_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>