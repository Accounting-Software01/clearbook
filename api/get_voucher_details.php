<?php
/************************************
 * ERROR REPORTING (DEV ONLY)
 ************************************/
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

/************************************
 * HEADERS
 ************************************/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * DB CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php';

/************************************
 * VALIDATE INPUT
 ************************************/
if (
    !isset($_GET['voucher_id'], $_GET['company_id']) ||
    !is_numeric($_GET['voucher_id']) ||
    trim($_GET['company_id']) === '' // Validate that company_id is a non-empty string
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Invalid or missing voucher_id or company_id"
    ]);
    exit();
}

$voucherId = (int) $_GET['voucher_id'];
$companyId = trim($_GET['company_id']); // Treat company_id as a string

/************************************
 * FETCH VOUCHER HEADER
 ************************************/
$sqlVoucher = "
    SELECT
        jv.id,
        jv.voucher_number,
        jv.entry_date,
        jv.narration,
        jv.total_debits,
        jv.total_credits,
        jv.status,
        jv.is_locked,

        l.full_name AS user_name,

        c.company_name,
        c.company_logo
    FROM journal_vouchers jv
    INNER JOIN logers l
        ON jv.user_id = l.id
    INNER JOIN companies c
        ON jv.company_id = c.id
    WHERE jv.id = ?
      AND jv.company_id = ?
    LIMIT 1
";

$stmt = $conn->prepare($sqlVoucher);
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "SQL prepare failed",
        "details" => $conn->error
    ]);
    exit();
}

// Bind voucherId as integer ('i') and companyId as string ('s')
$stmt->bind_param("is", $voucherId, $companyId);
$stmt->execute();
$result = $stmt->get_result();
$voucher = $result->fetch_assoc();
$stmt->close();

if (!$voucher) {
    http_response_code(404);
    echo json_encode([
        "success" => false,
        "error" => "Voucher not found"
    ]);
    exit();
}

/************************************
 * FETCH VOUCHER LINES
 ************************************/
$sqlLines = "
    SELECT
        jvl.account_id,
        jvl.debit,
        jvl.credit,
        jvl.description
    FROM journal_voucher_lines jvl
    WHERE jvl.voucher_id = ?
      AND jvl.company_id = ?
    ORDER BY jvl.id ASC
";

$stmtLines = $conn->prepare($sqlLines);
if (!$stmtLines) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "SQL prepare failed",
        "details" => $conn->error
    ]);
    exit();
}

// Bind voucherId as integer ('i') and companyId as string ('s')
$stmtLines->bind_param("is", $voucherId, $companyId);
$stmtLines->execute();
$resultLines = $stmtLines->get_result();

$lines = [];
while ($row = $resultLines->fetch_assoc()) {
    $lines[] = $row;
}

$stmtLines->close();

/************************************
 * RESPONSE
 ************************************/
http_response_code(200);
echo json_encode([
    "success" => true,
    "voucher" => [
        "id" => $voucher['id'],
        "voucher_number" => $voucher['voucher_number'],
        "entry_date" => $voucher['entry_date'],
        "narration" => $voucher['narration'],
        "total_debits" => $voucher['total_debits'],
        "total_credits" => $voucher['total_credits'],
        "status" => $voucher['status'],
        "is_locked" => $voucher['is_locked'],
        "user_name" => $voucher['user_name'],
        "company_name" => $voucher['company_name'],
        "company_logo" => $voucher['company_logo'],
        "lines" => $lines
    ]
]);

$conn->close();
exit();
