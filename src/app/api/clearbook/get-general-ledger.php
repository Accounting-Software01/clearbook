<?php
require_once __DIR__ . '/db_connect.php';

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- Get Parameters ---
$company_id = $_GET['company_id'] ?? null;
$account_code = $_GET['account_code'] ?? null;
$from_date = $_GET['from_date'] ?? null;
$to_date = $_GET['to_date'] ?? null;

// --- Validation ---
if (!$company_id || !$account_code || !$from_date || !$to_date) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters (company_id, account_code, from_date, to_date).']);
    exit;
}

global $conn;

try {
    // --- 1. Get Account Details ---
    $acc_stmt = $conn->prepare("SELECT account_name, account_type FROM chart_of_accounts WHERE account_code = ? AND company_id = ?");
    $acc_stmt->bind_param("ss", $account_code, $company_id);
    $acc_stmt->execute();
    $acc_result = $acc_stmt->get_result();
    $account_details = $acc_result->fetch_assoc();
    if (!$account_details) {
        throw new Exception("Account not found.");
    }
    $acc_stmt->close();

    // --- 2. Calculate Opening Balance ---
    $ob_stmt = $conn->prepare("
        SELECT
            COALESCE(SUM(jvl.debit), 0) AS total_debit,
            COALESCE(SUM(jvl.credit), 0) AS total_credit
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jvl.company_id = ?
          AND jvl.account_id = ?
          AND jv.status = 'posted'
          AND jv.entry_date < ?
    ");
    $ob_stmt->bind_param("sss", $company_id, $account_code, $from_date);
    $ob_stmt->execute();
    $ob_result = $ob_stmt->get_result()->fetch_assoc();
    $opening_balance = (float)$ob_result['total_debit'] - (float)$ob_result['total_credit'];
    $ob_stmt->close();

    // --- 3. Get Transactions within Period ---
    $tx_stmt = $conn->prepare("
        SELECT
            jv.entry_date,
            jv.voucher_number,
            jvl.description,
            jvl.debit,
            jvl.credit
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jvl.company_id = ?
          AND jvl.account_id = ?
          AND jv.status = 'posted'
          AND jv.entry_date BETWEEN ? AND ?
        ORDER BY jv.entry_date ASC, jv.id ASC
    ");
    $tx_stmt->bind_param("ssss", $company_id, $account_code, $from_date, $to_date);
    $tx_stmt->execute();
    $transactions_result = $tx_stmt->get_result();
    
    $transactions = [];
    $total_debit_period = 0;
    $total_credit_period = 0;
    $running_balance = $opening_balance;

    while ($row = $transactions_result->fetch_assoc()) {
        $debit = (float)$row['debit'];
        $credit = (float)$row['credit'];
        $running_balance += $debit - $credit;

        $transactions[] = [
            'date' => $row['entry_date'],
            'reference' => $row['voucher_number'],
            'description' => $row['description'],
            'debit' => number_format($debit, 2),
            'credit' => number_format($credit, 2),
            'running_balance' => number_format($running_balance, 2)
        ];
        $total_debit_period += $debit;
        $total_credit_period += $credit;
    }
    $tx_stmt->close();

    // --- 4. Final Calculations & Response ---
    $closing_balance = $opening_balance + $total_debit_period - $total_credit_period;

    $summary = [
        'account_details' => $account_details,
        'period_str' => date('F d, Y', strtotime($from_date)) . ' to ' . date('F d, Y', strtotime($to_date)),
        'opening_balance' => number_format($opening_balance, 2),
        'total_debit' => number_format($total_debit_period, 2),
        'total_credit' => number_format($total_credit_period, 2),
        'net_movement' => number_format($total_debit_period - $total_credit_period, 2),
        'closing_balance' => number_format($closing_balance, 2),
        'transaction_count' => count($transactions)
    ];

    echo json_encode([
        'success' => true,
        'summary' => $summary,
        'transactions' => $transactions
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred.', 'details' => $e->getMessage()]);
}

$conn->close();
?>