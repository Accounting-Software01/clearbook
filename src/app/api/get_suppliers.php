<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'auth_check.php';

$auth = new Auth();
$user_info = $auth->getUserInfo();

if ($_SERVER['REQUEST_METHOD'] == 'GET' && $user_info) {
    $company_id = $user_info->company_id;

    try {
        $sql = "SELECT id, supplier_name as name FROM suppliers WHERE company_id = ? ORDER BY supplier_name ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $suppliers = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode(['success' => true, 'suppliers' => $suppliers]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to fetch suppliers: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method or not authenticated.']);
}

$conn->close();
?>