<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

$company_id = $_GET['company_id'] ?? null;
$customer_id = $_GET['customer_id'] ?? null;

if (!$company_id || !$customer_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID and Customer ID are required."]);
    exit();
}

// MOCK CUSTOMER DETAILS (for now)
$mock_customers = [
  'cust001' => [ 'id' => 'cust001', 'name' => 'ABC Solutions', 'contact_person' => 'John Doe', 'email' => 'john@abc.com', 'phone' => '123-456-7890', 'address' => '123 Main St, Anytown' ],
  'cust002' => [ 'id' => 'cust002', 'name' => 'XYZ Corp', 'contact_person' => 'Jane Smith', 'email' 'jane@xyz.com', 'phone' => '098-765-4321', 'address' => '456 Oak Ave, Somewhere' ],
  'cust003' => [ 'id' => 'cust003', 'name' => 'PQR Enterprises', 'contact_person' => 'Peter Jones', 'email' => 'peter@pqr.com', 'phone' => '111-222-3333', 'address' => '789 Pine Ln, Nowhere' ],
];

if (!isset($mock_customers[$customer_id])) {
    http_response_code(404);
    echo json_encode(["success" => false, "error" => "Customer not found."]);
    exit();
}

$customer_details = $mock_customers[$customer_id];

$conn->begin_transaction();
try {

    // Outstanding Balance
    $balance_sql = "SELECT SUM(total_amount - (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE invoice_id_ref = sales_invoices.id)) as balance FROM sales_invoices WHERE customer_id = ? AND company_id = ? AND status <> 'Paid'";
    $balance_stmt = $conn->prepare($balance_sql);
    $balance_stmt->bind_param('ss', $customer_id, $company_id);
    $balance_stmt->execute();
    $balance_result = $balance_stmt->get_result()->fetch_assoc();
    $current_outstanding_balance = $balance_result['balance'] ?? 0;
    $balance_stmt->close();

    // Invoices
    $invoices_sql = "SELECT id, invoice_number, invoice_date, total_amount, status, (total_amount - (SELECT COALESCE(SUM(amount), 0) FROM customer_payments WHERE invoice_id_ref = sales_invoices.id)) as amount_due FROM sales_invoices WHERE customer_id = ? AND company_id = ? ORDER BY invoice_date DESC";
    $invoices_stmt = $conn->prepare($invoices_sql);
    $invoices_stmt->bind_param('ss', $customer_id, $company_id);
    $invoices_stmt->execute();
    $invoices = $invoices_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $invoices_stmt->close();

    // Payments
    $payments_sql = "SELECT p.id, p.payment_date, p.amount, p.method, i.invoice_number as invoice_number_ref FROM customer_payments p LEFT JOIN sales_invoices i ON p.invoice_id_ref = i.id WHERE p.customer_id = ? AND p.company_id = ? ORDER BY p.payment_date DESC";
    $payments_stmt = $conn->prepare($payments_sql);
    $payments_stmt->bind_param('ss', $customer_id, $company_id);
    $payments_stmt->execute();
    $payments = $payments_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $payments_stmt->close();

    // Waybills
    $waybills_sql = "SELECT w.id, w.waybill_number, w.waybill_date, i.invoice_number as invoice_number_ref FROM waybills w JOIN sales_invoices i ON w.invoice_id = i.id WHERE w.customer_id = ? AND w.company_id = ? ORDER BY w.waybill_date DESC";
    $waybills_stmt = $conn->prepare($waybills_sql);
    $waybills_stmt->bind_param('ss', $customer_id, $company_id);
    $waybills_stmt->execute();
    $waybills = $waybills_stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $waybills_stmt->close();

    $conn->commit();

    $response = [
        "success" => true,
        "data" => [
            "customer_details" => $customer_details,
            "current_outstanding_balance" => (float)$current_outstanding_balance,
            "invoices" => $invoices,
            "payments" => $payments,
            "waybills" => $waybills
        ]
    ];

    http_response_code(200);
    echo json_encode($response);

} catch (Throwable $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode([ "success" => false, "error" => "Database query failed", "details" => $e->getMessage() ]);
}

$conn->close();
?>