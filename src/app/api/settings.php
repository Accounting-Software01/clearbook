<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

session_start();

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/db_connect.php';

if (!isset($_SESSION['user']['company_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "User not authenticated."]);
    exit;
}

$data = json_decode(file_get_contents("php://input"));

if (empty($data->company_id) || empty($data->updates->company_type)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing company_id or company_type."]);
    exit;
}

// Security check: Ensure the user is updating their own company
if ($data->company_id !== $_SESSION['user']['company_id']) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Forbidden."]);
    exit;
}

$db = new DB_CONNECT();
$conn = $db->connect();

try {
    $conn->begin_transaction();

    $sql = "UPDATE companies SET company_type = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);

    if ($stmt === false) {
        throw new Exception("SQL statement preparation failed: " . $conn->error);
    }
    
    $stmt->bind_param("si", $data->updates->company_type, $data->company_id);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to update company type: " . $stmt->error);
    }
    
    $stmt->close();

    // Now update the session
    $_SESSION['user']['company_type'] = $data->updates->company_type;
    
    $conn->commit();
    
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "Company type updated successfully.",
        "user" => $_SESSION['user']
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

$db->close();
exit;
?>