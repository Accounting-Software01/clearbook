<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ .'/../../db_connect.php';

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
        "SELECT b.*, p.name as finished_good_name 
         FROM boms b 
         JOIN products p ON b.finished_good_id = p.id 
         WHERE b.id = ?"
    );
    if ($stmt === false) {
        throw new Exception('Prepare failed (BOM Identity): ' . $conn->error);
    }
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        throw new Exception('BOM not found.');
    }
    $bom_details['identity'] = $result->fetch_assoc();
    $stmt->close();

    // Fetch Components - NOW INCLUDES average_unit_cost
    $stmt = $conn->prepare(
        "SELECT bc.*, 
                rm.name as item_name, 
                rm.unit_of_measure as uom, 
                rm.average_unit_cost 
         FROM bom_components bc
         JOIN raw_materials rm ON bc.item_id = rm.id
         WHERE bc.bom_id = ?"
    );
    if ($stmt === false) {
        throw new Exception('Prepare failed (Components): ' . $conn->error);
    }
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $bom_details['components'] = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Fetch Operations
    $stmt = $conn->prepare("SELECT * FROM bom_operations WHERE bom_id = ? ORDER BY sequence ASC");
    if ($stmt === false) {
        throw new Exception('Prepare failed (Operations): ' . $conn->error);
    }
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $bom_details['operations'] = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Fetch Overheads
    $stmt = $conn->prepare("SELECT * FROM bom_overheads WHERE bom_id = ?");
    if ($stmt === false) {
        throw new Exception('Prepare failed (Overheads): ' . $conn->error);
    }
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