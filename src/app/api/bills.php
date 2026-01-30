<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

/* ─────────────────────────────────────────────
   CORS CONFIG — MUST BE FIRST
───────────────────────────────────────────── */

$allowed_origins = [
    "https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev",
    "https://clearbook-olive.vercel.app"
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    header("Vary: Origin");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

/* ─── HANDLE PREFLIGHT ─── */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
require_once __DIR__ . '/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode([
        'success' => false,
        'message' => 'Method Not Allowed'
    ]));
}


// Read and decode JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
    http_response_code(400);
    exit(json_encode([
        'success' => false,
        'message' => 'Invalid JSON payload'
    ]));
}

// Extract and validate required fields
$required = ['supplier_id', 'bill_date', 'due_date', 'items'];
foreach ($required as $field) {
    if (!isset($input[$field]) || ($field === 'items' && !is_array($input[$field]))) {
        http_response_code(400);
        exit(json_encode([
            'success' => false,
            'message' => "Missing or invalid field: $field"
        ]));
    }
}

$supplier_id = $input['supplier_id'];
$bill_date   = $input['bill_date'];
$due_date    = $input['due_date'];
$notes       = $input['notes']       ?? null;
$terms       = $input['terms']       ?? null;
$items       = $input['items'];


$company_id = $input['company_id'] ?? null;
$user_id    = $input['user_id'] ?? null;





if (empty($company_id) || empty($user_id)) {
    http_response_code(401);
    exit(json_encode([
        'success' => false,
        'message' => 'User or company context missing'
    ]));
}


// ────────────────────────────────────────────────
// Calculate totals
// ────────────────────────────────────────────────
$total_net = 0.0;
$total_vat = 0.0;

foreach ($items as $item) {
    $qty    = (float) ($item['quantity']   ?? 0);
    $price  = (float) ($item['unitPrice']  ?? 0);
    $disc   = (float) ($item['discount']   ?? 0);
    $tax    = (float) ($item['taxRate']    ?? 0);

    $net    = round($qty * $price * (1 - $disc / 100), 2);
    $vat    = round($net * ($tax / 100), 2);

    $total_net += $net;
    $total_vat += $vat;
}

$total_gross = round($total_net + $total_vat, 2);

// ────────────────────────────────────────────────
// Start transaction
// ────────────────────────────────────────────────
$conn->begin_transaction();

try {
    // 1. Create the bill
    $stmt = $conn->prepare(
        "INSERT INTO bills 
            (company_id, supplier_id, bill_date, due_date, notes, terms_and_conditions, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("sissssd", $company_id, $supplier_id, $bill_date, $due_date, $notes, $terms, $total_gross);
    $stmt->execute();
    $bill_id = $conn->insert_id;
    $stmt->close();

    // 2. Insert bill items
    $stmt = $conn->prepare(
        "INSERT INTO bill_items 
            (bill_id, description, quantity, unit_price, tax_rate, discount, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    foreach ($items as $item) {
        $qty    = (float) ($item['quantity']   ?? 0);
        $price  = (float) ($item['unitPrice']  ?? 0);
        $disc   = (float) ($item['discount']   ?? 0);
        $tax    = (float) ($item['taxRate']    ?? 0);
        $desc   = trim($item['description'] ?? '');

        $net    = round($qty * $price * (1 - $disc / 100), 2);
        $vat    = round($net * ($tax / 100), 2);
        $gross  = round($net + $vat, 2);

        $stmt->bind_param("isddddd", $bill_id, $desc, $qty, $price, $tax, $disc, $gross);
        $stmt->execute();
    }
    $stmt->close();

    // 3. Create journal voucher
    $jv_number   = "BILL-$bill_id";
    $narration   = "Bill #$bill_id from supplier $supplier_id";

    $stmt = $conn->prepare(
        "INSERT INTO journal_vouchers 
            (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, 
             reference_id, reference_type, narration, total_debits, total_credits, status)
         VALUES (?, ?, ?, 'Bill', ?, 'BILL', ?, 'bills', ?, ?, ?, 'posted')"
    );
    $stmt->bind_param("isssisdd", $company_id, $user_id, $jv_number, $bill_date, $bill_id, $narration, $total_gross, $total_gross);
    $stmt->execute();
    $voucher_id = $conn->insert_id;
    $stmt->close();

    // 4. Get system accounts
    $getSystemAccount = function(string $role) use ($conn, $company_id): string {
        $stmt = $conn->prepare(
            "SELECT account_code FROM chart_of_accounts 
             WHERE company_id = ? AND system_role = ? LIMIT 1"
        );
        $stmt->bind_param("ss", $company_id, $role);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("System account not found: $role");
        }
        
        $row = $result->fetch_assoc();
        $stmt->close();
        return $row['account_code'];
    };

    $ap_account      = $getSystemAccount('accounts_payable');
    $expense_account = $getSystemAccount('default_expense');
    $vat_account     = $getSystemAccount('input_vat');

    // 5. Journal lines – Credit AP
    $stmt_credit = $conn->prepare(
        "INSERT INTO journal_voucher_lines 
            (company_id, user_id, voucher_id, account_id, credit, payee_id, payee_type, description)
         VALUES (?, ?, ?, ?, ?, ?, 'supplier', ?)"
    );
    $stmt_credit->bind_param("siisdis", $company_id, $user_id, $voucher_id, $ap_account, $total_gross, $supplier_id, $narration);
    $stmt_credit->execute();
    $stmt_credit->close();

    // 6. Journal lines – Debit Expense + Input VAT
    $stmt_debit = $conn->prepare(
        "INSERT INTO journal_voucher_lines 
            (company_id, user_id, voucher_id, account_id, debit, payee_id, payee_type, description)
         VALUES (?, ?, ?, ?, ?, ?, 'supplier', ?)"
    );

    foreach ($items as $item) {
        $qty    = (float) ($item['quantity']   ?? 0);
        $price  = (float) ($item['unitPrice']  ?? 0);
        $disc   = (float) ($item['discount']   ?? 0);
        $tax    = (float) ($item['taxRate']    ?? 0);
        $desc   = trim($item['description'] ?? '');

        $net    = round($qty * $price * (1 - $disc / 100), 2);
        $vat    = round($net * ($tax / 100), 2);

        if ($net > 0) {
            $line_desc = "Bill #$bill_id: $desc";
            $stmt_debit->bind_param("siisdis", $company_id, $user_id, $voucher_id, $expense_account, $net, $supplier_id, $line_desc);
            $stmt_debit->execute();
        }

        if ($vat > 0) {
            $vat_desc = "Input VAT – Bill #$bill_id: $desc";
            $stmt_debit->bind_param("siisdis", $company_id, $user_id, $voucher_id, $vat_account, $vat, $supplier_id, $vat_desc);
            $stmt_debit->execute();
        }
    }
    $stmt_debit->close();

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Bill and journal entries created successfully',
        'bill_id' => $bill_id
    ]);

} catch (Exception $e) {
    $conn->rollback();

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to create bill: ' . $e->getMessage()
    ]);
}

$conn->close();