<?php
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

$companyId = isset($_GET['company_id']) ? $_GET['company_id'] : null;
$fromDate = isset($_GET['fromDate']) ? $_GET['fromDate'] : null;
$toDate = isset($_GET['toDate']) ? $_GET['toDate'] : null;

if (!$companyId || !$fromDate || !$toDate) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required parameters: company_id, fromDate, and toDate."]);
    exit();
}

try {
    // This query now fetches only the raw balance data, without making assumptions about other tables.
    // The frontend will be responsible for mapping account details.
    $sql = "
        SELECT
            jvl.account_id as accountId,
            SUM(CASE WHEN jv.entry_date < ? THEN COALESCE(jvl.credit, 0) - COALESCE(jvl.debit, 0) ELSE 0 END) as openingBalance,
            SUM(COALESCE(jvl.credit, 0) - COALESCE(jvl.debit, 0)) as closingBalance
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jv.company_id = ? AND jv.entry_date <= ?
        GROUP BY jvl.account_id;
    ";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $fromDate, $companyId, $toDate);
    $stmt->execute();
    $result = $stmt->get_result();

    $balances = [];
    while ($row = $result->fetch_assoc()) {
        $balances[] = [
            'accountId' => $row['accountId'],
            'openingBalance' => (float)$row['openingBalance'],
            'closingBalance' => (float)$row['closingBalance']
        ];
    }

    echo json_encode($balances);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "An error occurred: " . $e->getMessage()]);
} finally {
    if (isset($stmt)) $stmt->close();
    $conn->close();
}
?>