<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Company ID is required to fetch users."]);
    exit();
}

$companyId = $_GET['company_id'];

$db = new DB_CONNECT();
$conn = $db->connect();

// Assumes a 'users' table with a foreign key 'company_id'
$sql = "SELECT 
            user_id, 
            full_name, 
            email, 
            role, 
            status, 
            last_login 
        FROM users 
        WHERE company_id = ?";

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["error" => "SQL statement preparation failed: " . $conn->error]);
    exit();
}

$stmt->bind_param("s", $companyId);

if ($stmt->execute()) {
    $result = $stmt->get_result();
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    http_response_code(200);
    echo json_encode($users);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch users: " . $stmt->error]);
}

$stmt->close();
$conn->close();

?>
