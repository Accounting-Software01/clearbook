<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$company_id = $_GET['company_id'] ?? null;
$fromDate   = $_GET['fromDate'] ?? null;
$toDate     = $_GET['toDate'] ?? null;

if (!$company_id || !$fromDate || !$toDate) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters: company_id, fromDate, toDate']);
    exit;
}

try {
    global $conn;

    // The SQL query is updated to ensure all accounts are included, even those with no transactions.
    // Conditions were moved from the WHERE clause to the LEFT JOIN's ON clause.
    $sql = "
        SELECT 
            ca.account_code,
            ca.account_name,
            ca.account_type,
            COALESCE(SUM(jvl.debit), 0) as total_debit,
            COALESCE(SUM(jvl.credit), 0) as total_credit
        FROM chart_of_accounts ca
        LEFT JOIN journal_voucher_lines jvl ON ca.account_code = jvl.account_id
        LEFT JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
            AND jv.status = 'posted'
            AND (
                (ca.account_type IN ('Asset', 'Liability', 'Equity') AND jv.entry_date <= ?)
                OR
                (ca.account_type IN ('Revenue', 'Expense', 'Cost of Goods Sold') AND jv.entry_date BETWEEN ? AND ?)
            )
        WHERE ca.company_id = ?
        GROUP BY ca.account_code, ca.account_name, ca.account_type
        ORDER BY ca.account_type, ca.account_code
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("SQL prepare failed: " . $conn->error);
    
    $stmt->bind_param("ssss", $toDate, $fromDate, $toDate, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $report = [];
    $groups = ['Asset','Liability','Equity','Revenue','COGS','Expense'];
    foreach ($groups as $g) {
        $report[$g] = ['accounts' => [], 'total_debit' => 0, 'total_credit' => 0];
    }

    $natural_debit_accounts = ['Asset', 'Expense', 'Cost of Goods Sold'];

    while ($row = $result->fetch_assoc()) {
        $type = $row['account_type'];
        $balance = (float)$row['total_debit'] - (float)$row['total_credit'];
        
        $final_debit = 0;
        $final_credit = 0;

        if ($balance !== 0) {
            if (in_array($type, $natural_debit_accounts)) {
                if ($balance > 0) $final_debit = $balance;
                else $final_credit = abs($balance);
            } else {
                if ($balance < 0) $final_credit = abs($balance);
                else $final_debit = $balance;
            }
        }
        
        $group_key = ($type === 'Cost of Goods Sold') ? 'COGS' : $type;
        
        if (!isset($report[$group_key])) continue;

        $report[$group_key]['accounts'][] = [
            'account_code' => $row['account_code'],
            'account_name' => $row['account_name'],
            'debit' => round($final_debit, 2),
            'credit' => round($final_credit, 2)
        ];
    }
    
    $totals = [];
    $grand_total_debit = 0;
    $grand_total_credit = 0;

    foreach($report as $key => &$group) {
        $group_debit = array_sum(array_column($group['accounts'], 'debit'));
        $group_credit = array_sum(array_column($group['accounts'], 'credit'));
        
        $group['total_debit'] = round($group_debit, 2);
        $group['total_credit'] = round($group_credit, 2);
        
        $totals[$key] = ['debit' => $group['total_debit'], 'credit' => $group['total_credit']];
        
        $grand_total_debit += $group_debit;
        $grand_total_credit += $group_credit;
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'report' => $report,
        'totals' => $totals,
        'grand_totals' => [
            'debit' => round($grand_total_debit, 2),
            'credit' => round($grand_total_credit, 2)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Trial balance generation failed',
        'error' => $e->getMessage()
    ]);
}
