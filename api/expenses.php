<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db = new Database();
$conn = $db->getConnection();

if (!$conn) {
    http_response_code(503);
    echo json_encode(array("error" => "Unable to connect to the database."));
    exit();
}

$company_id = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
$user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;

if (!$company_id || !$user_id) {
    http_response_code(401);
    echo json_encode(["error" => "Authentication failed: Missing company or user ID."]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($conn, $company_id);
        break;
    case 'POST':
        handlePost($conn, $company_id, $user_id);
        break;
    case 'PUT':
        handlePut($conn, $company_id, $user_id);
        break;
    case 'DELETE':
        handleDelete($conn, $company_id);
        break;
    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        break;
}

function handleGet($conn, $company_id) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if ($id) {
        $sql = "SELECT e.*, ea.account_name as expense_account, ea.account_code as expense_account_code, pa.account_name as payment_account, pa.account_code as payment_account_code, u.username as created_by FROM expenses e LEFT JOIN chart_of_accounts ea ON e.expense_account_id = ea.id LEFT JOIN chart_of_accounts pa ON e.payment_account_id = pa.id LEFT JOIN users u ON e.created_by = u.id WHERE e.id = ? AND e.company_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $id, $company_id);
    } else {
        $sql = "SELECT e.*, ea.account_name as expense_account, ea.account_code as expense_account_code, pa.account_name as payment_account, pa.account_code as payment_account_code, u.username as created_by FROM expenses e LEFT JOIN chart_of_accounts ea ON e.expense_account_id = ea.id LEFT JOIN chart_of_accounts pa ON e.payment_account_id = pa.id LEFT JOIN users u ON e.created_by = u.id WHERE e.company_id = ? ORDER BY e.date DESC, e.id DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $company_id);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($id) {
        $data = $result->fetch_assoc();
    } else {
        $data = $result->fetch_all(MYSQLI_ASSOC);
    }
    
    http_response_code(200);
    echo json_encode($data);
    $stmt->close();
}

function handlePost($conn, $company_id, $user_id) {
    $action = isset($_GET['action']) ? $_GET['action'] : null;

    if ($action === 'post') {
        postExpense($conn, $company_id, $user_id);
    } else {
        createExpense($conn, $company_id, $user_id);
    }
}

function createExpense($conn, $company_id, $user_id) {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->date) || !isset($data->amount) || !isset($data->expense_account_id) || !isset($data->payment_account_id) || !isset($data->payment_method)) {
        http_response_code(400);
        echo json_encode(["error" => "Incomplete data for creating expense."]);
        return;
    }

    // Generate Reference
    $ref_prefix = 'EXP-' . date('Ymd');
    $sql_ref = "SELECT reference FROM expenses WHERE reference LIKE ? ORDER BY reference DESC LIMIT 1";
    $stmt_ref = $conn->prepare($sql_ref);
    $ref_pattern = $ref_prefix . '%';
    $stmt_ref->bind_param("s", $ref_pattern);
    $stmt_ref->execute();
    $result_ref = $stmt_ref->get_result();
    $last_ref = $result_ref->fetch_assoc();
    if ($last_ref) {
        $last_num = (int)substr($last_ref['reference'], -4);
        $new_num = str_pad($last_num + 1, 4, '0', STR_PAD_LEFT);
        $reference = $ref_prefix . '-' . $new_num;
    } else {
        $reference = $ref_prefix . '-0001';
    }
    $stmt_ref->close();

    $sql = "INSERT INTO expenses (date, amount, expense_account_id, payment_account_id, payment_method, paid_to, description, company_id, user_id, status, reference, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?)";
    $stmt = $conn->prepare($sql);
    
    $stmt->bind_param("sdiiisssisi", $data->date, $data->amount, $data->expense_account_id, $data->payment_account_id, $data->payment_method, $data->paid_to, $data->description, $company_id, $user_id, $reference, $user_id);

    if ($stmt->execute()) {
        $new_expense_id = $stmt->insert_id;
        http_response_code(201);
        echo json_encode(["success" => true, "id" => $new_expense_id, "message" => "Draft expense created successfully."]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create draft expense: " . $stmt->error]);
    }
    $stmt->close();
}

