<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once __DIR__ . '/db_connect.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$bill_id = $_GET['id'] ?? null;
$company_id = $_GET['company_id'] ?? null;

if (!$bill_id || !$company_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Bill ID and Company ID are required.']);
    exit;
}

try {
    // Fetch the main bill details and join with supplier info
    // CORRECTED: Added b.supplier_id to the SELECT statement
    $bill_sql = "SELECT
                    b.id,
                    b.supplier_id,
                    b.bill_date,
                    b.due_date,
                    b.notes,
                    b.terms_and_conditions,
                    b.total_amount,
                    b.`status`,
                    s.name AS supplier_name,
                    s.billing_address AS supplier_address,
                    s.tin_number AS supplier_tin
                FROM
                    bills b
                JOIN
                    suppliers s ON b.supplier_id = s.id
                WHERE
                    b.id = ? AND b.company_id = ?";

    $bill_stmt = $conn->prepare($bill_sql);
    if ($bill_stmt === false) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $bill_stmt->bind_param("is", $bill_id, $company_id);
    $bill_stmt->execute();
    $result = $bill_stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Bill not found.']);
        exit;
    }

    $bill_details = $result->fetch_assoc();
    $bill_stmt->close();

    // Fetch the associated bill items
    $items_sql = "SELECT
                    description,
                    quantity,
                    unit_price,
                    tax_rate,
                    discount,
                    line_total
                FROM
                    bill_items
                WHERE
                    bill_id = ?";
                    
    $items_stmt = $conn->prepare($items_sql);
    $items_stmt->bind_param("i", $bill_id);
    $items_stmt->execute();
    $items_result = $items_stmt->get_result();
    
    $items = [];
    while ($row = $items_result->fetch_assoc()) {
        $items[] = $row;
    }
    $items_stmt->close();

    // Combine bill details with items
    $bill_details['items'] = $items;

    // Send the successful response
    echo json_encode(['success' => true, 'data' => $bill_details]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'A server error occurred: ' . $e->getMessage()
    ]);
} finally {
    $conn->close();
}
?>
