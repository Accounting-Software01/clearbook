<?php
require_once 'db_connect.php';
require_once 'logers.php'; 
require_once 'post_to_journal.php';

global $conn; 

$method = $_SERVER['REQUEST_METHOD'];
header('Content-Type: application/json');

try {
    switch ($method) {
        case 'GET':
            if (empty($_GET['company_id'])) {
                throw new Exception('Company ID is required.', 400);
            }
            $company_id = (int)$_GET['company_id'];
            handle_get($conn, $company_id);
            break;
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON data received', 400);
            }
            
            if (empty($data['company_id']) || empty($data['user_id'])) {
                throw new Exception('Company ID and User ID are required.', 400);
            }
            $company_id = (int)$data['company_id'];
            $user_id = (int)$data['user_id'];

            handle_post($conn, $data, $company_id, $user_id);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => "Method {$method} not allowed"]);
            break;
    }
} catch (Exception $e) {
    $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}

function handle_get($conn, $company_id) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    
    if ($id) {
        $query = "SELECT * FROM suppliers WHERE id = ? AND company_id = ?";
        $stmt = $conn->prepare($query);
        if(!$stmt) throw new Exception($conn->error, 500);
        $stmt->bind_param("ii", $id, $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_assoc(); // Fetch a single row
        $stmt->close();
    } else {
        $query = "SELECT id, code, name, contact_person, ap_account_id, status FROM suppliers WHERE company_id = ? ORDER BY name";
        $stmt = $conn->prepare($query);
        if(!$stmt) throw new Exception($conn->error, 500);
        $stmt->bind_param("i", $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = $result->fetch_all(MYSQLI_ASSOC); // Fetch all rows
        $stmt->close();
    }
    
    echo json_encode($data);
}

function handle_post($conn, $data, $company_id, $user_id) {
    // --- Validation ---
    if (empty(trim($data['name'])) || empty(trim($data['phone']))) {
        throw new Exception('Supplier name and phone number are required.', 400);
    }
    
    // --- Begin Transaction ---
    $conn->begin_transaction();

    try {
        $code = generate_supplier_code($conn, $company_id);
        
        $query = "INSERT INTO suppliers (
                    company_id, code, name, type, contact_person, phone, email, status,
                    country, state, city, address, ap_account_id, currency, payment_terms,
                    vat_registered, vat_number, wht_applicable, bank_name, account_name, account_number,
                    preferred_payment_method, created_by
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($query);
        if (!$stmt) {
            throw new Exception("Database prepare failed: " . $conn->error, 500);
        }

        $vat_registered_val = ($data['vat_registered'] === 'yes') ? 1 : 0;
        $wht_applicable_val = ($data['wht_applicable'] === 'yes') ? 1 : 0;

        $stmt->bind_param(
            "isssssssssssssisssisssi",
            $company_id, $code, $data['name'], $data['type'], $data['contact_person'], $data['phone'], $data['email'], $data['status'],
            $data['country'], $data['state'], $data['city'], $data['address'], $data['ap_account_id'], $data['currency'], $data['payment_terms'],
            $vat_registered_val, $data['vat_number'], $wht_applicable_val, $data['bank_name'], $data['account_name'], $data['account_number'],
            $data['preferred_payment_method'], $user_id
        );

        if (!$stmt->execute()) {
            throw new Exception("Database execution failed: " . $stmt->error, 500);
        }
        
        $new_supplier_id = $stmt->insert_id;
        $stmt->close();

        // --- Handle Opening Balance ---
        if (!empty($data['opening_balance']) && (float)$data['opening_balance'] > 0) {
            create_opening_balance_entry($conn, $company_id, $user_id, $new_supplier_id, $data);
        }

        // --- Commit Transaction ---
        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Supplier created successfully.',
            'supplier_id' => $new_supplier_id,
            'supplier_code' => $code
        ]);

    } catch (Exception $e) {
        // --- Rollback Transaction on Error ---
        $conn->rollback();
        // Re-throw the exception to be caught by the main error handler
        throw $e;
    }
}

function create_opening_balance_entry($conn, $company_id, $user_id, $supplier_id, $supplier_data) {
    $amount = (float)$supplier_data['opening_balance'];
    $ap_account_id = $supplier_data['ap_account_id'];
    $opening_balance_equity_account = '303010'; // Opening Balance Equity
    
    $narration = "Opening balance for supplier: " . $supplier_data['name'];

    $entries = [];
    if ($supplier_data['balance_type'] === 'credit') { // We owe the supplier
        // Credit Accounts Payable (Supplier)
        $entries[] = ['account_id' => $ap_account_id, 'debit' => 0, 'credit' => $amount, 'payee_id' => $supplier_id, 'payee_type' => 'supplier'];
        // Debit Opening Balance Equity
        $entries[] = ['account_id' => $opening_balance_equity_account, 'debit' => $amount, 'credit' => 0];
    } else { // Supplier owes us (Debit Balance)
        // Debit Accounts Payable (Supplier) - This is unusual but possible
        $entries[] = ['account_id' => $ap_account_id, 'debit' => $amount, 'credit' => 0, 'payee_id' => $supplier_id, 'payee_type' => 'supplier'];
        // Credit Opening Balance Equity
        $entries[] = ['account_id' => $opening_balance_equity_account, 'debit' => 0, 'credit' => $amount];
    }

    $journal_data = [
        'company_id' => $company_id,
        'user_id' => $user_id,
        'voucher_type' => 'JV',
        'narration' => $narration,
        'date' => date('Y-m-d'),
        'entries' => $entries
    ];

    // This function is defined in 'post_to_journal.php' and handles its own transaction
    $result = post_to_journal($conn, $journal_data);

    if (!$result['success']) {
        // The error message from post_to_journal is a string
        throw new Exception("Failed to post opening balance journal entry: " . $result['error']);
    }
}


function generate_supplier_code($conn, $company_id) {
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM suppliers WHERE company_id = ?");
    if(!$stmt) throw new Exception("Prepare failed: " . $conn->error);
    $stmt->bind_param("i", $company_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $next_id = $row['count'] + 1;
    return 'SUP' . str_pad($next_id, 4, '0', STR_PAD_LEFT);
}

exit;
?>