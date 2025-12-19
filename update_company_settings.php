<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Set CORS and content type headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
// The response will be JSON, but the request is now multipart/form-data
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection
require_once __DIR__ . '/db_connect.php';

// --- Validation ---
// Data now comes from $_POST (for text fields) and $_FILES (for files)
if (empty($_POST['company_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input. Company ID is required."]);
    exit();
}

$companyId = $_POST['company_id'];
$logo_path_for_db = null;

// --- Handle Logo Upload ---
if (isset($_FILES['company_logo']) && $_FILES['company_logo']['error'] === UPLOAD_ERR_OK) {
    $upload_dir = 'uploads/company_logos/';
    // Create directory if it doesn't exist
    if (!is_dir($upload_dir) && !mkdir($upload_dir, 0775, true)) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create upload directory."]);
        exit();
    }

    $tmp_name = $_FILES['company_logo']['tmp_name'];
    $original_name = basename($_FILES['company_logo']['name']);
    $file_extension = strtolower(pathinfo($original_name, PATHINFO_EXTENSION));

    // Sanitize filename for security
    $safe_filename = preg_replace('/[^a-zA-Z0-9._-]/i', '', pathinfo($original_name, PATHINFO_FILENAME));
    $new_filename = $companyId . '_' . time() . '.' . $file_extension;
    $target_file = $upload_dir . $new_filename;

    // Validate file type
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    if (!in_array($file_extension, $allowed_types)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid file type. Only JPG, JPEG, PNG, GIF, and SVG are allowed."]);
        exit();
    }
    
    // Validate file size (e.g., 5MB limit)
    if ($_FILES['company_logo']['size'] > 5 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(["error" => "File is too large. Maximum size is 5MB."]);
        exit();
    }

    // Move the uploaded file
    if (move_uploaded_file($tmp_name, $target_file)) {
        $logo_path_for_db = $target_file;
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Sorry, there was an error uploading your file."]);
        exit();
    }
}

// --- Prepare Data for Update ---
$db = new DB_CONNECT();
$conn = $db->connect();

$update_clauses = [];
$params = [];
$types = '';

// `company_type` is removed from this list as it should not be updated.
// `company_logo` is handled separately.
$allowed_text_fields = [
    'company_name', 'industry', 'address', 'contact_email', 'contact_phone', 
    'base_currency', 'accounting_method', 'fiscal_year_start', 
    'fiscal_year_end', 'default_bank_account', 'default_cash_account'
];

foreach ($allowed_text_fields as $field) {
    if (isset($_POST[$field])) {
        $update_clauses[] = "$field = ?";
        $params[] = $_POST[$field];
        $types .= 's'; // Assume all are strings for simplicity
    }
}

// Add the logo path to the update query if a new one was successfully uploaded
if ($logo_path_for_db !== null) {
    $update_clauses[] = "company_logo = ?";
    $params[] = $logo_path_for_db;
    $types .= 's';
}

// If no fields are being updated, exit early.
if (count($update_clauses) === 0) {
    http_response_code(200);
    echo json_encode(["message" => "No new settings data was provided to update."]);
    exit();
}

// --- Build and Execute SQL Query ---
$sql = "UPDATE companies SET " . implode(', ', $update_clauses) . " WHERE company_id = ?";
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
    $response = [
        "message" => "Company settings updated successfully."
    ];
    // Include the new logo path in the response so the UI can update instantly
    if ($logo_path_for_db !== null) {
        $response['new_logo_path'] = $logo_path_for_db;
    }
    http_response_code(200);
    echo json_encode($response);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to update company settings: " . $stmt->error]);
}

$stmt->close();
$conn->close();

?>
