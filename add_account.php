<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->account_name) || !isset($data->account_number) || !isset($data->account_type) || !isset($data->company_id)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input. All account fields and company ID are required."]);
    exit();
}

$accountName = $data->account_name;
$accountNumber = $data->account_number;
$accountType = $data->account_type;
$companyId = $data->company_id;
$status = 'Active'; // Default status for new accounts
$initialBalance = 0.00;
$accountId = 'acc_' . uniqid();

$db = new DB_CONNECT();
$conn = $db->connect();

// Check for duplicate account number
$checkSql = "SELECT account_id FROM chart_of_accounts WHERE account_number = ? AND company_id = ?";
$checkStmt = $conn->prepare($checkSql);
$checkStmt->bind_param("ss", $accountNumber, $companyId);
$checkStmt->execute();
if ($checkStmt->get_result()->num_rows > 0) {
    http_response_code(409);
    echo json_encode(["error" => "An account with number '{$accountNumber}' already exists."]);
    $checkStmt->close();
    $conn->close();
    exit();
}
$checkStmt->close();

// Insert new account
$insertSql = "INSERT INTO chart_of_accounts (account_id, company_id, account_number, account_name, account_type, status, balance) VALUES (?, ?, ?, ?, ?, ?, ?)";
$insertStmt = $conn->prepare($insertSql);
$insertStmt->bind_param("ssssssd", $accountId, $companyId, $accountNumber, $accountName, $accountType, $status, $initialBalance);

if ($insertStmt->execute()) {
    http_response_code(201);
    echo json_encode([
        "message" => "Account created successfully.",
        "newAccount" => [
            'account_id' => $accountId,
            'account_number' => $accountNumber,
            'account_name' => $accountName,
            'account_type' => $accountType,
            'status' => $status,
            'balance' => $initialBalance
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to create account: " . $insertStmt->error]);
}

$insertStmt->close();
$conn->close();

?>
