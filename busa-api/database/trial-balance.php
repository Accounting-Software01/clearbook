<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'hariindu_erp');
define('DB_PASSWORD', 'Software1234@!');
define('DB_NAME', 'hariindu_erp');

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database Connection Failed: " . $conn->connect_error]);
    exit();
}
$conn->set_charset("utf8mb4");

$companyId = isset($_GET['company_id']) ? trim($_GET['company_id']) : null;
$toDate = isset($_GET['toDate']) ? $_GET['toDate'] : null;

if (!$companyId || !$toDate) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required parameters: company_id and toDate."]);
    exit();
}

try {
    // This query correctly calculates the closing balance for each account up to the specified `toDate`.
    $sql = "
        SELECT
            acc.id AS accountId,
            acc.name AS accountName,
            SUM(COALESCE(jvl.debit, 0)) AS totalDebit,
            SUM(COALESCE(jvl.credit, 0)) AS totalCredit
        FROM accounts AS acc
        LEFT JOIN journal_voucher_lines AS jvl ON acc.id = jvl.account_id
        LEFT JOIN journal_vouchers AS jv ON jvl.voucher_id = jv.id
            AND jv.company_id = ? 
            AND jv.entry_date <= ?
        WHERE acc.company_id = ?
        GROUP BY acc.id, acc.name
        HAVING totalDebit > 0 OR totalCredit > 0
        ORDER BY acc.id;
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
         throw new Exception("SQL statement preparation failed: " . $conn->error);
    }
    
    $stmt->bind_param("sss", $companyId, $toDate, $companyId);
    $stmt->execute();
    $result = $stmt->get_result();

    $report = [];
    while ($row = $result->fetch_assoc()) {
        $totalDebit = (float)$row['totalDebit'];
        $totalCredit = (float)$row['totalCredit'];
        $balance = $totalDebit - $totalCredit;

        if (abs($balance) > 0.005) { 
            $report[] = [
                'accountId' => $row['accountId'],
                'accountName' => $row['accountName'],
                'debit' => $balance > 0 ? $balance : null,
                'credit' => $balance < 0 ? -$balance : null,
            ];
        }
    }

    echo json_encode($report);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    $conn->close();
}
?>