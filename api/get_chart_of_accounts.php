<?php
require_once __DIR__ . '/../../src/app/api/db_connect.php';

header('Content-Type: application/json');

if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID is required']);
    exit;
}

$company_id = intval($_GET['company_id']);

$sql = "SELECT id, account_code AS code, account_name AS name, account_type AS type FROM chart_of_accounts WHERE company_id = ? ORDER BY account_code ASC";

try {
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $accounts = [];
    while ($row = $result->fetch_assoc()) {
        // The frontend expects `id` as a string.
        $row['id'] = (string)$row['id'];
        $accounts[] = $row;
    }

    $stmt->close();
    $conn->close();

    echo json_encode($accounts);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database query failed', 'details' => $e->getMessage()]);
}
?>