<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- Database Connection ---
define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'hariindu_erp');
define('DB_PASSWORD', 'Software1234@!');
define('DB_NAME', 'hariindu_erp');

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Connection Failed: " . $conn->connect_error]);
    exit();
}
$conn->set_charset("utf8mb4");

// --- Input Validation ---


$companyId   = isset($_GET['company_id']) ? strtoupper(trim($_GET['company_id'])) : null;
$accountCode = isset($_GET['account_code']) ? trim($_GET['account_code']) : null;

if (!$companyId || !$accountCode || !$fromDate || !$toDate) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Missing required parameters: company_id, account_code, fromDate, and toDate."
    ]);
    exit();
}

// Fetch account by code
$stmt = $conn->prepare("
    SELECT id, account_type 
    FROM chart_of_accounts 
    WHERE TRIM(account_code) = ? 
      AND TRIM(UPPER(company_id)) = ?
");
$stmt->bind_param("ss", $accountCode, $companyId);
$stmt->execute();
$account = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$account) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "message" => "Account with code '{$accountCode}' not found for the given company."
    ]);
    exit();
}

$accountId = (int)$account['id']; // internal ID for joins

    // Asset and Expense accounts have a normal debit balance. Others have a normal credit balance.
    $isDebitNormal = in_array($account['account_type'], ['Asset', 'Expense']);
    $balance_calc_field = $isDebitNormal ? "SUM(COALESCE(jvl.debit, 0) - COALESCE(jvl.credit, 0))" : "SUM(COALESCE(jvl.credit, 0) - COALESCE(jvl.debit, 0))";


    // --- 2. Calculate Opening Balance ---
    $sql_opening = "
        SELECT {$balance_calc_field} as openingBalance
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jvl.account_id = ? AND jv.company_id = ? AND jv.entry_date < ?
    ";
    $stmt_opening = $conn->prepare($sql_opening);
    if(!$stmt_opening) throw new Exception("Opening balance query preparation failed: " . $conn->error);
    $stmt_opening->bind_param("iss", $accountId, $companyId, $fromDate);
    $stmt_opening->execute();
    $result_opening = $stmt_opening->get_result();
    $opening_row = $result_opening->fetch_assoc();
    $openingBalance = (float)($opening_row['openingBalance'] ?? 0);
    $stmt_opening->close();

    // --- 3. Fetch Transactions for the Period ---
    $sql_transactions = "
        SELECT jv.entry_date, jvl.description, jvl.debit, jvl.credit
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jvl.account_id = ? AND jv.company_id = ? AND jv.entry_date BETWEEN ? AND ?
        ORDER BY jv.entry_date, jv.id
    ";
    $stmt_transactions = $conn->prepare($sql_transactions);
    if(!$stmt_transactions) throw new Exception("Transactions query preparation failed: " . $conn->error);
    $stmt_transactions->bind_param("isss", $accountId, $companyId, $fromDate, $toDate);
    $stmt_transactions->execute();
    $result_transactions = $stmt_transactions->get_result();
    
    $transactions = [];
    $period_debit_total = 0;
    $period_credit_total = 0;
    while ($row = $result_transactions->fetch_assoc()) {
        $debit = (float)$row['debit'];
        $credit = (float)$row['credit'];
        $transactions[] = [
            "date" => $row['entry_date'],
            "description" => $row['description'],
            "debit" => $debit,
            "credit" => $credit
        ];
        $period_debit_total += $debit;
        $period_credit_total += $credit;
    }
    $stmt_transactions->close();

    // --- 4. Calculate Closing Balance ---
    $period_change = $isDebitNormal ? ($period_debit_total - $period_credit_total) : ($period_credit_total - $period_debit_total);
    $closingBalance = $openingBalance + $period_change;
    
    // --- 5. Send Response ---
    $response = [
        "success" => true,
        "statement" => [
            "openingBalance" => $openingBalance,
            "transactions" => $transactions,
            "closingBalance" => $closingBalance
        ]
    ];
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "An error occurred: " . $e->getMessage()]);
} finally {
    $conn->close();
}
?>