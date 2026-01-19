<?php
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

$company_id = $_GET['company_id'] ?? null;
$toDate = $_GET['toDate'] ?? null;

// Use fromDate as the start of the financial year if not provided.
$fromDate = $_GET['fromDate'] ?? date('Y-01-01'); 

if (!$company_id || !$toDate) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID and toDate are required.']);
    exit;
}

try {
    // This query is designed to build a full trial balance. 
    // It starts with the chart of accounts and calculates the balance for each account.
    $sql = "SELECT
                coa.account_code,
                coa.account_name,
                coa.account_type,
                COALESCE(SUM(jvl.debit), 0) AS total_debits,
                COALESCE(SUM(jvl.credit), 0) AS total_credits
            FROM
                chart_of_accounts coa
            LEFT JOIN
                journal_voucher_lines jvl ON coa.account_code = jvl.account_id AND coa.company_id = jvl.company_id
            LEFT JOIN
                journal_vouchers jv ON jvl.voucher_id = jv.id AND jv.company_id = jvl.company_id
                                    AND jv.status = 'posted'
                                    AND jv.entry_date <= ?
            WHERE
                coa.company_id = ?
            GROUP BY
                coa.account_code, coa.account_name, coa.account_type
            ORDER BY
                coa.account_type, coa.account_code";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('SQL statement preparation failed: ' . $conn->error);
    }
    
    $stmt->bind_param('ss', $toDate, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    // The frontend expects the data to be grouped into sections.
    $report = [
        'Asset' => ['accounts' => []],
        'Liability' => ['accounts' => []],
        'Equity' => ['accounts' => []],
        'Revenue' => ['accounts' => []],
        'COGS' => ['accounts' => []],
        'Expense' => ['accounts' => []],
    ];

    $grand_totals = [
        'debit' => 0.0,
        'credit' => 0.0,
    ];

    while ($row = $result->fetch_assoc()) {
        // Calculate the final balance for each account.
        $balance = $row['total_debits'] - $row['total_credits'];

        $debit_balance = 0.0;
        $credit_balance = 0.0;

        // An account has either a debit or a credit balance, not both.
        if ($balance > 0) {
            $debit_balance = (float)$balance;
        } else {
            $credit_balance = (float)abs($balance);
        }

        $account_entry = [
            'account_code' => $row['account_code'],
            'account_name' => $row['account_name'],
            'debit' => $debit_balance,
            'credit' => $credit_balance,
        ];

        // Add the account to the correct section.
        $account_type = $row['account_type'];
        if (array_key_exists($account_type, $report)) {
            $report[$account_type]['accounts'][] = $account_entry;
        }

        // Add to the grand totals.
        $grand_totals['debit'] += $debit_balance;
        $grand_totals['credit'] += $credit_balance;
    }

    $stmt->close();

    // Return the full, structured response that the frontend expects.
    echo json_encode([
        'success' => true,
        'report' => $report,
        'grand_totals' => $grand_totals,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to generate trial balance: ' . $e->getMessage()]);
}

$conn->close();
?>