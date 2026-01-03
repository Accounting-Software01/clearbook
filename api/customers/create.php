<?php
// api/customers/create.php

// --- Basic Setup ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- Includes ---
include_once '../config/db_connect.php';

// --- Get Data ---
$data = json_decode(file_get_contents("php://input"));

// --- Validation ---
if (
    !isset($data->customerName) || 
    !isset($data->company_id) || 
    !isset($data->user_id) ||
    empty(trim($data->customerName))
) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Customer Name and Company/User ID are required."]);
    exit();
}

// --- Database Interaction ---
$conn->begin_transaction();

try {
    // 1. Check for duplicate customer name within the same company
    $check_sql = "SELECT id FROM customers WHERE customer_name = ? AND company_id = ?";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("ss", $data->customerName, $data->company_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {
        throw new Exception("A customer with this name already exists in your company.", 409);
    }
    $check_stmt->close();

    // 2. Prepare the main INSERT statement
    $sql = "INSERT INTO customers (
        company_id, created_by, customer_id, customer_name, trading_name,
        customer_type, status, customer_category, primary_phone_number,
        alternate_phone, email_address, contact_person, website,
        billing_address, shipping_address, city, state, country, postal_code,
        is_vat_applicable, vat_registration_number, customer_tin,
        tax_category, is_wht_applicable, payment_type, payment_terms,
        credit_limit, currency, price_level, default_sales_rep_id,
        default_warehouse, preferred_payment_method, is_discount_eligible,
        invoice_delivery_method, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);

    // 3. Generate a unique customer ID
    $customerId = 'CUS-' . time(); // Simple unique ID

    // 4. Bind parameters (CORRECTED: first param is 's' for company_id)
    $stmt->bind_param(
        "sissssssssssssssssissssissdssssiss",
        $data->company_id,
        $data->user_id,
        $customerId,
        $data->customerName,
        $data->tradingName,
        $data->customerType,
        $data->status,
        $data->customerCategory,
        $data->primaryPhoneNumber,
        $data->alternatePhone,
        $data->emailAddress,
        $data->contactPerson,
        $data->website,
        $data->billingAddress,
        $data->shippingAddress,
        $data->city,
        $data->state,
        $data->country,
        $data->postalCode,
        $data->vatApplicable,
        $data->vatRegistrationNumber,
        $data->customerTIN,
        $data->taxCategory,
        $data->withholdingTaxApplicable,
        $data->paymentType,
        $data->paymentTerms,
        $data->creditLimit,
        $data->currency,
        $data->priceLevel,
        $data->defaultSalesRepresentative,
        $data->defaultWarehouse,
        $data->preferredPaymentMethod,
        $data->discountEligibility,
        $data->invoiceDeliveryMethod,
        $data->notes
    );

    // 5. Execute and commit
    if (!$stmt->execute()) {
        throw new Exception("Error saving customer: " . $stmt->error, 500);
    }
    
    $new_customer_pk = $conn->insert_id; // The auto-incremented primary key

    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Customer registered successfully.",
        "customerId" => $new_customer_pk, // Return the new PK
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code($e->getCode() ?: 500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}

$conn->close();
?>