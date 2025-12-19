<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../config.php';
require_once '../auth.php';

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database Connection Failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));
$user = get_user_from_token();

if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "User not authenticated."]);
    exit();
}

if (empty($data->finishedGoodId) || empty($data->materials) || !is_array($data->materials)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid input. `finishedGoodId` and a `materials` array are required."]);
    exit();
}

$companyId = $user['company_id'];
$finishedGoodId = $data->finishedGoodId;
$materials = $data->materials;

// Begin transaction
$conn->begin_transaction();

try {
    // 1. Create the BOM Header
    $bomName = "BOM-" . uniqid(); // Or create a more descriptive name
    $stmt = $conn->prepare("INSERT INTO boms (companyId, finishedGoodId, name) VALUES (?, ?, ?)");
    $stmt->bind_param("iis", $companyId, $finishedGoodId, $bomName);
    if (!$stmt->execute()) {
        throw new Exception("Failed to create BOM header: " . $stmt->error);
    }
    $bomId = $stmt->insert_id;
    $stmt->close();

    // 2. Create the BOM Items
    $stmt = $conn->prepare("INSERT INTO bom_items (bomId, rawMaterialId, quantity) VALUES (?, ?, ?)");
    foreach ($materials as $material) {
        if (empty($material->id) || empty($material->quantity)) {
            throw new Exception("Invalid material format. Each material must have an `id` and `quantity`.");
        }
        $stmt->bind_param("iid", $bomId, $material->id, $material->quantity);
        if (!$stmt->execute()) {
            throw new Exception("Failed to add material to BOM: " . $stmt->error);
        }
    }
    $stmt->close();

    // Commit transaction
    $conn->commit();

    http_response_code(201);
    echo json_encode(["message" => "Bill of Materials created successfully.", "bomId" => $bomId]);

} catch (Exception $e) {
    // Rollback transaction on error
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
} finally {
    $conn->close();
}
?>