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
$role = $_GET['role'] ?? '';
$company_type = $_GET['company_type'] ?? '';

if (empty($role) || empty($company_type)) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Role and company type are required."]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT permission FROM role_permissions WHERE role = ? AND company_type = ?");
    $stmt->execute([$role, $company_type]);
    $permissions = $stmt->fetchAll();

    header('Content-Type: application/json');
    echo json_encode(["success" => true, "permissions" => $permissions]);

} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Error: " . $e->getMessage()]);
}
?>