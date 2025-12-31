<?php
require_once __DIR__ . '/../../app/api/db_connect.php';

header("Content-Type: application/json");

// CORS Headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // Cache for 1 day
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
    }
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

global $conn;
$data = json_decode(file_get_contents('php://input'), true);

// Basic validation
$required_fields = ['name', 'sku', 'category', 'unit_of_measure', 'unit_cost', 'company_id', 'item_type'];
foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "Missing required field: {$field}"]);
        exit;
    }
}

$item_type = $data['item_type'];
if ($item_type !== 'product' && $item_type !== 'raw_material') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid item_type specified.']);
    exit;
}

// Determine table and columns based on item type
$table_name = $item_type === 'product' ? 'products' : 'raw_materials';

// These columns are consistent across both tables
$name = $data['name'];
$sku = $data['sku'];
$category = $data['category'];
$unit_of_measure = $data['unit_of_measure'];
$average_unit_cost = (float)$data['unit_cost']; // Frontend sends 'unit_cost', DB expects 'average_unit_cost'
$company_id = $data['company_id'];

// We can make inventory_account_id optional or handle it based on your business logic.
// For now, we will use a placeholder or make it nullable if your schema allows.
// Let's assume it's required for this example.
if (empty($data['inventory_account_id'])) {
     http_response_code(400);
     echo json_encode(['status' => 'error', 'message' => 'Missing required field: inventory_account_id']);
     exit;
}
$inventory_account_id = (int)$data['inventory_account_id'];

try {
    $stmt = $conn->prepare(
        "INSERT INTO {$table_name} (name, sku, category, unit_of_measure, average_unit_cost, company_id, inventory_account_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    if ($stmt === false) {
        throw new Exception("Prepare statement failed: " . $conn->error);
    }

    $stmt->bind_param("ssssdsi", 
        $name, 
        $sku, 
        $category, 
        $unit_of_measure, 
        $average_unit_cost, 
        $company_id,
        $inventory_account_id
    );

    if ($stmt->execute()) {
        $new_id = $stmt->insert_id;
        http_response_code(201);
        echo json_encode(['status' => 'success', 'message' => ucfirst($item_type) . ' registered successfully.', 'id' => $new_id]);
    } else {
        // Check for duplicate SKU
        if ($conn->errno === 1062) {
            http_response_code(409); // Conflict
            echo json_encode(['status' => 'error', 'message' => 'This SKU is already in use. Please choose a different one.']);
        } else {
            throw new Exception($stmt->error);
        }
    }

    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database operation failed', 'details' => $e->getMessage()]);
}

$conn->close();
?>
