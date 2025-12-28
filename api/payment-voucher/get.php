<?php
// api/payment-voucher/get.php
header('Content-Type: application/json');

require_once '../../src/app/api/db_connect.php';

$voucher_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($voucher_id === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Voucher ID is required.']);
    exit;
}

try {
    // Fetch Voucher Header
    $header_stmt = $conn->prepare("SELECT * FROM payment_vouchers WHERE id = ?");
    $header_stmt->bind_param("i", $voucher_id);
    $header_stmt->execute();
    $header_result = $header_stmt->get_result();
    $voucher = $header_result->fetch_assoc();
    $header_stmt->close();

    if (!$voucher) {
        throw new Exception("Payment Voucher not found.");
    }

    // Fetch Line Items
    $lines_stmt = $conn->prepare("SELECT * FROM payment_voucher_line_items WHERE payment_voucher_id = ? ORDER BY lineNo ASC");
    $lines_stmt->bind_param("i", $voucher_id);
    $lines_stmt->execute();
    $lines_result = $lines_stmt->get_result();
    $lines = [];
    while ($line = $lines_result->fetch_assoc()) {
        $lines[] = $line;
    }
    $lines_stmt->close();

    $voucher['lineItems'] = $lines;

    // Fetch associated Journal Voucher
    $jv_stmt = $conn->prepare("SELECT id, voucher_number, status FROM journal_vouchers WHERE source_document = 'PV' AND source_id = ?");
    $jv_stmt->bind_param("i", $voucher_id);
    $jv_stmt->execute();
    $jv_result = $jv_stmt->get_result();
    $journal = $jv_result->fetch_assoc();
    $jv_stmt->close();

    $voucher['journal'] = $journal;

    echo json_encode(['status' => 'success', 'voucher' => $voucher]);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

$conn->close();
?>