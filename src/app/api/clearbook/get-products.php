<?php
// Set headers for CORS and content type
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

// Include the database connection file
require_once __DIR__ . '/db_connect.php';

// Check for company_id GET parameter
if (!isset($_GET['company_id']) || empty(trim($_GET['company_id']))) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID is required.']);
    exit;
}

$company_id = trim($_GET['company_id']);

try {
    // Prepare the simple SQL statement to select products
    $sql = "SELECT 
                id, 
                name, 
                sku, 
                category, 
                unit_of_measure 
            FROM products 
            WHERE company_id = ?";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Failed to prepare the statement: " . $conn->error);
    }

    // Bind the company_id parameter
    $stmt->bind_param("s", $company_id);

    // Execute the statement
    $stmt->execute();

    // Get the result set
    $result = $stmt->get_result();

    // Fetch all products into an array
    $products = $result->fetch_all(MYSQLI_ASSOC);

    // Close the statement and connection
    $stmt->close();
    $conn->close();

    // Send the response
    http_response_code(200);
    echo json_encode(['success' => true, 'products' => $products]);

} catch (Exception $e) {
    // Handle any errors
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while fetching products: ' . $e->getMessage()
    ]);
}
?>