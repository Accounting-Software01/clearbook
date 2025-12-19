<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config.php';
require_once '../auth.php';

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database Connection Failed"]);
    exit();
}

$user = get_user_from_token();
if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "User not authenticated."]);
    exit();
}

$bomId = isset($_GET['bomId']) ? (int)$_GET['bomId'] : 0;

if ($bomId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "A valid bomId is required."]);
    exit();
}

// This query retrieves the BOM header information and all associated materials.
$sql = "
    SELECT 
        b.id AS bomId,
        b.name AS bomName,
        fg.id AS finishedGoodId,
        fg.name AS finishedGoodName,
        fg.code AS finishedGoodCode,
        rm.id AS rawMaterialId,
        rm.name AS rawMaterialName,
        rm.code AS rawMaterialCode,
        bi.quantity
    FROM boms b
    JOIN items fg ON b.finishedGoodId = fg.id
    JOIN bom_items bi ON b.id = bi.bomId
    JOIN items rm ON bi.rawMaterialId = rm.id
    WHERE b.id = ? AND b.companyId = ?
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $bomId, $user['company_id']);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["error" => "Bill of Materials not found or you do not have permission to view it."]);
    exit();
}

$bomDetails = [];
$materials = [];

while ($row = $result->fetch_assoc()) {
    if (empty($bomDetails)) {
        $bomDetails = [
            'bomId' => $row['bomId'],
            'bomName' => $row['bomName'],
            'finishedGoodId' => $row['finishedGoodId'],
            'finishedGoodName' => $row['finishedGoodName'],
            'finishedGoodCode' => $row['finishedGoodCode'],
            'materials' => [],
        ];
    }
    $materials[] = [
        'rawMaterialId' => $row['rawMaterialId'],
        'rawMaterialName' => $row['rawMaterialName'],
        'rawMaterialCode' => $row['rawMaterialCode'],
        'quantity' => $row['quantity'],
    ];
}

$bomDetails['materials'] = $materials;

echo json_encode($bomDetails);

$stmt->close();
$conn->close();
?>