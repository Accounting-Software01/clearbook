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
$fromDate = $_GET['fromDate'] ?? null;
$toDate = $_GET['toDate'] ?? null;

if (!$company_id || !$fromDate || !$toDate) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID, fromDate, and toDate are required.']);
    exit;
}

try {
    $sql = "SELECT
                coa.account_code,
                coa.account_name,
                coa.account_type,
                SUM(jvl.debit) as total_debit,
                SUM(jvl.credit) as total_credit
            FROM
                journal_voucher_lines jvl
            JOIN
                chart_of_accounts coa ON jvl.account_id = coa.account_code AND jvl.company_id = coa.company_id
            JOIN
                journal_vouchers jv ON jvl.voucher_id = jv.id AND jvl.company_id = jv.company_id
            WHERE
                jv.company_id = ? AND jv.status = 'posted' AND jv.entry_date BETWEEN ? AND ?
                AND coa.account_type IN ('Revenue', 'COGS', 'Expense')
            GROUP BY
                coa.account_code, coa.account_name, coa.account_type
            ORDER BY
                coa.account_type, coa.account_code";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('SQL statement preparation failed: ' . $conn->error);
    }

    $stmt->bind_param('sss', $company_id, $fromDate, $toDate);
    $stmt->execute();
    $result = $stmt->get_result();

    $revenue = ['accounts' => [], 'total' => 0];
    $cogs = ['accounts' => [], 'total' => 0];
    $expenses = ['accounts' => [], 'total' => 0];

    while ($row = $result->fetch_assoc()) {
        $balance = (float)$row['total_debit'] - (float)$row['total_credit'];
        $account = [
            'id' => $row['account_code'],
            'name' => $row['account_name'],
            'amount' => 0
        ];

        switch ($row['account_type']) {
            case 'Revenue':
                $amount = -$balance; // Credit balance
                $account['amount'] = $amount;
                $revenue['accounts'][] = $account;
                $revenue['total'] += $amount;
                break;
            case 'COGS':
                $amount = $balance; // Debit balance
                $account['amount'] = $amount;
                $cogs['accounts'][] = $account;
                $cogs['total'] += $amount;
                break;
            case 'Expense':
                $amount = $balance; // Debit balance
                $account['amount'] = $amount;
                $expenses['accounts'][] = $account;
                $expenses['total'] += $amount;
                break;
        }
    }
    $stmt->close();

    $grossProfit = $revenue['total'] - $cogs['total'];
    $netIncome = $grossProfit - $expenses['total'];
    $revenueBase = $revenue['total'] == 0 ? 1 : $revenue['total'];

    // Add percentages to each line item
    foreach ($revenue['accounts'] as &$account) $account['percentage'] = ($account['amount'] / $revenueBase) * 100;
    foreach ($cogs['accounts'] as &$account) $account['percentage'] = ($account['amount'] / $revenueBase) * 100;
    foreach ($expenses['accounts'] as &$account) $account['percentage'] = ($account['amount'] / $revenueBase) * 100;

    $processedData = [
        'revenue' => ['accounts' => $revenue['accounts'], 'total' => $revenue['total'], 'totalPercentage' => ($revenue['total'] / $revenueBase) * 100],
        'costOfGoodsSold' => ['accounts' => $cogs['accounts'], 'total' => $cogs['total'], 'totalPercentage' => ($cogs['total'] / $revenueBase) * 100],
        'grossProfit' => ['amount' => $grossProfit, 'percentage' => ($grossProfit / $revenueBase) * 100],
        'expenses' => ['accounts' => $expenses['accounts'], 'total' => $expenses['total'], 'totalPercentage' => ($expenses['total'] / $revenueBase) * 100],
        'netIncome' => ['amount' => $netIncome, 'percentage' => ($netIncome / $revenueBase) * 100],
        'summary' => ['totalRevenue' => $revenue['total'], 'totalExpenses' => $cogs['total'] + $expenses['total'], 'netIncome' => $netIncome]
    ];

    echo json_encode(['success' => true, 'processedData' => $processedData]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to generate income statement: ' . $e->getMessage()]);
}

$conn->close();
?>