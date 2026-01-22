<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET');

require_once '../../../db_connect.php';

if (!isset($_GET['bom_id']) || !is_numeric($_GET['bom_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A valid BOM ID is required.']);
    exit;
}

$bom_id = (int)$_GET['bom_id'];

try {
    $conn->begin_transaction();

    // 1. Fetch BOM Identity (Corrected: joining with 'products')
    $identity_sql = "SELECT b.*, p.name as finished_good_name FROM boms b JOIN products p ON b.finished_good_id = p.id WHERE b.id = ?";
    $stmt_identity = $conn->prepare($identity_sql);
    $stmt_identity->bind_param("i", $bom_id);
    $stmt_identity->execute();
    $identity_result = $stmt_identity->get_result();
    $bom_identity = $identity_result->fetch_assoc();
    $stmt_identity->close();

    if (!$bom_identity) {
        throw new Exception("BOM not found.");
    }

    // 2. Fetch Components (Corrected: joining with raw_materials and ADDING average_unit_cost)
    $components_sql = "SELECT bc.*, rm.name as item_name, rm.unit_of_measure as uom, rm.average_unit_cost FROM bom_components bc JOIN raw_materials rm ON bc.item_id = rm.id WHERE bc.bom_id = ?";
    $stmt_components = $conn->prepare($components_sql);
    $stmt_components->bind_param("i", $bom_id);
    $stmt_components->execute();
    $components_result = $stmt_components->get_result();
    $bom_components = $components_result->fetch_all(MYSQLI_ASSOC);
    $stmt_components->close();

    // 3. Fetch Operations
    $operations_sql = "SELECT * FROM bom_operations WHERE bom_id = ? ORDER BY sequence ASC";
    $stmt_operations = $conn->prepare($operations_sql);
    $stmt_operations->bind_param("i", $bom_id);
    $stmt_operations->execute();
    $operations_result = $stmt_operations->get_result();
    $bom_operations = $operations_result->fetch_all(MYSQLI_ASSOC);
    $stmt_operations->close();

    // 4. Fetch Overheads
    $overheads_sql = "SELECT * FROM bom_overheads WHERE bom_id = ?";
    $stmt_overheads = $conn->prepare($overheads_sql);
    $stmt_overheads->bind_param("i", $bom_id);
    $stmt_overheads->execute();
    $overheads_result = $stmt_overheads->get_result();
    $bom_overheads = $overheads_result->fetch_all(MYSQLI_ASSOC);
    $stmt_overheads->close();

    $conn->commit();

    echo json_encode([
        'success' => true,
        'bom_details' => [
            'identity' => $bom_identity,
            'components' => $bom_components,
            'operations' => $bom_operations,
            'overheads' => $bom_overheads
        ]
    ]);

} catch (Exception $e) {
    if ($conn->errno) { 
        $conn->rollback();
    }
    http_response_code($e->getMessage() === "BOM not found." ? 404 : 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn->ping()) {
        $conn->close();
    }
}
?>