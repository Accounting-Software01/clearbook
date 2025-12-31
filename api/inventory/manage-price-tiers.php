<?php
require_once __DIR__ . '/../../app/api/db_connect.php';

header("Content-Type: application/json");

// Standard CORS headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // Cache for 1 day
}

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
global $conn;

switch ($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn);
        break;
    case 'PUT':
        handlePut($conn);
        break;
    case 'DELETE':
        handleDelete($conn);
        break;
    default:
        http_response_code(405);
        echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
        break;
}

/* ========================= GET ========================= */
function handleGet($conn) {
    if (empty($_GET['product_id']) || empty($_GET['company_id'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'product_id and company_id are required.']);
        return;
    }

    try {
        $stmt = $conn->prepare("SELECT id, product_id, tier_name, price FROM product_price_tiers WHERE product_id = ? AND company_id = ? ORDER BY price ASC");
        $stmt->bind_param("is", $_GET['product_id'], $_GET['company_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        echo json_encode($result->fetch_all(MYSQLI_ASSOC));
        $stmt->close();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to fetch price tiers.', 'details' => $e->getMessage()]);
    }
}

/* ========================= POST (ADD) ========================= */
function handlePost($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['product_id']) || empty($data['tier_name']) || !isset($data['price']) || empty($data['company_id'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing required fields: product_id, tier_name, price, company_id.']);
        return;
    }

    // CORRECTED: Assign array values to local variables first.
    $product_id = $data['product_id'];
    $tier_name = $data['tier_name'];
    $price = $data['price'];
    $company_id = $data['company_id'];

    try {
        $stmt = $conn->prepare("INSERT INTO product_price_tiers (product_id, tier_name, price, company_id) VALUES (?, ?, ?, ?)");
        // CORRECTED: Pass variables to bind_param, not array elements.
        $stmt->bind_param("isds", $product_id, $tier_name, $price, $company_id);
        $stmt->execute();
        
        echo json_encode(['status' => 'success', 'message' => 'Price tier added successfully.', 'id' => $stmt->insert_id]);
        $stmt->close();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to add price tier.', 'details' => $e->getMessage()]);
    }
}

/* ========================= PUT (UPDATE) ========================= */
function handlePut($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id']) || !isset($data['price']) || empty($data['company_id'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'id, price, and company_id are required for an update.']);
        return;
    }

    // CORRECTED: Assign array values to local variables first.
    $price = $data['price'];
    $id = $data['id'];
    $company_id = $data['company_id'];

    try {
        $stmt = $conn->prepare("UPDATE product_price_tiers SET price = ? WHERE id = ? AND company_id = ?");
        // CORRECTED: Pass variables to bind_param.
        $stmt->bind_param("dis", $price, $id, $company_id);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Price tier updated successfully.']);
        } else {
            echo json_encode(['status' => 'warning', 'message' => 'No matching price tier found to update.']);
        }
        $stmt->close();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to update price tier.', 'details' => $e->getMessage()]);
    }
}

/* ========================= DELETE ========================= */
function handleDelete($conn) {
    if (empty($_GET['id']) || empty($_GET['company_id'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'id and company_id are required in the URL.']);
        return;
    }

    try {
        $stmt = $conn->prepare("DELETE FROM product_price_tiers WHERE id = ? AND company_id = ?");
        $stmt->bind_param("is", $_GET['id'], $_GET['company_id']);
        $stmt->execute();

        if ($stmt->affected_rows > 0) {
            echo json_encode(['status' => 'success', 'message' => 'Price tier deleted successfully.']);
        } else {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'No matching price tier found to delete.']);
        }
        $stmt->close();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete price tier.', 'details' => $e->getMessage()]);
    }
}

$conn->close();
