<?php
// ========================
// CORS CONFIGURATION
// ========================
$allowed_origins = [
    'https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
    'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
    'https://9003-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
   'https://clearbook-olive.vercel.app', 'https://hariindustries.net'
];

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowed_origins, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    }
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ----- DATABASE CONNECTION -----
require 'db_connect.php';

// ----- API LOGIC -----
$role = $_GET['role'] ?? '';
$company_type = $_GET['company_type'] ?? '';

if (empty($role) || empty($company_type)) {
    ob_clean();
    echo json_encode(["success" => false, "error" => "Role and company type are required."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT permission FROM role_permissions WHERE role = ? AND company_type = ?");
    $stmt->execute([$role, $company_type]);
    $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    ob_clean();
    echo json_encode(["success" => true, "permissions" => $permissions]);
    exit;

} catch (PDOException $e) {
    ob_clean();
    echo json_encode(["success" => false, "error" => "Database Error: " . $e->getMessage()]);
    exit;
}
?>