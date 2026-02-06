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

if ($conn === null) {
    http_response_code(500);
    echo json_encode(["message" => "Database connection failed."]);
    exit();
}

$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : '';

if (empty($company_id)) {
    http_response_code(400);
    echo json_encode(["message" => "Missing required parameter: company_id."]);
    exit();
}

try {
    $months = [];
    for ($i = 5; $i >= 0; $i--) {
        $date = new DateTime("first day of -$i month");
        $month_key = $date->format('Y-m');
        $months[$month_key] = [
            "month" => $date->format('M'),
            "revenue" => 0,
            "expenses" => 0
        ];
    }
    
    $six_months_ago = new DateTime("first day of -5 month");
    $start_date = $six_months_ago->format('Y-m-d');

    // --- Calculate Revenue from posted Sales Invoices ---
    $revenue_sql = "
        SELECT 
            DATE_FORMAT(invoice_date, '%Y-%m') AS month,
            SUM(total_amount) AS monthly_revenue
        FROM sales_invoices
        WHERE company_id = ? AND invoice_date >= ? AND status = 'Paid'
        GROUP BY month
    ";

    $stmt_rev = $conn->prepare($revenue_sql);
    if ($stmt_rev === false) {
        throw new Exception("Revenue query preparation failed: " . $conn->error);
    }
    $stmt_rev->bind_param("ss", $company_id, $start_date);
    $stmt_rev->execute();
    $result_rev = $stmt_rev->get_result();

    while ($row = $result_rev->fetch_assoc()) {
        if (isset($months[$row['month']])) {
            $months[$row['month']]['revenue'] = (float)$row['monthly_revenue'];
        }
    }
    $stmt_rev->close();
    
    // --- CORRECTED: Calculate Expenses from Journal Vouchers ---
    $expense_sql = "
        SELECT 
            DATE_FORMAT(entry_date, '%Y-%m') AS month,
            SUM(total_debits) AS monthly_expenses
        FROM journal_vouchers
        WHERE 
            company_id = ? 
            AND entry_date >= ?
            AND source = 'Expense' 
            AND status = 'posted'
        GROUP BY month
    ";

    $stmt_exp = $conn->prepare($expense_sql);
    if ($stmt_exp === false) {
        throw new Exception("Expense query preparation failed: " . $conn->error);
    }
    
    $stmt_exp->bind_param("ss", $company_id, $start_date);
    $stmt_exp->execute();
    $result_exp = $stmt_exp->get_result();

    while ($row = $result_exp->fetch_assoc()) {
        if (isset($months[$row['month']])) {
            $months[$row['month']]['expenses'] = (float)$row['monthly_expenses'];
        }
    }
    $stmt_exp->close();
    
    $conn->close();

    http_response_code(200);
    echo json_encode(array_values($months));

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "message" => "Failed to retrieve cash flow data: " . $e->getMessage()
    ]);
}
?>