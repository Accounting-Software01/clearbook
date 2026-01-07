<?php
header('Content-Type: application/json');
require_once 'src/app/api/db_connect.php'; // Assuming this is the correct path from the root

$company_id = isset($_GET['company_id']) ? (int)$_GET['company_id'] : 0;

if ($company_id <= 0) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'A valid Company ID is required.']);
    exit;
}

try {
    $sql = "
        SELECT
            b.id AS bank_id,
            b.bank_name,
            b.account_name,
            b.account_number,
            b.currency,
            b.gl_account_code,
            coa.account_name AS gl_account_name
        FROM 
            bank_accounts b
        JOIN 
            chart_of_accounts coa ON b.gl_account_code = coa.account_code AND b.company_id = coa.company_id
        WHERE 
            b.company_id = :company_id
        ORDER BY 
            b.bank_name, b.account_name;
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['company_id' => $company_id]);
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($accounts) {
        echo json_encode(['success' => true, 'bank_accounts' => $accounts]);
    } else {
        echo json_encode(['success' => true, 'bank_accounts' => []]); // Return empty array if no accounts found
    }

} catch (PDOException $e) {
    http_response_code(500); // Internal Server Error
    // In a production environment, you would log this error and return a generic error message.
    echo json_encode(['success' => false, 'error' => 'Database query failed: ' . $e->getMessage()]);
}
?>