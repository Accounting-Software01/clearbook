<?php
// api/payment-voucher/update-status.php
header('Content-Type: application/json');

require_once '../../src/app/api/db_connect.php';
require_once '../../src/app/api/logers.php';

$data = json_decode(file_get_contents('php://input'), true);

$voucher_id = isset($data['voucher_id']) ? (int)$data['voucher_id'] : 0;
$new_status = isset($data['status']) ? $data['status'] : '';
$user_id = isset($data['user_id']) ? $data['user_id'] : '';

// === VALIDATION ===
if ($voucher_id === 0 || empty($new_status) || empty($user_id)) {
    echo json_encode(['status' => 'error', 'message' => 'Voucher ID, new status, and user ID are required.']);
    exit;
}

if (!in_array($new_status, ['Approved', 'Rejected'])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid status provided.']);
    exit;
}

mysqli_begin_transaction($conn);

try {
    // 1. Fetch the voucher and its current status
    $stmt = mysqli_prepare($conn, "SELECT status, company_id FROM payment_vouchers WHERE id = ?");
    mysqli_stmt_bind_param($stmt, "i", $voucher_id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $voucher = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if (!$voucher) {
        throw new Exception("Payment Voucher not found.");
    }

    if ($voucher['status'] !== 'Submitted') {
        throw new Exception("This voucher has already been actioned and cannot be changed.");
    }
    
    $company_id = $voucher['company_id'];

    // 2. Update the Payment Voucher status
    $update_pv_stmt = mysqli_prepare($conn, "UPDATE payment_vouchers SET status = ?, approved_by = ?, approval_date = NOW() WHERE id = ?");
    mysqli_stmt_bind_param($update_pv_stmt, "ssi", $new_status, $user_id, $voucher_id);
    mysqli_stmt_execute($update_pv_stmt);
    mysqli_stmt_close($update_pv_stmt);

    // 3. Find the associated Journal Voucher and update its status
    $jv_stmt = mysqli_prepare($conn, "SELECT id FROM journal_vouchers WHERE source_document = 'PV' AND source_id = ?");
    mysqli_stmt_bind_param($jv_stmt, "i", $voucher_id);
    mysqli_stmt_execute($jv_stmt);
    $jv_result = mysqli_stmt_get_result($jv_stmt);
    $journal = mysqli_fetch_assoc($jv_result);
    mysqli_stmt_close($jv_stmt);

    if ($journal) {
        $jv_id = $journal['id'];
        $new_jv_status = ($new_status === 'Approved') ? 'Posted' : 'Rejected';
        
        $update_jv_stmt = mysqli_prepare($conn, "UPDATE journal_vouchers SET status = ? WHERE id = ?");
        mysqli_stmt_bind_param($update_jv_stmt, "si", $new_jv_status, $jv_id);
        mysqli_stmt_execute($update_jv_stmt);
        mysqli_stmt_close($update_jv_stmt);
        
        // If approved, post the GL entries
        if ($new_status === 'Approved') {
            // This is where you would move journal lines to the general_ledger table.
            // For this example, we'll assume the 'Posted' status is sufficient.
            // In a real system, you'd have a more robust ledger posting service.
             log_action('post', "Journal #{$jv_id} was posted to the General Ledger.", $user_id, $company_id, 'JournalVoucher');
        }
    }

    mysqli_commit($conn);
    
    log_action($new_status, "Payment Voucher #{$voucher_id} was {$new_status} by {$user_id}.", $user_id, $company_id, 'PaymentVoucher');

    echo json_encode([
        'status' => 'success', 
        'message' => "Payment Voucher has been successfully {$new_status}."
    ]);

} catch (Exception $e) {
    mysqli_rollback($conn);
    log_action('error', "PV Status Update Failed for #{$voucher_id}: " . $e->getMessage(), $user_id, $company_id ?? '', 'PaymentVoucher');
    echo json_encode(['status' => 'error', 'message' => "Transaction failed: " . $e->getMessage()]);
}

mysqli_close($conn);
?>