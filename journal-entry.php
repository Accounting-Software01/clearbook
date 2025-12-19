<?php
/************************************
 * ERROR REPORTING (DEV)
 ************************************/
ini_set('display_errors', 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

/************************************
 * HEADERS
 ************************************/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/************************************
 * DB CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php'; // should create $conn

if (!isset($conn) || $conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit();
}

/************************************
 * READ & VALIDATE INPUT
 ************************************/
$data = json_decode(file_get_contents("php://input"));

if (
    !isset($data->entryDate) ||
    !isset($data->narration) ||
    !isset($data->lines) ||
    !isset($data->company_id) ||
    !isset($data->user_id)
) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "Incomplete data. Required fields: entryDate, narration, lines, company_id, user_id"
    ]);
    exit();
}

$entryDate  = $data->entryDate;
$narration  = trim($data->narration);
$lines      = $data->lines;
$company_id = $data->company_id;   // keep as string
$user_id    = (int)$data->user_id;

if (count($lines) < 2) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "At least two journal lines are required"]);
    exit();
}

/************************************
 * VALIDATE & BALANCE
 ************************************/
$totalDebits  = 0;
$totalCredits = 0;

foreach ($lines as $line) {
    if (!isset($line->accountId) || !isset($line->debit) || !isset($line->credit)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid journal line format"]);
        exit();
    }

    $totalDebits  += (float)$line->debit;
    $totalCredits += (float)$line->credit;
}

if (abs($totalDebits - $totalCredits) > 0.01) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Journal entry is not balanced"]);
    exit();
}

/************************************
 * START TRANSACTION
 ************************************/
$conn->begin_transaction();

try {
    /************************************
     * STATUS (no journal_settings dependency)
     ************************************/
    $status = 'posted';

    /************************************
     * GENERATE VOUCHER NUMBER
     ************************************/
    $year = date('Y');

    $seqSql = "SELECT MAX(CAST(SUBSTRING(voucher_number, 6) AS UNSIGNED)) AS max_no
               FROM journal_vouchers
               WHERE voucher_number LIKE ?";
    $like = $year . '-%';

    $seqStmt = $conn->prepare($seqSql);
    $seqStmt->bind_param("s", $like);
    $seqStmt->execute();
    $res = $seqStmt->get_result()->fetch_assoc();
    $seqStmt->close();

    $nextNo = ($res['max_no'] ?? 0) + 1;
    $voucherNumber = $year . '-' . str_pad($nextNo, 5, '0', STR_PAD_LEFT);

    /************************************
     * INSERT VOUCHER HEADER
     ************************************/
    $voucherSql = "INSERT INTO journal_vouchers 
        (company_id, created_by_id, voucher_number, entry_date, narration, total_debits, total_credits, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    $voucherStmt = $conn->prepare($voucherSql);
    $voucherStmt->bind_param(
        "sissddds",
        $company_id,
        $user_id,
        $voucherNumber,
        $entryDate,
        $narration,
        $totalDebits,
        $totalCredits,
        $status
    );
    $voucherStmt->execute();
    $voucherId = $voucherStmt->insert_id;
    $voucherStmt->close();

    /************************************
     * INSERT JOURNAL LINES
     ************************************/
    $lineSql = "INSERT INTO journal_voucher_lines 
        (company_id, voucher_id, account_id, description, debit, credit, payee_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)";

    $lineStmt = $conn->prepare($lineSql);

    foreach ($lines as $line) {
        $desc     = $line->description ?? null;
        $payee_id = $line->payeeId ?? null;

        $lineStmt->bind_param(
            "ssisddi",
            $company_id,
            $voucherId,
            $line->accountId,
            $desc,
            $line->debit,
            $line->credit,
            $payee_id
        );

        $lineStmt->execute();
    }

    $lineStmt->close();

    /************************************
     * COMMIT
     ************************************/
    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "voucher_id" => $voucherId,
        "voucher_number" => $voucherNumber,
        "status" => $status,
        "total_debits" => $totalDebits,
        "total_credits" => $totalCredits
    ]);

} catch (Throwable $e) {
    $conn->rollback();

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Failed to create journal entry",
        "details" => $e->getMessage()
    ]);
}

/************************************
 * CLOSE CONNECTION
 ************************************/
$conn->close();
?>
