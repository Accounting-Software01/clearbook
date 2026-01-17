<?php
require_once __DIR__ . '/db_connect.php';

header("Content-Type: application/json");

// Allow from any origin
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}

// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");         
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

$company_id = $_GET['company_id'] ?? null;
$as_of_date = $_GET['as_of_date'] ?? date('Y-m-d');
$account_class = $_GET['account_class'] ?? 'all';

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID is required.']);
    exit;
}

global $conn;

try {
    // Main query to get balances from journal entries
    $sql = "
        SELECT
            ca.account_code,
            ca.account_name,
            ca.account_type,
            COALESCE(jvl_summary.total_debit, 0) AS debit,
            COALESCE(jvl_summary.total_credit, 0) AS credit
        FROM chart_of_accounts AS ca
        LEFT JOIN (
            SELECT
                jvl.account_id,
                SUM(jvl.debit) AS total_debit,
                SUM(jvl.credit) AS total_credit
            FROM journal_voucher_lines AS jvl
            JOIN journal_vouchers AS jv ON jvl.voucher_id = jv.id
            WHERE jv.company_id = ?
              AND jv.status = 'posted'
              AND jv.entry_date <= ?
            GROUP BY jvl.account_id
        ) AS jvl_summary ON ca.account_code = jvl_summary.account_id
        WHERE ca.company_id = ?
    ";

    $params = [$company_id, $as_of_date, $company_id];
    $types = "sss";

    if ($account_class !== 'all' && $account_class !== '') {
        $sql .= " AND ca.account_type = ?";
        $params[] = $account_class;
        $types .= "s";
    }

    $sql .= " ORDER BY ca.account_code ASC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $accounts = [];
    $summary = [
        'total_accounts' => 0,
        'total_debit' => 0,
        'total_credit' => 0,
        'is_balanced' => false,
        'asset' => 0,
        'liability' => 0,
        'equity' => 0,
        'revenue' => 0,
        'cogs' => 0, // Assuming COGS is an expense type or needs specific logic
        'expense' => 0
    ];

    while ($row = $result->fetch_assoc()) {
        $debit = (float)$row['debit'];
        $credit = (float)$row['credit'];
        
        $net_balance = $debit - $credit;
        $row['net_balance_val'] = $net_balance;

        if (in_array($row['account_type'], ['Asset', 'Expense'])) {
            // Natural Debit Balance
             $row['net_balance'] = number_format(abs($net_balance), 2) . ($net_balance >= 0 ? ' DR' : ' CR');
        } else {
            // Natural Credit Balance
             $net_balance = $credit - $debit;
             $row['net_balance'] = number_format(abs($net_balance), 2) . ($net_balance >= 0 ? ' CR' : ' DR');
        }
        
        $row['debit'] = number_format($debit, 2);
        $row['credit'] = number_format($credit, 2);

        $accounts[] = $row;
        
        // Calculate summaries
        $summary['total_debit'] += $debit;
        $summary['total_credit'] += $credit;
        
        $balance = $debit - $credit;
        $account_type_key = strtolower($row['account_type']); // asset, liability, etc.
        if (array_key_exists($account_type_key, $summary)) {
            if ($account_type_key === 'asset' || $account_type_key === 'expense') {
                 $summary[$account_type_key] += $balance;
            } else {
                 $summary[$account_type_key] += -$balance; // Liabilities, Equity, Revenue have natural credit balances
            }
        }
    }
    
    $summary['total_accounts'] = count($accounts);
    $summary['is_balanced'] = abs($summary['total_debit'] - $summary['total_credit']) < 0.01;

    // Format summary numbers
    foreach ($summary as $key => &$value) {
        if (is_numeric($value)) {
            $value = number_format($value, 2);
        }
    }
    
    $stmt->close();
    $conn->close();

    echo json_encode([
        'success' => true,
        'accounts' => $accounts,
        'summary' => $summary,
        'filters' => [
            'company_id' => $company_id,
            'as_of_date' => $as_of_date,
            'account_class' => $account_class
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred.', 'details' => $e->getMessage()]);
}
?>