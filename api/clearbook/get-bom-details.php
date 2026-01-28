<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../db_connect.php';

if (!isset($_GET['bom_id']) || empty($_GET['bom_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'BOM ID is required.']);
    exit();
}

$bom_id = intval($_GET['bom_id']);
$bom_details = [];

$conn->begin_transaction();

try {
    // Fetch BOM Identity
    $stmt = $conn->prepare(
        "SELECT b.*, i.name as finished_good_name 
         FROM boms b 
         JOIN inventory_items i ON b.finished_good_id = i.id 
         WHERE b.id = ?"
    );
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception('BOM not found.');
    }
    $bom_details['identity'] = $result->fetch_assoc();
    $stmt->close();

    // Fetch Components
    $stmt = $conn->prepare(
        "SELECT bc.*, i.name as item_name, i.uom 
         FROM bom_components bc
         JOIN inventory_items i ON bc.item_id = i.id
         WHERE bc.bom_id = ?"
    );
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $bom_details['components'] = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Fetch Operations
    $stmt = $conn->prepare("SELECT * FROM bom_operations WHERE bom_id = ? ORDER BY sequence ASC");
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $bom_details['operations'] = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Fetch Overheads
    $stmt = $conn->prepare("SELECT * FROM bom_overheads WHERE bom_id = ?");
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $bom_details['overheads'] = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    $conn->commit();
    http_response_code(200);
    echo json_encode(['success' => true, 'bom_details' => $bom_details]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>