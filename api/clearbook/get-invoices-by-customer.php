<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../../db_connect.php'; // Adjusted path

// --- CORS & Headers ---
// (omitting for brevity - same as get-customers.php)
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


// --- Input Validation ---
$company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
$customer_id = filter_input(INPUT_GET, 'customer_id', FILTER_SANITIZE_STRING);

if (!$company_id || !$customer_id) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Company ID and Customer ID are required."]);
    exit;
}

// --- Database Query ---
try {
    // Fetch only invoices that are not fully paid, as these are most likely to have credit notes
    $sql = "SELECT id, invoice_number FROM sales_invoices WHERE company_id = ? AND customer_id = ? AND status != 'PAID' ORDER BY invoice_date DESC";

    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param("ss", $company_id, $customer_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $invoices = $result->fetch_all(MYSQLI_ASSOC);

    echo json_encode($invoices);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Internal Server Error",
        "details" => $e->getMessage()
    ]);
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
