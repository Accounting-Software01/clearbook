<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

require_once '../db_connect.php';

$company_id = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;

if ($company_id === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required.']);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT * FROM tax_authorities WHERE company_id = ? ORDER BY name ASC");
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $authorities = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Convert numeric strings to actual numbers for consistency with frontend
    foreach ($authorities as &$authority) {
        if (isset($authority['default_tax_rate'])) {
            $authority['default_tax_rate'] = (float)$authority['default_tax_rate'];
        }
    }

    echo json_encode(['tax_authorities' => $authorities]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

$conn->close();
