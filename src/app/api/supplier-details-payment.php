<?php
// src/app/api/supplier-details-payment.php

// Dev error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

require_once 'db_connect.php';
global $conn;

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// --- Input Validation ---
if (!isset($_GET['id']) || !isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required parameters: id and company_id']);
    exit;
}

$supplier_id = (int)$_GET['id'];
$company_id = $_GET['company_id'];

try {
    // --- Fetch Profile (Now including bank details) ---
    $profile_stmt = $conn->prepare("SELECT id, name, contact_person, email, phone, address, vat_percentage, withholding_tax_applicable, bank_name, account_name, account_number FROM suppliers WHERE id = ? AND company_id = ?");
    if (!$profile_stmt) throw new Exception('DB prepare failed (profile): '.$conn->error);
    $profile_stmt->bind_param("is", $supplier_id, $company_id);
    $profile_stmt->execute();
    $profile_result = $profile_stmt->get_result();
    $profile = $profile_result->fetch_assoc();
    $profile_stmt->close();

    if (!$profile) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Supplier not found']);
        exit;
    }
    
    // Cast types for JSON consistency
    $profile['id'] = (string)$profile['id'];
    $profile['vat_percentage'] = isset($profile['vat_percentage']) ? (float)$profile['vat_percentage'] : null;
    $profile['withholding_tax_applicable'] = isset($profile['withholding_tax_applicable']) ? (bool)$profile['withholding_tax_applicable'] : null;


    // --- Combine and Return ---
    echo json_encode([
        'success' => true,
        'profile' => $profile
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>