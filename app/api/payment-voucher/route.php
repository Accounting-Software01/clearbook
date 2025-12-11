<?php
/**********************************************************
 * ERRORS (disable in production)
 **********************************************************/
ini_set('display_errors', 1);
error_reporting(E_ALL);

/**********************************************************
 * HEADERS
 **********************************************************/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Invalid request method"]);
    exit;
}

/**********************************************************
 * READ INPUT
 **********************************************************/
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Invalid JSON payload"]);
    exit;
}

/**********************************************************
 * DATABASE (PDO INLINE)
 **********************************************************/
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=hariindu_erp;charset=utf8mb4",
        "hariindu_erp",
        "Software1234@!",
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database connection failed"]);
    exit;
}

/**********************************************************
 * VALIDATION
 **********************************************************/
if (
    !isset($data['voucherDate']) || 
    !isset($data['payeeName']) || 
    !isset($data['paymentAccountId']) ||
    !isset($data['totalAmount']) ||
    !isset($data['lines']) ||
    !is_array($data['lines'])
) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Incomplete or invalid data provided."]);
    exit;
}

/**********************************************************
 * PROCESS PAYMENT VOUCHER
 **********************************************************/
try {
    $pdo->beginTransaction();

    // 1. Create Journal Voucher
    $narration = "Payment to " . $data['payeeName'];
    $stmt = $pdo->prepare("
        INSERT INTO journal_vouchers (date, narration, type, created_at) 
        VALUES (?, ?, 'Payment', NOW())
    ");
    $stmt->execute([$data['voucherDate'], $narration]);
    $voucherId = $pdo->lastInsertId();

    // 2. Debit the expense/asset accounts from the lines
    foreach ($data['lines'] as $line) {
        $stmt = $pdo->prepare("
            INSERT INTO journal_voucher_lines (voucher_id, account_code, debit, credit) 
            VALUES (?, ?, ?, 0)
        ");
        $stmt->execute([$voucherId, $line['accountId'], $line['amount']]);
    }

    // 3. Credit the cash/bank account
    $stmt = $pdo->prepare("
        INSERT INTO journal_voucher_lines (voucher_id, account_code, debit, credit) 
        VALUES (?, ?, 0, ?)
    ");
    $stmt->execute([$voucherId, $data['paymentAccountId'], $data['totalAmount']]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "journalVoucherId" => "JV-" . $voucherId
    ]);
    exit;

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Failed to post voucher: " . $e->getMessage()]);
    exit;
}
?>
