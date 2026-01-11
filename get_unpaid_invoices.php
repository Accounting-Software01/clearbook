<?php
// ======================== 
// FULL DEBUGGING CONFIG
// ========================
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ======================== 
// CORS HEADERS
// ========================
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $allowed_origins = [
        'https://9003-firebase-studiogit-1765450741734.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev',
        'https://hariindustries.net'
    ];
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
    }
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ======================== 
// DATABASE & HELPERS
// ========================
require_once 'db_connect.php'; // provides $conn

if (!$conn) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => "Database connection failed: " . mysqli_connect_error()]);
    exit;
}

// ======================== 
// INPUT VALIDATION
// ========================
if (!isset($_GET['company_id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Company ID is required.']);
    exit;
}

$company_id = $_GET['company_id'];
$supplier_id = $_GET['supplier_id'] ?? null;

// ======================== 
// FETCH INVOICES
// ========================
try {
    $query = "
        SELECT 
            si.id, 
            si.invoice_number, 
            s.name as supplier_name, 
            si.invoice_date, 
            si.due_date, 
            si.total_amount, 
            si.status 
        FROM 
            supplier_invoices si
        JOIN 
            suppliers s ON si.supplier_id = s.id
        WHERE 
            si.company_id = ?
            AND si.status = 'unpaid'
    ";

    if ($supplier_id) {
        $query .= " AND si.supplier_id = ?";
    }

    $query .= " ORDER BY si.invoice_date DESC";

    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    if ($supplier_id) {
        $stmt->bind_param("si", $company_id, $supplier_id);
    } else {
        $stmt->bind_param("s", $company_id);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $invoices = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // ======================== 
    // FETCH TAX AMOUNTS (IMPROVED)
    // ========================
    $invoices_with_tax = [];
    
    // Use specific GL codes for VAT and WHT for accuracy
    $vat_account_code = '101420'; 
    $wht_account_code = '101410';

    $tax_sql = "
        SELECT 
            jvl.gl_account_code, 
            jvl.credit
        FROM journal_voucher_lines jvl
        JOIN journal_vouchers jv ON jvl.voucher_id = jv.id
        WHERE jv.company_id = ? AND jv.reference_no = ? AND jvl.credit > 0 AND jvl.gl_account_code IN (?, ?)
    ";
    $tax_stmt = $conn->prepare($tax_sql);
    if (!$tax_stmt) {
        throw new Exception("Tax statement prepare failed: " . $conn->error);
    }

    foreach($invoices as $invoice) {
        $tax_stmt->bind_param("ssss", $company_id, $invoice['invoice_number'], $vat_account_code, $wht_account_code);
        $tax_stmt->execute();
        $tax_result = $tax_stmt->get_result();
        
        $invoice['vatAmount'] = 0;
        $invoice['whtAmount'] = 0;
        
        while ($tax_row = $tax_result->fetch_assoc()) {
            if ($tax_row['gl_account_code'] == $vat_account_code) {
                $invoice['vatAmount'] += $tax_row['credit'];
            }
            if ($tax_row['gl_account_code'] == $wht_account_code) {
                $invoice['whtAmount'] += $tax_row['credit'];
            }
        }
        $invoices_with_tax[] = $invoice;
    }
    $tax_stmt->close();

    http_response_code(200);
    echo json_encode(["success" => true, "invoices" => $invoices_with_tax]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Database query failed", "details" => $e->getMessage()]);
} finally {
    $conn->close();
}

exit();
?>