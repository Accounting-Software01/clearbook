<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->action) || !isset($data->po_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input data.']);
    exit();
}

$conn->begin_transaction();

try {
    if ($data->action === 'approve') {
        $po_id = (int)$data->po_id;
        
        $updateSql = "UPDATE purchase_orders SET status = 'Approved' WHERE id = ? AND status = 'Pending'";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("i", $po_id);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $conn->commit();
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Purchase order approved.']);
        } else {
            $conn->rollback();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Purchase order not found or not in a pending state.']);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action.']);
    }

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'An error occurred.',
        'details' => $e->getMessage()
    ]);
}

$conn->close();
?>