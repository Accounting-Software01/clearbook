<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once '../../../db_connect.php';

function get_products($conn, $company_id) {
    $stmt = $conn->prepare("SELECT id, name FROM products WHERE company_id = ? ORDER BY name ASC");
    if (!$stmt) {
        throw new Exception("SQL Prepare failed: " . $conn->error);
    }
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $products = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    return $products;
}

// Main execution block
try {
    if (!isset($_GET['company_id'])) {
        throw new Exception("Company ID is required.", 400);
    }
    $company_id = $_GET['company_id'];
    
    $products = get_products($conn, $company_id);
    echo json_encode(['success' => true, 'products' => $products]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>