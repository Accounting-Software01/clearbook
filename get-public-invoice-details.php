<?php
header('Content-Type: application/json');
require_once 'src/db/db_connect.php'; // Make sure this path is correct

$invoice_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($invoice_id <= 0) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'error' => 'A valid Invoice ID is required.']);
    exit;
}

try {
    // Begin transaction
    $pdo->beginTransaction();

    // Fetch main invoice details
    $sql = "
        SELECT
            si.id, si.invoice_number, si.invoice_date, si.due_date, si.customer_name,
            si.total_amount, si.amount_due, si.status,
            c.company_name, c.logo AS company_logo, c.address AS company_address, c.phone AS company_phone,
            COALESCE(cb.balance, 0) AS previous_balance,
            si.total_amount AS current_invoice_balance,
            (COALESCE(cb.balance, 0) + si.total_amount) AS total_balance
        FROM sales_invoices si
        JOIN customers cu ON si.customer_id = cu.id
        JOIN companies c ON si.company_id = c.id
        LEFT JOIN ( 
            SELECT customer_id, SUM(balance) as balance
            FROM customer_balances
            WHERE invoice_id < :invoice_id
            AND customer_id = (SELECT customer_id FROM sales_invoices WHERE id = :invoice_id)
            GROUP BY customer_id
        ) cb ON cu.id = cb.customer_id
        WHERE si.id = :invoice_id
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['invoice_id' => $invoice_id]);
    $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($invoice) {
        // Fetch invoice items
        $itemsSql = "SELECT id, item_name, quantity, unit_price, total_amount FROM sales_invoice_items WHERE invoice_id = :invoice_id";
        $itemsStmt = $pdo->prepare($itemsSql);
        $itemsStmt->execute(['invoice_id' => $invoice_id]);
        $invoice['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Commit transaction
        $pdo->commit();

        echo json_encode(['success' => true, 'invoice' => $invoice]);
    } else {
        $pdo->rollBack();
        http_response_code(404); // Not Found
        echo json_encode(['success' => false, 'error' => 'Invoice not found.']);
    }

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500); // Internal Server Error
    echo json_encode(['success' => false, 'error' => 'Database query failed: ' . $e->getMessage()]);
}
?>
