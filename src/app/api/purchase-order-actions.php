<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'db_connect.php';

if ($conn->connect_error) {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (empty($data->action) || empty($data->po_id) || empty($data->company_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input. Action, po_id, and company_id are required.']);
    exit();
}

$conn->begin_transaction();

try {
    if ($data->action === 'approve') {
        $po_id = (int)$data->po_id;
        $company_id = $data->company_id;

        // Added company_id to the WHERE clause for security
        $updateSql = "UPDATE purchase_orders SET status = 'Approved' WHERE id = ? AND company_id = ? AND status = 'Pending'";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("is", $po_id, $company_id);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            $conn->commit();
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Purchase order approved.']);
        } else {
            $conn->rollback();
            http_response_code(404);
            // Check if the PO exists to give a more specific error
            $checkSql = "SELECT status FROM purchase_orders WHERE id = ? AND company_id = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("is", $po_id, $company_id);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            if ($result->num_rows === 0) {
                 echo json_encode(['success' => false, 'error' => 'Purchase order not found.']);
            } else {
                 $row = $result->fetch_assoc();
                 echo json_encode(['success' => false, 'error' => 'Purchase order is not in a pending state. Current status: ' . $row['status']]);
            }
            $checkStmt->close();
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action.']);
    }
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    error_log("PO Action Failed: " . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'An internal server error occurred.']);
}

$conn->close();
?>
