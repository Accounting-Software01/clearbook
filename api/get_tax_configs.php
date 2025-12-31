<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Assuming db_connect.php is in the same directory or accessible via include path
include 'db_connect.php';

$company_id = isset($_GET['company_id']) ? intval($_GET['company_id']) : 0;

if ($company_id > 0) {
    // It's good practice to select from a view that joins with the chart of accounts
    // For now, we will fetch the raw data and let the frontend handle the account name.
    $sql = "SELECT id, tax_name, tax_rate, tax_type, payable_account_code FROM tax_configurations WHERE company_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $configs = array();
    while ($row = $result->fetch_assoc()) {
        $configs[] = $row;
    }
    echo json_encode($configs);
    $stmt->close();
} else {
    // Return an empty array if no company_id is provided
    echo json_encode([]);
}

$conn->close();
?>