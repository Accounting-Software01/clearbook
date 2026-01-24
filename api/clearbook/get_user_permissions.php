<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../src/app/api/db_connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For development. In production, restrict to your frontend domain.
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- Main Logic ---

$user_id = $_GET['user_id'] ?? null;
$company_id = $_GET['company_id'] ?? null;

if (!$user_id || !$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User ID and Company ID are required.']);
    exit;
}

try {
    // 1. Get the user's assigned role from the `users` table.
    $stmt_role = $pdo->prepare("SELECT role FROM users WHERE user_id = ? AND company_id = ?");
    $stmt_role->execute([$user_id, $company_id]);
    $user_data = $stmt_role->fetch(PDO::FETCH_ASSOC);

    if (!$user_data) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'User not found.']);
        exit;
    }
    
    $role = $user_data['role'];
    $role_permissions = [];

    // 2. If a role is assigned, get all base permissions for that role.
    if ($role) {
        // Role permissions are global, not company-specific
        $stmt_role_perms = $pdo->prepare("SELECT permission FROM role_permissions WHERE role = ?");
        $stmt_role_perms->execute([$role]);
        $role_permissions = $stmt_role_perms->fetchAll(PDO::FETCH_COLUMN, 0); 
    }

    // 3. Get all user-specific, individual permissions from the `user_permissions` table.
    $stmt_user_perms = $pdo->prepare("SELECT permission FROM user_permissions WHERE user_id = ? AND company_id = ?");
    $stmt_user_perms->execute([$user_id, $company_id]);
    $user_specific_permissions = $stmt_user_perms->fetchAll(PDO::FETCH_COLUMN, 0);

    // 4. Merge the base role permissions with the user-specific permissions.
    $final_permissions = array_unique(array_merge($role_permissions, $user_specific_permissions));

    // 5. Return the final, consolidated list of permissions.
    echo json_encode([
        'success' => true, 
        'permissions' => array_values($final_permissions)
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    exit;
}

?>