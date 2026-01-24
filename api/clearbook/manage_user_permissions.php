<?php
require_once __DIR__ . '/../../src/app/api/db_connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$user_id = isset($input['user_id']) ? (int)$input['user_id'] : null;
$company_id = $input['company_id'] ?? null;
$permissions = $input['permissions'] ?? [];

if (!$user_id || !$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'User ID and Company ID are required.']);
    exit;
}

if (!is_array($permissions)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Permissions must be an array.']);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt_delete = $pdo->prepare("DELETE FROM user_permissions WHERE user_id = ? AND company_id = ?");
    $stmt_delete->execute([$user_id, $company_id]);

    if (!empty($permissions)) {
        $stmt_insert = $pdo->prepare("INSERT INTO user_permissions (user_id, company_id, permission) VALUES (?, ?, ?)");
        foreach ($permissions as $permission) {
            if (is_string($permission) && !empty($permission)) {
                 $stmt_insert->execute([$user_id, $company_id, $permission]);
            }
        }
    }

    $pdo->commit();

    echo json_encode(['success' => true, 'message' => 'User permissions updated successfully.']);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Permissions update error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'An internal error occurred while updating permissions.']);
}

?>