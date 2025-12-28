<?php
// api/get-supplier-invoices.php

require_once 'db_connect.php';
require_once 'utils.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

set_exception_handler('handle_error');

try {
    $conn = connect_db();

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception("Invalid request method", 405);
    }

    if (!isset($_GET['company_id']) || !isset($_GET['supplier_id']) || !isset($_GET['status'])) {
        throw new Exception("company_id, supplier_id, and status are required parameters", 400);
    }
    
    $company_id = $_GET['company_id'];
    $supplier_id = $_GET['supplier_id'];
    $status = $_GET['status'];

    // Fetch unpaid invoices for the given supplier
    $query = "SELECT id, invoice_number, due_date, total_amount FROM supplier_invoices WHERE supplier_id = ? AND company_id = ? AND status = ? ORDER BY due_date";
    $stmt = $conn->prepare($query);
    if(!$stmt) {
        throw new Exception("Database prepare failed: " . $conn->error, 500);
    }
    
    $stmt->bind_param("sss", $supplier_id, $company_id, $status);
    $stmt->execute();
    
    $result = $stmt->get_result();
    $invoices = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    echo json_encode($invoices);

    $conn->close();

} catch (Exception $e) {
    handle_error($e);
}

?>