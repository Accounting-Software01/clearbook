
<?php
require_once 'db.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->invoice_id) || !isset($data->status) || !isset($data->company_id)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid input.']);
    exit;
}

$invoice_id = $data->invoice_id;
$status = $data->status;
$company_id = $data->company_id;

// Basic validation
if (!in_array($status, ['Unpaid', 'Void'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid status provided.']);
    exit;
}

$mysqli->begin_transaction();

try {
    $stmt = $mysqli->prepare("UPDATE supplier_invoices SET status = ? WHERE id = ? AND company_id = ? AND status = 'Awaiting Approval'");
    $stmt->bind_param("sis", $status, $invoice_id, $company_id);
    $stmt->execute();

    if ($stmt->affected_rows === 0) {
        throw new Exception("Invoice not found or not awaiting approval.");
    }

    $stmt->close();
    $mysqli->commit();

    echo json_encode(['status' => 'success', 'message' => "Invoice status updated to {$status}"]);

} catch (Exception $e) {
    $mysqli->rollback();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}

$mysqli->close();
?>
