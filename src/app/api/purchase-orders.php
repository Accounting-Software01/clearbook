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
    'https://clearbook-olive.vercel.app',
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


require_once 'db_connect.php';



// Suppress PHP errors from being displayed, ensuring a clean JSON response.
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// --- Main Request Router ---
switch ($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

$conn->close();

// --- GET Request Handler ---
function handleGet($conn) {
    $company_id = $_GET['company_id'] ?? null;
    if (!$company_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Company ID is required']);
        return;
    }

    $action = $_GET['action'] ?? null;

    try {
        if ($action == 'getNextPoNumber') {
            fetchNextPoNumber($conn, $company_id);
        } else if ($action == 'search_raw_materials') {
            searchRawMaterials($conn, $company_id);
        } else if ($action == 'get_supplier_details' && isset($_GET['supplier_id'])) {
            fetchSupplierDetails($conn, $company_id, $_GET['supplier_id']);
        } else if (isset($_GET['id'])) {
            fetchSinglePurchaseOrder($conn, $company_id, $_GET['id']);
        } else {
            fetchAllPurchaseOrders($conn, $company_id);
        }
    } catch (Exception $e) {
        http_response_code(500);
        // Log the actual error to the server logs for debugging
        error_log('API Error: ' . $e->getMessage());
        echo json_encode(['error' => 'An internal server error occurred.']);
    }
}

// --- GET Action Functions ---

function searchRawMaterials($conn, $company_id) {
    $search = $_GET['search'] ?? '';

    // CORRECTED QUERY: Uses `sku` and `average_unit_cost` from the user-provided table schema
    // and aliases them to `item_code` and `standard_cost` for the frontend.
    $sql = "SELECT id, name, sku as item_code, unit_of_measure, average_unit_cost as standard_cost FROM raw_materials WHERE company_id = ?";

    if (empty($search)) {
        $stmt = $conn->prepare($sql);
        if ($stmt === false) throw new Exception('Prepare failed: ' . $conn->error);
        $stmt->bind_param("s", $company_id);
    } else {
        $like_search = "%{$search}%";
        // CORRECTED: Search on `name` and `sku`
        $sql .= " AND (name LIKE ? OR sku LIKE ?)";
        $stmt = $conn->prepare($sql);
        if ($stmt === false) throw new Exception('Prepare failed: ' . $conn->error);
        $stmt->bind_param("sss", $company_id, $like_search, $like_search);
    }
    
    if (!$stmt->execute()) throw new Exception('Database query failed: ' . $stmt->error);

    $result = $stmt->get_result();
    $materials = $result->fetch_all(MYSQLI_ASSOC);
    echo json_encode($materials);
}


function fetchNextPoNumber($conn, $company_id) {
    $stmt = $conn->prepare("SELECT MAX(CAST(SUBSTRING(po_number, 4) AS UNSIGNED)) as max_po FROM purchase_orders WHERE company_id = ? AND po_number LIKE 'PO-%'");
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $next_po_num = ($row['max_po'] ?? 0) + 1;
    $next_po_number = 'PO-' . str_pad($next_po_num, 5, '0', STR_PAD_LEFT);
    echo json_encode(['next_po_number' => $next_po_number]);
}

function fetchSupplierDetails($conn, $company_id, $supplier_id) {
    $stmt = $conn->prepare("SELECT payment_terms, vat_registered FROM suppliers WHERE id = ? AND company_id = ?");
    $stmt->bind_param("ss", $supplier_id, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $details = $result->fetch_assoc();

    $response = ['payment_terms' => '', 'vat_rate' => 0];
    if ($details) {
        $response['payment_terms'] = $details['payment_terms'] ?? '';
        if ($details['vat_registered']) {
            $response['vat_rate'] = 7.5; // Standard VAT rate
        }
    }
    echo json_encode($response);
}

function fetchSinglePurchaseOrder($conn, $company_id, $po_id) {
    $stmt = $conn->prepare("SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = ? AND po.company_id = ?");
    $stmt->bind_param("is", $po_id, $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $po = $result->fetch_assoc();

    if ($po) {
        $stmt_items = $conn->prepare("SELECT * FROM purchase_order_items WHERE purchase_order_id = ?");
        $stmt_items->bind_param("i", $po_id);
        $stmt_items->execute();
        $po['items'] = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode($po);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Purchase Order not found']);
    }
}

function fetchAllPurchaseOrders($conn, $company_id) {
    $stmt = $conn->prepare("SELECT po.id, po.po_number, s.name as supplier_name, po.po_date, po.total_amount, po.status FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id WHERE po.company_id = ? ORDER BY po.po_date DESC");
    $stmt->bind_param("s", $company_id);
    $stmt->execute();
    $result = $stmt->get_result();
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
}


// --- POST Request Handler ---
function handlePost($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['header']) || !isset($data['items']) || empty($data['items'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input: Header and items are required.']);
        return;
    }

    $conn->begin_transaction();

    try {
        $header = $data['header'];
        $stmt_po = $conn->prepare(
            "INSERT INTO purchase_orders (company_id, po_number, supplier_id, po_date, expected_delivery_date, currency, payment_terms, subtotal, vat_total, total_amount, status, remarks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
       
        $stmt_po->bind_param("ssisssddddssi",
            $header['company_id'], $header['po_number'], $header['supplier_id'], $header['po_date'],
            $header['expected_delivery_date'], $header['currency'], $header['payment_terms'], $header['subtotal'],
            $header['vat_total'], $header['total_amount'], $header['status'], $header['remarks'], $header['created_by']
        );
        if (!$stmt_po->execute()) throw new Exception('Failed to create purchase order: ' . $stmt_po->error);
        
        $po_id = $conn->insert_id;

        $stmt_items = $conn->prepare(
            "INSERT INTO purchase_order_items (purchase_order_id, item_id, description, quantity, unit_price, line_amount, vat_applicable, vat_rate, vat_amount, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        foreach ($data['items'] as $item) {
            $vat_applicable_int = $item['vat_applicable'] ? 1 : 0;
            $stmt_items->bind_param("iisdddiddd",
            


                $po_id, $item['item_id'], $item['description'], $item['quantity'], $item['unit_price'],
                $item['line_amount'], $vat_applicable_int, $item['vat_rate'], $item['vat_amount'], $item['line_total']
            );
            if (!$stmt_items->execute()) throw new Exception('Failed to create purchase order item: ' . $stmt_items->error);
        }

        $conn->commit();
        echo json_encode(['success' => true, 'po_id' => $po_id, 'po_number' => $header['po_number']]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        error_log("PO Creation Failed: " . $e->getMessage());
        echo json_encode(['error' => 'Transaction Failed: ' . $e->getMessage()]);
    }
}
?>