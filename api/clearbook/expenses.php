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
require_once 'db_connect.php';

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
switch ($method) {
    case 'GET':
        handleGet($pdo, $company_id);
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

// ======================================================
// HANDLER FUNCTIONS
// ======================================================

function handleGet($pdo, $company_id) {
    try {
        // Get company details for printing
        $company_stmt = $pdo->prepare("SELECT company_name, address, phone, email, logo_path FROM companies WHERE id = ?");
        $company_stmt->execute([$company_id]);
        $company_info = $company_stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("
            SELECT
                jv.id, jv.entry_date AS date, jv.voucher_number AS reference, jv.status,
                jv.total_debits AS amount, jv.created_at, jv.narration,
                u.full_name AS created_by,
                fy.year as fiscal_year,
                ap.period_name as accounting_period
            FROM journal_vouchers jv
            LEFT JOIN users u ON jv.created_by_id = u.id
            LEFT JOIN fiscal_years fy ON jv.fiscal_year_id = fy.id
            LEFT JOIN accounting_periods ap ON jv.accounting_period_id = ap.id
            WHERE jv.company_id = ? AND jv.source = 'Expense'
            ORDER BY jv.entry_date DESC, jv.id DESC
        ");
        $stmt->execute([$company_id]);
        $vouchers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $acctStmt = $pdo->prepare("SELECT account_code, account_name, id FROM chart_of_accounts WHERE company_id = ?");
        $acctStmt->execute([$company_id]);
        $accounts = [];
        foreach ($acctStmt->fetchAll(PDO::FETCH_ASSOC) as $acc) {
            $accounts[$acc['id']] = $acc;
        }

        $expenses = array_map(function ($v) use ($accounts, $company_info) {
            $narration = json_decode($v['narration'], true);
            $exp_acct_id = $narration['details']['expense_account_id'] ?? null;
            $pay_acct_id = $narration['details']['payment_account_id'] ?? null;
            
            return [
                'id' => (int)$v['id'],
                'date' => $v['date'],
                'reference' => $v['reference'],
                'status' => ucfirst($v['status']),
                'amount' => (float)$v['amount'],
                'description' => $narration['description'] ?? '',
                'paid_to' => $narration['details']['paid_to'] ?? '',
                'payment_method' => $narration['details']['payment_method'] ?? '',
                'created_at' => $v['created_at'],
                'created_by' => $v['created_by'],
                'expense_account_id' => (int)$exp_acct_id,
                'expense_account' => $accounts[$exp_acct_id]['account_name'] ?? 'N/A',
                'expense_account_code' => $accounts[$exp_acct_id]['account_code'] ?? 'N/A',
                'payment_account_id' => (int)$pay_acct_id,
                'payment_account' => $accounts[$pay_acct_id]['account_name'] ?? 'N/A',
                'payment_account_code' => $accounts[$pay_acct_id]['account_code'] ?? 'N/A',
                'fiscal_year' => $v['fiscal_year'] ?? null,
                'accounting_period' => $v['accounting_period'] ?? null,
                'company_info' => $company_info // Add company info for printing
            ];
        }, $vouchers);

        echo json_encode($expenses);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'GET failed: ' . $e->getMessage()]);
    }
}

function handlePost($pdo, $company_id, $user_id, $id, $action, $input) {
    if ($action === 'create') {
        createDraft($pdo, $company_id, $user_id, $input);
    } elseif ($action === 'post') {
        postToLedger($pdo, $company_id, $user_id, $id);
    } elseif ($action === 'reverse') {
        reverseTransaction($pdo, $company_id, $user_id, $id);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid POST action']);
    }
}

function handlePut($pdo, $company_id, $user_id, $id, $input) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for update']);
        exit;
    }
    
    $required = ['date', 'amount', 'expense_account_id', 'payment_account_id', 'payment_method'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed, missing field: ' . $field]);
            return;
        }
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT id, status FROM journal_vouchers WHERE id = ? AND company_id = ? AND source = 'Expense' FOR UPDATE");
        $stmt->execute([$id, $company_id]);
        $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$voucher) throw new Exception('Expense not found.');
        if ($voucher['status'] !== 'draft') throw new Exception('Only draft expenses can be updated.');

        $narration = json_encode([
            'description' => $input['description'] ?? 'Expense updated',
            'details' => [
                'expense_account_id' => $input['expense_account_id'],
                'payment_account_id' => $input['payment_account_id'],
                'payment_method' => $input['payment_method'],
                'paid_to' => $input['paid_to'] ?? null
            ]
        ]);

        $stmt = $pdo->prepare("
            UPDATE journal_vouchers
            SET entry_date = ?, narration = ?, total_debits = ?, total_credits = ?, updated_by_id = ?
            WHERE id = ?
        ");
        $stmt->execute([$input['date'], $narration, $input['amount'], $input['amount'], $user_id, $id]);
        
        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Update failed: ' . $e->getMessage()]);
    }
}

function handleDelete($pdo, $company_id, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ID for delete']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT status FROM journal_vouchers WHERE id = ? AND company_id = ?");
        $stmt->execute([$id, $company_id]);
        $status = $stmt->fetchColumn();

        if ($status === false) {
            throw new Exception('Expense not found.');
        }
        if ($status !== 'draft') {
            throw new Exception('Only draft expenses can be deleted.');
        }

        $stmt = $pdo->prepare("DELETE FROM journal_vouchers WHERE id = ?");
        $stmt->execute([$id]);

        $pdo->commit();
        echo json_encode(['success' => true]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Delete failed: ' . $e->getMessage()]);
    }
}

function createDraft($pdo, $company_id, $user_id, $input) {
    // This function remains the same
}

function postToLedger($pdo, $company_id, $user_id, $id) {
    // This function remains the same
}

function reverseTransaction($pdo, $company_id, $user_id, $id) {
    // This function remains the same
}
?>