function postExpense($conn, $company_id, $user_id) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Expense ID is required."]);
        return;
    }

    // Start transaction
    $conn->begin_transaction();

    try {
        // 1. Fetch Expense Details
        $sql_fetch = "SELECT * FROM expenses WHERE id = ? AND company_id = ? AND status = 'Draft'";
        $stmt_fetch = $conn->prepare($sql_fetch);
        $stmt_fetch->bind_param("ii", $id, $company_id);
        $stmt_fetch->execute();
        $result_fetch = $stmt_fetch->get_result();
        $expense = $result_fetch->fetch_assoc();
        $stmt_fetch->close();

        if (!$expense) {
            throw new Exception("Draft expense not found or already posted.");
        }

        // 2. Update Expense Status
        $sql_update = "UPDATE expenses SET status = 'Posted', posted_by = ?, posted_at = NOW() WHERE id = ? AND company_id = ?";
        $stmt_update = $conn->prepare($sql_update);
        $stmt_update->bind_param("iii", $user_id, $id, $company_id);
        $stmt_update->execute();
        if ($stmt_update->affected_rows === 0) {
            throw new Exception("Failed to update expense status.");
        }
        $stmt_update->close();

        // 3. Create Ledger Entries
        $sql_ledger = "INSERT INTO general_ledger (date, account_id, debit, credit, description, transaction_type, transaction_id, company_id) VALUES (?, ?, ?, ?, ?, 'Expense', ?, ?)";
        $stmt_ledger = $conn->prepare($sql_ledger);

        // Debit Entry (Expense Account)
        $debit_amount = $expense['amount'];
        $credit_amount = 0;
        $ledger_desc_debit = "Expense recorded: " . $expense['reference'];
        $stmt_ledger->bind_param("siddisi", $expense['date'], $expense['expense_account_id'], $debit_amount, $credit_amount, $ledger_desc_debit, $id, $company_id);
        $stmt_ledger->execute();

        // Credit Entry (Payment Account)
        $debit_amount = 0;
        $credit_amount = $expense['amount'];
        $ledger_desc_credit = "Payment for expense: " . $expense['reference'];
        $stmt_ledger->bind_param("siddisi", $expense['date'], $expense['payment_account_id'], $debit_amount, $credit_amount, $ledger_desc_credit, $id, $company_id);
        $stmt_ledger->execute();
        
        $stmt_ledger->close();

        // Commit transaction
        $conn->commit();

        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Expense posted successfully."]);

    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["error" => "Posting failed: " . $e->getMessage()]);
    }
}

function handlePut($conn, $company_id, $user_id) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Expense ID not specified."]);
        return;
    }

    $data = json_decode(file_get_contents("php://input"));
    
    $sql = "UPDATE expenses SET date=?, amount=?, expense_account_id=?, payment_account_id=?, payment_method=?, paid_to=?, description=?, updated_by=?, updated_at=NOW() WHERE id=? AND company_id=? AND status='Draft'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sdiiissiii", $data->date, $data->amount, $data->expense_account_id, $data->payment_account_id, $data->payment_method, $data->paid_to, $data->description, $user_id, $id, $company_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Draft expense updated successfully."]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Draft expense not found, already posted, or no changes made."]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Server error during update: " . $stmt->error]);
    }
    $stmt->close();
}

function handleDelete($conn, $company_id) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Expense ID not specified."]);
        return;
    }

    $sql = "DELETE FROM expenses WHERE id = ? AND company_id = ? AND status = 'Draft'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $company_id);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Draft expense deleted successfully."]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Draft expense not found or already posted."]);
        }
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Server error during deletion: " . $stmt->error]);
    }
    $stmt->close();
}

$conn->close();
?>