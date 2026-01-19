<?php
// api/clearbook/journal-entry.php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, DELETE, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php'; // creates $conn (mysqli)

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed: " . $conn->connect_error]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

function generate_voucher_number($conn, $company_id) {
    $year = date('Y');
    $voucher_prefix = $company_id . '-' . $year . '-';

    $sql = "SELECT MAX(CAST(SUBSTRING(voucher_number, LENGTH(?) + 1) AS UNSIGNED)) AS max_no 
            FROM journal_vouchers 
            WHERE voucher_number LIKE ? AND company_id = ?";
    
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Failed to prepare voucher number statement: ' . $conn->error);
    }
    
    $like_pattern = $voucher_prefix . '%';
    $stmt->bind_param('sss', $voucher_prefix, $like_pattern, $company_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    
    $next_no = ($result['max_no'] ?? 0) + 1;
    return $voucher_prefix . str_pad($next_no, 6, '0', STR_PAD_LEFT);
}

if ($method == 'POST') {
    $action = $_GET['action'] ?? null;

    if ($action == 'post') {
        // ACTION: POSTING A DRAFT JOURNAL
        $voucher_id = $_GET['id'] ?? null;
        $company_id = $_GET['company_id'] ?? null;
        $user_id = $_GET['user_id'] ?? null;

        if (!$voucher_id || !$company_id || !$user_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Voucher ID, Company ID, and User ID are required.']);
            exit;
        }

        $conn->begin_transaction();
        try {
            // Check if the voucher exists and is a draft
            $stmt = $conn->prepare("SELECT id FROM journal_vouchers WHERE id = ? AND company_id = ? AND status = 'draft'");
            if (!$stmt) throw new Exception('Select voucher failed: ' . $conn->error);
            $stmt->bind_param('is', $voucher_id, $company_id);
            $stmt->execute();
            $voucher = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$voucher) {
                throw new Exception('Draft voucher not found or has already been processed.', 404);
            }

            // THE FIX: Removed all code related to general_ledger. 
            // The only action is to update the status to 'posted'.
            $update_stmt = $conn->prepare("UPDATE journal_vouchers SET status = 'posted' WHERE id = ? AND company_id = ?");
            if (!$update_stmt) throw new Exception('Voucher update failed: ' . $conn->error);
            $update_stmt->bind_param('is', $voucher_id, $company_id);
            $update_stmt->execute();
            $update_stmt->close();

            $conn->commit();
            echo json_encode(['success' => true, 'message' => 'Journal entry posted successfully.']);

        } catch (Exception $e) {
            $conn->rollback();
            $code = $e->getCode() === 404 ? 404 : 500;
            http_response_code($code);
            echo json_encode(['error' => 'Posting failed: ' . $e->getMessage()]);
        }

    } else {
        // ACTION: CREATING A NEW DRAFT
        $data = json_decode(file_get_contents("php://input"));

        if (!isset($data->company_id, $data->user_id, $data->entryDate, $data->narration, $data->lines)) {
            http_response_code(400);
            echo json_encode(["error" => "Incomplete data for journal entry."]);
            exit;
        }

        $conn->begin_transaction();
        try {
            $voucher_number = generate_voucher_number($conn, $data->company_id);
            
            $stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, narration, total_debits, total_credits, status) VALUES (?, ?, ?, 'Journal', ?, 'Journal', ?, ?, ?, 'draft')");
            if ($stmt === false) {
                throw new Exception("Voucher insert prep failed: " . $conn->error);
            }

            $stmt->bind_param('sisssdd', $data->company_id, $data->user_id, $voucher_number, $data->entryDate, $data->narration, $data->totalDebits, $data->totalCredits);
            $stmt->execute();

            $journalVoucherId = $stmt->insert_id;
            if ($journalVoucherId === 0) {
                throw new Exception('Voucher creation failed, insert_id is 0. Error: ' . $stmt->error);
            }
            $stmt->close();

            $line_stmt = $conn->prepare("INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, payee_id, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            if ($line_stmt === false) {
                 throw new Exception("Line insert prep failed: " . $conn->error);
            }
            foreach ($data->lines as $line) {
                $payeeId = $line->payeeId ?? null;
                // FIX: Read 'narration' from the payload to match the frontend
                $description = $line->narration ?? null;
                // FIX: Use 'account_code' to match the frontend payload
                $line_stmt->bind_param('siisddis', $data->company_id, $data->user_id, $journalVoucherId, $line->account_code, $line->debit, $line->credit, $payeeId, $description);
                $line_stmt->execute();
            }
            $line_stmt->close();
            
            $conn->commit();
            http_response_code(201);
            echo json_encode(['success' => true, 'journalVoucherId' => $journalVoucherId]);

        } catch (Exception $e) {
            $conn->rollback();
            http_response_code(500);
            echo json_encode(['error' => 'Database operation failed: ' . $e->getMessage()]);
        }
    }
} elseif ($method == 'DELETE') {
    // ACTION: DELETING A DRAFT JOURNAL
    $id = $_GET['id'] ?? null;
    $company_id = $_GET['company_id'] ?? null;

    if (!$id || !$company_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Voucher ID and Company ID are required for deletion.']);
        exit;
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("SELECT status FROM journal_vouchers WHERE id = ? AND company_id = ?");
        if (!$stmt) throw new Exception('Check status failed: ' . $conn->error);
        $stmt->bind_param('is', $id, $company_id);
        $stmt->execute();
        $voucher = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$voucher || $voucher['status'] !== 'draft') {
            throw new Exception('Cannot delete. Only draft entries can be deleted.', 403);
        }

        $line_del_stmt = $conn->prepare("DELETE FROM journal_voucher_lines WHERE voucher_id = ? AND company_id = ?");
        if (!$line_del_stmt) throw new Exception('Line delete failed: ' . $conn->error);
        $line_del_stmt->bind_param('is', $id, $company_id);
        $line_del_stmt->execute();
        $line_del_stmt->close();

        $voucher_del_stmt = $conn->prepare("DELETE FROM journal_vouchers WHERE id = ? AND company_id = ?");
        if (!$voucher_del_stmt) throw new Exception('Voucher delete failed: ' . $conn->error);
        $voucher_del_stmt->bind_param('is', $id, $company_id);
        $voucher_del_stmt->execute();
        $voucher_del_stmt->close();

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Draft journal entry deleted successfully.']);

    } catch (Exception $e) {
        $conn->rollback();
        $code = $e->getCode() === 403 ? 403 : 500;
        http_response_code($code);
        echo json_encode(['error' => 'Delete operation failed: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

$conn->close();
?>