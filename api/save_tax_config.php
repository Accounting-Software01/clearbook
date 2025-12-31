<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

include 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

$company_id = $data['company_id'] ?? null;
$tax_name = $data['tax_name'] ?? '';
$tax_rate = $data['tax_rate'] ?? 0;
$tax_type = $data['tax_type'] ?? '';
$payable_account_code = $data['payable_account_code'] ?? '';
$id = $data['id'] ?? null;

if ($company_id && $tax_name && $tax_type && $payable_account_code) {
    if ($id) {
        // Update existing configuration
        $sql = "UPDATE tax_configurations SET tax_name = ?, tax_rate = ?, tax_type = ?, payable_account_code = ? WHERE id = ? AND company_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sdssii", $tax_name, $tax_rate, $tax_type, $payable_account_code, $id, $company_id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update tax configuration.']);
        }
        $stmt->close();
    } else {
        // Create new configuration
        $sql = "INSERT INTO tax_configurations (company_id, tax_name, tax_rate, tax_type, payable_account_code) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("isdss", $company_id, $tax_name, $tax_rate, $tax_type, $payable_account_code);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'newId' => $stmt->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create tax configuration.']);
        }
        $stmt->close();
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input. Please provide all required fields.']);
}

$conn->close();
?>