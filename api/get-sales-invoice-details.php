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
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
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

require_once 'db_connect.php';

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// --- Step 1: Validate input ---
$company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
$invoice_id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$user_id = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);

if (!$company_id || !$invoice_id || !$user_id) {
    respond(400, ["success" => false, "error" => "Missing or invalid parameters. Required: company_id, id, user_id"]);
}

// --- Step 2: Fetch Data ---
try {
    // --- Main Invoice, Customer, and Company Data ---
    $sql = "
        SELECT 
            si.id, si.public_token, si.invoice_number, si.invoice_date, si.due_date, si.status, si.total_amount, si.amount_due, si.customer_id,
            cust.customer_name AS customer_name,
            cust.opening_balance_journal_id,
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

    $BASE_URL = 'https://hariindustries.net/api/clearbook/';
    if (!empty($invoice['company_logo'])) {
        $invoice['company_logo'] = $BASE_URL . ltrim($invoice['company_logo'], '/');
    } else {
        $invoice['company_logo'] = null;
    }

    if (!$invoice) {
        respond(404, ["success" => false, "error" => "Invoice not found"]);
    }

    // --- Invoice Items ---
    $items_sql = "SELECT id, item_name, quantity, unit_price, (quantity * unit_price) as total_amount FROM sales_invoice_items WHERE invoice_id = ?";
    $items_stmt = $conn->prepare($items_sql);
    if (!$items_stmt) throw new Exception("Prepare failed (items query): " . $conn->error);
    $items_stmt->bind_param("i", $invoice_id);
    $items_stmt->execute();
    $invoice['items'] = $items_stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // --- Step 3: Dynamic Balance Calculation (Corrected Logic) ---
    // To ensure accuracy, we use the 'amount_due' field, which reflects partial payments.

    // 3a. Get Opening Balance from Journal (if any)
    $opening_balance = 0;
    if (!empty($invoice['opening_balance_journal_id'])) {
        $ob_sql = "SELECT SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE -amount END) as balance FROM journal_voucher_lines WHERE journal_voucher_id = ?";
        $ob_stmt = $conn->prepare($ob_sql);
        if (!$ob_stmt) throw new Exception("Prepare failed (opening balance query): " . $conn->error);
        $ob_stmt->bind_param("i", $invoice['opening_balance_journal_id']);
        $ob_stmt->execute();
        $ob_result = $ob_stmt->get_result()->fetch_assoc();
        if ($ob_result && $ob_result['balance']) {
            $opening_balance = (float)$ob_result['balance'];
        }
        $ob_stmt->close();
    }

    // 3b. Get the sum of all amounts due for the customer from all relevant invoices.
    $total_due_sql = "SELECT SUM(amount_due) as total_due FROM sales_invoices WHERE customer_id = ? AND company_id = ? AND status NOT IN ('CANCELLED', 'DRAFT')";
    $total_due_stmt = $conn->prepare($total_due_sql);
    if (!$total_due_stmt) throw new Exception("Prepare failed (total due query): " . $conn->error);
    $total_due_stmt->bind_param("ss", $invoice['customer_id'], $company_id);
    $total_due_stmt->execute();
    $total_due_result = $total_due_stmt->get_result()->fetch_assoc();
    $total_outstanding_from_invoices = (float)($total_due_result['total_due'] ?? 0);
    $total_due_stmt->close();

    // 3c. Calculate the final balances
    $total_balance = $opening_balance + $total_outstanding_from_invoices;
    $current_invoice_amount_due = (float)$invoice['amount_due'];
    $previous_balance = $total_balance - $current_invoice_amount_due;
    $current_invoice_total = (float)$invoice['total_amount'];

    $invoice['previous_balance'] = $previous_balance;
    $invoice['current_invoice_balance'] = $current_invoice_total;
    $invoice['total_balance'] = $total_balance;
    
    // --- Step 4: Assemble Footer and Final Response ---
    $users = ['admin' => null, 'accountant' => null];
    $user_sql = "SELECT full_name, role FROM users WHERE company_id = ? AND role IN ('admin', 'accountant') LIMIT 2";
    $user_stmt = $conn->prepare($user_sql);
    if (!$user_stmt) throw new Exception("Prepare failed (users query): " . $conn->error);
    $user_stmt->bind_param("s", $company_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    while ($user_row = $user_result->fetch_assoc()) {
        $users[$user_row['role']] = $user_row['full_name'];
    }

    $preparer_sql = "SELECT full_name FROM users WHERE id = ? AND company_id = ? LIMIT 1";
    $preparer_stmt = $conn->prepare($preparer_sql);
    if (!$preparer_stmt) throw new Exception("Prepare failed (preparer query): " . $conn->error);
    $preparer_stmt->bind_param("is", $user_id, $company_id);
    $preparer_stmt->execute();
    $preparer_user = $preparer_stmt->get_result()->fetch_assoc();

    $invoice['prepared_by'] = $preparer_user['full_name'] ?? 'N/A';
    $invoice['verified_by'] = $users['accountant'] ?? 'N/A';
    $invoice['authorized_by'] = $users['admin'] ?? 'N/A';
    $invoice['verified_by_signature'] = '/public/sign_accountant.png';
    $invoice['authorized_by_signature'] = '/public/sign_admin.png';

    respond(200, ["success" => true, "invoice" => $invoice]);

} catch (Exception $e) {
    if ($env === "development") {
        respond(500, ["success" => false, "error" => "Internal server error", "details" => $e->getMessage()]);
    } else {
        error_log($e->getMessage());
        respond(500, ["success" => false, "error" => "Internal server error"]);
    }
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($items_stmt)) $items_stmt->close();
    if (isset($user_stmt)) $user_stmt->close();
    if (isset($preparer_stmt)) $preparer_stmt->close();
    if (isset($conn)) $conn->close();
}
?>