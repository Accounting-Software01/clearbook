<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowed_origins = [
    'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
    'https://hariindustries.net'
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'db_connect.php';

global $conn;
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {

        case 'GET':
            if (empty($_GET['company_id'])) {
                throw new Exception('Company ID is required.', 400);
            }
            $company_id = trim($_GET['company_id']);
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

            $company_id = trim($data['company_id']);
            $user_id    = (int)$data['user_id'];

            handle_post($conn, $data, $company_id, $user_id);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => "Method {$method} not allowed"]);
    }

} catch (Exception $e) {
    $code = ($e->getCode() >= 400 && $e->getCode() < 600) ? $e->getCode() : 500;
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
} finally {
    if ($conn) {
        $conn->close();
    }
}

// ---------------------- Functions ---------------------- //

function handle_get($conn, string $company_id) {

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($id) {
        $query = "SELECT * FROM suppliers WHERE id = ? AND company_id = ?";
        $stmt = $conn->prepare($query);
        if (!$stmt) throw new Exception($conn->error, 500);

        $stmt->bind_param("is", $id, $company_id);
        $stmt->execute();

        $result = $stmt->get_result();
        $data = $result->fetch_assoc();
        $stmt->close();

    } else {
        $query = "SELECT id, code, name, contact_person, ap_account_id, status FROM suppliers WHERE company_id = ? ORDER BY name";
        $stmt = $conn->prepare($query);
        if (!$stmt) throw new Exception($conn->error, 500);

        $stmt->bind_param("s", $company_id);
        $stmt->execute();

        $result = $stmt->get_result();
        $data = $result->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
    }

    echo json_encode($data);
}

function handle_post($conn, array $data, string $company_id, int $user_id) {

    $conn->begin_transaction();

    try {
        if (empty(trim($data['name'])) || empty(trim($data['phone']))) {
            throw new Exception('Supplier name and phone number are required.', 400);
        }

        $name_input = trim($data['name']);
        $phone_input = trim($data['phone']);

        // ---------------- Check if supplier exists ----------------
        $check_stmt = $conn->prepare("SELECT id FROM suppliers WHERE company_id = ? AND name = ?");
        if (!$check_stmt) throw new Exception("Prepare failed: " . $conn->error);

        $check_stmt->bind_param("ss", $company_id, $name_input);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        if ($check_result->num_rows > 0) {
            throw new Exception("Supplier with this name already exists for this company.");
        }
        $check_stmt->close();

        // ---------------- Generate Supplier Code ----------------
        $code = generate_supplier_code($conn, $company_id);

        // ---------------- Prepare other variables ----------------
        $type_var = $data['type'] ?? '';
        $contact_var = $data['contact_person'] ?? '';
        $email_var = $data['email'] ?? '';
        $status_var = $data['status'] ?? 'active';
        $country_var = $data['country'] ?? '';
        $state_var = $data['state'] ?? '';
        $city_var = $data['city'] ?? '';
        $address_var = $data['address'] ?? '';
        $ap_account_var = isset($data['ap_account_id']) ? (int)$data['ap_account_id'] : 0;
        $currency_var = $data['currency'] ?? '';
        $payment_terms_var = isset($data['payment_terms']) ? (int)filter_var($data['payment_terms'], FILTER_SANITIZE_NUMBER_INT) : 0;
        $vat_registered_var = (isset($data['vat_registered']) && $data['vat_registered'] === 'yes') ? 1 : 0;
        $vat_number_var = $data['vat_number'] ?? '';
        $wht_applicable_var = (isset($data['wht_applicable']) && $data['wht_applicable'] === 'yes') ? 1 : 0;
        $bank_name_var = $data['bank_name'] ?? '';
        $account_name_var = $data['account_name'] ?? '';
        $account_number_var = $data['account_number'] ?? '';
        $preferred_payment_var = $data['preferred_payment_method'] ?? '';

        // ---------------- Insert Supplier ----------------
        $query = "
            INSERT INTO suppliers (
                company_id, code, name, type, contact_person, phone, email, status,
                country, state, city, billing_address, ap_account_id, currency,
                payment_terms, vat_registered, vat_number, wht_applicable,
                bank_name, account_name, account_number, preferred_payment_method,
                created_by
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ";

        $stmt = $conn->prepare($query);
        if (!$stmt) throw new Exception("Database prepare failed: " . $conn->error, 500);

        $stmt->bind_param(
            "ssssssssssssiisisissssi",
            $company_id,
            $code,
            $name_input,
            $type_var,
            $contact_var,
            $phone_input,
            $email_var,
            $status_var,
            $country_var,
            $state_var,
            $city_var,
            $address_var,
            $ap_account_var,
            $currency_var,
            $payment_terms_var,
            $vat_registered_var,
            $vat_number_var,
            $wht_applicable_var,
            $bank_name_var,
            $account_name_var,
            $account_number_var,
            $preferred_payment_var,
            $user_id
        );

        if (!$stmt->execute()) {
            throw new Exception("Database execution failed: " . $stmt->error, 500);
        }

        $supplier_id = $stmt->insert_id;
        $stmt->close();

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Supplier created successfully.',
            'supplier_id' => $supplier_id,
            'supplier_code' => $code
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
}

function generate_supplier_code($conn, string $company_id): string {

    $stmt = $conn->prepare("SELECT COUNT(*) AS count FROM suppliers WHERE company_id = ?");
    if (!$stmt) throw new Exception("Prepare failed: " . $conn->error);

    $stmt->bind_param("s", $company_id);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $next = $row['count'] + 1;
    return 'SUP' . str_pad($next, 4, '0', STR_PAD_LEFT);
}
?>