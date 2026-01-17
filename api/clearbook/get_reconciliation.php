<?php
// api/clearbook/get_reconciliation.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

function handle_prepare_error($conn, $context) {
    http_response_code(500);
    echo json_encode(['error' => 'Database query preparation failed.', 'context' => $context, 'db_error' => $conn->error]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit();
}

if (empty($_GET['company_id']) || empty($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID and Reconciliation ID are required.']);
    exit();
}

$company_business_id = $_GET['company_id'];
$reconciliation_id = $_GET['id'];

// 1. Get the main reconciliation details (CORRECTED QUERY)
// Note: The bank_reconciliations table uses the varchar company_id, not the integer foreign key.
$rec_sql = "SELECT br.id, br.account_id, coa.account_name, coa.account_code, br.statement_date, br.statement_balance, br.status, br.notes FROM bank_reconciliations AS br JOIN chart_of_accounts AS coa ON br.account_id = coa.id WHERE br.id = ? AND br.company_id = ?";
$rec_stmt = $conn->prepare($rec_sql);
if ($rec_stmt === false) { handle_prepare_error($conn, 'get_reconciliation_details'); }
$rec_stmt->bind_param('is', $reconciliation_id, $company_business_id); // CORRECT: Use integer and string
$rec_stmt->execute();
$rec_result = $rec_stmt->get_result();
if ($rec_result->num_rows === 0) { http_response_code(404); echo json_encode(['error' => 'Reconciliation not found for this company.']); exit(); }
$reconciliation_data = $rec_result->fetch_assoc();
$rec_stmt->close();

$account_code = $reconciliation_data['account_code'];
$statement_date = $reconciliation_data['statement_date'];

// 2. Get all relevant transactions for the period
$trans_sql = "SELECT jvl.id, jv.entry_date, jv.voucher_number AS entry_no, jvl.description AS narration, jvl.debit, jvl.credit FROM journal_voucher_lines AS jvl JOIN journal_vouchers AS jv ON jvl.voucher_id = jv.id WHERE jvl.account_id = ? AND jv.company_id = ? AND jv.entry_date <= ? ORDER BY jv.entry_date ASC";
$trans_stmt = $conn->prepare($trans_sql);
if ($trans_stmt === false) { handle_prepare_error($conn, 'get_transactions'); }
$trans_stmt->bind_param('sss', $account_code, $company_business_id, $statement_date);
$trans_stmt->execute();
$transactions_data = $trans_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$trans_stmt->close();

// 3. Calculate the ledger balance
$bal_sql = "SELECT SUM(jvl.debit) - SUM(jvl.credit) AS ledger_balance FROM journal_voucher_lines AS jvl JOIN journal_vouchers AS jv ON jvl.voucher_id = jv.id WHERE jvl.account_id = ? AND jv.company_id = ? AND jv.entry_date <= ?";
$bal_stmt = $conn->prepare($bal_sql);
if ($bal_stmt === false) { handle_prepare_error($conn, 'get_ledger_balance'); }
$bal_stmt->bind_param('sss', $account_code, $company_business_id, $statement_date);
$bal_stmt->execute();
$balance_result = $bal_stmt->get_result()->fetch_assoc();
$ledger_balance = $balance_result['ledger_balance'] ?? "0.00";
$bal_stmt->close();

// 4. Get a list of already cleared transaction IDs (CORRECTED QUERY)
$cleared_sql = "SELECT transaction_id FROM bank_reconciliation_lines WHERE reconciliation_id = ?";
$cleared_stmt = $conn->prepare($cleared_sql);
if ($cleared_stmt === false) { handle_prepare_error($conn, 'get_cleared_items'); }
$cleared_stmt->bind_param('i', $reconciliation_id);
$cleared_stmt->execute();
$cleared_result = $cleared_stmt->get_result();
$cleared_transaction_ids = [];
while($row = $cleared_result->fetch_assoc()) { $cleared_transaction_ids[] = (string)$row['transaction_id']; }
$cleared_stmt->close();

// 5. Assemble and return the final JSON object
$response = [
    'reconciliation' => $reconciliation_data,
    'transactions' => $transactions_data,
    'ledger_balance' => $ledger_balance,
    'cleared_transaction_ids' => $cleared_transaction_ids
];

http_response_code(200);
echo json_encode($response);

$conn->close();
?>