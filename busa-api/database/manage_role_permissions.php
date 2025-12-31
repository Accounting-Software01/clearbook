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
$data = json_decode(file_get_contents('php://input'), true);

$role = $data['role'] ?? '';
$permissions = $data['permissions'] ?? [];
$company_type = $data['company_type'] ?? '';

if (empty($role) || empty($company_type)) {
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Role and company type are required."]);
    exit;
}


try {
    $pdo->beginTransaction();

    // Delete existing permissions for the role and company type
    $stmt = $pdo->prepare("DELETE FROM role_permissions WHERE role = ? AND company_type = ?");
    $stmt->execute([$role, $company_type]);

    // Insert new permissions
    $stmt = $pdo->prepare("INSERT INTO role_permissions (role, permission, company_type) VALUES (?, ?, ?)");
    foreach ($permissions as $permission) {
        $stmt->execute([$role, $permission, $company_type]);
    }

    $pdo->commit();

    header('Content-Type: application/json');
    echo json_encode(["success" => true, "message" => "Permissions updated successfully."]);

} catch (PDOException $e) {
    $pdo->rollBack();
    header('Content-Type: application/json');
    echo json_encode(["success" => false, "error" => "Error: " . $e->getMessage()]);
}
?>