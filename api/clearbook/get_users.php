<?php
// ========================
// CORS CONFIGURATION
// ========================
$allowed_origins = [
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
$host = "localhost";
$dbname = "hariindu_clearbook";
$username = "hariindu_clearbook";
$password = "hariindu_clearbook";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    ob_clean(); // Clean the output buffer
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Database Connection Failed: " . $e->getMessage()]);
    exit;
}

// ----- API LOGIC -----
$company_id = $_GET['company_id'] ?? '';

if (empty($company_id)) {
    ob_clean(); // Clean the output buffer
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id as uid, full_name, email, role, status FROM users WHERE company_id = ?");
    $stmt->execute([$company_id]);
    $users = $stmt->fetchAll();

    ob_clean(); // Clean the output buffer before sending the final JSON
    header('Content-Type: application/json');
    echo json_encode(["success" => true, "users" => $users]);
    exit;

} catch (PDOException $e) {
    ob_clean(); // Clean the output buffer
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Error: " . $e->getMessage()]);
    exit;
}
?>