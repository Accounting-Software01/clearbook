<?php
/************************************
 * HEADERS & PREFLIGHT
 ************************************/
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * DATABASE CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php';

/************************************
 * VALIDATE INPUT
 ************************************/
if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Company ID is required']);
    exit;
}

$company_id = $_GET['company_id'];

/************************************
 * FETCH SUPPLIERS
 ************************************/
try {
    $sql = "SELECT id, name, email, phone, address, contact_person, bank_name, account_number, tax_id FROM suppliers WHERE company_id = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $company_id);
    
    if (!$stmt->execute()) {
        throw new Exception("SQL execute failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $suppliers = [];
    
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $suppliers[] = $row;
        }
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "suppliers" => $suppliers]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database query failed", "details" => $e->getMessage()]);
}

$conn->close();
exit();
?>