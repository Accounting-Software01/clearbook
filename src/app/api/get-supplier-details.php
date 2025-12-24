<?php
// src/app/api/get-supplier-details.php

// Dev error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

require_once 'db_connect.php';
global $conn;

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
    exit;
}

// --- Input Validation ---
if (!isset($_GET['id']) || !isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required parameters: id and company_id']);
    exit;
}

$supplier_id = (int)$_GET['id'];
$company_id = $_GET['company_id'];

try {
    // --- Fetch Profile ---
    $profile_stmt = $conn->prepare("SELECT id, name, contact_person, email, phone, address, vat_percentage, withholding_tax_applicable FROM suppliers WHERE id = ? AND company_id = ?");
    if (!$profile_stmt) throw new Exception('DB prepare failed (profile): '.$conn->error);
    $profile_stmt->bind_param("is", $supplier_id, $company_id);
    $profile_stmt->execute();
    $profile_result = $profile_stmt->get_result();
    $profile = $profile_result->fetch_assoc();
    $profile_stmt->close();

    if (!$profile) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Supplier not found']);
        exit;
    }
    
    // Cast types for JSON consistency
    $profile['id'] = (string)$profile['id'];
    $profile['vat_percentage'] = isset($profile['vat_percentage']) ? (float)$profile['vat_percentage'] : null;
    $profile['withholding_tax_applicable'] = isset($profile['withholding_tax_applicable']) ? (bool)$profile['withholding_tax_applicable'] : null;


    // --- Fetch Activities ---
    $activities = [];

    // Fetch Purchase Invoices (assuming `purchase_invoices` table has a `status` column)
    $invoices_stmt = $conn->prepare("SELECT id, invoice_date as date, invoice_number as reference, total as amount, status FROM purchase_invoices WHERE supplier_id = ? AND company_id = ?");
    if ($invoices_stmt) {
        $invoices_stmt->bind_param("is", $supplier_id, $company_id);
        $invoices_stmt->execute();
        $invoices_result = $invoices_stmt->get_result();
        while ($row = $invoices_result->fetch_assoc()) {
            $row['type'] = 'Purchase Invoice';
            $row['amount'] = (float)$row['amount'];
            $activities[] = $row;
        }
        $invoices_stmt->close();
    }

    // Fetch Payments made to supplier from Journal
    $payments_stmt = $conn->prepare(
        "SELECT je.id, jv.entry_date as date, jv.voucher_number as reference, je.credit as amount, jv.status
         FROM journal_entries je
         JOIN journal_vouchers jv ON je.journal_voucher_id = jv.id
         WHERE je.payee_type = 'supplier' AND je.payee_id = ? AND jv.company_id = ? AND je.credit > 0"
    );
    if (!$payments_stmt) throw new Exception('DB prepare failed (payments): '.$conn->error);
    $payments_stmt->bind_param("is", $supplier_id, $company_id);
    $payments_stmt->execute();
    $payments_result = $payments_stmt->get_result();
    while ($row = $payments_result->fetch_assoc()) {
        $row['type'] = 'Payment';
        $row['amount'] = (float)$row['amount'];
        $activities[] = $row;
    }
    $payments_stmt->close();

    // Sort activities by date descending
    usort($activities, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });


    // --- Fetch Balance (Recalculated for accuracy) ---
    // Sum of invoices that are not in a draft/void state
    $total_invoiced = 0;
    $inv_balance_stmt = $conn->prepare("SELECT SUM(total) as total_invoiced FROM purchase_invoices WHERE supplier_id = ? AND company_id = ? AND status IN ('unpaid', 'paid', 'partial', 'overdue')");
    if ($inv_balance_stmt) { 
        $inv_balance_stmt->bind_param("is", $supplier_id, $company_id);
        $inv_balance_stmt->execute();
        $inv_balance_result = $inv_balance_stmt->get_result()->fetch_assoc();
        $total_invoiced = $inv_balance_result['total_invoiced'] ?? 0;
        $inv_balance_stmt->close();
    }

    // Sum of *approved* payments
    $total_paid = 0;
    $pay_balance_stmt = $conn->prepare("SELECT SUM(je.credit) as total_paid FROM journal_entries je JOIN journal_vouchers jv ON je.journal_voucher_id = jv.id WHERE je.payee_type = 'supplier' AND je.payee_id = ? AND jv.company_id = ? AND jv.status = 'approved'");
    if (!$pay_balance_stmt) throw new Exception('DB prepare failed (pay_balance): '.$conn->error);
    $pay_balance_stmt->bind_param("is", $supplier_id, $company_id);
    $pay_balance_stmt->execute();
    $pay_balance_result = $pay_balance_stmt->get_result()->fetch_assoc();
    $total_paid = $pay_balance_result['total_paid'] ?? 0;
    $pay_balance_stmt->close();

    $balance = [
        'total_invoiced' => (float)$total_invoiced,
        'total_paid' => (float)$total_paid,
        'outstanding_balance' => (float)$total_invoiced - (float)$total_paid,
    ];

    // --- Combine and Return ---
    echo json_encode([
        'success' => true,
        'profile' => $profile,
        'activities' => $activities,
        'balance' => $balance
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}
?>