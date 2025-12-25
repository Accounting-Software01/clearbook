<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Essential CORS headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    // Allow requests from your development and production environments
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://hariindustries.net'
    ];
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
    }
} else {
    // For non-browser requests or direct access
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204); // No Content
    exit;
}

// The API logic starts here
require_once __DIR__ . '/src/app/api/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed: " . ($conn->connect_error ?? 'Unknown error')]);
    exit();
}

// Get the posted data
$data = json_decode(file_get_contents("php://input"), true);

$action = $data['action'] ?? null;
$po_id = $data['po_id'] ?? null;
$company_id = $data['company_id'] ?? null;
$user_id = $data['user_id'] ?? null; // For logging or future use

if (!$action || !$po_id || !$company_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Missing required parameters (action, po_id, company_id)."]);
    exit();
}

$conn->begin_transaction();

try {
    if ($action === 'submit') {
        $new_status = 'Submitted';
        
        // Prepare the statement to update the status
        $stmt = $conn->prepare("UPDATE purchase_orders SET status = ? WHERE id = ? AND company_id = ? AND status = 'Draft'");
        if (!$stmt) {
            throw new Exception("Statement preparation failed: " . $conn->error);
        }
        
        $stmt->bind_param("sis", $new_status, $po_id, $company_id);
        $stmt->execute();

        // Check if the update was successful
        if ($stmt->affected_rows === 0) {
            // No rows updated. This could be because the PO doesn't exist, company_id is wrong, or status isn't 'Draft'.
            // We'll check if the PO exists to give a better error message.
            $check_stmt = $conn->prepare("SELECT status FROM purchase_orders WHERE id = ? AND company_id = ?");
            $check_stmt->bind_param("is", $po_id, $company_id);
            $check_stmt->execute();
            $result = $check_stmt->get_result();
            if ($result->num_rows === 0) {
                 throw new Exception("Purchase Order not found.");
            }
            $current_status_row = $result->fetch_assoc();
            $current_status = $current_status_row['status'];
            throw new Exception("Purchase Order could not be submitted. Its current status is '{$current_status}', not 'Draft'.");
        }
        
        $stmt->close();
        
        // Here you could also insert a record into an audit log table
        
        $conn->commit();
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Purchase Order submitted successfully."]);

    } else {
        // Handle other actions like 'approve', 'cancel' in the future
        throw new Exception("Invalid action provided.");
    }

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    // Send a more specific error message to the frontend.
    echo json_encode([
        "success" => false, 
        "error" => "Action failed: " . $e->getMessage()
    ]);
}

$conn->close();

?>