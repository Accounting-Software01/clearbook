<?php
/************************************
 * ERROR REPORTING
 ************************************/
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

/************************************
 * HEADERS
 ************************************/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * DB CONNECTION
 ************************************/
require_once 'db_connect.php';

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

/************************************
 * INPUT & LOGIC
 ************************************/
if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Company ID is required.']);
    exit();
}

$company_id = (int)$_GET['company_id'];

$sql = "SELECT id, name, description, unit_price, vat_rate FROM items WHERE company_id = ? AND is_active = 1 ORDER BY name ASC";

try {
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $items = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Ensure numeric types are correct
    foreach ($items as &$item) {
        $item['id'] = (string)$item['id']; // Keep ID as string for frontend consistency
        $item['unit_price'] = (float)$item['unit_price'];
        $item['vat_rate'] = isset($item['vat_rate']) ? (float)$item['vat_rate'] : null;
    }

    http_response_code(200);
    echo json_encode($items);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to fetch items.',
        'details' => $e->getMessage()
    ]);
}

$conn->close();
?>