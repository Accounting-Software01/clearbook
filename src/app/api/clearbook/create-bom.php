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

$required_fields = ['company_id', 'user_id', 'finished_good_id', 'bom_code', 'components'];
foreach ($required_fields as $field) {
    if (empty($data->$field)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit();
    }
}

$conn->begin_transaction();

try {
    $stmt_bom = $conn->prepare(
        "INSERT INTO boms (
            company_id, finished_good_id, bom_code, bom_version, status, uom,
            batch_size, effective_from, notes, scrap_percentage, prepared_by,
            approved_by, bom_type, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $stmt_bom->bind_param(
        "sisssssisdsssi",
        $data->company_id,
        $data->finished_good_id,
        $data->bom_code,
        $data->bom_version,
        $data->status,
        $data->uom,
        $data->batch_size,
        $data->effective_from,
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
                bom_id, item_id, component_type, quantity, waste_percentage
            ) VALUES (?, ?, ?, ?, ?)"
        );
        foreach ($data->components as $comp) {
            $stmt_comp->bind_param(
                "iisdd",
                $bom_id,
                $comp->item_id,
                $comp->component_type,
                $comp->quantity,
                $comp->waste_percentage
            );
            if (!$stmt_comp->execute()) {
                throw new Exception("Component insertion failed: " . $stmt_comp->error);
            }
        }
        $stmt_comp->close();
    }

    if (!empty($data->operations) && is_array($data->operations)) {
        $stmt_ops = $conn->prepare(
            "INSERT INTO bom_operations (bom_id, sequence, operation_name, notes) VALUES (?, ?, ?, ?)"
        );
        foreach ($data->operations as $op) {
            $stmt_ops->bind_param(
                "iiss",
                $bom_id,
                $op->sequence,
                $op->operation_name,
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