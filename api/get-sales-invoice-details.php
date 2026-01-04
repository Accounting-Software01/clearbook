<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- Environment Setup ---
$env = "development"; 

// --- CORS & headers ---
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://9000-firebase-clearbookgit-1767005762274.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
        'https://clearbook-olive.vercel.app',
        'https://hariindustries.net'
    ];
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: ".$_SERVER['HTTP_ORIGIN']);
    }
} else {
    header("Access-Control-Allow-Origin: https://hariindustries.net");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Includes & Utilities ---
require_once 'db_connect.php';

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// -------------------------
// Step 1: Validate input
// -------------------------
$company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
$invoice_id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$user_id = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);

if (!$company_id || !$invoice_id || !$user_id) {
    respond(400, ["success" => false, "error" => "Missing or invalid parameters. Required: company_id, id, user_id"]);
}

// -------------------------
// Step 2: Fetch Data
// -------------------------
try {
    // --- Main Invoice, Customer, and Company Data ---
    // Explicitly list columns instead of using SELECT *
    $sql = "
        SELECT 
            si.id, 
            si.invoice_number, 
            si.invoice_date, 
            si.due_date, 
            si.status, 
            si.total_amount,
            cust.customer_name AS customer_name,
            cust.balance AS customer_balance,
            co.name AS company_name,
            co.company_logo AS company_logo,
            co.address AS company_address,
            co.phone AS company_phone
        FROM sales_invoices si
        JOIN customers cust ON si.customer_id = cust.customer_id
        JOIN companies co ON si.company_id = co.id
        WHERE si.id = ? AND si.company_id = ?
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    if (!$stmt) throw new Exception("Prepare failed (main query): " . $conn->error);
    
    $stmt->bind_param("is", $invoice_id, $company_id);
    $stmt->execute();
    $invoice = $stmt->get_result()->fetch_assoc();

    if (!$invoice) {
        respond(404, ["success" => false, "error" => "Invoice not found"]);
    }

    // --- Invoice Items ---
    $items_sql = "SELECT id, item_name, quantity, unit_price, total_amount FROM sales_invoice_items WHERE invoice_id = ?";
    $items_stmt = $conn->prepare($items_sql);
    if (!$items_stmt) throw new Exception("Prepare failed (items query): " . $conn->error);
    
    $items_stmt->bind_param("i", $invoice_id);
    $items_stmt->execute();
    $invoice['items'] = $items_stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // --- User Roles for Footer ---
    $users = ['admin' => null, 'accountant' => null];
    $user_sql = "SELECT username, role FROM users WHERE company_id = ? AND role IN ('admin', 'accountant') LIMIT 2";
    $user_stmt = $conn->prepare($user_sql);
    if (!$user_stmt) throw new Exception("Prepare failed (users query): " . $conn->error);
    
    $user_stmt->bind_param("s", $company_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    while ($user_row = $user_result->fetch_assoc()) {
        $users[$user_row['role']] = $user_row['username'];
    }

    // --- Logged-in User (Preparer) ---
    $preparer_sql = "SELECT username FROM users WHERE id = ? AND company_id = ? LIMIT 1";
    $preparer_stmt = $conn->prepare($preparer_sql);
    if (!$preparer_stmt) throw new Exception("Prepare failed (preparer query): " . $conn->error);

    $preparer_stmt->bind_param("is", $user_id, $company_id);
    $preparer_stmt->execute();
    $preparer_user = $preparer_stmt->get_result()->fetch_assoc();

    // -------------------------
    // Step 3: Process & Assemble
    // -------------------------

    // --- Balance Calculations ---
    $customer_total_balance = (float)($invoice['customer_balance'] ?? 0);
    $current_invoice_total = (float)$invoice['total_amount'];
    $previous_balance = $customer_total_balance;

    if ($invoice['status'] !== 'DRAFT' && $invoice['status'] !== 'CANCELLED') {
        $previous_balance = $customer_total_balance - $current_invoice_total;
    }

    // --- Assemble Response ---
    $invoice['previous_balance'] = $previous_balance;
    $invoice['current_invoice_balance'] = $current_invoice_total;
    $invoice['total_balance'] = $customer_total_balance;

    $invoice['prepared_by'] = $preparer_user['username'] ?? 'N/A';
    $invoice['verified_by'] = $users['accountant'] ?? 'N/A';
    $invoice['authorized_by'] = $users['admin'] ?? 'N/A';

    $invoice['verified_by_signature'] = '/public/sign_accountant.png';
    $invoice['authorized_by_signature'] = '/public/sign_admin.png';

    // -------------------------
    // Step 4: Respond
    // -------------------------
    respond(200, ["success" => true, "invoice" => $invoice]);

} catch (Exception $e) {
    if ($env === "development") {
        respond(500, ["success" => false, "error" => "Internal server error", "details" => $e->getMessage()]);
    } else {
        error_log($e->getMessage());
        respond(500, ["success" => false, "error" => "Internal server error"]);
    }
} finally {
    // Close all statement handlers and the connection
    if (isset($stmt)) $stmt->close();
    if (isset($items_stmt)) $items_stmt->close();
    if (isset($user_stmt)) $user_stmt->close();
    if (isset($preparer_stmt)) $preparer_stmt->close();
    if (isset($conn)) $conn->close();
}
