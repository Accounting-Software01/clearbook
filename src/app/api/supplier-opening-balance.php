<?php
/************************************
 * ERROR REPORTING (DEV ONLY)
 ************************************/
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/************************************
 * CORS CONFIGURATION
 ************************************/
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowed_origins = [
    'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
    'https://hariindustries.net'
];

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

/************************************
 * PREFLIGHT REQUEST
 ************************************/
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/************************************
 * DEPENDENCIES
 ************************************/
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/post_to_journal.php';

global $conn;

/************************************
 * METHOD CHECK
 ************************************/
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method Not Allowed'
    ]);
    exit;
}

try {
    /************************************
     * PARSE & VALIDATE JSON
     ************************************/
    $data = json_decode(file_get_contents('php://input'), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON payload', 400);
    }

    $required_fields = [
        'company_id',
        'user_id',
        'supplier_id',
        'opening_balance_date',
        'opening_balance_amount',
        'ap_account_id'
    ];

    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            throw new Exception("Missing required field: {$field}", 400);
        }
    }

    /************************************
     * SANITIZE INPUT
     ************************************/
    $company_id = trim($data['company_id']);          // STRING (e.g. HARI123)
    $user_id = (int) $data['user_id'];
    $supplier_id = (int) $data['supplier_id'];
    $opening_balance_date = $data['opening_balance_date'];
    $amount = (float) $data['opening_balance_amount'];
    $ap_account_id = $data['ap_account_id'];
    $notes = $data['notes'] ?? 'Opening Balance for Supplier';

    if ($amount <= 0) {
        throw new Exception('Opening balance amount must be greater than zero.', 400);
    }

    /************************************
     * ACCOUNTING CONSTANTS
     ************************************/
    $opening_balance_suspense_account = '300999';

    /************************************
     * BEGIN TRANSACTION
     ************************************/
    $conn->begin_transaction();

    /************************************
     * PREPARE JOURNAL DATA
     ************************************/
    $journal_voucher_data = [
        'company_id' => $company_id,
        'user_id' => $user_id,
        'entry_date' => $opening_balance_date,
        'reference_number' => 'O/B-' . $supplier_id,
        'notes' => $notes,
        'source' => 'OPENING_BALANCE',
        'entries' => [
            [
                'account_id' => $opening_balance_suspense_account,
                'debit' => $amount,
                'credit' => 0,
                'description' => 'Supplier Opening Balance Offset'
            ],
            [
                'account_id' => $ap_account_id,
                'debit' => 0,
                'credit' => $amount,
                'description' => 'Opening Balance for Supplier #' . $supplier_id,
                'payee_id' => $supplier_id,
                'payee_type' => 'supplier'
            ]
        ]
    ];

    /************************************
     * POST JOURNAL ENTRY
     ************************************/
    $journal_result = post_journal_entry($conn, $journal_voucher_data);

    if (empty($journal_result['success'])) {
        throw new Exception(
            'Failed to post journal entry: ' . ($journal_result['error'] ?? 'Unknown error'),
            500
        );
    }

    $journal_id = (int) $journal_result['journal_id'];

    /************************************
     * UPDATE SUPPLIER RECORD
     ************************************/
    $stmt = $conn->prepare(
        "UPDATE suppliers
         SET opening_balance_journal_id = ?, opening_balance_date = ?
         WHERE id = ?"
    );

    if (!$stmt) {
        throw new Exception('DB prepare failed: ' . $conn->error, 500);
    }

    $stmt->bind_param(
        "isi",
        $journal_id,
        $opening_balance_date,
        $supplier_id
    );

    if (!$stmt->execute()) {
        throw new Exception('DB execute failed: ' . $stmt->error, 500);
    }

    /************************************
     * COMMIT
     ************************************/
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Supplier opening balance posted successfully.',
        'journal_id' => $journal_id
    ]);

} catch (Exception $e) {

    if (isset($conn) && $conn->in_transaction) {
        $conn->rollback();
    }

    $status_code = ($e->getCode() >= 400 && $e->getCode() < 600)
        ? $e->getCode()
        : 500;

    http_response_code($status_code);

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);

} finally {
    if (isset($conn)) {
        $conn->close();
    }
}
