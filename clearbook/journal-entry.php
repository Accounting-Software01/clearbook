<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

include '../src/app/api/db_connect.php'; // Adjusted path

$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Handle preflight request
    http_response_code(200);
    exit();
}

$entryDate = $data['entryDate'];
$narration = $data['narration'];
$lines = $data['lines'];
$totalDebits = $data['totalDebits'];
$totalCredits = $data['totalCredits'];
$user_id = $data['user_id'];
$company_id = $data['company_id'];

if (empty($entryDate) || empty($narration) || empty($lines) || !isset($totalDebits) || !isset($totalCredits) || empty($user_id) || empty($company_id)) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields.']);
    exit;
}

if (abs($totalDebits - $totalCredits) > 0.01) {
    echo json_encode(['success' => false, 'error' => 'Debits and credits do not balance.']);
    exit;
}

$conn->begin_transaction();

try {
    // 1. Insert into journal_vouchers
    $stmt = $conn->prepare("INSERT INTO journal_vouchers (company_id, voucher_date, narration, type, status, created_by, total_debit, total_credit) VALUES (?, ?, ?, 'manual', 'pending', ?, ?, ?)");
    $stmt->bind_param("issidd", $company_id, $entryDate, $narration, $user_id, $totalDebits, $totalCredits);
    $stmt->execute();
    $journalVoucherId = $stmt->insert_id;
    $stmt->close();

    // 2. Insert into journal_entries
    $stmt = $conn->prepare("INSERT INTO journal_entries (company_id, journal_voucher_id, account_id, debit, credit, payee_id, narration) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($lines as $line) {
        $accountId = $line['accountId'];
        $debit = $line['debit'];
        $credit = $line['credit'];
        $payeeId = isset($line['payeeId']) ? $line['payeeId'] : null;
        
        $stmt->bind_param("iisddis", $company_id, $journalVoucherId, $accountId, $debit, $credit, $payeeId, $narration);
        $stmt->execute();
    }
    $stmt->close();

    $conn->commit();

    echo json_encode(['success' => true, 'journalVoucherId' => $journalVoucherId]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

$conn->close();
?>