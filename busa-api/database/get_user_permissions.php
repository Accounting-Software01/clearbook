<?php
require_once '../../src/app/api/db_connect.php';

header('Content-Type: application/json');

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
$companyId = isset($_GET['company_id']) ? $_GET['company_id'] : '';

if ($userId <= 0 || empty($companyId)) {
    echo json_encode(['success' => false, 'error' => 'User ID and Company ID are required.']);
    exit;
}

// Fetch role-based permissions
$roleSql = "SELECT p.permission FROM role_permissions p JOIN users u ON p.role = u.role WHERE u.user_id = ? AND p.company_type = (SELECT company_type FROM companies WHERE company_id = ?)";
$stmtRole = mysqli_prepare($conn, $roleSql);
mysqli_stmt_bind_param($stmtRole, "is", $userId, $companyId);
mysqli_stmt_execute($stmtRole);
$roleResult = mysqli_stmt_get_result($stmtRole);
$rolePermissions = [];
while ($row = mysqli_fetch_assoc($roleResult)) {
    $rolePermissions[] = $row['permission'];
}
mysqli_stmt_close($stmtRole);

// Fetch user-specific permissions
$userSql = "SELECT permission FROM user_permissions WHERE user_id = ? AND company_id = ?";
$stmtUser = mysqli_prepare($conn, $userSql);
mysqli_stmt_bind_param($stmtUser, "is", $userId, $companyId);
mysqli_stmt_execute($stmtUser);
$userResult = mysqli_stmt_get_result($stmtUser);
$userPermissions = [];
while ($row = mysqli_fetch_assoc($userResult)) {
    $userPermissions[] = $row['permission'];
}
mysqli_stmt_close($stmtUser);

echo json_encode([
    'success' => true,
    'role_permissions' => $rolePermissions,
    'user_permissions' => $userPermissions,
]);

mysqli_close($conn);
?>