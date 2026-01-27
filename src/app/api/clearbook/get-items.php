<?php
require_once __DIR__ . '/db_connect.php';

header("Content-Type: application/json");

// CORS Headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, OPTIONS");
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

if (empty($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Company ID is required']);
    exit;
}

$company_id = $_GET['company_id'];
global $conn;

$response = [
    'products' => [],
    'raw_materials' => []
];

// Fetch Finished Products
try {
    $query = "SELECT id, name, sku, category, unit_of_measure, 
                     average_unit_cost AS unit_cost, 
                     quantity_on_hand AS quantity, 
                     (quantity_on_hand * average_unit_cost) AS total_value, -- Server-side calculation
                     'product' as item_type 
              FROM products WHERE company_id = ?";
    $stmt = $conn->prepare($query);
    if ($stmt === false) throw new Exception("Prepare failed (products): " . $conn->error);

    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['products'] = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch products', 'details' => $e->getMessage()]);
    $conn->close();
    exit;
}

// Fetch Raw Materials
try {
    $query = "SELECT id, name, sku, category, unit_of_measure, 
                     average_unit_cost AS unit_cost, 
                     quantity_on_hand AS quantity, 
                     (quantity_on_hand * average_unit_cost) AS total_value, -- Server-side calculation
                     'raw_material' as item_type 
              FROM raw_materials WHERE company_id = ?";
    $stmt = $conn->prepare($query);
    if ($stmt === false) throw new Exception("Prepare failed (raw_materials): " . $conn->error);

    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $response['raw_materials'] = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch raw materials', 'details' => $e->getMessage()]);
    $conn->close();
    exit;
}

$conn->close();

http_response_code(200);
echo json_encode($response);
?>