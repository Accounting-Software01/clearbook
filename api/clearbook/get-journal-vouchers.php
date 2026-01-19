<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'company_id is required']);
    exit;
}

$company_id = $_GET['company_id'];

try {
    $voucherSql = "SELECT 
                        jv.id, 
                        jv.voucher_number, 
                        jv.entry_date, 
                        jv.narration, 
                        jv.total_debits,
                        jv.total_credits,
                        jv.status,
                        u.full_name AS created_by
                   FROM journal_vouchers jv
                   LEFT JOIN users u ON jv.created_by_id = u.id
                   WHERE jv.company_id = ? AND jv.source = 'Journal'
                   ORDER BY jv.entry_date DESC, jv.id DESC";
    
    $voucherStmt = $conn->prepare($voucherSql);
    if (!$voucherStmt) throw new Exception('Voucher SQL statement failed: ' . $conn->error);
    $voucherStmt->bind_param("s", $company_id);
    $voucherStmt->execute();
    $vouchersResult = $voucherStmt->get_result();
    
    $vouchers = [];
    $voucherIds = [];
    while($row = $vouchersResult->fetch_assoc()) {
        $row['lines'] = [];
        $vouchers[$row['id']] = $row;
        $voucherIds[] = $row['id'];
    }
    $voucherStmt->close();

    if (!empty($voucherIds)) {
        $placeholders = implode(',', array_fill(0, count($voucherIds), '?'));
        $types = str_repeat('i', count($voucherIds));

        // FIX: Aliased column names to match the frontend data structure (account_code, narration)
        $lineSql = "SELECT 
                        jvl.voucher_id,
                        jvl.account_id AS account_code,
                        jvl.description AS narration,
                        jvl.debit,
                        jvl.credit,
                        coa.account_name AS account_name
                    FROM journal_voucher_lines jvl
                    LEFT JOIN chart_of_accounts coa ON jvl.account_id = coa.account_code AND coa.company_id = jvl.company_id
                    WHERE jvl.voucher_id IN ($placeholders) AND jv.company_id = ?";
        
        $lineStmt = $conn->prepare($lineSql);
        if (!$lineStmt) throw new Exception('Line SQL statement failed: ' . $conn->error);

        $params = $voucherIds;
        $params[] = $company_id;
        $param_types = $types . 's';
        
        $lineStmt->bind_param($param_types, ...$params);
        $lineStmt->execute();
        $linesResult = $lineStmt->get_result();

        while($line = $linesResult->fetch_assoc()) {
            if (isset($vouchers[$line['voucher_id']])) {
                $vouchers[$line['voucher_id']]['lines'][] = $line;
            }
        }
        $lineStmt->close();
    }
    
    $response = array_values($vouchers);

    http_response_code(200);
    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch journal vouchers: ' . $e->getMessage()]);
}

$conn->close();
?>