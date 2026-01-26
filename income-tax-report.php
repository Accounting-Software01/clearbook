<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include your database connection file
require_once 'db_connect.php';

// --- Input Validation ---
if (!isset($_GET['company_id']) || !isset($_GET['fromDate']) || !isset($_GET['toDate'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required parameters. Please provide company_id, fromDate, and toDate."]);
    exit;
}

$company_id = $_GET['company_id'];
$from_date = $_GET['fromDate'];
$to_date = $_GET['toDate'];

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $conn->connect_error]);
    exit;
}

// Initialize the final response structure
$response = [
    'total_revenue' => 0,
    'total_expenses' => 0,
    'assessable_profit' => 0,
    'company_income_tax' => 0,
    'education_tax' => 0,
    'total_tax_liability' => 0,
    'wht_credit' => 0,
    'final_tax_payable' => 0,
    'wht_transactions' => []
];

// --- 1. Calculate Total Revenue ---
// Sums the total of all posted sales invoices within the date range.
$stmt_revenue = $conn->prepare("SELECT SUM(grand_total) as total_revenue FROM sales_invoices WHERE company_id = ? AND status = 'Posted' AND invoice_date BETWEEN ? AND ?");
$stmt_revenue->bind_param("sss", $company_id, $from_date, $to_date);
$stmt_revenue->execute();
$result_revenue = $stmt_revenue->get_result();
if ($row_revenue = $result_revenue->fetch_assoc()) {
    $response['total_revenue'] = (float)($row_revenue['total_revenue'] ?? 0);
}
$stmt_revenue->close();

// --- 2. Calculate Total Expenses ---
// Sums the total of all expenses within the date range.
// NOTE: This assumes you have an 'expenses' table. If your structure is different, you may need to adjust this query.
$stmt_expenses = $conn->prepare("SELECT SUM(amount) as total_expenses FROM expenses WHERE company_id = ? AND expense_date BETWEEN ? AND ?");
$stmt_expenses->bind_param("sss", $company_id, $from_date, $to_date);
$stmt_expenses->execute();
$result_expenses = $stmt_expenses->get_result();
if ($row_expenses = $result_expenses->fetch_assoc()) {
    $response['total_expenses'] = (float)($row_expenses['total_expenses'] ?? 0);
}
$stmt_expenses->close();

// --- 3. Fetch WHT Credits ---
// Fetches all withholding tax transactions and calculates the total credit.
$wht_transactions = [];
$total_wht = 0;
$stmt_wht = $conn->prepare(
    "SELECT si.id, si.invoice_date as date, c.name as customer_name, si.invoice_number as invoice_id, si.grand_total as gross_amount, si.wht_amount 
     FROM sales_invoices si
     JOIN customers c ON si.customer_id = c.id
     WHERE si.company_id = ? AND si.invoice_date BETWEEN ? AND ? AND si.wht_amount > 0"
);
$stmt_wht->bind_param("sss", $company_id, $from_date, $to_date);
$stmt_wht->execute();
$result_wht = $stmt_wht->get_result();
while ($row = $result_wht->fetch_assoc()) {
    $row['gross_amount'] = (float)$row['gross_amount'];
    $row['wht_amount'] = (float)$row['wht_amount'];
    $wht_transactions[] = $row;
    $total_wht += $row['wht_amount'];
}
$response['wht_transactions'] = $wht_transactions;
$response['wht_credit'] = $total_wht;
$stmt_wht->close();

// --- 4. Perform Tax Calculations ---
$assessable_profit = $response['total_revenue'] - $response['total_expenses'];
// Tax is only calculated on positive profit.
$taxable_profit = max(0, $assessable_profit);

$cit_rate = 0.30;  // Company Income Tax rate (30%)
$tet_rate = 0.025; // Tertiary Education Tax rate (2.5%)

$company_income_tax = $taxable_profit * $cit_rate;
$education_tax = $taxable_profit * $tet_rate;
$total_tax_liability = $company_income_tax + $education_tax;
$final_tax_payable = $total_tax_liability - $response['wht_credit'];

$response['assessable_profit'] = $assessable_profit;
$response['company_income_tax'] = $company_income_tax;
$response['education_tax'] = $education_tax;
$response['total_tax_liability'] = $total_tax_liability;
// The final amount payable cannot be less than zero.
$response['final_tax_payable'] = max(0, $final_tax_payable); 

$conn->close();

// --- 5. Send JSON Response ---
http_response_code(200);
echo json_encode($response);

?>
