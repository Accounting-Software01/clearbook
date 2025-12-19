<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit();
}

try {
    $sql = "SELECT id, name, email FROM suppliers WHERE company_id = ? AND is_active = 1 ORDER BY name ASC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $suppliers = [];
    while ($row = $result->fetch_assoc()) {
        $suppliers[] = $row;
    }
    
    $stmt->close();
    $conn->close();

    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $suppliers]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "An error occurred while fetching suppliers.",
        "details" => $e->getMessage()
    ]);
}
?>
