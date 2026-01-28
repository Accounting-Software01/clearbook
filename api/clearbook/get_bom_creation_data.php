<?php
// ========================
// CONFIG & HEADERS
// ========================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ========================
// SCRIPT LOGIC
// ========================
require_once __DIR__ . '/db_connect.php'; // Ensure this path is correct for your server

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID is required.']);
    exit;
}

global $conn;
$response = [
    'products' => [],
    'raw_materials' => []
];

try {
    // 1. Fetch Finished Goods (Products) for the main dropdown
    // We only need id, name, and unit_of_measure.
    $sql_products = "SELECT id, name, unit_of_measure AS uom FROM products WHERE company_id = ?";
    $stmt_products = $conn->prepare($sql_products);
    $stmt_products->bind_param("i", $company_id);
    $stmt_products->execute();
    $result_products = $stmt_products->get_result();
    $response['products'] = $result_products->fetch_all(MYSQLI_ASSOC);
    $stmt_products->close();

    // 2. Fetch Raw Materials with their cost
    // This is the most critical part.
    // It selects 'average_unit_cost' and renames it to 'cost'.
    $sql_materials = "SELECT id, name, unit_of_measure AS uom, average_unit_cost AS cost FROM raw_materials WHERE company_id = ?";
    $stmt_materials = $conn->prepare($sql_materials);
    $stmt_materials->bind_param("i", $company_id);
    $stmt_materials->execute();
    $result_materials = $stmt_materials->get_result();
    $materials = $result_materials->fetch_all(MYSQLI_ASSOC);
    $stmt_materials->close();

    // 3. Ensure the cost is a clean number before sending.
    // This prevents issues with formatted strings (e.g., "₦10,000.00").
    foreach ($materials as &$material) {
        $material['cost'] = (float)($material['cost'] ?? 0);
    }
    $response['raw_materials'] = $materials;

    // Send the combined response
    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage()]);
}

$conn->close();

?>
