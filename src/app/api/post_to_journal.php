<?php
require_once __DIR__ . '/db_connect.php'; // Use absolute path for robustness

/**
 * Posts a complete journal voucher to the database within a transaction.
 *
 * @param mysqli $conn The database connection object.
 * @param array $data The journal voucher data, including entries.
 * @return array An associative array with 'success' (boolean) and either 'journal_id' (int) or 'error' (string).
 */
function post_journal_entry($conn, $data) {
    try {
        // --- Data Validation ---
        $required_fields = ['company_id', 'user_id', 'journal_date', 'source', 'entries'];
        foreach ($required_fields as $field) {
            if (empty($data[$field])) {
                return ['success' => false, 'error' => "Missing required field in journal data: {$field}"];
            }
        }

        if (!is_array($data['entries']) || count($data['entries']) < 2) {
            return ['success' => false, 'error' => 'A journal voucher must have at least two entries.'];
        }

        $company_id = (int)$data['company_id'];
        $user_id = (int)$data['user_id'];

        // --- Main Voucher Insertion ---
        $stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, journal_date, notes, reference_number, source, status, created_by) VALUES (?, ?, ?, ?, ?, 'posted', ?)");
        if (!$stmt) throw new Exception("Voucher prepare failed: " . $conn->error);
        
        $notes = $data['notes'] ?? '';
        $ref = $data['reference_number'] ?? null;
        $source = $data['source'];
        $date = $data['journal_date'];

        $stmt->bind_param("issssi", $company_id, $date, $notes, $ref, $source, $user_id);
        if (!$stmt->execute()) throw new Exception("Voucher execution failed: " . $stmt->error);
        
        $journal_id = $stmt->insert_id;
        $stmt->close();

        // --- Journal Entries Insertion ---
        $total_debit = 0;
        $total_credit = 0;

        $entry_query = "INSERT INTO journal_entries (journal_id, account_id, debit, credit, description, payee_id, payee_type) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $entry_stmt = $conn->prepare($entry_query);
        if (!$entry_stmt) throw new Exception("Entries prepare failed: " . $conn->error);

        foreach ($data['entries'] as $entry) {
            $debit = (float)($entry['debit'] ?? 0);
            $credit = (float)($entry['credit'] ?? 0);
            $total_debit += $debit;
            $total_credit += $credit;

            $payee_id = $entry['payee_id'] ?? null;
            $payee_type = $entry['payee_type'] ?? null;
            
            $entry_stmt->bind_param("isddiss", $journal_id, $entry['account_id'], $debit, $credit, $entry['description'], $payee_id, $payee_type);
            if (!$entry_stmt->execute()) throw new Exception("Entry execution failed: " . $entry_stmt->error);
        }
        $entry_stmt->close();

        // --- Final Validation ---
        if (round($total_debit, 2) !== round($total_credit, 2)) {
            throw new Exception("Journal entries do not balance. Debits: {$total_debit}, Credits: {$total_credit}");
        }

        return ['success' => true, 'journal_id' => $journal_id];

    } catch (Exception $e) {
        // Log the error for debugging
        log_error('JournalPostingError', $e->getMessage(), $user_id ?? 0, $company_id ?? 0);
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// --- Standalone Endpoint Logic (for backward compatibility if needed) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    global $conn;
    header('Content-Type: application/json');

    $data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid JSON']);
        exit;
    }

    $conn->begin_transaction();

    $result = post_journal_entry($conn, $data);

    if ($result['success']) {
        $conn->commit();
        echo json_encode($result);
    } else {
        $conn->rollback();
        http_response_code(400); // Or 500 depending on error type
        echo json_encode($result);
    }

    if ($conn) {
        $conn->close();
    }
}
?>