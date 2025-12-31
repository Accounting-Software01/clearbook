<?php
// ======================================================
// CORS CONFIGURATION
// ======================================================
$allowed_origins = [
    'https://9003-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
    'https://hariindustries.net'
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    header("Access-Control-Allow-Credentials: true");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ======================================================
// ERROR REPORTING (DEV ONLY)
// ======================================================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ======================================================
// DATABASE CONNECTION
// ======================================================
require_once '../db_connect.php';

// ======================================================
// READ INPUT
// ======================================================
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input.']);
    exit;
}

// ======================================================
// VALIDATION
// ======================================================
$company_id = $data['company_id'] ?? null;
$id         = isset($data['id']) ? (int)$data['id'] : null;

if (!$company_id || empty($data['name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID and Authority Name are required.']);
    exit;
}

// ======================================================
// SANITIZE & PREPARE PARAMETERS
// ======================================================
$params = [
    'company_id'       => trim($company_id),
    'name'             => trim($data['name']),
    'short_name'       => trim($data['short_name'] ?? ''),
    'authority_type'   => trim($data['authority_type'] ?? 'Other'),
    'jurisdiction'     => trim($data['jurisdiction'] ?? 'Federal'),
    'tax_id'           => trim($data['tax_id'] ?? ''),
    'contact_person'   => trim($data['contact_person'] ?? ''),
    'email'            => trim($data['email'] ?? ''),
    'phone'            => trim($data['phone'] ?? ''),
    'address'          => trim($data['address'] ?? ''),
    'website'          => trim($data['website'] ?? ''),
    'default_tax_rate' => isset($data['default_tax_rate']) ? (float)$data['default_tax_rate'] : 0.0,
    'status'           => trim($data['status'] ?? 'active'),
    'notes'            => trim($data['notes'] ?? '')
];

// ======================================================
// INSERT OR UPDATE
// ======================================================
try {
    if ($id) {
        // UPDATE
        $sql = "UPDATE tax_authorities 
                SET name=?, short_name=?, authority_type=?, jurisdiction=?, tax_id=?, contact_person=?, email=?, phone=?, address=?, website=?, default_tax_rate=?, status=?, notes=? 
                WHERE id=? AND company_id=?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception($conn->error);

        // 13 SET columns, plus 2 WHERE columns = 15 params
        // s (string), d (double), i (integer)
        $stmt->bind_param(
            'ssssssssssdssis',  // 15 types for 15 params
            $params['name'],
            $params['short_name'],
            $params['authority_type'],
            $params['jurisdiction'],
            $params['tax_id'],
            $params['contact_person'],
            $params['email'],
            $params['phone'],
            $params['address'],
            $params['website'],
            $params['default_tax_rate'], 
            $params['status'],
            $params['notes'],
            $id,                        
            $params['company_id']
        );
    } else {
        // INSERT
        $sql = "INSERT INTO tax_authorities 
                (company_id, name, short_name, authority_type, jurisdiction, tax_id, contact_person, email, phone, address, website, default_tax_rate, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        if (!$stmt) throw new Exception($conn->error);

        // 14 columns = 14 params
        $stmt->bind_param(
            'sssssssssssdss',
            $params['company_id'],
            $params['name'],
            $params['short_name'],
            $params['authority_type'],
            $params['jurisdiction'],
            $params['tax_id'],
            $params['contact_person'],
            $params['email'],
            $params['phone'],
            $params['address'],
            $params['website'],
            $params['default_tax_rate'],
            $params['status'],
            $params['notes']
        );
    }

    if ($stmt->execute()) {
        $newId = $id ?: $conn->insert_id;
        echo json_encode(['success' => true, 'id' => $newId]);
    } else {
        throw new Exception($stmt->error);
    }

    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database operation failed: ' . $e->getMessage()]);
}

$conn->close();
?>