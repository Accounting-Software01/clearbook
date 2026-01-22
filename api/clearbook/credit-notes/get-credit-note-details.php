<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db_connect.php';

// --- CORS & Headers ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// --- Input Validation ---
$company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
$credit_note_id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$company_id || !$credit_note_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID and Credit Note ID are required."]);
    exit;
}

// --- Main Query --- 
try {
    $sql = "
        SELECT 
            cn.id, 
            cn.credit_note_number, 
            cn.credit_note_date, 
            cn.reason, 
            cn.notes, 
            cn.terms_and_conditions, 
            cn.subtotal, 
            cn.total_tax, 
            cn.total_discount, 
            cn.total_amount, 
            cn.status, 
            c.customer_name, 
            c.customer_id,
            u.full_name as created_by_name
        FROM credit_notes cn
        JOIN customers c ON cn.customer_id = c.customer_id
        LEFT JOIN users u ON cn.created_by_id = u.uid
        WHERE cn.id = ? AND cn.company_id = ?
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("is", $credit_note_id, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $creditNote = $result->fetch_assoc();
    $stmt->close();

    if (!$creditNote) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Credit Note not found."]);
        exit;
    }

    // --- Items Query ---
    $sql_items = "
        SELECT id, item_id, item_name, quantity, unit_price, discount, tax_rate, tax_amount, line_total
        FROM credit_note_items
        WHERE credit_note_id = ?
    ";
    $stmt_items = $conn->prepare($sql_items);
    $stmt_items->bind_param("i", $credit_note_id);
    $stmt_items->execute();
    $result_items = $stmt_items->get_result();
    $items = $result_items->fetch_all(MYSQLI_ASSOC);
    $stmt_items->close();

    $creditNote['items'] = $items;

    echo json_encode($creditNote);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Internal Server Error",
        "details" => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) $conn->close();
}
