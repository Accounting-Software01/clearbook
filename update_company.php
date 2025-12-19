<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

if (!isset($_POST['id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Company ID is required."]);
    exit();
}

$companyId = $_POST['id'];

$db = new DB_CONNECT();
$conn = $db->connect();

$setClauses = [];
$bindTypes = '';
$bindValues = [];

// --- File Upload Security (VERY IMPORTANT) ---
$newLogoPath = null;
if (isset($_FILES['company_logo']) && $_FILES['company_logo']['error'] === UPLOAD_ERR_OK) {
    $logoFile = $_FILES['company_logo'];

    // 1. Extension validation
    $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    $fileExtension = strtolower(pathinfo($logoFile['name'], PATHINFO_EXTENSION));
    if (!in_array($fileExtension, $allowedExtensions)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid logo file type. Allowed types: " . implode(', ', $allowedExtensions)]);
        exit();
    }

    // 2. MIME type validation
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $logoFile['tmp_name']);
    finfo_close($finfo);
    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($mime, $allowedMimes)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid logo file content."]);
        exit();
    }

    $uploadDir = 'uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $newFileName = $uploadDir . 'logo_' . $companyId . '_' . time() . '.' . $fileExtension;

    if (move_uploaded_file($logoFile['tmp_name'], $newFileName)) {
        $setClauses[] = "company_logo = ?";
        $bindTypes .= 's';
        $bindValues[] = $newFileName;
        $newLogoPath = $newFileName;
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to upload logo."]);
        exit();
    }
}

// Whitelist of allowed fields. 
// `accounting_method` removed to prevent changes after setup.
$allowedFields = [
    'company_name', 'industry', 'address', 'contact_email', 
    'contact_phone', 'base_currency', 'fiscal_year_end' // fiscal_year_start is locked, end date can be adjusted.
];

foreach ($allowedFields as $field) {
    if (isset($_POST[$field])) {
        // --- Data Hygiene & Validation ---
        $value = trim($_POST[$field]);

        if ($field === 'contact_email' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid email address."]);
            exit();
        }

        $setClauses[] = "`{$field}` = ?";
        $bindTypes .= 's';
        $bindValues[] = $value;
    }
}

if (empty($setClauses)) {
    // If only a logo was uploaded, this is fine. If not, then no fields were provided.
    if ($newLogoPath === null) {
        http_response_code(400);
        echo json_encode(["message" => "No fields provided for update."]);
        exit();
    }
}

$bindTypes .= 's'; // For the company ID in WHERE clause
$bindValues[] = $companyId;

// Standardize on 'id' for the WHERE clause
$sql = "UPDATE companies SET " . implode(', ', $setClauses) . " WHERE id = ?";
$stmt = $conn->prepare($sql);

if ($stmt === false) {
    http_response_code(500);
    echo json_encode(["error" => "SQL statement preparation failed: " . $conn->error]);
    exit();
}

$stmt->bind_param($bindTypes, ...$bindValues);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0 || $newLogoPath) {
        $response = ["message" => "Company settings updated successfully."];
        if ($newLogoPath) {
            $response['new_logo_path'] = $newLogoPath;
        }
        http_response_code(200);
        echo json_encode($response);
    } else {
        http_response_code(200);
        echo json_encode(["message" => "No changes were made to the company settings."]);
    }
} else {
    http_response_code(500);
    echo json_encode(["error" => "Failed to update company settings: " . $stmt->error]);
}

$stmt->close();
$conn->close();

?>