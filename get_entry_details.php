<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include 'db_connection.php';

if (!isset($_GET['entry_id']) || !isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Entry ID and Company ID are required."]);
    exit();
}

$entry_id = $_GET['entry_id'];
$company_id = $_GET['company_id'];

$conn->begin_transaction();

try {
    // Fetch main voucher data along with company and user info
    $sql_voucher = "SELECT 
                        jv.id,
                        jv.voucher_number AS entry_number,
                        jv.entry_date,
                        jv.narration,
                        jv.total_debits,
                        jv.total_credits,
                        jv.status,
                        c.name as company_name, 
                        c.logo as company_logo, 
                        u.name as user_name
                  FROM journal_vouchers jv
                  JOIN companies c ON jv.company_id = c.id
                  LEFT JOIN users u ON jv.created_by_id = u.id
                  WHERE jv.id = ? AND jv.company_id = ?";

    $stmt_voucher = $conn->prepare($sql_voucher);
    $stmt_voucher->bind_param("is", $entry_id, $company_id);
    $stmt_voucher->execute();
    $result_voucher = $stmt_voucher->get_result();
    $entry = $result_voucher->fetch_assoc();
    $stmt_voucher->close();

    if (!$entry) {
        $conn->rollback();
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Journal entry not found."]);
        exit();
    }

    // Fetch voucher lines
    $sql_lines = "SELECT account_id, description, debit, credit, payee_id FROM journal_voucher_lines WHERE voucher_id = ?";
    $stmt_lines = $conn->prepare($sql_lines);
    $stmt_lines->bind_param("i", $entry_id);
    $stmt_lines->execute();
    $result_lines = $stmt_lines->get_result();
    $lines = [];
    while ($line = $result_lines->fetch_assoc()) {
        $lines[] = $line;
    }
    $stmt_lines->close();

    $entry['lines'] = $lines;

    $conn->commit();

    http_response_code(200);
    echo json_encode(["success" => true, "entry" => $entry]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Database transaction failed", 
        "details" => $e->getMessage()
    ]);
}

$conn->close();
?>
