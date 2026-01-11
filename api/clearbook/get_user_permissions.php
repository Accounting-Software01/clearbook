<?php
require_once __DIR__ . '/../../src/app/api/db_connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // In production, restrict this to your frontend domain
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user_id = $_GET['user_id'] ?? null;
$company_id = $_GET['company_id'] ?? null;

if (!$user_id || !$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User ID and Company ID are required.']);
    exit;
}

try {
    // FIX 1: Query users table by `id`, not `user_id`
    $stmt_user = $pdo->prepare("SELECT role, company_type FROM users WHERE id = ? AND company_id = ?");
    $stmt_user->execute([$user_id, $company_id]);
    $user_info = $stmt_user->fetch(PDO::FETCH_ASSOC);

    if (!$user_info) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found.']);
        exit;
    }

    $role = $user_info['role'];
    $company_type = $user_info['company_type'];

    $role_permissions = [];

    // FIX 2: Define modules statically for admin role, don't query the database
    if ($role === 'admin') {
        $modules = [
            ["permission" => "view_dashboard"],
            ["permission" => "manage_users"],
            ["permission" => "view_accounting"],
            ["permission" => "manage_settings"],
            ["permission" => "view_production"],
            ["permission" => "view_inventory"],
            ["permission" => "view_procurement"],
            ["permission" => "view_sales"],
        ];
        // Extract just the permission strings
        $role_permissions = array_column($modules, 'permission');
    } else {
        // Fetch role-based permissions from the role_permissions table
        $stmt_role = $pdo->prepare("SELECT permission FROM role_permissions WHERE role = ? AND (company_type = ? OR company_type = 'all')");
        $stmt_role->execute([$role, $company_type]);
        $role_permissions = $stmt_role->fetchAll(PDO::FETCH_COLUMN, 0);
    }

    // Fetch user-specific permissions from the user_permissions table
    $stmt_user_perms = $pdo->prepare("SELECT permission FROM user_permissions WHERE user_id = ? AND company_id = ?");
    $stmt_user_perms->execute([$user_id, $company_id]);
    $user_permissions = $stmt_user_perms->fetchAll(PDO::FETCH_COLUMN, 0);

    // Return both sets of permissions
    echo json_encode([
        'success' => true,
        'role_permissions' => $role_permissions,
        'user_permissions' => $user_permissions
    ]);

} catch (Exception $e) {
    error_log("Get User Permissions Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal server error occurred while fetching permissions.']);
}

?>