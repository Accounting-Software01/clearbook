<?php
// api/clearbook/get-accounts.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required.']);
    exit;
}

$company_id = $_GET['company_id'];

/*
 * Corrected Logic:
 * 1. Select all entries from the `bank_accounts` table for the company.
 * 2. Join with `chart_of_accounts` to get the primary ID required for foreign keys.
 * This is the correct way to identify accounts eligible for reconciliation.
 */
$sql = "SELECT 
            coa.id, 
            coa.account_code, 
            ba.account_name, 
            ba.bank_name, 
            ba.account_number
        FROM 
            bank_accounts AS ba
        JOIN 
            chart_of_accounts AS coa ON ba.gl_account_code = coa.account_code AND ba.company_id = coa.company_id
        WHERE 
            ba.company_id = ?";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['error' => 'SQL statement preparation failed: ' . $conn->error]);
    exit;
}

$stmt->bind_param('s', $company_id);
$stmt->execute();
$result = $stmt->get_result();
$accounts = $result->fetch_all(MYSQLI_ASSOC);

$stmt->close();
$conn->close();

http_response_code(200);
echo json_encode($accounts);
?>