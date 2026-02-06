<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-control-allow-headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// CORRECTED PATH: Adjusted to be relative to the new file location
require_once __DIR__ . '/db_connect.php';

if ($conn === null) {
    http_response_code(500);
    echo json_encode(["message" => "Database connection failed."]);
    exit();
}

$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : '';

if (empty($company_id)) {
    http_response_code(400);
    echo json_encode(["message" => "Missing required parameter: company_id."]);
    exit();
}

try {
    // CORRECTED QUERY: Changed `id` to `company_id` to match the table schema
    $sql = "SELECT name, business_type FROM companies WHERE company_id = ? LIMIT 1";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    // Correctly using 's' for the string type
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $company_details = $result->fetch_assoc();

    if ($company_details) {
        http_response_code(200);
        echo json_encode($company_details);
    } else {
        http_response_code(404);
        echo json_encode(["message" => "Company not found for ID: " . $company_id]);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "message" => "Failed to retrieve company details: " . $e->getMessage()
    ]);
}
?>