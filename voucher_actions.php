<?php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $voucherId = $_GET['id'] ?? null;
    if (!$voucherId) {
        http_response_code(400);
        echo json_encode(["error" => "Voucher ID is required"]);
        exit();
    }

    $sql = "SELECT id, status, is_locked FROM journal_vouchers WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $voucherId);
    $stmt->execute();
    $result = $stmt->get_result();
    $voucher = $result->fetch_assoc();

    if (!$voucher) {
        http_response_code(404);
        echo json_encode(["error" => "Voucher not found"]);
        exit();
    }

    echo json_encode($voucher);
    $stmt->close();

} elseif ($method === 'POST') {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw);

    $voucherId = $data->id ?? null;
    if (!$voucherId) {
        http_response_code(400);
        echo json_encode(["error" => "Voucher ID is required"]);
        exit();
    }

    $updates = [];
    $params = [];
    $types = '';

    if (isset($data->status)) {
        $updates[] = "status = ?";
        $params[] = $data->status;
        $types .= 's';
    }

    if (isset($data->isLocked)) {
        $updates[] = "is_locked = ?";
        $params[] = $data->isLocked ? 1 : 0;
        $types .= 'i';
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(["error" => "No update fields provided"]);
        exit();
    }

    $params[] = $voucherId;
    $types .= 'i';

    $sql = "UPDATE journal_vouchers SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => "Failed to update voucher"]);
    }

    $stmt->close();
}

$conn->close();
exit();
?>