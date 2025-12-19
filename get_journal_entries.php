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

// Select from journal_vouchers and alias columns to match frontend expectations
$sql = "SELECT 
            id, 
            voucher_number AS entry_number, 
            entry_date, 
            narration, 
            total_debits, 
            status, 
            created_by_id AS user_id 
        FROM journal_vouchers 
        WHERE company_id = ? 
        ORDER BY entry_date DESC, id DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $company_id);
$stmt->execute();
$result = $stmt->get_result();

$entries = [];
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $entries[] = $row;
    }
}

http_response_code(200);
echo json_encode(["success" => true, "data" => $entries]);

$conn->close();
?>