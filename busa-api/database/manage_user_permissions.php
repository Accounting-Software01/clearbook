<?php
require_once '../../src/app/api/db_connect.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

$userId = $data['user_id'] ?? 0;
$permissions = $data['permissions'] ?? [];
$companyId = $data['company_id'] ?? '';

if ($userId <= 0 || empty($companyId)) {
    echo json_encode(['success' => false, 'error' => 'User ID and Company ID are required.']);
    exit;
}

mysqli_begin_transaction($conn);

try {
    // First, delete all existing user-specific permissions for this user
    $deleteSql = "DELETE FROM user_permissions WHERE user_id = ? AND company_id = ?";
    $stmtDelete = mysqli_prepare($conn, $deleteSql);
    mysqli_stmt_bind_param($stmtDelete, "is", $userId, $companyId);
    mysqli_stmt_execute($stmtDelete);
    mysqli_stmt_close($stmtDelete);

    // Now, insert the new set of user-specific permissions, if any
    if (!empty($permissions)) {
        $insertSql = "INSERT INTO user_permissions (user_id, permission, company_id) VALUES (?, ?, ?)";
        $stmtInsert = mysqli_prepare($conn, $insertSql);
        foreach ($permissions as $permission) {
            mysqli_stmt_bind_param($stmtInsert, "iss", $userId, $permission, $companyId);
            mysqli_stmt_execute($stmtInsert);
        }
        mysqli_stmt_close($stmtInsert);
    }

    mysqli_commit($conn);
    echo json_encode(['success' => true, 'message' => 'User permissions updated successfully.']);

} catch (Exception $e) {
    mysqli_rollback($conn);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}

mysqli_close($conn);
?>