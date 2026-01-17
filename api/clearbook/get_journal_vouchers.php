<?php
// api/clearbook/get_journal_vouchers.php

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../../src/app/api/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$company_id = $_GET['company_id'] ?? null;
$voucher_id = $_GET['voucher_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['error' => 'A company_id is required.']);
    exit;
}

try {
    if ($voucher_id) {
        // Fetch a single voucher with its lines
        $stmt = $pdo->prepare("SELECT jv.*, u.full_name as created_by FROM journal_vouchers jv LEFT JOIN users u ON jv.created_by_id = u.id WHERE jv.id = ? AND jv.company_id = ?");
        $stmt->execute([$voucher_id, $company_id]);
        $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$voucher) {
            http_response_code(404);
            echo json_encode(['error' => 'Voucher not found.']);
            exit;
        }

        $line_stmt = $pdo->prepare("SELECT jvl.*, coa.name as account_name FROM journal_voucher_lines jvl JOIN chart_of_accounts coa ON jvl.gl_account_code = coa.code WHERE jvl.journal_voucher_id = ?");
        $line_stmt->execute([$voucher_id]);
        $lines = $line_stmt->fetchAll(PDO::FETCH_ASSOC);

        $voucher['lines'] = $lines;

        http_response_code(200);
        echo json_encode($voucher);

    } else {
        // Fetch a list of all vouchers
        $query = "
            SELECT 
                jv.id,
                jv.entry_date,
                jv.voucher_number,
                jv.narration,
                jv.total_debits,
                jv.total_credits,
                jv.status,
                u.full_name AS created_by
            FROM 
                journal_vouchers jv
            LEFT JOIN 
                users u ON jv.created_by_id = u.id
            WHERE 
                jv.company_id = :company_id
            ORDER BY
                jv.entry_date DESC, jv.id DESC
        ";
        
        $stmt = $pdo->prepare($query);
        $stmt->execute([':company_id' => $company_id]);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode($entries);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Operation failed: ' . $e->getMessage()]);
}

?>