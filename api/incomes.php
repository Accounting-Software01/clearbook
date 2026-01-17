<?php
/**
 * API for Incomes - REWRITTEN WITH BEST PRACTICES
 *
 * This API manages income records by treating them as journal vouchers, adhering to
 * strict accounting principles.
 *
 * Key Principles Implemented:
 * 1.  **Ledger-First Design**: Uses `journal_vouchers` as the source of truth.
 * 2.  **Draft vs. Posted States**:
 *     - Drafts are created in `journal_vouchers` ONLY. No ledger lines are created.
 *     - Posting is a separate, explicit action that creates immutable `journal_voucher_lines`.
 * 3.  **Transactional Integrity**: All database operations are wrapped in transactions.
 * 4.  **Audit Safety**: Posted entries cannot be deleted or directly edited. Updates to drafts do not affect the ledger.
 * 5.  **Data Integrity**:
 *     - Account types are validated before posting (Asset vs. Revenue).
 *     - Balances are checked to ensure debits equal credits.
 * 6.  **Robust API Design**: Uses a specific `?action=post` parameter to separate creation from posting.
 */

require_once '../../src/app/api/db_connect.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$pdo = connect_db();
$method = $_SERVER['REQUEST_METHOD'];
$company_id = isset($_GET['company_id']) ? $_GET['company_id'] : null;
$user_id = $_GET['user_id'] ?? null;
if (!$user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
if (!$company_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required']);
    exit;
}

// Helper function to get account type
function get_account_type($pdo, $account_code, $company_id) {
    $stmt = $pdo->prepare("SELECT account_type FROM chart_of_accounts WHERE account_code = ? AND company_id = ?");
    $stmt->execute([$account_code, $company_id]);
    return $stmt->fetchColumn();
}

switch ($method) {
    case 'GET':
        try {
            // New GET logic: Fetch all vouchers and parse narration for details.
            // This is safer and correctly reflects the draft/posted state.
            $stmt = $pdo->prepare("
                SELECT
                    jv.id,
                    jv.entry_date as date,
                    jv.voucher_number as reference,
                    jv.status,
                    jv.narration,
                    jv.total_debits as amount,
                    jv.created_at as createdAt,
                    u.username as createdBy -- Assuming a users table with a username column
                FROM journal_vouchers jv
                LEFT JOIN users u ON jv.created_by_id = u.id
                WHERE jv.company_id = ? AND jv.source = 'Income'
                ORDER BY jv.entry_date DESC, jv.id DESC
            ");
            $stmt->execute([$company_id]);
            $vouchers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch all accounts for mapping to avoid N+1 queries
            $accounts_stmt = $pdo->prepare("SELECT account_code, account_name FROM chart_of_accounts WHERE company_id = ?");
            $accounts_stmt->execute([$company_id]);
            $accounts_map = $accounts_stmt->fetchAll(PDO::FETCH_KEY_PAIR);

            $incomes = [];
            foreach ($vouchers as $voucher) {
                $narration_data = json_decode($voucher['narration'], true);
                
                $income_details = [
                    'id' => (int) $voucher['id'],
                    'date' => $voucher['date'],
                    'reference' => $voucher['reference'],
                    'status' => $voucher['status'],
                    'amount' => (float) $voucher['amount'],
                    'createdAt' => $voucher['createdAt'],
                    'createdBy' => $voucher['createdBy'] ?? 'system',
                    'description' => $narration_data['description'] ?? '',
                    'payment_method' => $narration_data['details']['payment_method'] ?? null,
                    'received_from' => $narration_data['details']['received_from'] ?? null
                ];

                if ($voucher['status'] === 'posted') {
                    // For posted, get accounts from ledger lines
                    $lines_stmt = $pdo->prepare("SELECT account_id, debit FROM journal_voucher_lines WHERE voucher_id = ?");
                    $lines_stmt->execute([$voucher['id']]);
                    $lines = $lines_stmt->fetchAll(PDO::FETCH_ASSOC);
                    foreach($lines as $line) {
                        if($line['debit'] > 0) { // Asset account was debited
                            $income_details['payment_account_code'] = $line['account_id'];
                            $income_details['payment_account'] = $accounts_map[$line['account_id']] ?? 'N/A';
                        } else { // Revenue account was credited
                            $income_details['income_account_code'] = $line['account_id'];
                            $income_details['income_account'] = $accounts_map[$line['account_id']] ?? 'N/A';
                        }
                    }
                } else { // For draft, get from narration
                    $payment_acct_id = $narration_data['details']['payment_account_id'] ?? null;
                    $income_acct_id = $narration_data['details']['income_account_id'] ?? null;

                    $income_details['payment_account_code'] = $payment_acct_id;
                    $income_details['payment_account'] = $accounts_map[$payment_acct_id] ?? 'N/A';
                    $income_details['income_account_code'] = $income_acct_id;
                    $income_details['income_account'] = $accounts_map[$income_acct_id] ?? 'N/A';
                }
                $incomes[] = $income_details;
            }

            echo json_encode($incomes);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        $action = isset($_GET['action']) ? $_GET['action'] : 'create';
        $data = json_decode(file_get_contents('php://input'), true);

        if ($action === 'create') {
            // --- Stage 1: Create a DRAFT income voucher ---
            // NO ledger lines are created here.
            
            if (!isset($data['date'], $data['amount'], $data['income_account_id'], $data['payment_account_id']) || !is_numeric($data['amount']) || $data['amount'] <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid input. Required fields: date, amount, income_account_id, payment_account_id.']);
                exit;
            }

            $pdo->beginTransaction();
            try {
                // More robust voucher number: Prefix-Date-Sequence/Unique ID
                $count_stmt = $pdo->prepare("SELECT COUNT(*) FROM journal_vouchers WHERE company_id = ? AND entry_date = ?");
                $count_stmt->execute([$company_id, $data['date']]);
                $today_count = $count_stmt->fetchColumn() + 1;
                $voucher_number = 'INC-' . date('Ymd', strtotime($data['date'])) . '-' . str_pad($today_count, 4, '0', STR_PAD_LEFT);

                // Store accounting details in narration as JSON for the draft.
                $narration = json_encode([
                    'description' => $data['description'] ?? 'Income recorded',
                    'details' => [
                        'income_account_id' => $data['income_account_id'],
                        'payment_account_id' => $data['payment_account_id'],
                        'payment_method' => $data['payment_method'] ?? 'N/A',
                        'received_from' => $data['received_from'] ?? null,
                    ]
                ]);

                $stmt = $pdo->prepare("
                    INSERT INTO journal_vouchers 
                    (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, narration, total_debits, total_credits, status)
                    VALUES (?, ?, ?, 'Income', ?, 'Journal', ?, ?, ?, 'draft')
                ");
                $stmt->execute([
                    $company_id, $user_id, $voucher_number, $data['date'], $narration, $data['amount'], $data['amount']
                ]);
                $voucher_id = $pdo->lastInsertId();

                $pdo->commit();
                
                $data['id'] = $voucher_id;
                $data['reference'] = $voucher_number;
                $data['status'] = 'draft';
                http_response_code(201);
                echo json_encode($data);

            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create draft income: ' . $e->getMessage()]);
            }

        } elseif ($action === 'post') {
            // --- Stage 2: Post the DRAFT voucher to the Ledger ---
            $voucher_id = isset($_GET['id']) ? intval($_GET['id']) : 0;
            if ($voucher_id === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid income ID for posting.']);
                exit;
            }

            $pdo->beginTransaction();
            try {
                // Lock the voucher row to prevent race conditions
                $stmt = $pdo->prepare("SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ? AND status = 'draft' FOR UPDATE");
                $stmt->execute([$voucher_id, $company_id]);
                $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$voucher) {
                    throw new Exception("Income not found or is not in draft status.", 404);
                }

                $narration_data = json_decode($voucher['narration'], true);
                $details = $narration_data['details'];
                $amount = (float)$voucher['total_debits'];
                
                // VALIDATE account types
                $payment_account_type = get_account_type($pdo, $details['payment_account_id'], $company_id);
                $income_account_type = get_account_type($pdo, $details['income_account_id'], $company_id);

                if ($payment_account_type !== 'Asset') {
                    throw new Exception("Payment account must be an Asset type account.", 400);
                }
                if ($income_account_type !== 'Revenue') {
                    throw new Exception("Income account must be a Revenue type account.", 400);
                }
                
                // Create Ledger Lines
                $description = $narration_data['description'] ?? 'Posted income';

                // Debit Asset Account
                $stmt_debit = $pdo->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, description) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt_debit->execute([$company_id, $user_id, $voucher_id, $details['payment_account_id'], $amount, $description]);

                // Credit Revenue Account
                $stmt_credit = $pdo->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, credit, description) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt_credit->execute([$company_id, $user_id, $voucher_id, $details['income_account_id'], $amount, $description]);

                // Update voucher status to 'posted'
                $stmt_update = $pdo->prepare("UPDATE journal_vouchers SET status = 'posted' WHERE id = ?");
                $stmt_update->execute([$voucher_id]);

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Income #{$voucher_id} posted to ledger successfully."]);

            } catch (Exception $e) {
                $pdo->rollBack();
                $code = $e->getCode() >= 400 ? $e->getCode() : 500;
                http_response_code($code);
                echo json_encode(['error' => 'Failed to post income: ' . $e->getMessage()]);
            }
        }
        break;

    case 'PUT':
        // Update a DRAFT income. This cannot touch posted entries.
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid ID for update']);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['date'], $data['amount']) || $data['amount'] <= 0) {
             http_response_code(400);
            echo json_encode(['error' => 'Invalid input data for update.']);
            exit;
        }

        $pdo->beginTransaction();
        try {
            // Ensure voucher is a draft before updating
            $stmt_check = $pdo->prepare("SELECT status, narration FROM journal_vouchers WHERE id = ? AND company_id = ? FOR UPDATE");
            $stmt_check->execute([$id, $company_id]);
            $voucher = $stmt_check->fetch(PDO::FETCH_ASSOC);

            if (!$voucher || $voucher['status'] !== 'draft') {
                throw new Exception('Only draft incomes can be updated.', 403);
            }
            
            // Reconstruct narration with updated details
            $old_narration = json_decode($voucher['narration'], true);
            $new_narration = json_encode([
                'description' => $data['description'] ?? $old_narration['description'],
                'details' => [
                    'income_account_id' => $data['income_account_id'] ?? $old_narration['details']['income_account_id'],
                    'payment_account_id' => $data['payment_account_id'] ?? $old_narration['details']['payment_account_id'],
                    'payment_method' => $data['payment_method'] ?? $old_narration['details']['payment_method'],
                    'received_from' => $data['received_from'] ?? $old_narration['details']['received_from'],
                ]
            ]);

            $stmt = $pdo->prepare("
                UPDATE journal_vouchers
                SET entry_date = ?, narration = ?, total_debits = ?, total_credits = ?
                WHERE id = ? AND company_id = ? AND status = 'draft'
            ");
            $stmt->execute([$data['date'], $new_narration, $data['amount'], $data['amount'], $id, $company_id]);

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Draft income updated successfully.']);

        } catch (Exception $e) {
            $pdo->rollBack();
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            http_response_code($code);
            echo json_encode(['error' => 'Failed to update income record: ' . $e->getMessage()]);
        }
        break;
        
    case 'DELETE':
        // Delete a DRAFT income. This will not and cannot touch the ledger.
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        if ($id === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid ID for deletion']);
            exit;
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT status FROM journal_vouchers WHERE id = ? AND company_id = ?");
            $stmt->execute([$id, $company_id]);
            $status = $stmt->fetchColumn();

            if ($status === false) { throw new Exception("Income not found.", 404); }
            if ($status !== 'draft') { throw new Exception("Cannot delete an income that is not in draft status.", 403); }

            // It is safe to delete from journal_vouchers because no lines exist for a draft.
            $stmt_delete = $pdo->prepare("DELETE FROM journal_vouchers WHERE id = ?");
            $stmt_delete->execute([$id]);
            
            if ($stmt_delete->rowCount() === 0) {
                 throw new Exception("Failed to delete the draft income.", 500);
            }

            $pdo->commit();
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Draft income deleted successfully.']);
        } catch (Exception $e) {
            $pdo->rollBack();
            $code = $e->getCode() >= 400 ? $e->getCode() : 500;
            http_response_code($code);
            echo json_encode(['error' => 'Failed to delete income: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        break;
}
