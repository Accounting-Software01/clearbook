<?php
// Start a session at the very beginning
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

/************************************
 * HEADERS & PREFLIGHT
 ************************************/
header("Access-Control-Allow-Origin: *"); // In production, replace * with your specific domain, e.g., https://your-frontend-app.com
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Database Connection ---
$host = "localhost";
$dbname = "hariindu_erp";
$username = "hariindu_erp";
$password = "Software1234@!";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit;
}

// --- Request Processing ---
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["email"]) || !isset($data["password"])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password required"]);
    exit;
}

$email = $data["email"];
$passwordInput = $data["password"];

// --- User & Password Verification ---
$stmt = $pdo->prepare("SELECT * FROM logers WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($passwordInput, $user["password"])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Invalid email or password"]);
    exit;
}

// Check if account is active
if ($user["status"] !== "active") {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Account is inactive"]);
    exit;
}

// --- CRITICAL SECURITY STEP: Store user data in the server-side session ---
$_SESSION['user'] = [
    "id" => $user["id"],
    "company_id" => $user["company_id"],
    "full_name" => $user["full_name"],
    "email" => $user["email"],
    "role" => $user["role"]
];


// --- Success Response ---
// Send user data back to the frontend for UI purposes
echo json_encode([
    "status" => "success",
    "message" => "Login successful",
    "user" => [
        "id" => $user["id"],
        "full_name" => $user["full_name"],
        "email" => $user["email"],
        "role" => $user["role"],
        "user_type" => $user["user_type"],
        "company_type" => $user["company_type"],
        "company_id" => $user["company_id"]
    ]
]);

exit;
?>
