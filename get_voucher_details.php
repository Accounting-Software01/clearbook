<?php
require_once 'db_connect.php'; // Assuming you have a file for DB connection

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For development, restrict in production

if (isset($_GET['voucher_id']) && isset($_GET['company_id'])) {
    $voucherId = $_GET['voucher_id'];
    $companyId = $_GET['company_id'];

    try {
        // Fetch Voucher Main Details
        $stmt = $pdo->prepare("
            SELECT
                jv.id,
                jv.voucher_number,
                jv.entry_date,
                jv.narration,
                jv.total_debits,
                jv.total_credits,
                u.name as user_name,
                c.name as company_name,
                c.logo_url
            FROM journal_vouchers jv
            JOIN users u ON jv.user_id = u.id
            JOIN companies c ON jv.company_id = c.id
            WHERE jv.id = :voucher_id AND jv.company_id = :company_id
        ");
        $stmt->execute(['voucher_id' => $voucherId, 'company_id' => $companyId]);
        $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$voucher) {
            echo json_encode(['error' => 'Voucher not found']);
            http_response_code(404);
            exit;
        }

        // Fetch Voucher Lines
        $stmt_lines = $pdo->prepare("
            SELECT
                jvl.account_id,
                coa.name as account_name,
                jvl.debit,
                jvl.credit
            FROM journal_voucher_lines jvl
            JOIN chart_of_accounts coa ON jvl.account_id = coa.code
            WHERE jvl.journal_voucher_id = :voucher_id
        ");
        $stmt_lines->execute(['voucher_id' => $voucherId]);
        $lines = $stmt_lines->fetchAll(PDO::FETCH_ASSOC);

        $voucher['lines'] = $lines;

        echo json_encode($voucher);

    } catch (PDOException $e) {
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        http_response_code(500);
    }
} else {
    echo json_encode(['error' => 'Missing voucher_id or company_id']);
    http_response_code(400);
}
?>
