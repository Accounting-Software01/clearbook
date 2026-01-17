<?php
// api/clearbook/reconciliation.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db_connect.php';

function handle_prepare_error($conn, $context) {
    http_response_code(500);
    echo json_encode(['error' => 'Database query preparation failed.', 'context' => $context, 'db_error' => $conn->error]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    handlePostRequest($conn);
} elseif ($method === 'GET') {
    // Note: Individual GET logic is now in get_reconciliation.php
    handleGetListRequest($conn);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}

$conn->close();

function handlePostRequest($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['company_id']) || empty($data['user_id']) || empty($data['account_id']) || empty($data['statement_date']) || !isset($data['statement_balance'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields.', 'received_data' => $data]);
        return;
    }

    $company_business_id = $data['company_id']; // This is the varchar(20) ID, e.g., 'HARI_INDUSTRIES'

    // CORRECTED LOGIC: Use the varchar ID directly
    $check_sql = "SELECT id FROM bank_reconciliations WHERE company_id = ? AND account_id = ? AND status = 'draft'";
    $check_stmt = $conn->prepare($check_sql);
    if ($check_stmt === false) { handle_prepare_error($conn, 'post_check_existing_draft'); }
    $check_stmt->bind_param('si', $company_business_id, $data['account_id']); // CORRECT: 's' for string company_id
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    if ($check_result->num_rows > 0) {
        $existing = $check_result->fetch_assoc();
        http_response_code(409);
        echo json_encode(['error' => 'A draft reconciliation for this account already exists.', 'reconciliation_id' => $existing['id']]);
        return;
    }
    $check_stmt->close();

    $sql = "INSERT INTO bank_reconciliations (company_id, created_by_id, account_id, reconciliation_date, statement_date, statement_balance, notes) VALUES (?, ?, ?, CURDATE(), ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if ($stmt === false) { handle_prepare_error($conn, 'post_create_reconciliation'); }
    // CORRECTED BINDING: Use 's' for the first parameter (company_id)
    $stmt->bind_param('ssisds', 
        $company_business_id, 
        $data['user_id'], 
        $data['account_id'], 
        $data['statement_date'], 
        $data['statement_balance'], 
        $data['notes']
    );

    if ($stmt->execute()) {
        $new_id = $stmt->insert_id;
        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Draft reconciliation created successfully.', 'reconciliation_id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create reconciliation: ' . $stmt->error]);
    }
    $stmt->close();
}

function handleGetListRequest($conn) {
    if (empty($_GET['company_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Company ID is required.']);
        return;
    }
    $company_business_id = $_GET['company_id'];

    $list_sql = "SELECT br.id, br.reconciliation_date, br.statement_date, coa.account_name, coa.account_code, br.status, br.difference FROM bank_reconciliations AS br JOIN chart_of_accounts AS coa ON br.account_id = coa.id WHERE br.company_id = ? ORDER BY br.reconciliation_date DESC, br.created_at DESC";
    $list_stmt = $conn->prepare($list_sql);
    if ($list_stmt === false) { handle_prepare_error($conn, 'get_reconciliation_list'); }
    $list_stmt->bind_param('s', $company_business_id);
    $list_stmt->execute();
    $result = $list_stmt->get_result();
    $reconciliations = $result->fetch_all(MYSQLI_ASSOC);
    $list_stmt->close();

    http_response_code(200);
    echo json_encode($reconciliations);
}
?>