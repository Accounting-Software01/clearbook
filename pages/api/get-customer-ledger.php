<?php
// ======================================================
// CUSTOMER LEDGER API (Corrected)
// ======================================================

// --- CORS and Preflight Handling ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}
// --- End of CORS Handling ---

header("Content-Type: application/json; charset=UTF-8");

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php'; // PDO object $pdo

// ======================================================
// INPUT
// ======================================================
$company_id = $_GET['company_id'] ?? null;
$customer_id = $_GET['customer_id'] ?? null;

if (!$company_id || !$customer_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing company_id or customer_id']);
    exit;
}

try {
    // 1️⃣ Fetch Customer Info (As per your script)
    $stmt = $pdo->prepare("
        SELECT
            id, company_id, created_by, customer_id, customer_name, trading_name,
            customer_type, status, customer_category, primary_phone_number, alternate_phone,
            email_address, contact_person, website, billing_address, shipping_address,
            city, state, country, postal_code, opening_balance_journal_id, opening_balance_date,
            created_at, is_vat_applicable, vat_registration_number, customer_tin, tax_category,
            is_wht_applicable, payment_type, payment_terms, credit_limit, currency, price_level,
            default_sales_rep_id, default_warehouse, preferred_payment_method, is_discount_eligible,
            invoice_delivery_method, notes
        FROM customers
        WHERE company_id = ? AND customer_id = ?
    ");
    $stmt->execute([$company_id, $customer_id]);
    $customer = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$customer) {
        throw new Exception("Customer not found");
    }

    $ledger = [];
    $runningBalance = 0; // Initialize running balance

    // 2️⃣ Opening Balance (As per your script)
    if ($customer['opening_balance_journal_id']) {
        $stmt = $pdo->prepare("
            SELECT total_debits, total_credits, entry_date
            FROM journal_vouchers
            WHERE id = ? AND company_id = ?
        ");
        $stmt->execute([$customer['opening_balance_journal_id'], $company_id]);
        $ob = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($ob) {
            $balance = (float)$ob['total_debits'] - (float)$ob['total_credits'];
            $ledger[] = [
                'date' => $ob['entry_date'],
                'type' => 'Opening Balance',
                'reference' => 'OB-' . $customer['customer_id'],
                'debit' => (float)$ob['total_debits'],
                'credit' => (float)$ob['total_credits'],
                'balance' => $balance,
                'description' => 'Opening balance'
            ];
            $runningBalance = $balance; // Start the running balance from the opening balance
        }
    }

    $transactions = [];

    // 3️⃣ Sales Invoices (As per your script)
    $stmt = $pdo->prepare("
        SELECT id, invoice_number, invoice_date, total_amount, amount_paid, (total_amount - amount_paid) AS amount_due
        FROM sales_invoices
        WHERE company_id = ? AND customer_id = ? AND status IN ('ISSUED','PARTIAL','OVERDUE')
    ");
    $stmt->execute([$company_id, $customer['customer_id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $inv) {
        $transactions[] = [
            'date' => $inv['invoice_date'],
            'type' => 'Invoice',
            'reference' => $inv['invoice_number'],
            'debit' => (float)$inv['total_amount'],
            'credit' => 0.00,
            'description' => 'Sales Invoice #' . $inv['invoice_number'],
        ];
    }

    // 4️⃣ Credit Notes (As per your script)
    $stmt = $pdo->prepare("
        SELECT credit_note_number, credit_note_date, total_amount
        FROM credit_notes
        WHERE company_id = ? AND customer_id = ? AND status = 'posted'
    ");
    $stmt->execute([$company_id, $customer['customer_id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $cn) {
        $transactions[] = [
            'date' => $cn['credit_note_date'],
            'type' => 'Credit Note',
            'reference' => $cn['credit_note_number'],
            'debit' => 0.00,
            'credit' => (float)$cn['total_amount'],
            'description' => 'Credit Note #' . $cn['credit_note_number'],
        ];
    }

    // 5️⃣ Payments & Receipts (Corrected Query using your table structure)
    $stmt = $pdo->prepare("
        SELECT 
            jv.entry_date, 
            jv.voucher_number, 
            jvl.narration, 
            jvl.credit
        FROM journal_vouchers jv
        JOIN journal_voucher_lines jvl ON jv.id = jvl.voucher_id
        JOIN accounts a ON jvl.account_id = a.id
        WHERE jv.company_id = ?
          AND a.account_name LIKE '%Accounts Receivable%'
          AND jvl.credit > 0
          AND jvl.related_party_id = ? -- Use the customer's primary key ID
          AND jvl.related_party_type = 'customer'
    ");
    // Note: We use customer['id'] (the primary key), not customer['customer_id'] (the text code)
    $stmt->execute([$company_id, $customer['id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $p) {
        $transactions[] = [
            'date' => $p['entry_date'],
            'type' => 'Payment', // Source is reliably a payment/receipt based on the query
            'reference' => $p['voucher_number'],
            'debit' => 0.00,
            'credit' => (float)$p['credit'],
            'description' => $p['narration'] ?? 'Customer Payment',
        ];
    }

    // 6️⃣ Sort all transactions by date ascending (As per your script)
    usort($transactions, function($a, $b) {
        return strtotime($a['date']) <=> strtotime($b['date']);
    });

    // 7️⃣ Compute running balance and append to ledger
    foreach ($transactions as $t) {
        $runningBalance += $t['debit'] - $t['credit'];
        $t['balance'] = $runningBalance;
        $ledger[] = $t;
    }

    // 8️⃣ Return
    echo json_encode([
        'customer' => $customer,
        'ledger' => $ledger,
        'current_balance' => $runningBalance
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>