<?php
// busa-api/database/post_to_journal.php

/**
 * Creates a full journal voucher with its line items.
 *
 * @param mysqli $conn The database connection object.
 * @param string $company_id The ID of the company.
 * @param int $user_id The ID of the user creating the voucher.
 * @param string $entry_date The date of the journal entry (Y-m-d).
 * @param string $narration A description of the overall transaction.
 * @param string $voucher_type The type of voucher (e.g., 'Payment', 'General').
 * @param array $journal_entries An array of line items for the voucher.
 * @return array An associative array with 'success' (bool) and 'voucher_id' (int).
 */
function post_to_journal($conn, $company_id, $user_id, $entry_date, $narration, $voucher_type, $journal_entries) {

    // Generate a unique voucher number (customize as needed)
    $voucher_number = 'JV-' . time() . rand(100, 999);

    // 1. Insert into journal_vouchers table
    $sql_voucher = "INSERT INTO journal_vouchers (company_id, created_by_id, voucher_number, source, entry_date, voucher_type, narration, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'posted')";
    $stmt_voucher = $conn->prepare($sql_voucher);
    if ($stmt_voucher === false) {
        return ['success' => false, 'message' => 'Voucher prepare failed: ' . $conn->error];
    }

    $source = 'PaymentWorkbench'; // Or another source identifier
    $stmt_voucher->bind_param("sisssss", $company_id, $user_id, $voucher_number, $source, $entry_date, $voucher_type, $narration);
    
    if (!$stmt_voucher->execute()) {
        return ['success' => false, 'message' => 'Voucher execute failed: ' . $stmt_voucher->error];
    }

    $voucher_id = $conn->insert_id; // Get the ID of the newly created voucher
    $stmt_voucher->close();

    $total_debits = 0.00;
    $total_credits = 0.00;

    // 2. Insert into journal_voucher_lines table
    $sql_line = "INSERT INTO journal_voucher_lines (company_id, user_id, voucher_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt_line = $conn->prepare($sql_line);
    if ($stmt_line === false) {
        return ['success' => false, 'message' => 'Line prepare failed: ' . $conn->error];
    }

    foreach ($journal_entries as $entry) {
        $debit = (float)$entry['debit'];
        $credit = (float)$entry['credit'];
        $description = $entry['narration'];

        $stmt_line->bind_param("siisdds", $company_id, $user_id, $voucher_id, $entry['account_id'], $debit, $credit, $description);
        
        if (!$stmt_line->execute()) {
             return ['success' => false, 'message' => 'Line execute failed: ' . $stmt_line->error];
        }

        $total_debits += $debit;
        $total_credits += $credit;
    }
    $stmt_line->close();

    // 3. Update the totals in the journal_vouchers table
    $sql_update = "UPDATE journal_vouchers SET total_debits = ?, total_credits = ? WHERE id = ?";
    $stmt_update = $conn->prepare($sql_update);
    if ($stmt_update === false) {
        return ['success' => false, 'message' => 'Update prepare failed: ' . $conn->error];
    }
    
    $stmt_update->bind_param("ddi", $total_debits, $total_credits, $voucher_id);
    if (!$stmt_update->execute()) {
        return ['success' => false, 'message' => 'Update execute failed: ' . $stmt_update->error];
    }
    $stmt_update->close();

    return ['success' => true, 'voucher_id' => $voucher_id];
}
?>