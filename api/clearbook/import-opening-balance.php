<?php
// api/clearbook/import-opening-balance.php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/db_connect.php';

if (!isset($_POST['company_id'], $_POST['user_id'], $_POST['entry_date'], $_FILES['csv_file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: company_id, user_id, entry_date, or csv_file.']);
    exit;
}

if ($_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'File upload error: ' . $_FILES['csv_file']['error']]);
    exit;
}

$company_id = $_POST['company_id'];
$user_id = $_POST['user_id'];
$entry_date = $_POST['entry_date'];
$file_path = $_FILES['csv_file']['tmp_name'];

$conn->begin_transaction();
try {
    $lines = [];
    $total_debits = 0;
    $total_credits = 0;
    $header = null;
    $required_headers = ['AccountCode', 'Amount', 'Type'];

    if (($handle = fopen($file_path, 'r')) === FALSE) {
        throw new Exception('Cannot open uploaded file.');
    }

    $header = array_map('trim', fgetcsv($handle, 1000, ","));
    if (!in_array('AccountCode', $header) || !in_array('Amount', $header) || !in_array('Type', $header)) {
        throw new Exception('Invalid CSV header. It must contain AccountCode, Amount, and Type columns.');
    }

    while (($row = fgetcsv($handle, 1000, ",")) !== FALSE) {
        $row_data = array_combine($header, $row);
        
        // Skip rows that don't have an amount or type
        if (empty(trim($row_data['Amount'])) || empty(trim($row_data['Type']))) {
            continue;
        }

        $account_id = trim($row_data['AccountCode']);
        $amount = (float)trim($row_data['Amount']);
        $type = strtolower(trim($row_data['Type']));

        if ($amount <= 0) continue;

        $debit = 0;
        $credit = 0;
        if ($type == 'debit') {
            $debit = $amount;
            $total_debits += $debit;
        } elseif ($type == 'credit') {
            $credit = $amount;
            $total_credits += $credit;
        } else {
            throw new Exception("Invalid balance type found for account {$account_id}. Must be 'Debit' or 'Credit'.");
        }
        
        $lines[] = ['account_id' => $account_id, 'debit' => $debit, 'credit' => $credit];
    }
    fclose($handle);

    if (count($lines) === 0) {
        throw new Exception('The uploaded CSV file does not contain any valid rows to import.');
    }

    if (abs($total_debits - $total_credits) > 0.001) {
        throw new Exception(sprintf('Entries are not balanced. Total Debits: %.2f, Total Credits: %.2f', $total_debits, $total_credits));
    }

    $year = date('Y', strtotime($entry_date));
    $voucher_prefix = $company_id . '-' . $year . '-';
    $sql = "SELECT MAX(CAST(SUBSTRING(voucher_number, LENGTH(?) + 1) AS UNSIGNED)) AS max_no FROM journal_vouchers WHERE voucher_number LIKE ? AND company_id = ?";
    $stmt_num = $conn->prepare($sql);
    $like_pattern = $voucher_prefix . '%';
    $stmt_num->bind_param('sss', $voucher_prefix, $like_pattern, $company_id);
    $stmt_num->execute();
    $result = $stmt_num->get_result()->fetch_assoc();
    $next_no = ($result['max_no'] ?? 0) + 1;
    $voucher_number = $voucher_prefix . str_pad($next_no, 6, '0', STR_PAD_LEFT);
    $stmt_num->close();

    $narration = 'Opening Balance as of ' . date('d-M-Y', strtotime($entry_date));
    $stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Opening Balance', ?, 'Opening Balance', ?, ?, ?, 'posted')");
    if (!$stmt) throw new Exception('Voucher insert prep failed: ' . $conn->error);
    $stmt->bind_param('sisssdd', $company_id, $user_id, $voucher_number, $entry_date, $narration, $total_debits, $total_credits);
    $stmt->execute();
    $voucher_id = $stmt->insert_id;
    if ($voucher_id === 0) throw new Exception('Failed to create journal voucher.');
    $stmt->close();

    $line_stmt = $conn->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit) VALUES (?, ?, ?, ?, ?, ?)");
    if (!$line_stmt) throw new Exception('Line insert prep failed: ' . $conn->error);

    foreach ($lines as $line) {
        $line_stmt->bind_param('siisdd', $company_id, $user_id, $voucher_id, $line['account_id'], $line['debit'], $line['credit']);
        $line_stmt->execute();
    }
    $line_stmt->close();

    $conn->commit();

    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'Opening balance imported successfully.', 'voucher_id' => $voucher_id]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>