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
        $company_stmt = $pdo->prepare("SELECT company_name, address, phone, email, logo_path FROM companies WHERE id = ?");
        $company_stmt->execute([$company_id]);
        $company_info = $company_stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("
            SELECT
                jv.id, jv.entry_date AS date, jv.voucher_number AS reference, jv.status,
                jv.total_credits AS amount, jv.created_at, jv.narration,
                u.full_name AS created_by,
                fy.year as fiscal_year,
                ap.period_name as accounting_period
            FROM journal_vouchers jv
            LEFT JOIN users u ON jv.created_by_id = u.id
            LEFT JOIN fiscal_years fy ON jv.fiscal_year_id = fy.id
            LEFT JOIN accounting_periods ap ON jv.accounting_period_id = ap.id
            WHERE jv.company_id = ? AND jv.source = 'Receipt'
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

        $receipts = array_map(function ($v) use ($accounts, $company_info) {
            $narration = json_decode($v['narration'], true);
            $rec_acct_id = $narration['details']['receipt_account_id'] ?? null;
            $cust_id = $narration['details']['customer_id'] ?? null;

            return [
                'id' => (int)$v['id'],
                'date' => $v['date'],
                'reference' => $v['reference'],
                'status' => ucfirst($v['status']),
                'amount' => (float)$v['amount'],
                'description' => $narration['description'] ?? '',
                'receipt_type' => $narration['details']['receipt_type'] ?? 'Other',
                'customer_id' => (int)$cust_id,
                'customer_name' => $narration['details']['customer_name'] ?? 'N/A',
                'payment_method' => $narration['details']['payment_method'] ?? '',
                'invoice_id' => $narration['details']['invoice_id'] ?? null,
                'created_at' => $v['created_at'],
                'created_by' => $v['created_by'],
                'receipt_account_id' => (int)$rec_acct_id,
                'cash_bank_account' => $accounts[$rec_acct_id]['account_name'] ?? 'N/A',
                'cash_bank_account_code' => $accounts[$rec_acct_id]['account_code'] ?? 'N/A',
                'fiscal_year' => $v['fiscal_year'] ?? null,
                'accounting_period' => $v['accounting_period'] ?? null,
                'company_info' => $company_info
            ];
        }, $vouchers);

        echo json_encode($receipts);
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
        return;
    }

    $required = ['date', 'amount', 'receipt_account_id', 'receipt_type', 'payment_method', 'customer_id'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed, missing field: ' . $field]);
            return;
        }
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT id, status FROM journal_vouchers WHERE id = ? AND company_id = ? AND source = 'Receipt' FOR UPDATE");
        $stmt->execute([$id, $company_id]);
        $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$voucher) throw new Exception('Receipt not found.');
        if ($voucher['status'] !== 'draft') throw new Exception('Only draft receipts can be updated.');

        $cust_stmt = $pdo->prepare("SELECT customer_name FROM customers WHERE id = ?");
        $cust_stmt->execute([$input['customer_id']]);
        $customer_name = $cust_stmt->fetchColumn();

        $narration = json_encode([
            'description' => $input['description'] ?? 'Receipt updated',
            'details' => [
                'receipt_type' => $input['receipt_type'],
                'receipt_account_id' => $input['receipt_account_id'],
                'customer_id' => $input['customer_id'],
                'customer_name' => $customer_name,
                'payment_method' => $input['payment_method'],
                'invoice_id' => $input['invoice_id'] ?? null,
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
        return;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT status FROM journal_vouchers WHERE id = ? AND company_id = ?");
        $stmt->execute([$id, $company_id]);
        $status = $stmt->fetchColumn();

        if ($status === false) throw new Exception('Receipt not found.');
        if ($status !== 'draft') throw new Exception('Only draft receipts can be deleted.');

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
    $required = ['date', 'amount', 'receipt_account_id', 'receipt_type', 'payment_method', 'customer_id'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => 'Validation failed, missing field: ' . $field]);
            return;
        }
    }

    $pdo->beginTransaction();
    try {
        $count_stmt = $pdo->prepare("SELECT COUNT(*) FROM journal_vouchers WHERE company_id = ? AND entry_date = ? AND source = 'Receipt'");
        $count_stmt->execute([$company_id, $input['date']]);
        $seq = $count_stmt->fetchColumn() + 1;
        $voucher_no = 'RCT-' . date('Ymd', strtotime($input['date'])) . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $cust_stmt = $pdo->prepare("SELECT customer_name FROM customers WHERE id = ?");
        $cust_stmt->execute([$input['customer_id']]);
        $customer_name = $cust_stmt->fetchColumn();

        $narration = json_encode([
            'description' => $input['description'] ?? 'Receipt recorded',
            'details' => [
                'receipt_type' => $input['receipt_type'],
                'receipt_account_id' => $input['receipt_account_id'],
                'customer_id' => $input['customer_id'],
                'customer_name' => $customer_name,
                'payment_method' => $input['payment_method'],
                'invoice_id' => $input['invoice_id'] ?? null,
            ]
        ]);

        $stmt = $pdo->prepare("
            INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, narration, total_debits, total_credits, status)
            VALUES (?, ?, ?, 'Receipt', ?, 'Journal', ?, ?, ?, 'draft')
        ");
        $stmt->execute([$company_id, $user_id, $voucher_no, $input['date'], $narration, $input['amount'], $input['amount']]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'reference' => $voucher_no, 'id' => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Create draft failed: ' . $e->getMessage()]);
    }
}

