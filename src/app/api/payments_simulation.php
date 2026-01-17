<?php
// ======================================================
// CORS & ERROR HANDLING
// ======================================================
$allowed_origins = [
    'https://clearbook-olive.vercel.app',
    'https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
    'https://hariindustries.net'
];
if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

ini_set('display_errors', 1);
error_reporting(E_ALL);

// ======================================================
// BOOTSTRAP
// ======================================================
require_once 'db_connect.php'; // Provides a PDO object $pdo

// ======================================================
// INPUT & AUTH
// ======================================================
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$company_id = $_GET['company_id'] ?? $input['company_id'] ?? null;
$user_id = $_GET['user_id'] ?? $input['user_id'] ?? null;

if (!$company_id || !$user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: Missing company_id or user_id']);
    exit;
}

$id = (int)($_GET['id'] ?? 0);
$action = $_GET['action'] ?? null;

// ======================================================
// ROUTER
// ======================================================
try {
    switch ($method) {
        case 'GET':
            handleGet($pdo, $company_id, $action, $_GET);
            break;
        case 'POST':
            handlePost($pdo, $company_id, $user_id, $id, $action, $input);
            break;
        case 'PUT':
            handlePut($pdo, $company_id, $user_id, $id, $input);
            break;
        case 'DELETE':
            handleDelete($pdo, $company_id, $id);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method Not Allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Operation failed: ' . $e->getMessage()]);
}

// ======================================================
// HANDLER FUNCTIONS
// ======================================================

function handleGet($pdo, $company_id, $action, $params) {
    // These actions are for populating form dropdowns and are kept separate
    $simple_actions = [
        'get_suppliers' => "SELECT id, supplier_name FROM suppliers WHERE company_id = :company_id ORDER BY supplier_name",
        'get_customers' => "SELECT id, customer_name FROM customers WHERE company_id = :company_id ORDER BY customer_name",
        'get_bank_accounts' => "SELECT id, account_name, gl_account_code, id as account_id FROM chart_of_accounts WHERE company_id = :company_id AND classification = 'Asset' AND type = 'Cash & Bank' ORDER BY account_name",
    ];

    if (array_key_exists($action, $simple_actions)) {
        $stmt = $pdo->prepare($simple_actions[$action]);
        $stmt->execute([':company_id' => $company_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        return;
    }
    
    // Complex GET actions that require parameters
    if ($action === 'get_supplier_unpaid_invoices') {
        $supplier_id = (int)($params['supplier_id'] ?? 0);
        if (!$supplier_id) throw new Exception("Supplier ID is required.");
        $stmt = $pdo->prepare("SELECT id, invoice_number, total_amount, total_amount - COALESCE((SELECT SUM(amount) FROM supplier_payments sp WHERE sp.invoice_id = si.id), 0) as outstanding_amount FROM supplier_invoices si WHERE si.supplier_id = ? AND si.company_id = ? AND si.status IN ('SENT', 'PARTIALLY_PAID') HAVING outstanding_amount > 0.01");
        $stmt->execute([$supplier_id, $company_id]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        return;
    }
    
    // Default GET action: list all payments from journal_vouchers
    $stmt = $pdo->prepare("
        SELECT jv.id, jv.entry_date AS date, jv.voucher_number AS reference, jv.status,
               jv.total_debits AS amount, jv.created_at, jv.narration, u.full_name AS created_by
        FROM journal_vouchers jv
        LEFT JOIN users u ON jv.created_by_id = u.id
        WHERE jv.company_id = ? AND jv.source = 'Payment'
        ORDER BY jv.entry_date DESC, jv.id DESC
    ");
    $stmt->execute([$company_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}

function handlePost($pdo, $company_id, $user_id, $id, $action, $input) {
    if ($action === 'create') {
        createDraft($pdo, $company_id, $user_id, $input);
    } elseif ($action === 'post') {
        postToLedger($pdo, $company_id, $user_id, $id);
    } else {
        throw new Exception('Invalid POST action specified.');
    }
}

function handlePut($pdo, $company_id, $user_id, $id, $input) {
    if (!$id) throw new Exception('Invalid ID for update.');
    
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("SELECT id, status FROM journal_vouchers WHERE id = ? AND company_id = ? AND source = 'Payment' FOR UPDATE");
    $stmt->execute([$id, $company_id]);
    if (!$stmt->fetch()) throw new Exception('Draft payment not found.');

    $narration = buildNarration($input);

    $stmt = $pdo->prepare("UPDATE journal_vouchers SET entry_date = ?, narration = ?, total_debits = ?, total_credits = ?, updated_by_id = ? WHERE id = ?");
    $stmt->execute([$input['date'], $narration, $input['amount'], $input['amount'], $user_id, $id]);
    
    $pdo->commit();
    echo json_encode(['success' => true]);
}

function handleDelete($pdo, $company_id, $id) {
    if (!$id) throw new Exception('Invalid ID for delete.');

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT status FROM journal_vouchers WHERE id = ? AND company_id = ? AND source = 'Payment'");
    $stmt->execute([$id, $company_id]);
    if ($stmt->fetchColumn() !== 'draft') throw new Exception('Only draft payments can be deleted.');

    $stmt = $pdo->prepare("DELETE FROM journal_vouchers WHERE id = ?");
    $stmt->execute([$id]);

    $pdo->commit();
    echo json_encode(['success' => true]);
}

// ======================================================
// SUB-FUNCTIONS (LOGIC)
// ======================================================

function buildNarration($input) {
    return json_encode([
        'description' => $input['description'] ?? 'Payment transaction',
        'details' => [
            'payment_type' => $input['payment_type'],
            'payment_method' => $input['payment_method'],
            'payee_name' => $input['payee_name'],
            'debit_account_id' => (int)$input['debit_account_id'],
            'cash_bank_account_id' => (int)$input['cash_bank_account_id'],
            'invoice_id' => $input['invoice_id'] ?? null
        ]
    ]);
}

function createDraft($pdo, $company_id, $user_id, $input) {
    $required = ['date', 'amount', 'payee_name', 'debit_account_id', 'cash_bank_account_id'];
    foreach ($required as $field) {
        if (empty($input[$field])) throw new Exception('Validation failed, missing field: ' . $field);
    }

    $pdo->beginTransaction();

    $count_stmt = $pdo->prepare("SELECT COUNT(*) FROM journal_vouchers WHERE company_id = ? AND entry_date = ? AND source = 'Payment'");
    $count_stmt->execute([$company_id, $input['date']]);
    $seq = $count_stmt->fetchColumn() + 1;
    $voucher_no = 'PAY-' . date('Ymd', strtotime($input['date'])) . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

    $narration = buildNarration($input);

    $stmt = $pdo->prepare("
        INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, narration, total_debits, total_credits, status)
        VALUES (?, ?, ?, 'Payment', ?, 'Journal', ?, ?, ?, 'draft')
    ");
    $stmt->execute([$company_id, $user_id, $voucher_no, $input['date'], $narration, $input['amount'], $input['amount']]);
    
    $pdo->commit();
    echo json_encode(['success' => true, 'reference' => $voucher_no, 'id' => $pdo->lastInsertId()]);
}

function postToLedger($pdo, $company_id, $user_id, $id) {
    if (!$id) throw new Exception('Invalid ID for posting.');
    
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ? AND status = 'draft' AND source = 'Payment' FOR UPDATE");
    $stmt->execute([$id, $company_id]);
    $v = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$v) throw new Exception('Draft payment not found.');

    $narration = json_decode($v['narration'], true);
    $amount = (float)$v['total_debits'];
    $debit_acct_id = $narration['details']['debit_account_id'];
    $credit_acct_id = $narration['details']['cash_bank_account_id'];
    $desc = $narration['description'] ?: 'Payment to ' . ($narration['details']['payee_name'] ?? 'N/A');

    if (!$debit_acct_id || !$credit_acct_id) throw new Exception('Invalid accounting details in narration.');
    
    // Insert Debit Line
    $pdo->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, description) VALUES (?, ?, ?, ?, ?, ?)")
        ->execute([$company_id, $user_id, $id, $debit_acct_id, $amount, $desc]);

    // Insert Credit Line
    $pdo->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, credit, description) VALUES (?, ?, ?, ?, ?, ?)")
        ->execute([$company_id, $user_id, $id, $credit_acct_id, $amount, $desc]);

    // Update Voucher Status
    $pdo->prepare("UPDATE journal_vouchers SET status='posted', updated_by_id = ? WHERE id = ?")
        ->execute([$user_id, $id]);

    $pdo->commit();
    echo json_encode(['success' => true]);
}
?>