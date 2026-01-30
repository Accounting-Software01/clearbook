<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db_connect.php';

$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Company ID is required.']);
    exit;
}

try {
    $sql = "SELECT account_code, account_name FROM chart_of_accounts WHERE company_id = ? AND account_type IN ('Cash', 'Bank') ORDER BY account_name";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        $accounts[] = $row;
    }
    
    $stmt->close();
    $conn->close();
    
    echo json_encode(['success' => true, 'accounts' => $accounts]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
