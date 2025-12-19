<?php
// Set headers for CORS and content type
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Database connection
define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'hariindu_erp');
define('DB_PASSWORD', 'Software1234@!');
define('DB_NAME', 'hariindu_erp');

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database Connection Failed: " . $conn->connect_error]);
    exit();
}
$conn->set_charset("utf8mb4");

// Get and validate parameters
$companyId = isset($_GET['company_id']) ? trim($_GET['company_id']) : null;
$accountId = isset($_GET['accountId']) ? $_GET['accountId'] : null;
$fromDate = isset($_GET['fromDate']) ? $_GET['fromDate'] : null;
$toDate = isset($_GET['toDate']) ? $_GET['toDate'] : null;

if (!$companyId || !$accountId || !$fromDate || !$toDate) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required parameters: company_id, accountId, fromDate, and toDate are required."]);
    exit();
}

try {
    // === Step 1: Determine Opening Balance (Journal-Only) ===
    $opening_balance = 0.00;
    $financial_year = date('Y', strtotime($fromDate));

    // Try to fetch a pre-calculated opening balance
    // FIX: Changed bind_param from "sis" to "sss" as all parameters are strings.
    $stmt_ob_pre = $conn->prepare("SELECT opening_balance FROM account_opening_balances WHERE account_id = ? AND financial_year = ? AND company_id = ?");
    $stmt_ob_pre->bind_param("sss", $accountId, $financial_year, $companyId);
    $stmt_ob_pre->execute();
    $result_ob_pre = $stmt_ob_pre->get_result();

    if ($result_ob_pre->num_rows > 0) {
        $opening_balance = (float)$result_ob_pre->fetch_assoc()['opening_balance'];
        
        // Add transactions from the start of the financial year to the fromDate
        $year_start_date = $financial_year . "-01-01";
        $stmt_ob_trans = $conn->prepare("
            SELECT COALESCE(SUM(jvl.debit), 0) as total_debits, COALESCE(SUM(jvl.credit), 0) as total_credits
            FROM journal_voucher_lines jvl
            JOIN journal_vouchers jv ON jv.id = jvl.voucher_id
            WHERE jvl.account_id = ? AND jv.company_id = ? AND jv.entry_date >= ? AND jv.entry_date < ?
        ");
        $stmt_ob_trans->bind_param("ssss", $accountId, $companyId, $year_start_date, $fromDate);
        $stmt_ob_trans->execute();
        $res_trans = $stmt_ob_trans->get_result()->fetch_assoc();
        $opening_balance += (float)$res_trans['total_debits'] - (float)$res_trans['total_credits'];
        $stmt_ob_trans->close();

    } else {
        // No stored opening balance, calculate from the beginning of time up to fromDate
        $stmt_ob_calc = $conn->prepare("
            SELECT COALESCE(SUM(jvl.debit), 0) as total_debits, COALESCE(SUM(jvl.credit), 0) as total_credits
            FROM journal_voucher_lines jvl
            JOIN journal_vouchers jv ON jv.id = jvl.voucher_id
            WHERE jvl.account_id = ? AND jv.company_id = ? AND jv.entry_date < ?
        ");
        $stmt_ob_calc->bind_param("sss", $accountId, $companyId, $fromDate);
        $stmt_ob_calc->execute();
        $res_calc = $stmt_ob_calc->get_result()->fetch_assoc();
        $opening_balance = (float)$res_calc['total_debits'] - (float)$res_calc['total_credits'];
        $stmt_ob_calc->close();
    }
    $stmt_ob_pre->close();

    // === Step 2: Fetch Transactions within the Date Range (Journal-Only) ===
    // FIX: Changed BETWEEN to a safer >= and <= condition.
    $sql = "
        SELECT jv.entry_date as date, COALESCE(jvl.description, jv.narration) as description, jvl.debit, jvl.credit
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jv.id = jvl.voucher_id
        WHERE jvl.account_id = ? AND jv.company_id = ? AND jv.entry_date >= ? AND jv.entry_date <= ?
        ORDER BY jv.entry_date ASC, jv.id ASC
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssss", $accountId, $companyId, $fromDate, $toDate);
    $stmt->execute();
    $result = $stmt->get_result();

    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = $row;
    }

    // === Step 3: Format Output ===
    $ledger_entries = [];
    $current_balance = $opening_balance;
    
    // REFINEMENT: Set opening balance date to the day before fromDate for accounting clarity.
    $opening_balance_date = date('Y-m-d', strtotime($fromDate . ' -1 day'));
    $ledger_entries[] = ['date' => $opening_balance_date, 'description' => 'Opening Balance', 'debit' => null, 'credit' => null, 'balance' => $current_balance];

    foreach ($transactions as $trans) {
        $debit = (float)($trans['debit'] ?? 0);
        $credit = (float)($trans['credit'] ?? 0);
        $current_balance += $debit - $credit;
        $ledger_entries[] = [
            'date' => $trans['date'],
            'description' => $trans['description'],
            'debit' => $debit > 0 ? $debit : null,
            'credit' => $credit > 0 ? $credit : null,
            'balance' => $current_balance
        ];
    }
    
    echo json_encode($ledger_entries);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "An error occurred in the script: " . $e->getMessage()]);
} finally {
    if (isset($stmt) && $stmt) $stmt->close();
    $conn->close();
}
?>