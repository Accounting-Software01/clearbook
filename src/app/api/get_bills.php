<?php
header('Content-Type: application/json');
include 'db_connect.php';
include 'auth_check.php';

$auth = new Auth();
$user_info = $auth->getUserInfo();

if ($_SERVER['REQUEST_METHOD'] == 'GET' && $user_info) {
    $company_id = $user_info->company_id;

    try {
        $sql = "SELECT b.id, b.bill_date, CONCAT('BILL-', b.id) as reference, s.supplier_name as supplier, b.due_date, b.total_amount FROM bills b JOIN suppliers s ON b.supplier_id = s.id WHERE b.company_id = ? ORDER BY b.bill_date DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $bills = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        echo json_encode(['success' => true, 'bills' => $bills]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to fetch bills: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method or not authenticated.']);
}

$conn->close();
?>