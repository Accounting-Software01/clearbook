<?php
// api/update_company.php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed."]);
    exit();
}

// --- Validation ---
if (!isset($_POST['company_id']) || !isset($_POST['user_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required identifiers (company_id or user_id)."]);
    exit();
}

$companyId = $_POST['company_id'];
$userId = $_POST['user_id'];

// --- Database connection ---
$conn = new mysqli("localhost", "hariindu_erp", "Software1234@!", "hariindu_erp");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

// --- Prepare update fields ---
$update_clauses = [];
$params = [];
$types = '';
$new_logo_path = null;

// --- Logo Upload Handling ---
if (isset($_FILES['company_logo']) && $_FILES['company_logo']['error'] === UPLOAD_ERR_OK) {
    $logoFile = $_FILES['company_logo'];
    
    // Validate file extension only
    $allowed_extensions = ['jpg', 'jpeg', 'png', 'webp'];
    $file_extension = strtolower(pathinfo($logoFile['name'], PATHINFO_EXTENSION));

    if (!in_array($file_extension, $allowed_extensions)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid file type. Only JPG, JPEG, PNG, and WEBP are allowed."]);
        exit();
    }

    $upload_dir = 'uploads/logos/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }

    $unique_filename = uniqid($companyId . '_', true) . '.' . $file_extension;
    $target_path = $upload_dir . $unique_filename;

    if (move_uploaded_file($logoFile['tmp_name'], $target_path)) {
        $update_clauses[] = "company_logo = ?";
        $params[] = $target_path;
        $types .= 's';
        $new_logo_path = $target_path;
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to move uploaded logo."]);
        exit();
    }
}

// --- Text Fields Handling ---
$allowed_text_fields = [
    'company_name', 'industry', 'address', 
    'contact_email', 'contact_phone', 'base_currency'
];

foreach ($allowed_text_fields as $field) {
    if (isset($_POST[$field])) {
        $value = trim($_POST[$field]);
        if ($field === 'contact_email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid email address."]);
            exit();
        }
        $update_clauses[] = "$field = ?";
        $params[] = $value;
        $types .= 's';
    }
}

// --- Exit if nothing to update ---
if (count($update_clauses) === 0) {
    http_response_code(200);
    echo json_encode([
        "message" => "No new data provided to update.",
        "new_logo_path" => $new_logo_path
    ]);
    exit();
}

// --- Build SQL query using companies.id ---
$sql = "UPDATE companies SET " . implode(', ', $update_clauses) . " WHERE id = ?";
$params[] = $companyId;
$types .= 's';

$stmt = $conn->prepare($sql);
if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["error" => "SQL statement preparation failed: " . $conn->error]);
    exit();
}

$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode([
        "message" => "Company settings updated successfully.",
        "company_id" => $companyId,
        "new_logo_path" => $new_logo_path
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to update company settings: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>