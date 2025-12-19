<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include 'db_connection.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->id) || !isset($data->status)) {
    http_response_code(400);
    echo json_encode(["error" => "Entry ID and status are required."]);
    exit();
}

$entry_id = $data->id;
$status = $data->status;

// Adjusted status values to match your schema if needed
if (!in_array($status, ['approved', 'rejected', 'posted'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid status provided. Use 'approved', 'rejected', or 'posted'."]);
    exit();
}

$conn->begin_transaction();

try {
    // Update the status in the journal_vouchers table
    $stmt = $conn->prepare("UPDATE journal_vouchers SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $entry_id);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        $conn->commit();
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Entry status updated successfully."]);
    } else {
        $conn->rollback();
        http_response_code(404);
        echo json_encode(["error" => "Entry not found or status is already the same."]);
    }
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Database transaction failed: " . $e->getMessage()]);
}

$conn->close();
?>
