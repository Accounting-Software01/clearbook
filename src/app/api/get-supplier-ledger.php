<?php
// ======================================================
// SUPPLIER LEDGER API
// ======================================================
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once 'db_connect.php'; // PDO object $pdo

// ======================================================
// INPUT
// ======================================================
$company_id = $_GET['company_id'] ?? null;
$supplier_id = $_GET['supplier_id'] ?? null; // This is the PK `id` from the `suppliers` table

if (!$company_id || !$supplier_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing company_id or supplier_id']);
    exit;
}

try {
    // 1️⃣ Fetch Supplier Info (Corrected based on schema)
    $stmt = $pdo->prepare("
        SELECT
            id,
            code as supplier_code,
            name,
            contact_person,
            email,
            phone,
            billing_address as address,
            city,
            state,
            country,
            currency as supplier_currency,
            vat_number,
            payment_terms,
            opening_balance_journal_id
        FROM suppliers
        WHERE company_id = ? AND id = ?
    ");
    $stmt->execute([$company_id, $supplier_id]);
    $supplier = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$supplier) {
        throw new Exception("Supplier not found");
    }
// If currency is invalid or not set, default to NGN
if (empty($supplier['supplier_currency']) || $supplier['supplier_currency'] === '0') {
    $supplier['supplier_currency'] = 'NGN';
}
    $ledger = [];
    $transactions = [];
    $runningBalance = 0;

    // 2️⃣ Opening Balance
    if ($supplier['opening_balance_journal_id']) {
        $stmt = $pdo->prepare("
            SELECT total_debits, total_credits, entry_date
            FROM journal_vouchers
            WHERE id = ? AND company_id = ?
        ");
        $stmt->execute([$supplier['opening_balance_journal_id'], $company_id]);
        $ob = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($ob) {
            // For suppliers, an opening balance we owe is a credit.
            $transactions[] = [
                'date' => $ob['entry_date'],
                'type' => 'Opening Balance',
                'reference' => 'OB-' . $supplier['supplier_code'],
                'debit' => (float)$ob['total_debits'],
                'credit' => (float)$ob['total_credits'],
                'description' => 'Opening balance'
            ];
        }
    }

    // 3️⃣ Supplier Invoices (Bills)
    $stmt = $pdo->prepare("
        SELECT id, invoice_number, invoice_date, total_amount
        FROM supplier_invoices
        WHERE company_id = ? AND supplier_id = ? AND status NOT IN ('DRAFT', 'CANCELLED')
    ");
    $stmt->execute([$company_id, $supplier['id']]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $inv) {
        $transactions[] = [
            'date' => $inv['invoice_date'],
            'type' => 'Supplier Invoice',
            'reference' => $inv['invoice_number'],
            'debit' => 0.00,
            'credit' => (float)$inv['total_amount'], // Increases amount owed
            'description' => 'Invoice #' . $inv['invoice_number'],
        ];
    }

    // 4️⃣ Payments made to Supplier (Improved Logic)
    $stmt = $pdo->prepare("
        SELECT
            jv.entry_date,
            jv.voucher_number,
            jvl.debit,
            jvl.description
        FROM journal_vouchers jv
        JOIN journal_voucher_lines jvl ON jv.id = jvl.voucher_id
        WHERE jv.company_id = ?
          AND jv.source = 'Payment'
          AND jvl.payee_id = ?
          AND jvl.payee_type = 'supplier'
          AND jv.status = 'posted'
    ");
    $stmt->execute([$company_id, $supplier_id]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $v) {
         if ((float)$v['debit'] > 0) {
            $transactions[] = [
                'date' => $v['entry_date'],
                'type' => 'Payment',
                'reference' => $v['voucher_number'],
                'debit' => (float)$v['debit'], // Decreases amount owed (debit to A/P)
                'credit' => 0.00,
                'description' => $v['description'] ?: 'Payment',
            ];
        }
    }

    // 5️⃣ Sort all transactions by date
    usort($transactions, function($a, $b) {
        return strtotime($a['date']) <=> strtotime($b['date']);
    });

    // 6️⃣ Compute running balance
    foreach ($transactions as $t) {
        $runningBalance += ($t['credit'] - $t['debit']);
        $t['balance'] = $runningBalance;
        $ledger[] = $t;
    }

    // 7️⃣ Return JSON response
    echo json_encode([
        'supplier' => $supplier,
        'ledger' => $ledger,
        'current_balance' => $runningBalance
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred: ' . $e->getMessage()]);
}
?>