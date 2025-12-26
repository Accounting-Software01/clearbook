
<?php
require_once 'db.php';

header('Content-Type: application/json');

$company_id = $_GET['company_id'] ?? null;
$invoice_id = $_GET['id'] ?? null;

if (!$company_id || !$invoice_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Company ID and Invoice ID are required']);
    exit;
}

// --- Fetch a Single Invoice with Details ---
getSingleInvoiceDetails($mysqli, $company_id, $invoice_id);

$mysqli->close();

/**
 * Fetches all details for a specific invoice, including its items.
 */
function getSingleInvoiceDetails($mysqli, $company_id, $invoice_id) {
    // Main invoice details query
    $query = "
        SELECT 
            si.id, 
            si.invoice_number, 
            si.invoice_date, 
            si.due_date, 
            s.name as supplier_name, 
            si.total_amount, 
            si.status
        FROM supplier_invoices si
        JOIN suppliers s ON si.supplier_id = s.id
        WHERE si.company_id = ? AND si.id = ?
    ";

    $stmt = $mysqli->prepare($query);
    $stmt->bind_param("si", $company_id, $invoice_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $invoice = $result->fetch_assoc();
    $stmt->close();

    if (!$invoice) {
        http_response_code(404);
        echo json_encode(['error' => 'Invoice not found']);
        return;
    }

    // Query for invoice items
    $items_query = "
        SELECT 
            sii.id, 
            rm.name as raw_material_name, 
            sii.description,
            sii.quantity,
            sii.unit_price,
            sii.total_amount
        FROM supplier_invoice_items sii
        JOIN raw_materials rm ON sii.raw_material_id = rm.id
        WHERE sii.supplier_invoice_id = ? AND sii.company_id = ?
    ";
    $items_stmt = $mysqli->prepare($items_query);
    $items_stmt->bind_param("is", $invoice_id, $company_id);
    $items_stmt->execute();
    $items_result = $items_stmt->get_result();
    $invoice['items'] = $items_result->fetch_all(MYSQLI_ASSOC);
    $items_stmt->close();

    echo json_encode(['invoice' => $invoice]);
}
