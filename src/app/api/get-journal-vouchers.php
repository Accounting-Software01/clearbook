<?php
/************************************
 * HEADERS & PREFLIGHT
 ************************************/
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// --- Environment Flag ---
define('IS_PRODUCTION', false); // Set to true in a production environment

/************************************
 * DATABASE CONNECTION
 ************************************/
require_once __DIR__ . '/db_connect.php';

/************************************
 * AUTHENTICATION & AUTHORIZATION (Placeholder)
 ************************************/
// In a real application, you would get the user ID from a validated session or JWT.
$currentUserId = 1; // Example: This would be $_SESSION['user_id'] or similar.

/************************************
 * VALIDATE INPUT & PAGINATION
 ************************************/
// Correctly handle string-based company ID
if (!isset($_GET['company_id']) || empty(trim($_GET['company_id']))) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "A valid Company ID is required."]);
    exit();
}
$companyId = trim($_GET['company_id']); // Treat as a string

// Set up pagination parameters with sensible defaults
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 25;
$offset = ($page - 1) * $limit;

/************************************
 * FETCH DATA (with Authorization & Pagination)
 ************************************/
try {
    // 1. Get Total Record Count for Pagination (with authorization)
    $countStmt = $conn->prepare("
        SELECT COUNT(jv.id) as total
        FROM journal_vouchers jv
        JOIN company_users cu ON jv.company_id = cu.company_id
        WHERE cu.user_id = ? AND jv.company_id = ?
    ");
    // Use 's' for the string company_id
    $countStmt->bind_param("is", $currentUserId, $companyId);
    $countStmt->execute();
    $totalRecords = (int)$countStmt->get_result()->fetch_assoc()['total'];
    $totalPages = ceil($totalRecords / $limit);
    $countStmt->close();

    // 2. Fetch the Paginated Data
    $dataStmt = $conn->prepare("
        SELECT 
            jv.id, 
            jv.voucher_number, 
            jv.entry_date, 
            jv.narration, 
            jv.total_debits, 
            jv.total_credits, 
            jv.status,
            u.full_name as created_by
        FROM 
            journal_vouchers jv
        JOIN 
            logers u ON jv.created_by_id = u.id
        JOIN 
            company_users cu ON jv.company_id = cu.company_id
        WHERE 
            cu.user_id = ? AND jv.company_id = ?
        ORDER BY 
            jv.entry_date DESC, jv.id DESC
        LIMIT ? OFFSET ?
    ");
    // Use 's' for company_id, 'i' for limit and offset
    $dataStmt->bind_param("isii", $currentUserId, $companyId, $limit, $offset);
    $dataStmt->execute();
    $result = $dataStmt->get_result();
    $vouchers = $result->fetch_all(MYSQLI_ASSOC);
    $dataStmt->close();

    // 3. Send Standardized API Response
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "data" => $vouchers,
        "meta" => [
            "total" => $totalRecords,
            "page" => $page,
            "limit" => $limit,
            "totalPages" => $totalPages
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    
    if (!IS_PRODUCTION) {
        error_log($e->getMessage());
    }

    echo json_encode([
        "success" => false,
        "error" => "An internal server error occurred.",
        "details" => IS_PRODUCTION ? null : $e->getMessage() 
    ]);
}

$conn->close();
?>
