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

// --- Validate input ---
$company_id = filter_input(INPUT_GET, 'company_id', FILTER_SANITIZE_STRING);
if (!$company_id) {
    respond(400, ["success" => false, "error" => "Missing company_id parameter."]);
}

// --- Fetch Sales Trail Data ---
try {
    // The sales trail is a log of all invoices. We get the invoice date,
    // number, total amount, status, and the name of the customer 
    // associated with the invoice record, ordered by customer.
    $sql = "
        SELECT 
            si.id, 
            si.invoice_date, 
            si.invoice_number, 
            si.total_amount, 
            si.status, 
            si.created_at, 
            c.name AS customer_name
        FROM 
            sales_invoices si
        JOIN 
            customers c ON si.customer_id = c.id
        WHERE 
            si.company_id = ?
        ORDER BY 
            c.name, si.created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $sales_trail = $result->fetch_all(MYSQLI_ASSOC);

    respond(200, ["success" => true, "sales_trail" => $sales_trail]);

} catch (Exception $e) {
    error_log($e->getMessage());
    $error_details = ($env === "development") ? ["details" => $e->getMessage()] : [];
    respond(500, array_merge(["success" => false, "error" => "Internal server error"], $error_details));
} finally {
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
}
