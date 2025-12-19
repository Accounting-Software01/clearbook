<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include 'db_connection.php';

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(["error" => "Company ID is required."]);
    exit();
}

$company_id = $_GET['company_id'];

// Get pending count from journal_vouchers with 'posted' status
$sql_pending = "SELECT COUNT(*) as pending_count FROM journal_vouchers WHERE company_id = ? AND status = 'posted'";
$stmt_pending = $conn->prepare($sql_pending);
$stmt_pending->bind_param("s", $company_id);
$stmt_pending->execute();
$result_pending = $stmt_pending->get_result();
$pending_count = $result_pending->fetch_assoc()['pending_count'];

// Get lock status from global_settings (assuming this remains the same)
$sql_lock = "SELECT is_locked FROM global_settings WHERE company_id = ?";
$stmt_lock = $conn->prepare($sql_lock);
$stmt_lock->bind_param("s", $company_id);
$stmt_lock->execute();
$result_lock = $stmt_lock->get_result();
$is_locked = $result_lock->num_rows > 0 ? (bool)$result_lock->fetch_assoc()['is_locked'] : true; // Default to locked

$overview = [
    'pending_count' => (int)$pending_count,
    'is_locked' => $is_locked
];

http_response_code(200);
echo json_encode($overview);

$conn->close();
?>