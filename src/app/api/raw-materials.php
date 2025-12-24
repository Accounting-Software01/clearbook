<?php
require_once 'db_connect.php';
require_once 'logers.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

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
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function handleGet($conn) {
    if (isset($_GET['id'])) {
        $id = $_GET['id'];
        $stmt = $conn->prepare("SELECT * FROM raw_materials WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $item = $result->fetch_assoc();
        echo json_encode($item);
    } else {
        $company_id = $_GET['company_id'];
        $stmt = $conn->prepare("SELECT * FROM raw_materials WHERE company_id = ?");
        $stmt->bind_param("s", $company_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $items = $result->fetch_all(MYSQLI_ASSOC);
        echo json_encode($items);
    }
}

function handlePost($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    // --- Validation ---
    if (empty($data['company_id']) || empty($data['item_code']) || empty($data['name']) || empty($data['unit_of_measure'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields.']);
        return;
    }

    $stmt = $conn->prepare("INSERT INTO raw_materials (company_id, item_code, name, description, unit_of_measure, preferred_supplier_id, standard_cost) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssid", 
        $data['company_id'], 
        $data['item_code'], 
        $data['name'], 
        $data['description'], 
        $data['unit_of_measure'], 
        $data['preferred_supplier_id'],
        $data['standard_cost']
    );

    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        echo json_encode(['success' => true, 'id' => $new_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $stmt->error]);
    }
}

function handlePut($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'];

    // --- Validation ---
    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID for update.']);
        return;
    }

    $stmt = $conn->prepare("UPDATE raw_materials SET item_code = ?, name = ?, description = ?, unit_of_measure = ?, preferred_supplier_id = ?, standard_cost = ?, status = ? WHERE id = ?");
    $stmt->bind_param("ssssidsi", 
        $data['item_code'], 
        $data['name'], 
        $data['description'], 
        $data['unit_of_measure'], 
        $data['preferred_supplier_id'],
        $data['standard_cost'],
        $data['status'],
        $id
    );

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $stmt->error]);
    }
}

function handleDelete($conn) {
    $id = $_GET['id'];

    if (empty($id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID for deletion.']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM raw_materials WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $stmt->error]);
    }
}

$conn->close();
?>