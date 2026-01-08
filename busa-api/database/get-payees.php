<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');

// Corrected include path for the database connection
include_once __DIR__ . '/../../src/app/api/db_connect.php';

// --- Validate company_id ---
$company_id = $_GET['company_id'] ?? null;

if (!$company_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "company_id is required"]);
    exit;
}

$payees = [];

/**
 * =========================
 * Fetch Customers
 * =========================
 */
$customer_sql = "SELECT id, customer_name AS name FROM customers WHERE company_id = ? AND status = 'active'";
$customer_stmt = $conn->prepare($customer_sql);

if ($customer_stmt) {
    $customer_stmt->bind_param("i", $company_id);
    $customer_stmt->execute();
    $customer_result = $customer_stmt->get_result();

    while ($row = $customer_result->fetch_assoc()) {
        $payees[] = [
            "id"   => $row['id'],
            "name" => $row['name'],
            "type" => "Customer" // Capitalized to match frontend expectation
        ];
    }
    $customer_stmt->close();
} else {
    http_response_code(500);
    echo json_encode(["error" => "Customer query prepare failed: " . $conn->error]);
    exit;
}

/**
 * =========================
 * Fetch Suppliers
 * =========================
 */
$supplier_sql = "SELECT id, supplier_name AS name FROM suppliers WHERE company_id = ? AND status = 'active'";
$supplier_stmt = $conn->prepare($supplier_sql);

if ($supplier_stmt) {
    $supplier_stmt->bind_param("i", $company_id);
    $supplier_stmt->execute();
    $supplier_result = $supplier_stmt->get_result();

    while ($row = $supplier_result->fetch_assoc()) {
        $payees[] = [
            "id"   => $row['id'],
            "name" => $row['name'],
            "type" => "Supplier" // Capitalized to match frontend expectation
        ];
    }
    $supplier_stmt->close();
} else {
    http_response_code(500);
    echo json_encode(["error" => "Supplier query prepare failed: " . $conn->error]);
    exit;
}

// The frontend expects a direct JSON array of payees.
echo json_encode($payees);

$conn->close();
?>
