<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID is required.']);
    exit;
}

try {
    // The SQL query calculates the balance for each liability account.
    // A liability account's balance is typically Credit - Debit.
    $sql = "SELECT 
                coa.account_code,
                coa.account_name,
                coa.account_type,
                SUM(IFNULL(jvl.credit, 0)) - SUM(IFNULL(jvl.debit, 0)) AS balance
            FROM 
                chart_of_accounts coa
            LEFT JOIN 
                journal_voucher_lines jvl ON coa.account_code = jvl.account_id AND jvl.company_id = coa.company_id
            WHERE 
                coa.company_id = ? 
                AND coa.account_type = 'Liability'
            GROUP BY
                coa.account_code, coa.account_name, coa.account_type
            HAVING
                balance != 0
            ORDER BY
                coa.account_code ASC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $liabilities = [];
    while ($row = $result->fetch_assoc()) {
        // Ensure balance is formatted as a number
        $row['balance'] = floatval($row['balance']);
        $liabilities[] = $row;
    }

    $stmt->close();
    $conn->close();

    echo json_encode(['success' => true, 'data' => $liabilities]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A server error occurred: ' . $e->getMessage()
    ]);
}
?>