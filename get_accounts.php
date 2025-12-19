<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Company ID is required to fetch accounts."]);
    exit();
}

$companyId = $_GET['company_id'];

$db = new DB_CONNECT();
$conn = $db->connect();

// Assumes a 'chart_of_accounts' table with a foreign key 'company_id'
$sql = "SELECT 
            account_id, 
            account_number, 
            account_name, 
            account_type, 
            status, 
            balance
        FROM chart_of_accounts 
        WHERE company_id = ? 
        ORDER BY account_number ASC";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["error" => "SQL statement preparation failed: " . $conn->error]);
    exit();
}

$stmt->bind_param("s", $companyId);

if ($stmt->execute()) {
    $result = $stmt->get_result();
    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure balance is treated as a number
        $row['balance'] = (float) $row['balance'];
        $accounts[] = $row;
    }
    http_response_code(200);
    echo json_encode($accounts);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch chart of accounts: " . $stmt->error]);
}

$stmt->close();
$conn->close();

?>
