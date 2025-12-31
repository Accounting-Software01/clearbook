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
$company_type = $_GET['company_type'] ?? '';

if (empty($company_type)) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Company type is required."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT DISTINCT role FROM role_permissions WHERE company_type = ?");
    $stmt->execute([$company_type]);
    $roles = $stmt->fetchAll();

    header('Content-Type: application/json');
    echo json_encode(["success" => true, "roles" => $roles]);

} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Error: " . $e->getMessage()]);
}
?>