<?php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

// --- Validation ---
if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Company ID is required."]);
    exit();
}

$companyId = $_GET['company_id'];

// --- Database Query ---
$db = new DB_CONNECT();
$conn = $db->connect();

$sql = "SELECT 
            company_name, 
            company_id, 
            company_type, 
            company_logo, 
            industry, 
            address, 
            contact_email, 
            contact_phone, 
            base_currency, 
            accounting_method, 
            fiscal_year_start, 
            fiscal_year_end, 
            default_bank_account, 
            default_cash_account 
        FROM companies 
        WHERE company_id = ? 
        LIMIT 1";

$stmt = $conn->prepare($sql);

if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to prepare the SQL statement: " . $conn->error]);
    exit();
}

$stmt->bind_param("s", $companyId);

if ($stmt->execute()) {
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $company_data = $result->fetch_assoc();
        http_response_code(200);
        echo json_encode($company_data);
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Company with ID '{$companyId}' not found."]);
    }
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch company settings: " . $stmt->error]);
}

$stmt->close();
$conn->close();

?>
