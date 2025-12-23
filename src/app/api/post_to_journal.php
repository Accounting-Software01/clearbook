<?php

// This file should not be accessed directly.
if (basename(__FILE__) == basename($_SERVER["SCRIPT_FILENAME"])) {
    http_response_code(403);
    die('Forbidden: This script is meant to be included and not executed directly.');
}

/**
 * Generates a unique, sequential voucher number for a given company and voucher type.
 * Example format: JV-2024-0001
 *
 * @param mysqli $conn The database connection object.
 * @param string $company_id The ID of the company (e.g., 'HARI123').
 * @param string $voucher_prefix The prefix for the voucher type (e.g., 'JV').
 * @return string The newly generated voucher number.
 * @throws Exception If the database query fails.
 */
function generate_voucher_number($conn, $company_id, $voucher_prefix) {
    $year = date('Y');
    $prefix = strtoupper($voucher_prefix) . '-' . $year . '-';
    $like_prefix = $prefix . '%';

    $query = "SELECT voucher_number FROM journal_vouchers 
              WHERE company_id = ? AND voucher_number LIKE ? 
              ORDER BY voucher_number DESC LIMIT 1";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Voucher number generation prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param('ss', $company_id, $like_prefix);
    $stmt->execute();
    $result = $stmt->get_result();
    $last_voucher = $result->fetch_assoc();
    $stmt->close();

    $next_num = 1;
    if ($last_voucher) {
        $last_num_str = substr($last_voucher['voucher_number'], strlen($prefix));
        $next_num = (int)$last_num_str + 1;
    }

    return $prefix . str_pad($next_num, 4, '0', STR_PAD_LEFT);
}

/**
 * Posts a complete journal voucher and its lines to the database.
 * This function handles validation, balancing, and insertion.
 * IMPORTANT: It does NOT manage transactions (commit/rollback). The calling script
 * must handle transaction management.
 *
 * @param mysqli $conn The database connection object.
 * @param array $journal_data The associative array containing all journal data.
 * @return array An associative array indicating success or failure. 
 *               On success: ['success' => true, 'voucher_id' => ..., 'voucher_number' => ...]
 *               On failure: ['success' => false, 'error' => 'Error message']
 */
function post_to_journal($conn, $journal_data) {
    try {
        // --- 1. VALIDATE INCOMING DATA ---
        $required_fields = ['company_id', 'user_id', 'voucher_type', 'narration', 'date', 'entries'];
        foreach ($required_fields as $field) {
            if (empty($journal_data[$field])) {
                throw new Exception("Journal data is missing required field: {$field}");
            }
        }
        
        $company_id = $journal_data['company_id'];
        $user_id = (int)$journal_data['user_id'];
        $entry_date = $journal_data['date'];
        $narration = $journal_data['narration'];
        $voucher_type = $journal_data['voucher_type'];
        $lines = $journal_data['entries'];
        
        if (!is_array($lines) || count($lines) < 2) {
            throw new Exception("A journal entry must have at least two lines in its 'entries' array.");
        }

        // --- 2. CALCULATE TOTALS AND VALIDATE BALANCE ---
        $totalDebits = 0.0;
        $totalCredits = 0.0;
        foreach ($lines as $line) {
            $debit = isset($line['debit']) ? (float)$line['debit'] : 0;
            $credit = isset($line['credit']) ? (float)$line['credit'] : 0;
            if ($debit < 0 || $credit < 0) throw new Exception("Debit and credit amounts cannot be negative.");
            if ($debit > 0 && $credit > 0) throw new Exception("A journal line cannot have both debit and credit values.");
            $totalDebits += $debit;
            $totalCredits += $credit;
        }

        if (abs($totalDebits - $totalCredits) > 0.001) {
            throw new Exception("Journal entry is not balanced. Debits ({$totalDebits}) do not equal Credits ({$totalCredits}).");
        }

        // --- 3. GENERATE VOUCHER NUMBER ---
        $voucherNumber = generate_voucher_number($conn, $company_id, $voucher_type);

        // --- 4. INSERT VOUCHER HEADER ---
        $status = 'posted';
        $voucherSql = "INSERT INTO journal_vouchers 
                        (company_id, user_id, created_by_id, voucher_number, entry_date, narration, total_debits, total_credits, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $voucherStmt = $conn->prepare($voucherSql);
        if (!$voucherStmt) throw new Exception("Prepare failed (journal_vouchers): " . $conn->error);

        $voucherStmt->bind_param("siisssdds", 
            $company_id, $user_id, $user_id, /* created_by_id */
            $voucherNumber, $entry_date, $narration,
            $totalDebits, $totalCredits, $status
        );

        $voucherStmt->execute();
        $voucherId = $voucherStmt->insert_id;
        $voucherStmt->close();

        if ($voucherId == 0) {
            throw new Exception("Failed to insert journal voucher header; insert_id was zero.");
        }

        // --- 5. INSERT VOUCHER LINES ---
        $lineSql = "INSERT INTO journal_voucher_lines 
                    (company_id, user_id, voucher_id, account_id, debit, credit, payee_id, description) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        $lineStmt = $conn->prepare($lineSql);
        if (!$lineStmt) throw new Exception("Prepare failed (journal_voucher_lines): " . $conn->error);

        foreach ($lines as $line) {
            $account_id = (int)$line['account_id'];
            $debit = (float)($line['debit'] ?? 0);
            $credit = (float)($line['credit'] ?? 0);
            $payee_id = isset($line['payee_id']) ? (int)$line['payee_id'] : null;
            $description = $line['description'] ?? null;

            $lineStmt->bind_param("siiiidds",
                $company_id, $user_id, $voucherId, $account_id,
                $debit, $credit, $payee_id, $description
            );
            $lineStmt->execute();
        }
        $lineStmt->close();
        
        // --- 6. RETURN SUCCESS ---
        return [
            'success' => true,
            'voucher_id' => $voucherId,
            'voucher_number' => $voucherNumber
        ];

    } catch (Exception $e) {
        // Return an error array, as the calling function will handle the transaction rollback.
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

?>