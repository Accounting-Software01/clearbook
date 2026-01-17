<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests for CORS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

include_once '../db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;
$product_id = isset($_GET['product_id']) ? intval($_GET['product_id']) : 0;

if (!$company_id || !$product_id) {
    http_response_code(400);
    echo json_encode(['message' => 'Company ID and Product ID are required.']);
    exit;
}

try {
    // Find the active BOM for the given product
    // We'll assume a simple structure here: a 'boms' table and a 'bom_components' table.
    // This might need to be adjusted based on the actual production schema.
    $findBomSql = "SELECT id FROM boms WHERE finished_good_id = ? AND company_id = ? AND status = 'Active' ORDER BY bom_version DESC LIMIT 1";
    $stmt = $conn->prepare($findBomSql);
    $stmt->bind_param("ii", $product_id, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $bom = $result->fetch_assoc();

    if (!$bom) {
        http_response_code(404);
        echo json_encode(['message' => 'No active BOM found for this product.']);
        exit;
    }

    $bom_id = $bom['id'];

    // Fetch the components for this BOM, focusing on raw materials and packaging
    $getComponentsSql = "
        SELECT 
            bc.item_id AS id,
            i.name,
            bc.quantity,
            bc.component_type
        FROM bom_components bc
        JOIN items i ON bc.item_id = i.id
        WHERE bc.bom_id = ? AND bc.component_type IN ('raw-material', 'packaging')
    ";

    $stmt = $conn->prepare($getComponentsSql);
    $stmt->bind_param("i", $bom_id);
    $stmt->execute();
    $componentsResult = $stmt->get_result();
    
    $components = [];
    while ($row = $componentsResult->fetch_assoc()) {
        $components[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'quantity' => $row['quantity'],
        ];
    }

    header('Content-Type: application/json');
    echo json_encode($components);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['message' => 'An error occurred while fetching the BOM: ' . $e->getMessage()]);
}

$conn->close();
