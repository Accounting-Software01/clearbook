<?php
// =================================================================
// GET SUPPLIER UNPAID INVOICES API
// =================================================================
// Set headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include database connection
require_once '../db_connect.php';

// =================================================================
// Validate Input
// =================================================================
$company_id = $_GET['company_id'] ?? null;
$supplier_id = isset($_GET['supplier_id']) ? (int)$_GET['supplier_id'] : null;

if (!$company_id || !$supplier_id) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Company ID and Supplier ID are required.']);
    exit;
}

// =================================================================
// Main Logic
// =================================================================
try {
    // 1. Get Supplier Details
    $supplier_stmt = $conn->prepare("SELECT id, name, email, phone, bank_name, account_number, account_name, vat_number, wht_applicable FROM suppliers WHERE id = ? AND company_id = ?");
    $supplier_stmt->bind_param('is', $supplier_id, $company_id);
    $supplier_stmt->execute();
    $supplier_result = $supplier_stmt->get_result();
    $supplier = $supplier_result->fetch_assoc();
    $supplier_stmt->close();

    if (!$supplier) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Supplier not found.']);
        exit;
    }

    // 2. Get Unpaid and Partially Paid Invoices for the Supplier
    $invoices_sql = "
        SELECT
            si.id AS invoice_id,
            si.invoice_number,
            si.invoice_date,
            si.due_date,
            si.total_amount,
            (
                SELECT SUM(jvl.credit)
                FROM journal_voucher_lines jvl
                JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
                WHERE jvl.payee_id = si.supplier_id
                AND jv.reference_type = 'supplier_invoices'
                AND jv.reference_id = si.id
            ) as paid_amount,
            (
                SELECT SUM(poi.vat_amount)
                FROM purchase_order_items poi
                WHERE poi.purchase_order_id = si.purchase_order_id
            ) as vat_amount
        FROM supplier_invoices si
        WHERE si.supplier_id = ?
        AND si.company_id = ?
        AND si.status IN ('Unpaid', 'Partially Paid')
        ORDER BY si.invoice_date ASC
    ";

    $invoices_stmt = $conn->prepare($invoices_sql);
    $invoices_stmt->bind_param('is', $supplier_id, $company_id);
    $invoices_stmt->execute();
    $invoices_result = $invoices_stmt->get_result();
    
    $invoices = [];
    while ($row = $invoices_result->fetch_assoc()) {
        $paid = (float)($row['paid_amount'] ?? 0);
        $total = (float)$row['total_amount'];
        $outstanding = $total - $paid;

        if ($outstanding > 0.01) { // Consider floating point inaccuracies
            $row['paid_amount'] = $paid;
            $row['outstanding_amount'] = $outstanding;
            $invoices[] = $row;
        }
    }
    $invoices_stmt->close();
    
    // =================================================================
    // Final Response
    // =================================================================
    echo json_encode([
        'status' => 'success',
        'data' => [
            'supplier' => $supplier,
            'unpaid_invoices' => $invoices
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'An unexpected error occurred: ' . $e->getMessage()
    ]);
} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
?>