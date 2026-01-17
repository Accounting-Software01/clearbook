<?php
require_once __DIR__ . '/db_connect.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit;
}

$company_id = $_GET['company_id'];
global $conn;

try {
    $sql = "SELECT account_code, account_name FROM chart_of_accounts WHERE company_id = ? AND account_type = 'Expense' ORDER BY account_code ASC";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $company_id);
    
    if (!$stmt->execute()) {
        throw new Exception("SQL execute failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    $accounts = [];
    
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $accounts[] = $row;
        }
    }
    
    http_response_code(200);
    echo json_encode(["success" => true, "accounts" => $accounts]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database query failed", "details" => $e->getMessage()]);
}

$conn->close();
?>
