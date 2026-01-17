<?php
require_once __DIR__ . '/db_connect.php';

// Set headers for JSON response and CORS
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- Get and Validate Parameters ---
$company_id = $_GET['company_id'] ?? null;
$fromDate = $_GET['fromDate'] ?? null;
$toDate = $_GET['toDate'] ?? null;

if (!$company_id || !$fromDate || !$toDate) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required parameters: company_id, fromDate, and toDate.']);
    exit;
}

global $conn;

try {
    $sql = "
        SELECT
            ca.account_code,
            ca.account_name,
            ca.account_type,
            SUM(jvl.debit) as total_debit,
            SUM(jvl.credit) as total_credit
        FROM
            chart_of_accounts ca
        LEFT JOIN
            journal_voucher_lines jvl ON ca.account_code = jvl.account_id
        LEFT JOIN
            journal_vouchers jv ON jvl.voucher_id = jv.id AND jv.status = 'posted'
        WHERE
            ca.company_id = ?
            AND (
                jv.id IS NULL OR 
                (ca.account_type IN ('Asset', 'Liability', 'Equity') AND jv.entry_date <= ?)
                OR
                (ca.account_type IN ('Revenue', 'Expense', 'Cost of Goods Sold') AND jv.entry_date BETWEEN ? AND ?)
            )
        GROUP BY
            ca.account_code, ca.account_name, ca.account_type
        ORDER BY
            ca.account_code;
    ";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("ssss", $company_id, $toDate, $fromDate, $toDate);
    $stmt->execute();
    $result = $stmt->get_result();

    $reportData = [];
    $natural_debit_accounts = ['Asset', 'Expense', 'Cost of Goods Sold'];

    while ($row = $result->fetch_assoc()) {
        $debit_total = (float)($row['total_debit'] ?? 0);
        $credit_total = (float)($row['total_credit'] ?? 0);
        
        $balance = $debit_total - $credit_total;
        
        $final_debit = 0;
        $final_credit = 0;

        if ($balance !== 0) {
            if (in_array($row['account_type'], $natural_debit_accounts)) {
                if ($balance > 0) $final_debit = $balance;
                else $final_credit = abs($balance);
            } else { 
                if ($balance < 0) $final_credit = abs($balance);
                else $final_debit = $balance;
            }
        }

        // Always include account type, but only add to report if there's a balance
        if ($final_debit > 0 || $final_credit > 0) {
             $reportData[] = [
                'accountId' => $row['account_code'],
                'accountName' => $row['account_name'],
                'account_type' => $row['account_type'], // <-- The Fix
                'debit' => $final_debit,
                'credit' => $final_credit,
            ];
        }
    }

    $stmt->close();
    $conn->close();

    echo json_encode($reportData);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred.', 'details' => $e->getMessage()]);
}
?>