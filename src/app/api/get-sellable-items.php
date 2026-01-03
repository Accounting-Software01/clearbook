<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

// Corrected to use the same db_connect as other files
include_once 'db_connect.php'; 

$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : null;

if (!$company_id) {
    http_response_code(400);
    // Updated to provide a consistent error format
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit();
}

try {
    // This SQL statement correctly joins inventory items with their price tiers
    $sql = "
        SELECT 
            i.id, 
            i.name, 
            i.unit_cost as base_price, 
            ppt.tier_name, 
            ppt.price
        FROM inventory_items i
        LEFT JOIN product_price_tiers ppt ON i.id = ppt.product_id AND i.company_id = ppt.company_id
        WHERE i.company_id = ? AND i.item_type = 'product'
        ORDER BY i.name
    ";
    
    // Switched from PDO to MySQLi for consistency
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Failed to prepare statement: " . $conn->error);
    }
    
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $item_id = $row['id'];
        if (!isset($items[$item_id])) {
            $items[$item_id] = [
                'id' => (string)$item_id, // Cast ID to string to match frontend type
                'name' => $row['name'],
                'base_price' => (float)$row['base_price'],
                // Use an object to ensure JSON output is {} not [] for empty tiers
                'price_tiers' => new stdClass() 
            ];
        }
        // If a price tier exists, add it to the price_tiers object
        if ($row['tier_name'] && $row['price'] !== null) {
            $tier_name = $row['tier_name'];
            $items[$item_id]['price_tiers']->$tier_name = (float)$row['price'];
        }
    }
    
    http_response_code(200);
    // Return a simple array of items, as the frontend expects
    echo json_encode(array_values($items));
    
    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Failed to fetch sellable items.", "details" => $e->getMessage()]);
}

$conn->close();
?>
