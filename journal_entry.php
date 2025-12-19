<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include 'db_connection.php';

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->company_id) || !isset($data->user_id) || !isset($data->entry_date) || !isset($data->narration) || !isset($data->lines) || !is_array($data->lines)) {
    http_response_code(400);
    echo json_encode(["error" => "Incomplete data provided."]);
    exit();
}

$company_id = $data->company_id;
$user_id = $data->user_id;
$entry_date = $data->entry_date;
$narration = $data->narration;
$lines = $data->lines;

$total_debits = 0;
$total_credits = 0;

foreach ($lines as $line) {
    if ($line->type === 'debit') {
        $total_debits += $line->amount;
    } else {
        $total_credits += $line->amount;
    }
}

if (round($total_debits, 2) !== round($total_credits, 2) || $total_debits === 0) {
    http_response_code(400);
    echo json_encode(["error" => "Journal entry is unbalanced or total is zero."]);
    exit();
}

$conn->begin_transaction();

try {
    // 1. Generate Entry Number
    $prefix = "JV" . date('y') . date('m');
    $sql = "SELECT MAX(entry_number) as max_num FROM journal_entries WHERE entry_number LIKE '$prefix%'";
    $result = $conn->query($sql);
    $row = $result->fetch_assoc();
    $next_num = 1;
    if ($row && $row['max_num']) {
        $last_num = (int)substr($row['max_num'], -4);
        $next_num = $last_num + 1;
    }
    $entry_number = $prefix . str_pad($next_num, 4, '0', STR_PAD_LEFT);

    // 2. Insert into journal_entries
    $stmt = $conn->prepare("INSERT INTO journal_entries (company_id, user_id, entry_number, entry_date, narration, total_debits, total_credits, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')");
    $stmt->bind_param("ssssdds", $company_id, $user_id, $entry_number, $entry_date, $narration, $total_debits, $total_credits);
    $stmt->execute();
    $entry_id = $stmt->insert_id;

    // 3. Insert into journal_entry_lines
    $stmt_lines = $conn->prepare("INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)");
    foreach ($lines as $line) {
        $debit = $line->type === 'debit' ? $line->amount : 0;
        $credit = $line->type === 'credit' ? $line->amount : 0;
        $stmt_lines->bind_param("isdd", $entry_id, $line->accountId, $debit, $credit);
        $stmt_lines->execute();
    }

    $conn->commit();

    http_response_code(201);
    echo json_encode(["success" => true, "message" => "Journal entry created successfully.", "entryNumber" => $entry_number]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Database transaction failed: " . $e->getMessage()]);
}

$conn->close();
?>