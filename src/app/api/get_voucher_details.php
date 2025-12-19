<?php
/************************************
 * HEADERS & PREFLIGHT
 ************************************/
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- Environment Flag ---
define('IS_PRODUCTION', false);

/************************************
 * DATABASE CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php';

/************************************
 * VALIDATE INPUT
 ************************************/
// Handle string-based company ID and integer voucher ID
if (!isset($_GET['voucher_id']) || !filter_var($_GET['voucher_id'], FILTER_VALIDATE_INT) || !isset($_GET['company_id']) || empty(trim($_GET['company_id']))) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "A valid Voucher ID and Company ID are required."]);
    exit();
}

$voucherId = (int)$_GET['voucher_id'];
$companyId = trim($_GET['company_id']);

/************************************
 * FETCH DATA
 ************************************/
try {
    // Fetch main voucher details
    $voucherStmt = $conn->prepare("
        SELECT 
            jv.*, 
            c.name as company_name,
            u.full_name as created_by_name
        FROM journal_vouchers jv
        JOIN companies c ON jv.company_id = c.id
        JOIN logers u ON jv.created_by_id = u.id
        WHERE jv.id = ? AND jv.company_id = ?
    ");
    // Use 'is' for integer voucher_id and string company_id
    $voucherStmt->bind_param("is", $voucherId, $companyId);
    $voucherStmt->execute();
    $voucherResult = $voucherStmt->get_result();
    
    if ($voucherResult->num_rows === 0) {
        throw new Exception("Voucher not found or access denied.");
    }
    
    $voucher = $voucherResult->fetch_assoc();
    $voucherStmt->close();

    // Fetch voucher lines
    $linesStmt = $conn->prepare("
        SELECT jvl.*, coa.name as account_name
        FROM journal_voucher_lines jvl
        JOIN chart_of_accounts coa ON jvl.account_id = coa.id
        WHERE jvl.voucher_id = ?
    ");
    $linesStmt->bind_param("i", $voucherId);
    $linesStmt->execute();
    $linesResult = $linesStmt->get_result();
    $lines = $linesResult->fetch_all(MYSQLI_ASSOC);
    $linesStmt->close();

    // Combine and return
    $voucher['lines'] = $lines;

    http_response_code(200);
    echo json_encode(["success" => true, "voucher" => $voucher]);

} catch (Exception $e) {
    http_response_code(500);
    
    if (!IS_PRODUCTION) {
        error_log($e->getMessage());
    }

    echo json_encode([
        "success" => false,
        "error" => "An internal server error occurred.",
        "details" => IS_PRODUCTION ? null : $e->getMessage()
    ]);
}

$conn->close();
?>