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

if (!$company_id || !$toDate) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID and toDate are required.']);
    exit;
}

// Determine the start of the financial year.
$year = date('Y', strtotime($toDate));
$fromDate = $year . '-01-01';

try {
    // 1. Get all account balances up to the 'toDate' for balance sheet accounts
    $balanceSql = "SELECT
                       coa.account_code,
                       coa.account_name,
                       coa.account_type,
                       COALESCE(SUM(jvl.debit), 0) - COALESCE(SUM(jvl.credit), 0) as balance
                   FROM
                       chart_of_accounts coa
                   LEFT JOIN
                       journal_voucher_lines jvl ON coa.account_code = jvl.account_id AND jvl.company_id = coa.company_id
                   LEFT JOIN
                       journal_vouchers jv ON jvl.voucher_id = jv.id AND jv.company_id = jvl.company_id AND jv.status = 'posted' AND jv.entry_date <= ?
                   WHERE
                       coa.company_id = ? AND coa.account_type IN ('Asset', 'Liability', 'Equity')
                   GROUP BY
                       coa.account_code, coa.account_name, coa.account_type";
    
    $stmt = $conn->prepare($balanceSql);
    if (!$stmt) throw new Exception("Balance sheet accounts prep failed: " . $conn->error);
    $stmt->bind_param('ss', $toDate, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $sections = [
        'Asset' => ['subGroups' => [], 'total' => 0],
        'Liability' => ['subGroups' => [], 'total' => 0],
        'Equity' => ['subGroups' => [], 'total' => 0]
    ];

    while ($row = $result->fetch_assoc()) {
        $type = $row['account_type'];
        $balance = (float)$row['balance'];

        // Flip the sign for Liabilities and Equity for standard reporting
        if ($type === 'Liability' || $type === 'Equity') {
            $balance = -$balance;
        }

        if (abs($balance) < 0.01) continue; // Skip accounts with no balance

        $subType = explode(' - ', $row['account_name'])[0];
        if (!isset($sections[$type]['subGroups'][$subType])) {
            $sections[$type]['subGroups'][$subType] = ['accounts' => [], 'total' => 0];
        }

        $sections[$type]['subGroups'][$subType]['accounts'][] = [
            'id' => $row['account_code'],
            'name' => $row['account_name'],
            'balance' => $balance
        ];
    }
    $stmt->close();

    // 2. Calculate Net Income for the current financial period
    $incomeSql = "SELECT 
                        SUM(CASE WHEN coa.account_type = 'Revenue' THEN jvl.credit - jvl.debit ELSE 0 END) as total_revenue,
                        SUM(CASE WHEN coa.account_type IN ('COGS', 'Expense') THEN jvl.debit - jvl.credit ELSE 0 END) as total_expenses
                    FROM journal_voucher_lines jvl
                    JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
                    JOIN chart_of_accounts coa ON jvl.account_id = coa.account_code AND jvl.company_id = coa.company_id
                    WHERE jv.company_id = ? AND jv.status = 'posted' AND jv.entry_date BETWEEN ? AND ?";
    
    $stmt = $conn->prepare($incomeSql);
    if (!$stmt) throw new Exception("Net income prep failed: " . $conn->error);
    $stmt->bind_param('sss', $company_id, $fromDate, $toDate);
    $stmt->execute();
    $incomeResult = $stmt->get_result()->fetch_assoc();
    $netIncome = ($incomeResult['total_revenue'] ?? 0) - ($incomeResult['total_expenses'] ?? 0);
    $stmt->close();

    // 3. Add the calculated Net Income to the Equity section
    $netIncomeSubType = 'Current Period Earnings';
    if (!isset($sections['Equity']['subGroups'][$netIncomeSubType])) {
        $sections['Equity']['subGroups'][$netIncomeSubType] = ['accounts' => [], 'total' => 0];
    }
    $sections['Equity']['subGroups'][$netIncomeSubType]['accounts'][] = [
        'id' => 'net-income',
        'name' => 'Net Income for the Period',
        'balance' => $netIncome
    ];

    // 4. Calculate all sub-totals and main totals
    $totalLiabilitiesAndEquity = 0;
    foreach ($sections as $typeName => &$section) {
        $sectionTotal = 0;
        foreach ($section['subGroups'] as $subTypeName => &$subGroup) {
            $subGroup['total'] = array_sum(array_column($subGroup['accounts'], 'balance'));
             // if the sub group is empty, remove it from the report
            if(count($subGroup['accounts']) == 0){
                unset($section['subGroups'][$subTypeName]);
                continue;
            }
            $sectionTotal += $subGroup['total'];
        }
        $section['total'] = $sectionTotal;
        if ($typeName !== 'Asset') {
            $totalLiabilitiesAndEquity += $sectionTotal;
        }
    }

    echo json_encode([
        'success' => true,
        'processedData' => [
            'assets' => $sections['Asset'],
            'liabilities' => $sections['Liability'],
            'equity' => $sections['Equity'],
            'totalLiabilitiesAndEquity' => $totalLiabilitiesAndEquity
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to generate balance sheet: ' . $e->getMessage()]);
}

$conn->close();
?>