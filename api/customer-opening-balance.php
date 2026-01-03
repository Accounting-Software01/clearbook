<?php
// api/customer-opening-balance.php

// Required headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Include database and object files
include_once 'config/db_connect.php';
include_once 'utils/post_to_journal.php';

// Get posted data
$data = json_decode(file_get_contents("php://input"));

// --- Basic Validation ---
if (
    !isset($data->customerId) ||
    !isset($data->balance) ||
    !isset($data->date) ||
    !isset($data->company_id) ||
    !isset($data->user_id)
) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Incomplete data provided for opening balance."]);
    exit();
}

if (!is_numeric($data->balance) || $data->balance <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Opening balance must be a positive number."]);
    exit();
}

// Assign variables (CORRECTED company_id to string)
$customer_id = (int)$data->customerId;
$amount = (float)$data->balance;
$opening_balance_date = $data->date;
$company_id = (string)$data->company_id;
$user_id = (int)$data->user_id;

$conn->begin_transaction();

try {
    /************************************
     * VALIDATE CUSTOMER & PREVENT DUPLICATES
     ************************************/
    $customer_check_stmt = $conn->prepare(
        "SELECT id, opening_balance_journal_id FROM customers WHERE id = ? AND company_id = ? LIMIT 1"
    );
    // CORRECTED: bind_param is now "is" (integer, string)
    $customer_check_stmt->bind_param("is", $customer_id, $company_id);
    $customer_check_stmt->execute();
    $customer_result = $customer_check_stmt->get_result();

    if ($customer_result->num_rows === 0) {
        throw new Exception("Customer not found for this company.", 404);
    }
    
    $customer_data = $customer_result->fetch_assoc();
    $customer_check_stmt->close();

    if (!empty($customer_data['opening_balance_journal_id'])) {
        throw new Exception("An opening balance has already been posted for this customer. Cannot post twice.", 409);
    }

    /************************************
     * GET SYSTEM ACCOUNTS
     ************************************/
    $settings_stmt = $conn->prepare("SELECT accounts_receivable_account, opening_balance_suspense_account FROM company_settings WHERE company_id = ?");
    // CORRECTED: bind_param is now "s"
    $settings_stmt->bind_param("s", $company_id);
    $settings_stmt->execute();
    $settings = $settings_stmt->get_result()->fetch_assoc();
    $settings_stmt->close();

    if (!$settings || empty($settings['accounts_receivable_account']) || empty($settings['opening_balance_suspense_account'])) {
        throw new Exception("System accounts (AR or Suspense) are not configured for this company.", 500);
    }
    
    $ar_account_id = $settings['accounts_receivable_account'];
    $suspense_account_id = $settings['opening_balance_suspense_account'];

    /************************************
     * PREPARE JOURNAL DATA
     ************************************/
    $journal_voucher_data = [
        'company_id' => $company_id,
        'user_id' => $user_id,
        'entry_date' => $opening_balance_date,
        'reference_number' => 'CUS-OB-' . $customer_id,
        'notes' => "Opening balance for customer #" . $customer_id,
        'source' => 'CUSTOMER_OPENING_BALANCE',
        'entries' => [
            [
                'account_id' => $ar_account_id,
                'debit' => $amount,
                'credit' => 0,
                'description' => 'Opening Balance for Customer #' . $customer_id,
                'payee_id' => $customer_id,
                'payee_type' => 'customer'
            ],
            [
                'account_id' => $suspense_account_id,
                'debit' => 0,
                'credit' => $amount,
                'description' => 'Customer Opening Balance Offset'
            ]
        ]
    ];

    /************************************
     * POST JOURNAL ENTRY
     ************************************/
    $journal_result = post_journal_entry($conn, $journal_voucher_data);

    if (empty($journal_result['success'])) {
        throw new Exception('Failed to post journal entry: ' . ($journal_result['error'] ?? 'Unknown error'), 500);
    }

    $journal_id = (int)$journal_result['journal_id'];

    /************************************
     * UPDATE CUSTOMER RECORD WITH JOURNAL LINK
     ************************************/
    $update_stmt = $conn->prepare(
        "UPDATE customers SET opening_balance_journal_id = ?, opening_balance_date = ? WHERE id = ?"
    );
    $update_stmt->bind_param("isi", $journal_id, $opening_balance_date, $customer_id);

    if (!$update_stmt->execute()) {
        throw new Exception('Failed to link journal entry to customer: ' . $conn->error, 500);
    }
    
    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "success" => true,
        "message" => "Opening balance posted to journal successfully.",
        "journal_id" => $journal_id
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code($e->getCode() > 0 ? $e->getCode() : 500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ]);
}
?>