<?php
// api/clearbook/generate-opening-balance-template.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

if (!isset($_GET['company_id'], $_GET['user_role'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Company ID and User Role are required.']);
    exit;
}

$company_id = $_GET['company_id'];
$user_role = $_GET['user_role'];

try {
    // Check if Chart of Accounts exists for the company
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM chart_of_accounts WHERE company_id = ?");
    if (!$stmt) throw new Exception('SQL prep failed: ' . $conn->error);
    $stmt->bind_param('s', $company_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($result['count'] == 0) {
        http_response_code(404); // Not Found
        header('Content-Type: application/json');
        if ($user_role == 'admin' || $user_role == 'accountant') {
            echo json_encode(['error' => 'Chart of Accounts not found. Please go to Settings to create it.']);
        } else {
            echo json_encode(['error' => 'Chart of Accounts not found. Please contact your administrator.']);
        }
        exit;
    }

    // Fetch all accounts
    $stmt = $conn->prepare("SELECT account_code, account_name, account_type FROM chart_of_accounts WHERE company_id = ? ORDER BY account_code ASC");
    if (!$stmt) throw new Exception('SQL prep failed: ' . $conn->error);
    $stmt->bind_param('s', $company_id);
    $stmt->execute();
    $accounts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Set headers for CSV download
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="opening_balance_template.csv"');

    $output = fopen('php://output', 'w');

    // Write the CSV header
    fputcsv($output, ['AccountCode', 'AccountName', 'AccountType', 'Amount', 'Type']);

    // Write account data to the CSV
    foreach ($accounts as $account) {
        fputcsv($output, [
            $account['account_code'],
            $account['account_name'],
            $account['account_type'],
            '', // Placeholder for Amount
            ''  // Placeholder for Type (Debit/Credit)
        ]);
    }

    fclose($output);
    exit;

} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    // Log the real error on the server
    error_log("Failed to generate opening balance template: " . $e->getMessage());
    // Send a generic error to the client
    echo json_encode(['error' => 'An internal server error occurred while generating the template.']);
    exit;
}
?>