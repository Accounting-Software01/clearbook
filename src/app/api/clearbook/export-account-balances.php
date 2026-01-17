<?php
require_once __DIR__ . '/db_connect.php';

header("Content-Type: text/csv");
header("Content-Disposition: attachment; filename=\"account_balances_report.csv\"");

$company_id = $_GET['company_id'] ?? null;
$as_of_date = $_GET['as_of_date'] ?? date('Y-m-d');
$account_class = $_GET['account_class'] ?? 'all';

if (!$company_id) {
    // We can't return JSON here as the browser expects a CSV.
    // We can output a CSV with an error message.
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Error', 'Company ID is required.']);
    fclose($output);
    exit;
}

global $conn;

try {
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
    
    $output = fopen('php://output', 'w');
    
    // CSV Header
    fputcsv($output, ['Account Code', 'Account Name', 'Account Type', 'Debit', 'Credit', 'Net Balance']);

    while ($row = $result->fetch_assoc()) {
        $debit = (float)$row['debit'];
        $credit = (float)$row['credit'];
        $net_balance = $debit - $credit;
        
        fputcsv($output, [
            $row['account_code'],
            $row['account_name'],
            $row['account_type'],
            number_format($debit, 2),
            number_format($credit, 2),
            number_format($net_balance, 2)
        ]);
    }
    
    fclose($output);
    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    // Log error, but don't output it directly into the CSV
    error_log($e->getMessage());
    // Output a CSV with an error row
    $output = fopen('php://output', 'w');
    fputcsv($output, ['Error', 'An error occurred while generating the report.']);
    fclose($output);
}
?>