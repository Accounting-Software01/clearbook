<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/src/app/api/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Invalid request method.']);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->action, $data->po_id, $data->company_id, $data->user_id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields.']);
    exit();
}

$conn->begin_transaction();

try {
    if ($data->action === 'approve') {
        $po_id = (int)$data->po_id;
        $user_id = (int)$data->user_id;
        $company_id = (string)$data->company_id;
        
        $updateSql = "UPDATE purchase_orders SET status = 'Approved', approved_by = ?, approved_at = NOW() WHERE id = ? AND company_id = ? AND status = 'Submitted'";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("iis", $user_id, $po_id, $company_id);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $conn->commit();
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Purchase order approved.']);
        } else {
            $conn->rollback();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Order not found, not in a submitted state, or does not belong to your company.']);
        }
        $stmt->close();
    } elseif ($data->action === 'submit') {
        $po_id = (int)$data->po_id;
        $company_id = (string)$data->company_id;

        $updateSql = "UPDATE purchase_orders SET status = 'Submitted' WHERE id = ? AND company_id = ? AND status = 'Draft'";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("is", $po_id, $company_id);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            $conn->commit();
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Purchase order submitted for approval.']);
        } else {
            $conn->rollback();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Order not found, not in a draft state, or does not belong to your company.']);
        }
        $stmt->close();
    } elseif ($data->action === 'cancel') {
        $po_id = (int)$data->po_id;
        $company_id = (string)$data->company_id;

        $updateSql = "UPDATE purchase_orders SET status = 'Cancelled' WHERE id = ? AND company_id = ? AND status = 'Submitted'";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param("is", $po_id, $company_id);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            $conn->commit();
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Purchase order has been cancelled.']);
        } else {
            $conn->rollback();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Order not found, not in a submitted state, or does not belong to your company.']);
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
