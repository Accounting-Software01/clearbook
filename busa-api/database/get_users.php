<?php
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
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Database Connection Failed: " . $e->getMessage()]);
    exit;
}

// ----- API LOGIC -----
$company_id = $_GET['company_id'] ?? '';

if (empty($company_id)) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT user_id, full_name, email, role, status FROM users WHERE company_id = ?");
    $stmt->execute([$company_id]);
    $users = $stmt->fetchAll();

    header('Content-Type: application/json');
    echo json_encode(["success" => true, "users" => $users]);

} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Error: " . $e->getMessage()]);
}
?>