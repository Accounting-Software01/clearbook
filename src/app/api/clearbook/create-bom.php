<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

// BOM Identity
$company_id = $data['company_id'] ?? null;
$user_id = $data['user_id'] ?? null;
$finished_good_id = $data['finished_good_id'] ?? null;
$bom_code = $data['bom_code'] ?? '';
$bom_version = $data['bom_version'] ?? '1.0';
$status = $data['status'] ?? 'Active';
$uom = $data['uom'] ?? '';
$batch_size = $data['batch_size'] ?? 1;
$effective_from = $data['effective_from'] ?? null;
$notes = $data['notes'] ?? '';

// New Governance & Control Fields
$prepared_by = $data['prepared_by'] ?? null;
$approved_by = $data['approved_by'] ?? null; // This might be handled in a separate approval workflow
$bom_type = $data['bom_type'] ?? 'Standard';

// New Scrap/Yield Fields
$scrap_percentage = $data['scrap_percentage'] ?? 0.00;

// BOM Components, Overheads, and Operations
$components = $data['components'] ?? [];
$overheads = $data['overheads'] ?? [];
$operations = $data['operations'] ?? [];

if (!$company_id || !$user_id || !$finished_good_id || empty($components)) {
    http_response_code(400);
    echo json_encode(['message' => 'Missing required fields: company_id, user_id, finished_good_id, and at least one component are required.']);
    exit;
}

$conn->begin_transaction();

try {
    // Insert into boms table
    $insertBomSql = "INSERT INTO boms (company_id, user_id, finished_good_id, bom_code, bom_version, status, uom, standard_batch_size, effective_from, notes, scrap_percentage, prepared_by, approved_by, bom_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($insertBomSql);
    $stmt->bind_param("siisssisssdsss", $company_id, $user_id, $finished_good_id, $bom_code, $bom_version, $status, $uom, $batch_size, $effective_from, $notes, $scrap_percentage, $prepared_by, $approved_by, $bom_type);
    $stmt->execute();
    $bom_id = $stmt->insert_id;

    // Insert into bom_components table
    $insertComponentSql = "INSERT INTO bom_components (bom_id, item_id, component_type, quantity, uom, uom_category) VALUES (?, ?, ?, ?, ?, ?)";
    $componentStmt = $conn->prepare($insertComponentSql);
    foreach ($components as $component) {
        $componentStmt->bind_param("iisdss", $bom_id, $component['item_id'], $component['component_type'], $component['quantity'], $component['uom'], $component['uom_category']);
        $componentStmt->execute();
    }

    // Insert into bom_overheads table
    if (!empty($overheads)) {
        $insertOverheadSql = "INSERT INTO bom_overheads (bom_id, company_id, overhead_name, cost_method, cost, gl_account) VALUES (?, ?, ?, ?, ?, ?)";
        $overheadStmt = $conn->prepare($insertOverheadSql);
        foreach ($overheads as $overhead) {
            $overheadStmt->bind_param("isssds", $bom_id, $company_id, $overhead['overhead_name'], $overhead['cost_method'], $overhead['cost'], $overhead['gl_account']);
            $overheadStmt->execute();
        }
    }
    
    // Insert into bom_operations table
    if (!empty($operations)) {
        $insertOperationSql = "INSERT INTO bom_operations (bom_id, company_id, sequence, operation_name, notes) VALUES (?, ?, ?, ?, ?)";
        $operationStmt = $conn->prepare($insertOperationSql);
        foreach ($operations as $operation) {
            $operationStmt->bind_param("isiss", $bom_id, $company_id, $operation['sequence'], $operation['operation_name'], $operation['notes']);
            $operationStmt->execute();
        }
    }

    $conn->commit();

    http_response_code(201);
    echo json_encode(['message' => 'BOM created successfully', 'bom_id' => $bom_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['message' => 'BOM creation failed: ' . $e->getMessage(), 'error' => $e->getTraceAsString()]);
}

$conn->close();