function postToLedger($pdo, $company_id, $user_id, $id) {
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ? AND status = 'draft' FOR UPDATE");
        $stmt->execute([$id, $company_id]);
        $v = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$v) throw new Exception('Draft receipt not found.');

        $narration = json_decode($v['narration'], true);
        $details = $narration['details'];
        $amount = (float)$v['total_credits'];
        $rec_acct_id = $details['receipt_account_id'];
        $desc = $narration['description'] ?? 'Receipt Posting';

        // Determine credit account based on receipt type
        $credit_account_id = 1200; // Default: Accounts Receivable
        if ($details['receipt_type'] === 'Refund') {
            // Logic to get a refund liability account
            $credit_account_id = 2200; // Example: Customer Refunds
        } else if ($details['receipt_type'] === 'Advance Payment') {
            $credit_account_id = 2300; // Example: Customer Advances
        } else if ($details['receipt_type'] === 'Other') {
            $credit_account_id = 4100; // Example: Other Income
        }

        // DEBIT Cash/Bank Account
        $pdo->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, description) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$company_id, $user_id, $id, $rec_acct_id, $amount, $desc]);

        // CREDIT Appropriate Account
        $pdo->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, credit, description) VALUES (?, ?, ?, ?, ?, ?)")
            ->execute([$company_id, $user_id, $id, $credit_account_id, $amount, $desc]);

        // Update Invoice if applicable
        if ($details['receipt_type'] === 'Customer Receipt' && !empty($details['invoice_id'])) {
            $inv_id = $details['invoice_id'];
            $update_inv = $pdo->prepare("UPDATE sales_invoices SET amount_paid = amount_paid + ? WHERE id = ?");
            $update_inv->execute([$amount, $inv_id]);

            // Check if invoice is fully paid
            $check_inv = $pdo->prepare("SELECT total_amount, amount_paid FROM sales_invoices WHERE id = ?");
            $check_inv->execute([$inv_id]);
            $invoice_status = $check_inv->fetch(PDO::FETCH_ASSOC);
            if ($invoice_status && $invoice_status['amount_paid'] >= $invoice_status['total_amount']) {
                $pdo->prepare("UPDATE sales_invoices SET status = 'PAID' WHERE id = ?")->execute([$inv_id]);
            }
        }

        $pdo->prepare("UPDATE journal_vouchers SET status='posted', updated_by_id = ? WHERE id = ?")
            ->execute([$user_id, $id]);

        $pdo->commit();
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Post to ledger failed: ' . $e->getMessage()]);
    }
}

function reverseTransaction($pdo, $company_id, $user_id, $id) {
    // This remains largely the same, but we need to reverse the invoice payment too.
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ? AND status = 'posted' FOR UPDATE");
        $stmt->execute([$id, $company_id]);
        $v_orig = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$v_orig) throw new Exception('Posted receipt not found or already reversed.');

        $narration_orig = json_decode($v_orig['narration'], true);
        $details_orig = $narration_orig['details'];
        $amount = (float)$v_orig['total_credits'];

        $rev_voucher_no = 'REV-' . $v_orig['voucher_number'];
        $rev_narration = json_encode([
            'description' => 'Reversal of receipt ' . $v_orig['voucher_number'],
            'details' => $details_orig
        ]);

        $stmt = $pdo->prepare("
            INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, narration, total_debits, total_credits, status, reversal_of)
            VALUES (?, ?, ?, 'Receipt', CURDATE(), 'Reversal', ?, ?, ?, 'posted', ?)
        ");
        $stmt->execute([$company_id, $user_id, $rev_voucher_no, $rev_narration, $amount, $amount, $id]);
        $rev_id = $pdo->lastInsertId();

        // Reverse the original journal lines
        $lines_stmt = $pdo->prepare("SELECT * from journal_voucher_lines WHERE voucher_id = ?");
        $lines_stmt->execute([$id]);
        while ($line = $lines_stmt->fetch(PDO::FETCH_ASSOC)) {
             $pdo->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute([$company_id, $user_id, $rev_id, $line['account_id'], $line['credit'], $line['debit'], 'Reversal']);
        }

        // Reverse invoice payment if applicable
        if ($details_orig['receipt_type'] === 'Customer Receipt' && !empty($details_orig['invoice_id'])) {
             $inv_id = $details_orig['invoice_id'];
             $pdo->prepare("UPDATE sales_invoices SET amount_paid = amount_paid - ? WHERE id = ?")->execute([$amount, $inv_id]);
             $pdo->prepare("UPDATE sales_invoices SET status = 'PARTIAL' WHERE id = ? AND status = 'PAID'")->execute([$inv_id]);
        }

        $pdo->prepare("UPDATE journal_vouchers SET status='reversed' WHERE id = ?")->execute([$id]);

        $pdo->commit();
        echo json_encode(['success' => true, 'reversal_id' => $rev_id]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Reversal failed: ' . $e->getMessage()]);
    }
}
?>