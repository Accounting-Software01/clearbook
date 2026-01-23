<?php

class DBEntry {
    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    /**
     * Creates a complete journal voucher and its lines based on the provided schema.
     * @return bool True on success, false on failure.
     * @throws Exception if any database operation fails.
     */
    public function create_journal_entry($company_id, $source, $narration, $reference_id, $sub_entries, $main_account, $total_amount, $user_id) {
        
        // 1. Create the Journal Voucher header
        $this->conn->autocommit(FALSE); // Start transaction

        try {
            $temp_voucher_number = 'TEMP-' . time(); // Temporary number
            $voucher_type = 'Journal Entry';
            $status = 'posted';

            $stmt_voucher = $this->conn->prepare(
                "INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, reference_id, narration, total_debits, total_credits, status) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)"
            );

            if (!$stmt_voucher) {
                throw new Exception("Voucher preparation failed: " . $this->conn->error);
            }
            
            $total_amount_float = (float) $total_amount;
            $ref_id_int = (int) $reference_id;

            $stmt_voucher->bind_param("sisssisdds", $company_id, $user_id, $temp_voucher_number, $source, $voucher_type, $ref_id_int, $narration, $total_amount_float, $total_amount_float, $status);
            
            if (!$stmt_voucher->execute()) {
                throw new Exception("DB Error inserting journal voucher: " . $stmt_voucher->error);
            }

            $voucher_id = $this->conn->insert_id;
            $stmt_voucher->close();

            if ($voucher_id == 0) {
                throw new Exception("Failed to retrieve new voucher ID after insertion.");
            }

            // Update the voucher_number to be permanent and unique
            $final_voucher_number = 'JV-' . date('Ymd') . '-' . $voucher_id;
            $update_stmt = $this->conn->prepare("UPDATE journal_vouchers SET voucher_number = ? WHERE id = ?");
            if (!$update_stmt) {
                throw new Exception("Voucher number update preparation failed: " . $this->conn->error);
            }
            $update_stmt->bind_param("si", $final_voucher_number, $voucher_id);
            if (!$update_stmt->execute()) {
                throw new Exception("Failed to update voucher number: " . $update_stmt->error);
            }
            $update_stmt->close();

            // 2. Insert the journal voucher lines
            $stmt_lines = $this->conn->prepare(
                "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)"
            );
            if (!$stmt_lines) {
                throw new Exception("Voucher lines preparation failed: " . $this->conn->error);
            }

            // Determine if the main entry is a Debit or Credit
            // This logic seems to assume that if the first sub_entry is Debit, then the main entry is Credit for balance.
            // Consider reviewing this logic for accuracy based on accounting principles.
            $main_entry_type = 'Debit';
            if (!empty($sub_entries) && isset($sub_entries[0]['type']) && $sub_entries[0]['type'] === 'Debit') {
                $main_entry_type = 'Credit';
            }

            // Insert sub-entries
            foreach ($sub_entries as $entry) {
                $debit = ($entry['type'] == 'Debit') ? (float)$entry['amount'] : 0.00;
                $credit = ($entry['type'] == 'Credit') ? (float)$entry['amount'] : 0.00;
                $entry_description = isset($entry['narration']) ? $entry['narration'] : $narration;
                $account_id_str = (string)$entry['account'];

                $stmt_lines->bind_param("siisdds", $company_id, $user_id, $voucher_id, $account_id_str, $debit, $credit, $entry_description);
                if (!$stmt_lines->execute()) {
                    throw new Exception("DB Error inserting journal voucher line: " . $stmt_lines->error);
                }
            }
            
            // Insert the main balancing entry
            $main_debit = ($main_entry_type == 'Debit') ? (float)$total_amount : 0.00;
            $main_credit = ($main_entry_type == 'Credit') ? (float)$total_amount : 0.00;
            $main_account_str = (string)$main_account;

            $stmt_lines->bind_param("siisdds", $company_id, $user_id, $voucher_id, $main_account_str, $main_debit, $main_credit, $narration);
            if (!$stmt_lines->execute()) {
                throw new Exception("DB Error inserting journal voucher line (main entry): " . $stmt_lines->error);
            }

            $stmt_lines->close();
            $this->conn->commit(); // Commit transaction

            return true; // Indicate success
        } catch (Exception $e) {
            $this->conn->rollback(); // Rollback on error
            throw $e; // Re-throw the exception to be handled by the caller
        }
    }
}