<?php
// api/customers/get_info.php

// --- Basic Setup ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

// --- Includes ---
include_once '../db_connect.php';

// --- Validation ---
if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID is required."]);
    exit();
}

$company_id = (string)$_GET['company_id'];
$customers_array = [];

// --- Database Interaction ---
try {
    // CORRECTED SQL to use 'journal_voucher_lines' and 'voucher_id'
    $sql = "SELECT 
                c.id, c.customer_id, c.customer_name, c.trading_name, c.primary_phone_number, 
                c.email_address, c.status, c.credit_limit, c.price_tier,
                (SELECT SUM(jvl.debit) - SUM(jvl.credit) FROM journal_voucher_lines jvl
                 JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
                 WHERE jvl.payee_id = c.id AND jvl.payee_type = 'customer' AND jv.company_id = ?) as balance
            FROM 
                customers c
            WHERE 
                c.company_id = ?";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ss", $company_id, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            // Ensure balance is a number
            $row['balance'] = (float)($row['balance'] ?? 0);
            $customers_array[] = $row;
        }
    }
    
    // Remapping for the frontend
    $response_data = [];
    foreach($customers_array as $customer) {
        $response_data[] = [
            'id' => $customer['customer_id'],
            'name' => $customer['customer_name'],
            'balance' => $customer['balance'],
            'price_tier' => $customer['price_tier']
        ];
    }


    http_response_code(200);
    echo json_encode(['success' => true, 'data' => $response_data]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}

$conn->close();
?>