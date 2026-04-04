<?php
// api/clearbook/get-general-ledger-v2.php

// Error Reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// DB Connection
require_once __DIR__ . '/../../src/app/api/db_connect.php';

// Get and Validate Input
$company_id = $_GET['company_id'] ?? null;
$account_code = $_GET['account_code'] ?? null;
$from_date = $_GET['from_date'] ?? null;
$to_date = $_GET['to_date'] ?? null;

if (!$company_id || !$account_code || !$from_date || !$to_date) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters: company_id, account_code, from_date, to_date.']);
    exit;
}

try {
    // Use a transaction for data consistency
    $pdo->beginTransaction();

    // 1. Get Opening Balance
    $opening_balance_sql = "
        SELECT 
            COALESCE(SUM(jvl.debit) - SUM(jvl.credit), 0) as opening_balance
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.journal_voucher_id = jv.id
        WHERE jvl.gl_account_code = :account_code 
          AND jv.company_id = :company_id
          AND jv.entry_date < :from_date
          AND jv.status = 'Posted'
    ";
    $stmt_ob = $pdo->prepare($opening_balance_sql);
    $stmt_ob->execute([
        ':account_code' => $account_code,
        ':company_id' => $company_id,
        ':from_date' => $from_date
    ]);
    $opening_balance_result = $stmt_ob->fetch(PDO::FETCH_ASSOC);
    $opening_balance = (float)($opening_balance_result['opening_balance'] ?? 0);

    // 2. Fetch Transactions for the period and include user name and journal type
    $transactions_sql = "
        SELECT 
            jv.entry_date as date,
            jv.voucher_number as reference,
            jvl.description,
            jvl.debit,
            jvl.credit,
            u.full_name as posted_by,
            'Journal Entry' as journal_type -- This is sourced from journal_vouchers
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.journal_voucher_id = jv.id
        LEFT JOIN users u ON jv.created_by_id = u.id -- LEFT JOIN is safer
        WHERE jvl.gl_account_code = :account_code 
          AND jv.company_id = :company_id
          AND jv.entry_date BETWEEN :from_date AND :to_date
          AND jv.status = 'Posted'
        ORDER BY jv.entry_date ASC, jv.id ASC
    ";
    $stmt_tx = $pdo->prepare($transactions_sql);
    $stmt_tx->execute([
        ':account_code' => $account_code,
        ':company_id' => $company_id,
        ':from_date' => $from_date,
        ':to_date' => $to_date
    ]);
    $transactions = $stmt_tx->fetchAll(PDO::FETCH_ASSOC);

    // 3. Get Account Details
    $account_sql = "SELECT account_name, account_type, normal_balance FROM chart_of_accounts WHERE account_code = :account_code AND company_id = :company_id";
    $stmt_acc = $pdo->prepare($account_sql);
    $stmt_acc->execute([':account_code' => $account_code, ':company_id' => $company_id]);
    $account_details = $stmt_acc->fetch(PDO::FETCH_ASSOC);

    // 4. Calculate running balance and totals
    $running_balance = $opening_balance;
    $total_debit = 0;
    $total_credit = 0;
    $processed_transactions = [];

    foreach ($transactions as $tx) {
        $debit = (float)$tx['debit'];
        $credit = (float)$tx['credit'];
        $running_balance += $debit - $credit;

        $total_debit += $debit;
        $total_credit += $credit;
        
        $tx['running_balance'] = $running_balance;
        $processed_transactions[] = $tx;
    }
    
    $closing_balance = $running_balance;
    $net_movement = $total_debit - $total_credit;

    // 5. Assemble the final response object
    $response = [
        'success' => true,
        'summary' => [
            'account_details' => $account_details ?: ['account_name' => 'N/A', 'account_type' => 'N/A', 'account_code' => $account_code, 'normal_balance' => 'debit'],
            'period_str' => "{$from_date} to {$to_date}",
            'opening_balance' => $opening_balance,
            'total_debit' => $total_debit,
            'total_credit' => $total_credit,
            'net_movement' => $net_movement,
            'closing_balance' => $closing_balance,
            'transaction_count' => count($processed_transactions)
        ],
        'transactions' => $processed_transactions
    ];

    $pdo->commit();
    
    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to generate new ledger: ' . $e->getMessage()]);
}

?>